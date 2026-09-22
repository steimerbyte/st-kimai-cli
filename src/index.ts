#!/usr/bin/env node

import { Command } from "commander";
import { loadAuthConfig, getConfigPath } from "./config.js";
import { loginWizard } from "./setup.js";
import { KimaiApi, KimaiApiError } from "./api.js";
import {
	printTimesheets,
	printProjects,
	printActivities,
	printCustomers,
	printTags,
	printTimesheetHeader,
	formatTimesheet,
	formatDuration,
	nowIso,
	parseDate,
	parseEndDate,
	getProjectName,
	getActivityName,
	formatDateTime,
	formatDate,
	formatTime,
	getEntityId,
	checkDayGap,
	getDatePart,
	getCalendarWeek,
	parseTimeRange,
	parseId,
	sanitizeError,
	styledHeader,
	styledRow,
	styledSuccess,
	styledError,
	styles,
	divider,
	LAYOUT,
} from "./utils.js";
import { createLoading, withLoading } from "./loading.js";
import type { Timesheet, ListTimesheetsOptions } from "./types.js";

const program = new Command();

// ─── TTY detection ─────────────────────────────────────────────────────────────

const useColor = process.stdout.isTTY;

// ─── Auth guard ───────────────────────────────────────────────────────────────

/**
 * Check auth config and exit with a clear message if not configured.
 * TTY-only commands (auth login) handle their own missing-config path.
 */
function requireAuth(): void {
	if (process.env.KIMAI_API_KEY) return;
	if (process.env.KIMAI_NO_SETUP === "1") return;
	if (getConfigPath() !== null) {
		try {
			loadAuthConfig();
		} catch {
			console.error("❌ auth not configured. Run: kimai-cli auth login");
			process.exit(1);
		}
		return;
	}
	// Also check KIMAI_URL + KIMAI_API_KEY combo
	const url = process.env.KIMAI_URL || process.env.KIMAI_API_URL;
	if (url && process.env.KIMAI_API_KEY) {
		try {
			loadAuthConfig();
		} catch {
			console.error("❌ auth not configured. Run: kimai-cli auth login");
			process.exit(1);
		}
		return;
	}
	console.error("❌ auth not configured. Run: kimai-cli auth login");
	process.exit(1);
}

// ─── Validation helpers ────────────────────────────────────────────────────────

