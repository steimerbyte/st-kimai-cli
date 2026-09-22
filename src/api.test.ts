import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { KimaiApi, KimaiApiError } from "./api";
import type { AuthConfig } from "./types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("KimaiApi", () => {
	let api: KimaiApi;
	let config: AuthConfig;

	beforeEach(() => {
		vi.clearAllMocks();
		config = { url: "https://kimai.example.com", apiKey: "test-key-123" };
		api = new KimaiApi(config);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		it("should accept HTTPS URLs", () => {
			expect(() => new KimaiApi(config)).not.toThrow();
		});

		it("should throw on HTTP URLs", () => {
			const httpConfig = { url: "http://kimai.example.com", apiKey: "test" };
			expect(() => new KimaiApi(httpConfig)).toThrow("HTTPS");
		});

		it("should use Bearer token for Authorization header", () => {
			const testConfig = {
				url: "https://kimai.example.com",
				apiKey: "my-secret-key",
			};
			const testApi = new KimaiApi(testConfig);
			// Access private headers through any cast for testing
			const apiAny = testApi as unknown as { headers: Record<string, string> };
			expect(apiAny.headers["Authorization"]).toBe("Bearer my-secret-key");
		});
	});

	describe("request handling", () => {
		describe("401 Unauthorized", () => {
			it("should throw KimaiApiError with 401 status", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 401,
					statusText: "Unauthorized",
					json: () => Promise.resolve({ message: "Invalid API key" }),
				});

				try {
					await api.ping();
					throw new Error("Should have thrown");
				} catch (error) {
					expect(error).toBeInstanceOf(KimaiApiError);
					expect((error as KimaiApiError).statusCode).toBe(401);
				}
			});

			it("should include error message from API response", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 401,
					statusText: "Unauthorized",
					json: () => Promise.resolve({ message: "Token expired" }),
				});

				try {
					await api.ping();
					throw new Error("Should have thrown");
				} catch (error) {
					expect(error).toBeInstanceOf(KimaiApiError);
					expect((error as KimaiApiError).message).toBe("Token expired");
				}
			});
		});

		describe("404 Not Found", () => {
			it("should throw KimaiApiError with 404 status", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 404,
					statusText: "Not Found",
					json: () => Promise.resolve({ message: "Resource not found" }),
				});

				try {
					await api.getProject(99999);
					throw new Error("Should have thrown");
				} catch (error) {
					expect(error).toBeInstanceOf(KimaiApiError);
					expect((error as KimaiApiError).statusCode).toBe(404);
				}
			});

			it("should handle 404 for timesheets", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 404,
					statusText: "Not Found",
					json: () => Promise.resolve({ message: "Timesheet not found" }),
				});

				await expect(
					api.getTimesheets({ project: 99999 }),
				).rejects.toMatchObject({
					statusCode: 404,
				});
			});
		});

		describe("timeout handling", () => {
			it("should handle abort signal on timeout", async () => {
				// Simulate timeout by aborting
				const controller = new AbortController();
				mockFetch.mockImplementationOnce(() => {
					controller.abort();
					return Promise.reject(new DOMException("Aborted", "AbortError"));
				});

				await expect(api.ping()).rejects.toThrow();
			});

			it("should clear timeout after successful response", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ message: "pong" }),
				});

				const result = await api.ping();
				expect(result).toEqual({ message: "pong" });
			});
		});

		describe("successful API calls", () => {
			it("should return data from ping", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ message: "pong" }),
				});

				const result = await api.ping();
				expect(result).toEqual({ message: "pong" });
			});

			it("should return version info", async () => {
				const versionData = {
					version: "1.0.0",
					versionId: 10000,
					copyright: "© 2024",
				};
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve(versionData),
				});

				const result = await api.version();
				expect(result).toEqual(versionData);
			});

			it("should return plugins list", async () => {
				const plugins = [{ name: "plugin1", version: "1.0" }];
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve(plugins),
				});

				const result = await api.plugins();
				expect(result).toEqual(plugins);
			});

			it("should return timesheets array", async () => {
				const timesheets = [
					{
						id: 1,
						project: 1,
						activity: 1,
						user: 1,
						tags: [],
						begin: "2026-05-21T09:00:00",
						end: "2026-05-21T17:00:00",
						duration: 28800,
						break: 0,
						description: "Test work",
						rate: 0,
						internalRate: 0,
						exported: false,
						billable: true,
						metaFields: [],
					},
				];
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve(timesheets),
				});

				const result = await api.getTimesheets();
				expect(result).toHaveLength(1);
				expect(result[0].id).toBe(1);
			});

			it("should handle 204 No Content responses", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 204,
					json: () => Promise.reject(new Error("No content")),
				});

				const result = await api.deleteTimesheet(1);
				expect(result).toBeNull();
			});
		});

		describe("error message parsing", () => {
			it("should extract detailed errors from Kimai API errors object", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: () =>
						Promise.resolve({
							message: "Validation failed",
							errors: { errors: ["Field A is required", "Field B is invalid"] },
						}),
				});

				try {
					await api.createTimesheet({
						project: 1,
						activity: 1,
						begin: "2026-05-21T09:00:00",
					});
					throw new Error("Should have thrown");
				} catch (error) {
					expect(error).toBeInstanceOf(KimaiApiError);
					expect((error as KimaiApiError).message).toBe(
						"Field A is required; Field B is invalid",
					);
				}
			});

			it("should fall back to statusText when no JSON error", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: () => Promise.reject(new Error("Invalid JSON")),
				});

				try {
					await api.ping();
					throw new Error("Should have thrown");
				} catch (error) {
					expect(error).toBeInstanceOf(KimaiApiError);
					expect((error as KimaiApiError).message).toBe(
						"Internal Server Error",
					);
				}
			});
		});

		describe("request headers", () => {
			it("should include Authorization header", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ message: "pong" }),
				});

				await api.ping();

				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining("/ping"),
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "Bearer test-key-123",
						}),
					}),
				);
			});

			it("should include Accept and Content-Type headers", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
				});

				await api.getTimesheets();

				expect(mockFetch).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						headers: expect.objectContaining({
							Accept: "application/json",
							"Content-Type": "application/json",
						}),
					}),
				);
			});
		});

		describe("POST requests", () => {
			it("should send JSON body for createTimesheet", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 201,
					json: () =>
						Promise.resolve({
							id: 42,
							project: 1,
							activity: 1,
							description: "Test",
						}),
				});

				await api.createTimesheet({
					project: 1,
					activity: 1,
					description: "Test work",
					begin: "2026-05-21T09:00:00",
				});

				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining("/timesheets"),
					expect.objectContaining({
						method: "POST",
						body: JSON.stringify({
							project: 1,
							activity: 1,
							description: "Test work",
							begin: "2026-05-21T09:00:00",
						}),
					}),
				);
			});
		});

		describe("PATCH requests", () => {
			it("should send JSON body for stopTimesheet", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ id: 1, end: "2026-05-21T17:00:00" }),
				});

				await api.stopTimesheet(1, "2026-05-21T17:00:00");

				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining("/timesheets/1"),
					expect.objectContaining({
						method: "PATCH",
						body: JSON.stringify({ end: "2026-05-21T17:00:00" }),
					}),
				);
			});
		});

		describe("query parameters", () => {
			it("should build query string for getTimesheets", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
				});

				await api.getTimesheets({
					project: 5,
					begin: "2026-05-01T00:00:00",
					end: "2026-05-31T23:59:59",
					state: "stopped",
				});

				const call = mockFetch.mock.calls[0];
				const url = call[0] as string;
				expect(url).toContain("project=5");
				expect(url).toContain("begin=2026-05-01");
				expect(url).toContain("end=2026-05-31");
				expect(url).toContain("state=1");
			});

			it("should handle active state specially", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
				});

				await api.getTimesheets({ state: "active" });

				const url = mockFetch.mock.calls[0][0] as string;
				expect(url).toContain("active=1");
				expect(url).not.toContain("state=");
			});

			it("should include full=true when requested", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve([]),
				});

				await api.getProjects(true);

				const url = mockFetch.mock.calls[0][0] as string;
				expect(url).toContain("full=true");
			});
		});
	});

		describe("redirect handling", () => {
			it("should throw KimaiApiError on 302 redirect and include redirect in message", async () => {
				mockFetch.mockResolvedValueOnce({
					status: 302,
					ok: false,
					statusText: "Found",
					headers: new Headers({ Location: "https://evil.example.com" }),
					json: async () => ({ message: "redirected" }),
				} as unknown as Response);

				try {
					await api.ping();
					throw new Error("Should have thrown KimaiApiError on 302");
				} catch (error) {
					expect(error).toBeInstanceOf(KimaiApiError);
					expect((error as KimaiApiError).statusCode).toBe(302);
					expect((error as KimaiApiError).message).toMatch(/redirect/i);
				}
			});

			it("should throw KimaiApiError on 301 permanent redirect", async () => {
				mockFetch.mockResolvedValueOnce({
					status: 301,
					ok: false,
					statusText: "Moved Permanently",
					headers: new Headers({ Location: "https://kimai.example.com/" }),
					json: async () => ({ message: "moved" }),
				} as unknown as Response);

				try {
					await api.ping();
					throw new Error("Should have thrown KimaiApiError on 301");
				} catch (error) {
					expect(error).toBeInstanceOf(KimaiApiError);
					expect((error as KimaiApiError).statusCode).toBe(301);
					expect((error as KimaiApiError).message).toMatch(/redirect/i);
				}
			});

			it("should pass redirect: manual to fetch to prevent credential leakage", async () => {
				// A successful 200 that also carries redirect: manual proves the option
				// is always set regardless of the response status.
				mockFetch.mockResolvedValueOnce({
					status: 200,
					ok: true,
					statusText: "OK",
					headers: new Headers(),
					json: async () => ({ message: "pong" }),
				} as unknown as Response);

				await api.ping();

				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining("/ping"),
					expect.objectContaining({
						redirect: "manual",
					}),
				);
			});

			it("should forward Authorization: Bearer header with every request", async () => {
				mockFetch.mockResolvedValueOnce({
					status: 200,
					ok: true,
					headers: new Headers(),
					json: async () => ({ message: "pong" }),
				} as unknown as Response);

				await api.ping();

				const call = mockFetch.mock.calls[0];
				const init = call[1] as RequestInit;
				expect(init.headers).toMatchObject({
					Authorization: "Bearer test-key-123",
				});
			});
		});

	describe("KimaiApiError", () => {
		it("should have correct name", () => {
			const error = new KimaiApiError(404, "Not found");
			expect(error.name).toBe("KimaiApiError");
		});

		it("should preserve error message", () => {
			const error = new KimaiApiError(500, "Server error");
			expect(error.message).toBe("Server error");
		});

		it("should have statusCode accessible", () => {
			const error = new KimaiApiError(403, "Forbidden");
			expect(error.statusCode).toBe(403);
		});

		it("should be instanceof Error", () => {
			const error = new KimaiApiError(401, "Unauthorized");
			expect(error).toBeInstanceOf(Error);
		});
	});
});
