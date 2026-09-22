/**
 * Kimai API client for time-tracking operations
 * Handles authentication, request management, and API error handling
 */

import { DEFAULT_TIMEOUT_MS } from "./constants.js";
import type {
	AuthConfig,
	Timesheet,
	Project,
	Customer,
	Activity,
	User,
	Team,
	Plugin,
	Version,
	CreateTimesheetOptions,
	ListTimesheetsOptions,
} from "./types.js";

/**
 * Extract detailed errors array from error JSON object
 */
function extractDetailedErrors(
	errorJson: Record<string, unknown>,
): string[] | undefined {
	const errors = errorJson.errors;
	if (errors !== null && typeof errors === "object" && errors !== null) {
		const errorsObj = errors as Record<string, unknown>;
		if (Array.isArray(errorsObj.errors)) {
			return errorsObj.errors.filter((e): e is string => typeof e === "string");
		}
	}
	return undefined;
}

/**
 * Kimai API client
 * Provides methods for all Kimai v1 API endpoints
 */
export class KimaiApi {
	private baseUrl: string;
	private apiKey: string;
	private headers: Record<string, string>;

	/**
	 * Create a new API client
	 * @param config - Auth configuration with url and apiKey
	 * @throws Error if URL doesn't use HTTPS
	 */
	constructor(config: AuthConfig) {
		// Validate HTTPS requirement for security
		try {
			const url = new URL(config.url);
			if (url.protocol !== "https:") {
				throw new Error(
					`KIMAI_URL must use HTTPS. HTTP would expose your API key. ` +
						`Got: ${config.url}`,
				);
			}
		} catch (e) {
			// Re-throw HTTPS validation errors
			if (e instanceof Error && e.message.includes("HTTPS")) {
				throw e;
			}
			// If URL parsing fails, let it fail naturally in request
		}

		this.baseUrl = `${config.url}/api`.replace(/\/+$/, "");
		this.apiKey = config.apiKey;
		this.headers = {
			Authorization: `Bearer ${this.apiKey}`,
			Accept: "application/json",
			"Content-Type": "application/json",
		};
	}

	/**
	 * Execute authenticated API request with timeout
	 * @param endpoint - API endpoint path
	 * @param options - Fetch options
	 * @returns Parsed response data
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

		let response: Response;
		try {
			response = await fetch(url, {
				...options,
				// SECURITY: refuse to follow redirects. A redirect to a different
				// host would leak the Bearer token. Kimai APIs do not normally
				// redirect; if you encounter a 3xx, report upstream.
				redirect: "manual",
				headers: {
					...this.headers,
					...options.headers,
				},
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timeoutId);
		}

		// Treat any 3xx as an error so callers know the upstream behaved
		// unexpectedly instead of silently following it.
		if (response.status >= 300 && response.status < 400) {
			throw new KimaiApiError(
				response.status,
				`Unexpected redirect from ${url}. The CLI refuses to follow redirects to avoid leaking credentials.`,
			);
		}

		if (!response.ok) {
			let errorJson: Record<string, unknown> = { message: response.statusText };
			try {
				const parsed = await response.json();
				if (parsed !== null && typeof parsed === "object") {
					errorJson = parsed as Record<string, unknown>;
				}
			} catch {
				// Use default error message from status text
			}
			const errorMessage =
				typeof errorJson.message === "string"
					? errorJson.message
					: response.statusText;
			const detailedErrors = extractDetailedErrors(errorJson);
			const finalMessage =
				detailedErrors && detailedErrors.length > 0
					? detailedErrors.join("; ")
					: errorMessage;
			throw new KimaiApiError(response.status, finalMessage);
		}

		// Handle 204 No Content - return null for void responses
		if (response.status === 204) {
			return null as T;
		}

		const json = await response.json();
		return json as T;
	}

	/**
	 * Ping the API server
	 * @returns Server ping response
	 */
	async ping(): Promise<{ message: string }> {
		return this.request("/ping");
	}

	/**
	 * Get API version info
	 * @returns Version information
	 */
	async version(): Promise<Version> {
		return this.request("/version");
	}

	/**
	 * Get installed plugins
	 * @returns List of plugins
	 */
	async plugins(): Promise<Plugin[]> {
		return this.request("/plugins");
	}

	/**
	 * Get timesheets with optional filters
	 * @param options - Query options (project, activity, user, date range, state, etc.)
	 * @returns Array of timesheets
	 */
	async getTimesheets(
		options: ListTimesheetsOptions = {},
	): Promise<Timesheet[]> {
		const params = new URLSearchParams();

		if (options.project) params.set("project", options.project.toString());
		if (options.activity) params.set("activity", options.activity.toString());
		if (options.user) params.set("user", options.user.toString());
		if (options.begin) params.set("begin", options.begin);
		if (options.end) params.set("end", options.end);
		if (options.state === "active") params.set("active", "1");
		if (options.state === "stopped") params.set("state", "1");
		if (options.billable !== undefined)
			params.set("billable", options.billable.toString());
		if (options.exported !== undefined)
			params.set("exported", options.exported.toString());
		if (options.full) params.set("full", "true");
		if (options.page) params.set("page", options.page.toString());
		if (options.size) params.set("size", options.size.toString());

		const query = params.toString();
		return this.request(`/timesheets${query ? `?${query}` : ""}`);
	}