function validateId(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function validateTimeRange(start: string, end: string): void {
	if (start >= end) {
		console.error(`❌ time range: start ${start} must be before end ${end}`);
		process.exit(1);
	}
}

/**
 * Parse DD.MM.YYYY date string. Returns ISO date string (YYYY-MM-DD) or null on error.
 */
function parseDmY(dateStr: string): string | null {
	const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
	if (!match) return null;
	const [, day, month, year] = match;
	const d = parseInt(day, 10);
	const m = parseInt(month, 10);
	const y = parseInt(year, 10);
	const parsed = new Date(y, m - 1, d);
	if (parsed.getDate() !== d || parsed.getMonth() !== m - 1 || parsed.getFullYear() !== y) return null;
	const today = new Date();
	const farFuture = new Date(today);
	farFuture.setFullYear(farFuture.getFullYear() + 1);
	if (parsed > farFuture || parsed < new Date(today.getFullYear() - 2, 0, 1)) return null;
	return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Resolve date: DD.MM.YYYY string, "today", or "YYYY-MM-DD".
 * Defaults to today's ISO date string.
 */
function resolveDate(dateStr?: string): string {
	if (!dateStr) return new Date().toISOString().split("T")[0]!;
	if (dateStr === "today") return new Date().toISOString().split("T")[0]!;
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
	const iso = parseDmY(dateStr);
	if (!iso) {
		console.error(`❌ date: invalid format "${dateStr}" (expected DD.MM.YYYY or YYYY-MM-DD)`);
		process.exit(1);
	}
	return iso;
}

// ─── Error handling ───────────────────────────────────────────────────────────

function handleError(error: unknown): never {
	if (error instanceof KimaiApiError) {
		console.error(`\n❌ API Error [${error.statusCode}] ${error.message}`);
	} else if (error instanceof Error) {
		console.error(`\n❌ Error: ${sanitizeError(error.message)}`);
	} else {
		console.error("\n❌ Unknown error");
	}
	process.exit(1);
}

// ─── API factory ───────────────────────────────────────────────────────────────

function createApi(): KimaiApi {
	const config = loadAuthConfig();
	return new KimaiApi(config);
}

// ─── Conflict detection ───────────────────────────────────────────────────────

/**
 * Check whether [begin, end] overlaps any entry in existing.
 * Returns the conflicting entry or null.
 */
function findOverlap(
	existing: Timesheet[],
	begin: string,
	end: string,
): Timesheet | null {
	const b = new Date(begin).getTime();
	const e = new Date(end).getTime();
	for (const ts of existing) {
		if (!ts.end) continue;
		const tb = new Date(ts.begin).getTime();
		const te = new Date(ts.end).getTime();
		// overlap: start < other_end AND end > other_start
		if (b < te && e > tb) return ts;
	}
	return null;
}

// ─── Global options (only these are global) ───────────────────────────────────

// ─── Global options ─────────────────────────────────────────────────────────────

program
	.name("kimai-cli")
	.description("Kimai CLI — time tracking from the command line")
	.option("--no-color", "Disable color output")
	.option("-c, --config <path>", "Path to auth.json config file");

// ─── Version ──────────────────────────────────────────────────────────────────

program.version("3.0.0");

// ─── Helper: box-style output for verbose list ────────────────────────────────

function printTimesheetsBox(timesheets: Timesheet[]): void {
	if (timesheets.length === 0) {
		console.log("No timesheets found.");
		return;
	}
	printTimesheetHeader();
	for (const ts of timesheets) {
		console.log(formatTimesheet(ts));
	}
	const totalDuration = timesheets.reduce((sum, ts) => sum + (ts.duration || 0), 0);
	console.log(`\nTotal: ${timesheets.length} entries, ${formatDuration(totalDuration)}`);
}

// ════════════════════════════════════════════════════════════════════════════════
// COMMANDS
// ════════════════════════════════════════════════════════════════════════════════

// ─── add ──────────────────────────────────────────────────────────────────────

program
	.command("add")
	.description("Add a completed timesheet entry")
	.requiredOption("-p, --project <id>", "Project ID", (v) => parseInt(v, 10))
	.requiredOption("-a, --activity <id>", "Activity ID", (v) => parseInt(v, 10))
	.option("-n, --description <text>", "Description / note")
	.option("-t, --time <range>", "Time range HH:MM-HH:MM", "09:00-17:00")
	.option("-d, --date <date>", "Date DD.MM.YYYY (default: today)")
	.option("-y, --yes", "Skip confirmation")
	.option("-f, --force", "Override conflict detection")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();

		// Parse time range
		const parsed = parseTimeRange(options.time);
		if (!parsed) {
			console.error(`❌ add: time range "${options.time}" is invalid (expected HH:MM-HH:MM)`);
			process.exit(1);
		}
		validateTimeRange(parsed.start, parsed.end);

		// Parse date
		const dateStr = resolveDate(options.date);
		const beginIso = `${dateStr}T${parsed.start}`;
		const endIso = `${dateStr}T${parsed.end}`;

		// Conflict detection (skip when force)
		if (!options.force) {
			loading.start("Checking for conflicts...");
			try {
				const api = createApi();
				const day = await api.getTimesheets({
					begin: `${dateStr}T00:00:00`,
					end: `${dateStr}T23:59:59`,
					size: 500,
				});
				const conflict = findOverlap(day, beginIso, endIso);
				if (conflict) {
					const cBegin = formatTime(conflict.begin);
					const cEnd = conflict.end ? formatTime(conflict.end) : "running";
					console.error(`❌ add: overlaps existing entry #${conflict.id} (${cBegin}-${cEnd}). Use --force to override.`);
					process.exit(1);
				}
			} catch (err) {
				loading.fail("Conflict check failed");
				handleError(err);
			}
		}

		// Confirmation
		if (!options.yes) {
			const readline = await import("readline");
			const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
			const note = options.description ? ` - "${options.description}"` : "";
			const answer = await new Promise<string>((resolve) => {
				rl.question(
					`Create timesheet (project #${options.project}, activity #${options.activity}${note})? [y/N] `,
					resolve,
				);
			});
			rl.close();
			if (answer.toLowerCase() !== "y") {
				console.log("Cancelled.");
				return;
			}
		}

		// Create
		try {
			const api = createApi();
			const timesheet = await withLoading("Creating timesheet...", () =>
				api.createTimesheet({
					project: options.project,
					activity: options.activity,
					description: options.description,
					begin: beginIso,
					end: endIso,
				}),
			);
			console.log(styledSuccess(`Timesheet #${timesheet.id} created`));
			console.log(`   Project: ${getProjectName(timesheet.project)}`);
			console.log(`   Activity: ${getActivityName(timesheet.activity)}`);
			if (timesheet.description) console.log(`   Note: ${timesheet.description}`);
			console.log(`   Time: ${formatTime(timesheet.begin)} - ${formatTime(timesheet.end)}`);
			console.log(`   Duration: ${formatDuration(timesheet.duration)}`);

			// Gap check
			const dayDate = getDatePart(timesheet.begin);
			if (dayDate) {
				loading.update("Checking for gaps...");
				const dayTs = await api.getTimesheets({ begin: `${dayDate}T00:00:00`, end: `${dayDate}T23:59:59`, size: 200 });
				const gapCheck = checkDayGap(dayTs);
				if (gapCheck.hasGap && gapCheck.gapMinutes) {
					const gs = gapCheck.gapStart?.split("T")[1]?.substring(0, 5) ?? "";
					const ge = gapCheck.gapEnd?.split("T")[1]?.substring(0, 5) ?? "";
					console.log(`\nℹ️  Gap detected: ${Math.round(gapCheck.gapMinutes)} min (${gs} - ${ge})`);
				}
			}
		} catch (err) {
			loading.fail("Failed to create timesheet");
			handleError(err);
		}
	});

// ─── edit ─────────────────────────────────────────────────────────────────────

program
	.command("edit <id>")
	.description("Edit a timesheet: description, time, project, activity")
	.option("-p, --project <id>", "New project ID", (v) => parseInt(v, 10))
	.option("-a, --activity <id>", "New activity ID", (v) => parseInt(v, 10))
	.option("-n, --description <text>", "Description / note")
	.option("-t, --time <range>", "Time range HH:MM-HH:MM")
	.option("-d, --date <date>", "Date DD.MM.YYYY")
	.option("-y, --yes", "Skip confirmation")
	.option("-f, --force", "Override conflict detection")
	.action(async (id: string, options) => {
		requireAuth();
		const loading = createLoading();

		const timesheetId = parseId(id, "Timesheet ID");

		// Fetch current entry
		loading.start("Fetching timesheet...");
		let api: KimaiApi;
		let current: Timesheet;
		try {
			api = createApi();
			const all = await api.getTimesheets({ size: 500 });
			current = all.find((t) => t.id === timesheetId)!;
			if (!current) {
				console.error(`❌ edit: timesheet #${id} not found`);
				process.exit(1);
			}
		} catch (err) {
			loading.fail("Failed to fetch timesheet");
			handleError(err);
		}

		// Build updates
		const updates: Record<string, unknown> = {};
		if (options.description !== undefined) updates.description = options.description;
		if (options.project !== undefined) updates.project = options.project;
		if (options.activity !== undefined) updates.activity = options.activity;

		// Parse time range if provided
		let newBegin: string | undefined;
		let newEnd: string | undefined;
		if (options.time) {
			const parsed = parseTimeRange(options.time);
			if (!parsed) {
				console.error(`❌ edit: time range "${options.time}" is invalid (expected HH:MM-HH:MM)`);
				process.exit(1);
			}
			validateTimeRange(parsed.start, parsed.end);
			const entryDate = resolveDate(options.date ?? current.begin.split("T")[0]);
			newBegin = `${entryDate}T${parsed.start}`;
			newEnd = `${entryDate}T${parsed.end}`;
			updates.begin = newBegin;
			updates.end = newEnd;
		}

		if (Object.keys(updates).length === 0) {
			console.error("❌ edit: no updates specified. Use -n, -t, -p, or -a");
			process.exit(1);
		}

		// Conflict detection
		if (!options.force && newBegin && newEnd) {
			loading.update("Checking for conflicts...");
			const dateStr = newBegin.split("T")[0]!;
			try {
				const day = await api!.getTimesheets({ begin: `${dateStr}T00:00:00`, end: `${dateStr}T23:59:59`, size: 500 });
				const conflict = findOverlap(day.filter((t) => t.id !== timesheetId), newBegin!, newEnd!);
				if (conflict) {
					const cBegin = formatTime(conflict.begin);
					const cEnd = conflict.end ? formatTime(conflict.end) : "running";
					console.error(`❌ edit: overlaps existing entry #${conflict.id} (${cBegin}-${cEnd}). Use --force to override.`);
					process.exit(1);
				}
			} catch (err) {
				loading.fail("Conflict check failed");
				handleError(err);
			}
		}

		// Confirmation
		if (!options.yes) {
			const readline = await import("readline");
			const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
			const answer = await new Promise<string>((resolve) => {
				rl.question(`Update timesheet #${id}? [y/N] `, resolve);
			});
			rl.close();
			if (answer.toLowerCase() !== "y") {
				console.log("Cancelled.");
				return;
			}
		}

		// Apply update
		try {
			const updated = await withLoading("Updating timesheet...", () =>
				api!.updateTimesheet(timesheetId, updates),
			);
			console.log(styledSuccess(`Timesheet #${id} updated`));
			console.log(`   Project: ${getProjectName(updated.project)}`);
			console.log(`   Activity: ${getActivityName(updated.activity)}`);
			console.log(`   Note: ${updated.description || "-"}`);
			console.log(`   Time: ${formatTime(updated.begin)} - ${formatTime(updated.end)}`);
			console.log(`   Duration: ${formatDuration(updated.duration)}`);
		} catch (err) {
			loading.fail("Failed to update timesheet");
			handleError(err);
		}
	});