	/**
	 * Get currently active (running) timesheets
	 * @returns Array of active timesheets
	 */
	async getActiveTimesheetsRaw(): Promise<Timesheet[]> {
		const params = new URLSearchParams();
		params.set("active", "1");
		return this.request(`/timesheets?${params.toString()}`);
	}

	/**
	 * Create a new timesheet entry
	 * @param options - Timesheet creation options
	 * @returns Created timesheet
	 * @throws Error if project/activity IDs are invalid
	 */
	async createTimesheet(options: CreateTimesheetOptions): Promise<Timesheet> {
		// Validate IDs are positive integers
		if (
			typeof options.project !== "number" ||
			!Number.isInteger(options.project) ||
			options.project <= 0
		) {
			throw new Error("Project ID must be a positive integer");
		}
		if (
			typeof options.activity !== "number" ||
			!Number.isInteger(options.activity) ||
			options.activity <= 0
		) {
			throw new Error("Activity ID must be a positive integer");
		}

		const body: Record<string, unknown> = {
			project: options.project,
			activity: options.activity,
		};

		if (options.description) body.description = options.description;
		if (options.begin) body.begin = options.begin;
		if (options.end) body.end = options.end;
		if (options.tags) body.tags = options.tags;

		return this.request("/timesheets", {
			method: "POST",
			body: JSON.stringify(body),
		});
	}

	/**
	 * Stop (close) a timesheet
	 * @param id - Timesheet ID
	 * @param endTime - End time in ISO format
	 * @returns Updated timesheet
	 */
	async stopTimesheet(id: number, endTime: string): Promise<Timesheet> {
		return this.request(`/timesheets/${id}`, {
			method: "PATCH",
			body: JSON.stringify({ end: endTime }),
		});
	}

	/**
	 * Delete a timesheet
	 * @param id - Timesheet ID to delete
	 */
	async deleteTimesheet(id: number): Promise<void> {
		return this.request(`/timesheets/${id}`, {
			method: "DELETE",
		});
	}

	/**
	 * Update a timesheet with partial data
	 * @param id - Timesheet ID
	 * @param updates - Fields to update
	 * @returns Updated timesheet
	 */
	async updateTimesheet(
		id: number,
		updates: Record<string, unknown>,
	): Promise<Timesheet> {
		return this.request(`/timesheets/${id}`, {
			method: "PATCH",
			body: JSON.stringify(updates),
		});
	}

	/**
	 * Get all projects
	 * @param full - Include full entity details
	 * @returns Array of projects
	 */
	async getProjects(full = false): Promise<Project[]> {
		const query = full ? "?full=true" : "";
		return this.request(`/projects${query}`);
	}

	/**
	 * Get a single project by ID
	 * @param id - Project ID
	 * @returns Project details
	 */
	async getProject(id: number): Promise<Project> {
		return this.request(`/projects/${id}`);
	}

	/**
	 * Get all customers
	 * @param full - Include full entity details
	 * @returns Array of customers
	 */
	async getCustomers(full = false): Promise<Customer[]> {
		const query = full ? "?full=true" : "";
		return this.request(`/customers${query}`);
	}

	/**
	 * Get a single customer by ID
	 * @param id - Customer ID
	 * @returns Customer details
	 */
	async getCustomer(id: number): Promise<Customer> {
		return this.request(`/customers/${id}`);
	}

	/**
	 * Get all activities
	 * @param full - Include full entity details
	 * @returns Array of activities
	 */
	async getActivities(full = false): Promise<Activity[]> {
		const query = full ? "?full=true" : "";
		return this.request(`/activities${query}`);
	}

	/**
	 * Get a single activity by ID
	 * @param id - Activity ID
	 * @returns Activity details
	 */
	async getActivity(id: number): Promise<Activity> {
		return this.request(`/activities/${id}`);
	}

	/**
	 * Get all tags
	 * @returns Array of tag names
	 */
	async getTags(): Promise<string[]> {
		return this.request("/tags");
	}

	/**
	 * Get all users
	 * @returns Array of users
	 */
	async getUsers(): Promise<User[]> {
		return this.request("/users");
	}

	/**
	 * Get all teams
	 * @returns Array of teams
	 */
	async getTeams(): Promise<Team[]> {
		return this.request("/teams");
	}
}

/**
 * API error with HTTP status code
 */
export class KimaiApiError extends Error {
	/**
	 * HTTP status code from API
	 */
	constructor(
		public statusCode: number,
		message: string,
	) {
		super(message);
		this.name = "KimaiApiError";
	}
}