// ─── remove ───────────────────────────────────────────────────────────────────

program
	.command("remove <id>")
	.description("Delete a timesheet by ID")
	.option("-y, --yes", "Skip confirmation")
	.action(async (id: string, options) => {
		requireAuth();
		const loading = createLoading();
		const timesheetId = parseId(id, "Timesheet ID");

		if (!options.yes) {
			const readline = await import("readline");
			const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
			const answer = await new Promise<string>((resolve) => {
				rl.question(`Delete timesheet #${id}? [y/N] `, resolve);
			});
			rl.close();
			if (answer.toLowerCase() !== "y") {
				console.log("Cancelled.");
				return;
			}
		}

		try {
			const api = createApi();
			await withLoading("Deleting timesheet...", () =>
				api.deleteTimesheet(timesheetId),
			);
			console.log(styledSuccess(`Timesheet #${id} deleted`));
		} catch (err) {
			loading.fail("Failed to delete timesheet");
			handleError(err);
		}
	});

// ─── show ─────────────────────────────────────────────────────────────────────

program
	.command("show <id>")
	.description("Show details of a specific timesheet")
	.option("--json", "Output as JSON")
	.action(async (id: string, options) => {
		requireAuth();
		const loading = createLoading();
		const timesheetId = parseId(id, "Timesheet ID");

		try {
			const api = createApi();
			loading.start("Fetching timesheet...");
			const all = await api.getTimesheets({ size: 500 });
			const ts = all.find((t) => t.id === timesheetId);
			if (!ts) {
				console.error(`❌ show: timesheet #${id} not found`);
				process.exit(1);
			}

			if (options.json) {
				console.log(JSON.stringify(ts, null, 2));
			} else {
				console.log(`Timesheet #${ts.id}`);
				console.log(divider());
				console.log(`Project:   ${getProjectName(ts.project)}`);
				console.log(`Activity:  ${getActivityName(ts.activity)}`);
				console.log(`Start:     ${formatDateTime(ts.begin)}`);
				console.log(`End:       ${formatDateTime(ts.end)}`);
				console.log(`Duration:  ${formatDuration(ts.duration)}`);
				if (ts.description) console.log(`Description: ${ts.description}`);
				if (ts.tags?.length) console.log(`Tags: ${ts.tags.join(", ")}`);
				console.log(`Billable: ${ts.billable ? "Yes" : "No"}`);
				console.log(`Exported: ${ts.exported ? "Yes" : "No"}`);
			}
		} catch (err) {
			loading.fail("Failed to fetch timesheet");
			handleError(err);
		}
	});

// ─── start ─────────────────────────────────────────────────────────────────────

program
	.command("start")
	.description("Start a running timesheet (timer)")
	.requiredOption("-p, --project <id>", "Project ID", (v) => parseInt(v, 10))
	.requiredOption("-a, --activity <id>", "Activity ID", (v) => parseInt(v, 10))
	.option("-n, --description <text>", "Description", "Working")
	.option("-y, --yes", "Skip confirmation")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();

		if (!options.yes) {
			const readline = await import("readline");
			const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
			const answer = await new Promise<string>((resolve) => {
				rl.question(
					`Start timesheet (project #${options.project}, activity #${options.activity})? [y/N] `,
					resolve,
				);
			});
			rl.close();
			if (answer.toLowerCase() !== "y") {
				console.log("Cancelled.");
				return;
			}
		}

		try {
			const api = createApi();
			const timesheet = await withLoading("Starting timesheet...", () =>
				api.createTimesheet({
					project: options.project,
					activity: options.activity,
					description: options.description,
					begin: nowIso(),
				}),
			);
			console.log(styledSuccess(`Timesheet #${timesheet.id} started`));
			console.log(`   Project: ${getProjectName(timesheet.project)}`);
			console.log(`   Activity: ${getActivityName(timesheet.activity)}`);
			if (timesheet.description) console.log(`   Description: ${timesheet.description}`);
			console.log(`   Started: ${formatDateTime(timesheet.begin)}`);
		} catch (err) {
			loading.fail("Failed to start timesheet");
			handleError(err);
		}
	});

// ─── stop ──────────────────────────────────────────────────────────────────────

program
	.command("stop")
	.description("Stop a running timesheet")
	.option("-y, --yes", "Skip confirmation")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();

		try {
			const api = createApi();
			loading.start("Finding active timesheets...");
			const active = await api.getActiveTimesheetsRaw();

			if (active.length === 0) {
				console.log("No running timesheet found.");
				return;
			}

			if (!options.yes) {
				const readline = await import("readline");
				const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
				const answer = await new Promise<string>((resolve) => {
					rl.question(
						`Stop ${active.length} active timesheet(s)? [y/N] `,
						resolve,
					);
				});
				rl.close();
				if (answer.toLowerCase() !== "y") {
					console.log("Cancelled.");
					return;
				}
			}

			for (const ts of active) {
				const stopped = await withLoading(`Stopping #${ts.id}...`, () =>
					api.stopTimesheet(ts.id, nowIso()),
				);
				console.log(styledSuccess(`Stopped #${ts.id} (${formatDuration(stopped.duration)})`));
			}
		} catch (err) {
			loading.fail("Failed to stop timesheet");
			handleError(err);
		}
	});

// ─── list ─────────────────────────────────────────────────────────────────────

program
	.command("list")
	.alias("ls")
	.description("List timesheets with optional filters")
	.option("--today", "Show today's entries")
	.option("--week", "Show current week's entries")
	.option("--month", "Show current month's entries")
	.option("--from <date>", "Start date DD.MM.YYYY or YYYY-MM-DD")
	.option("--to <date>", "End date DD.MM.YYYY or YYYY-MM-DD")
	.option("--project <id>", "Filter by project ID", (v) => parseInt(v, 10))
	.option("--query <text>", "Search in descriptions")
	.option("--json", "Output as JSON")
	.option("--csv", "Output as CSV")
	.option("--verbose", "Show boxed output style")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();

		// Date range
		let begin: string | undefined;
		let end: string | undefined;

		if (options.today) {
			const today = new Date().toISOString().split("T")[0]!;
			begin = `${today}T00:00:00`;
			end = `${today}T23:59:59`;
		} else if (options.week) {
			const now = new Date();
			const dow = now.getDay();
			const monday = new Date(now);
			monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
			const sunday = new Date(monday);
			sunday.setDate(monday.getDate() + 6);
			begin = `${monday.toISOString().split("T")[0]}T00:00:00`;
			end = `${sunday.toISOString().split("T")[0]}T23:59:59`;
		} else if (options.month) {
			const now = new Date();
			const year = now.getFullYear();
			const month = now.getMonth();
			const lastDay = new Date(year, month + 1, 0).getDate();
			begin = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00`;
			end = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}T23:59:59`;
		} else {
			if (options.from) begin = `${resolveDate(options.from)}T00:00:00`;
			if (options.to) end = `${resolveDate(options.to)}T23:59:59`;
		}

		const listOptions: ListTimesheetsOptions = {
			begin,
			end,
			size: 500,
		};
		if (options.project) listOptions.project = options.project;

		try {
			const api = createApi();
			let timesheets = await withLoading("Fetching timesheets...", () =>
				api.getTimesheets(listOptions),
			);

			// Client-side query filter
			if (options.query) {
				const q = options.query.toLowerCase();
				timesheets = timesheets.filter(
					(ts) => ts.description?.toLowerCase().includes(q),
				);
			}

			if (options.csv) {
				console.log("id,project,activity,begin,end,duration,description");
				for (const ts of timesheets) {
					const proj = getProjectName(ts.project);
					const act = getActivityName(ts.activity);
					const desc = (ts.description || "").replace(/"/g, '""');
					const dur = ts.duration ?? 0;
					console.log(
						`${ts.id},"${proj}","${act}",${ts.begin},${ts.end ?? ""},${dur},"${desc}"`,
					);
				}
				return;
			}

			if (options.json) {
				console.log(JSON.stringify(timesheets, null, 2));
				return;
			}

			if (options.verbose) {
				printTimesheetsBox(timesheets);
			} else {
				printTimesheets(timesheets);
				if (timesheets.length > 0) {
					const totalDuration = timesheets.reduce(
						(sum, ts) => sum + (ts.duration || 0),
						0,
					);
					console.log(`\nTotal: ${timesheets.length} entries, ${formatDuration(totalDuration)}`);
				}
			}
		} catch (err) {
			loading.fail("Failed to fetch timesheets");
			handleError(err);
		}
	});

// ─── projects ─────────────────────────────────────────────────────────────────

program
	.command("projects")
	.description("List all projects")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();
		try {
			const api = createApi();
			const projects = await withLoading("Fetching projects...", () =>
				api.getProjects(),
			);
			if (options.json) {
				console.log(JSON.stringify(projects, null, 2));
			} else {
				printProjects(projects);
				console.log(`\nTotal: ${projects.length} projects`);
			}
		} catch (err) {
			loading.fail("Failed to fetch projects");
			handleError(err);
		}
	});

// ─── project ───────────────────────────────────────────────────────────────────

program
	.command("project <id>")
	.description("Show details of a specific project")
	.option("--json", "Output as JSON")
	.action(async (id: string, options) => {
		requireAuth();
		const loading = createLoading();
		const projectId = parseId(id, "Project ID");
		try {
			const api = createApi();
			const projects = await withLoading("Fetching project...", () =>
				api.getProjects(true),
			);
			const project = projects.find((p) => p.id === projectId);
			if (!project) {
				console.error(`❌ project: project #${id} not found`);
				process.exit(1);
			}
			if (options.json) {
				console.log(JSON.stringify(project, null, 2));
			} else {
				console.log(`Project #${project.id}: ${project.name}`);
				console.log(divider());
				if (typeof project.customer !== "number" && project.customer) {
					console.log(`Customer: ${project.customer.name}`);
				} else if (typeof project.customer === "number") {
					console.log(`Customer ID: #${project.customer}`);
				}
				console.log(`Visible: ${project.visible ? "Yes" : "No"}`);
				console.log(`Billable: ${project.billable ? "Yes" : "No"}`);
				if (project.start) console.log(`Start: ${project.start}`);
				if (project.end) console.log(`End: ${project.end}`);
				if (project.comment) console.log(`Comment: ${project.comment}`);
			}
		} catch (err) {
			loading.fail("Failed to fetch project");
			handleError(err);
		}
	});

// ─── activities ────────────────────────────────────────────────────────────────

program
	.command("activities")
	.description("List activities, optionally filtered by project")
	.option("-P, --project <id>", "Show only activities for this project", (v) =>
		parseInt(v, 10),
	)
	.option("--json", "Output as JSON")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();
		try {
			const api = createApi();
			let activities = await withLoading("Fetching activities...", () =>
				api.getActivities(true),
			);
			if (options.project) {
				activities = activities.filter((a) => {
					if (a.project === null) return true;
					if (typeof a.project === "number") return a.project === options.project;
					return a.project.id === options.project;
				});
			}
			if (options.json) {
				console.log(JSON.stringify(activities, null, 2));
			} else {
				printActivities(activities);
				console.log(`\nTotal: ${activities.length} activities`);
			}
		} catch (err) {
			loading.fail("Failed to fetch activities");
			handleError(err);
		}
	});

// ─── activity ─────────────────────────────────────────────────────────────────

program
	.command("activity <id>")
	.description("Show details of a specific activity")
	.option("--json", "Output as JSON")
	.action(async (id: string, options) => {
		requireAuth();
		const loading = createLoading();
		const activityId = parseId(id, "Activity ID");
		try {
			const api = createApi();
			const activities = await withLoading("Fetching activity...", () =>
				api.getActivities(true),
			);
			const activity = activities.find((a) => a.id === activityId);
			if (!activity) {
				console.error(`❌ activity: activity #${id} not found`);
				process.exit(1);
			}
			if (options.json) {
				console.log(JSON.stringify(activity, null, 2));
			} else {
				console.log(`Activity #${activity.id}: ${activity.name}`);
				console.log(divider());
				console.log(`Visible: ${activity.visible ? "Yes" : "No"}`);
				console.log(`Billable: ${activity.billable ? "Yes" : "No"}`);
				if (activity.project && typeof activity.project !== "number") {
					console.log(`Project: ${activity.project.name}`);
				}
				if (activity.comment) console.log(`Comment: ${activity.comment}`);
			}
		} catch (err) {
			loading.fail("Failed to fetch activity");
			handleError(err);
		}
	});

// ─── customers ────────────────────────────────────────────────────────────────

program
	.command("customers")
	.description("List all customers")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();
		try {
			const api = createApi();
			const customers = await withLoading("Fetching customers...", () =>
				api.getCustomers(),
			);
			if (options.json) {
				console.log(JSON.stringify(customers, null, 2));
			} else {
				printCustomers(customers);
				console.log(`\nTotal: ${customers.length} customers`);
			}
		} catch (err) {
			loading.fail("Failed to fetch customers");
			handleError(err);
		}
	});

// ─── tags ─────────────────────────────────────────────────────────────────────

program
	.command("tags")
	.description("List all tags")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();
		try {
			const api = createApi();
			const tags = await withLoading("Fetching tags...", () =>
				api.getTags(),
			);
			if (options.json) {
				console.log(JSON.stringify(tags, null, 2));
			} else {
				printTags(tags);
				console.log(`\nTotal: ${tags.length} tags`);
			}
		} catch (err) {
			loading.fail("Failed to fetch tags");
			handleError(err);
		}
	});

// ─── duplicate ───────────────────────────────────────────────────────────────

program
	.command("duplicate <id>")
	.description("Duplicate a timesheet entry (default: +1 day)")
	.option("-d, --date <date>", "Target date DD.MM.YYYY (default: +1 day from original)")
	.option("-y, --yes", "Skip confirmation")
	.action(async (id: string, options) => {
		requireAuth();
		const loading = createLoading();
		const sourceId = parseId(id, "Timesheet ID");

		try {
			const api = createApi();
			loading.start("Finding source timesheet...");
			const all = await api.getTimesheets({ size: 1000 });
			const source = all.find((t) => t.id === sourceId);
			if (!source) {
				console.error(`❌ duplicate: timesheet #${id} not found`);
				process.exit(1);
			}

			const projectId = getEntityId(source.project);
			const activityId = getEntityId(source.activity);
			if (projectId === null || activityId === null) {
				console.error("❌ duplicate: could not determine project/activity");
				process.exit(1);
			}

			// Compute target date
			let targetDate: Date;
			if (options.date) {
				const iso = parseDmY(options.date) ?? options.date;
				targetDate = new Date(iso + "T00:00:00");
				if (isNaN(targetDate.getTime())) {
					console.error(`❌ duplicate: invalid date "${options.date}"`);
					process.exit(1);
				}
			} else {
				const sourceDate = new Date(source.begin);
				targetDate = new Date(sourceDate);
				targetDate.setDate(targetDate.getDate() + 1);
			}

			const timePart = source.begin.split("T")[1]?.substring(0, 8) ?? "08:00:00";
			const endTimePart =
				(source.end || source.begin).split("T")[1]?.substring(0, 8) ?? "16:30:00";
			const targetDateStr = targetDate.toISOString().split("T")[0]!;
			const newBegin = `${targetDateStr}T${timePart}`;
			const newEnd = `${targetDateStr}T${endTimePart}`;

			if (!options.yes) {
				const readline = await import("readline");
				const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
				const answer = await new Promise<string>((resolve) => {
					rl.question(
						`Duplicate #${id} to ${formatDate(newBegin)}? [y/N] `,
						resolve,
					);
				});
				rl.close();
				if (answer.toLowerCase() !== "y") {
					console.log("Cancelled.");
					return;
				}
			}

			const created = await withLoading("Duplicating timesheet...", () =>
				api.createTimesheet({
					project: projectId,
					activity: activityId,
					description: source.description || "",
					begin: newBegin,
					end: newEnd,
				}),
			);
			console.log(styledSuccess(`Timesheet #${created.id} created (duplicate of #${source.id})`));
			console.log(`   ${formatDateTime(created.begin)} - ${formatTime(created.end)}`);
		} catch (err) {
			loading.fail("Failed to duplicate timesheet");
			handleError(err);
		}
	});

// ─── suggest ─────────────────────────────────────────────────────────────────

program
	.command("suggest")
	.description("Show available projects and activities for quick reference")
	.option("-p, --project <id>", "Show only activities for this project", (v) =>
		parseInt(v, 10),
	)
	.option("--json", "Output as JSON")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();
		try {
			const api = createApi();
			const [projects, activities] = await withLoading("Fetching data...", () =>
				Promise.all([api.getProjects(), api.getActivities()]),
			);

			if (options.json) {
				console.log(JSON.stringify({ projects, activities }, null, 2));
				return;
			}

			console.log(styledHeader("Projects"));
			console.log("");
			printProjects(projects);

			let filteredActivities = activities;
			if (options.project) {
				filteredActivities = activities.filter((a) => {
					if (a.project === null) return true;
					if (typeof a.project === "number") return a.project === options.project;
					return a.project.id === options.project;
				});
			}

			console.log("");
			console.log(styledHeader("Activities"));
			console.log("");
			printActivities(filteredActivities);
		} catch (err) {
			loading.fail("Failed to fetch suggestions");
			handleError(err);
		}
	});

// ─── whoami ───────────────────────────────────────────────────────────────────

program
	.command("whoami")
	.description("Show the authenticated user")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		requireAuth();
		const loading = createLoading();
		try {
			const api = createApi();
			const users = await withLoading("Fetching user info...", () =>
				api.getUsers(),
			);
			// First user is typically the authenticated one
			const user = users[0];
			if (!user) {
				console.error("❌ whoami: no user information available");
				process.exit(1);
			}
			if (options.json) {
				console.log(JSON.stringify(user, null, 2));
			} else {
				console.log(`Username: ${user.username}`);
				if (user.alias) console.log(`Alias: ${user.alias}`);
				console.log(`Email: ${user.email}`);
				if (user.title) console.log(`Title: ${user.title}`);
				console.log(`Language: ${user.language}`);
				console.log(`Timezone: ${user.timezone}`);
				console.log(`Enabled: ${user.enabled ? "Yes" : "No"}`);
			}
		} catch (err) {
			loading.fail("Failed to fetch user info");
			handleError(err);
		}
	});

// ─── config ──────────────────────────────────────────────────────────────────

program
	.command("config")
	.description("Show current auth configuration")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const cfg = loadAuthConfig();
			if (options.json) {
				console.log(JSON.stringify({ url: cfg.url, apiKey: cfg.apiKey ? "***" : "" }, null, 2));
			} else {
				console.log(`URL: ${cfg.url}`);
				console.log(`API key: ${cfg.apiKey ? cfg.apiKey.substring(0, 4) + "..." : "(not set)"}`);
			}
		} catch (err) {
			if (err instanceof Error && err.message.includes("No auth.json")) {
				console.error("❌ auth not configured. Run: kimai-cli auth login");
				process.exit(1);
			}
			handleError(err);
		}
	});

// ─── auth (group) ─────────────────────────────────────────────────────────────

const authCmd = program
	.command("auth")
	.description("Authentication management");

authCmd
	.command("login")
	.description("Configure credentials interactively (TTY required)")
	.action(async () => {
		// TTY guard
		if (!process.stdin.isTTY || !process.stdout.isTTY) {
			console.error("❌ auth login: must be run interactively in a terminal");
			process.exit(1);
		}
		try {
			await loginWizard();
		} catch (err) {
			console.error(`❌ auth login failed: ${err instanceof Error ? err.message : String(err)}`);
			process.exit(1);
		}
	});

authCmd
	.command("logout")
	.description("Remove stored credentials")
	.option("-y, --yes", "Skip confirmation")
	.action(async (options) => {
		const { homedir } = await import("os");
		const { existsSync, unlinkSync } = await import("fs");
		const path = await import("path");
		const authPath = path.join(homedir(), ".kimai-cli", "auth.json");

		if (!options.yes) {
			const readline = await import("readline");
			const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
			const answer = await new Promise<string>((resolve) => {
				rl.question(`Remove ${authPath}? [y/N] `, resolve);
			});
			rl.close();
			if (answer.toLowerCase() !== "y") {
				console.log("Cancelled.");
				return;
			}
		}

		if (existsSync(authPath)) {
			unlinkSync(authPath);
			console.log(styledSuccess(`Removed ${authPath}`));
		} else {
			console.log("No credentials file found.");
		}
	});

// ─── help ─────────────────────────────────────────────────────────────────────

program
	.command("help [cmd]")
	.description("Show help for a command or list all commands")
	.action(async (cmd: string | undefined) => {
		if (cmd) {
			const sub = program.commands.find((c) => c.name() === cmd);
			if (!sub) {
				console.error(`unknown command '${cmd}'. Run: kimai-cli help`);
				process.exit(1);
			}
			console.log(sub.helpInformation());
		} else {
			program.help();
		}
	});

// ─── Unknown subcommand ────────────────────────────────────────────────────────

program.action(() => {
	program.help();
});

// ─── Parse ────────────────────────────────────────────────────────────────────

program.exitOverride((err) => {
	if (err) {
		if (err.code === "commander.missingArgument") {
			console.error(`❌ missing argument: ${err.message}`);
		} else if (err.code === "commander.unknownOption") {
			console.error(`❌ unknown option: ${err.message}`);
		} else if (err.code === "commander.unknownCommand") {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const unknown = (err as unknown as { commandName?: () => string }).commandName?.() ?? "";
			console.error(unknown ? `unknown command '${unknown}'. Run: kimai-cli help` : `unknown command. Run: kimai-cli help`);
		} else {
			console.error(`❌ ${err.message}`);
		}
	}
	process.exit(1);
});

if (!process.env.KIMAI_SKIP_PARSE) {
	program.parse();
}

export { program };
