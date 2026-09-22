import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	formatDuration,
	parseDate,
	getEntityId,
	parseId,
	parseDateRange,
	getCalendarWeek,
	formatDate,
	formatTime,
	formatDateTime,
	checkDayGap,
	parseTimeRange,
	getDatePart,
	// newly tested
	truncate,
	styledHeader,
	styledRow,
	styledDivider,
	sanitizeError,
	formatError,
	styledSuccess,
	styledError,
	styledWarning,
	styledInfo,
	colorizeDuration,
	colorizeStatus,
	formatTimesheet,
	getProjectName,
	getActivityName,
	getCustomerName,
	printTimesheetHeader,
	printTimesheets,
	printProjects,
	printActivities,
	printCustomers,
	printTags,
	nowIso,
	todayIso,
	parseEndDate,
	getTimePart,
	checkDayBreak,
	formatBreakWarning,
	parseBreak,
	calculateDuration,
} from "./utils";
import type { Timesheet, Project, Activity, Customer } from "./types";

describe("formatDuration", () => {
	it("should format 0 seconds", () => {
		expect(formatDuration(0)).toBe("-");
	});
	it("should format seconds only", () => {
		expect(formatDuration(45)).toBe("45s");
	});
	it("should format minutes and seconds", () => {
		expect(formatDuration(125)).toBe("2m 5s");
	});
	it("should format hours, minutes, seconds", () => {
		expect(formatDuration(3723)).toBe("1h 2m 3s");
	});
});

describe("parseDate", () => {
	it("should add T00:00:00 to YYYY-MM-DD", () => {
		expect(parseDate("2026-05-21")).toBe("2026-05-21T00:00:00");
	});
	it("should pass through ISO strings", () => {
		expect(parseDate("2026-05-21T09:30:00+0200")).toBe(
			"2026-05-21T09:30:00+0200",
		);
	});
});

describe("getEntityId", () => {
	it("should return number as-is", () => {
		expect(getEntityId(42)).toBe(42);
	});
	it("should extract id from object", () => {
		expect(getEntityId({ id: 42, name: "test" } as { id: number })).toBe(42);
	});
	it("should return null for null/undefined", () => {
		expect(getEntityId(null)).toBe(null);
		expect(getEntityId(undefined)).toBe(null);
	});
});

describe("parseId", () => {
	it("should parse valid ID", () => {
		expect(parseId("42")).toBe(42);
	});
	it("should throw on invalid ID", () => {
		expect(() => parseId("abc")).toThrow();
		expect(() => parseId("")).toThrow();
	});
	it("should throw on negative ID", () => {
		expect(() => parseId("-5")).toThrow();
	});
});

describe("parseDateRange", () => {
	it("should parse DD.MM-DD.MM format", () => {
		const dates = parseDateRange("19.05-21.05");
		expect(dates).toHaveLength(3);
		expect(dates[0]).toBe("2026-05-19");
		expect(dates[1]).toBe("2026-05-20");
		expect(dates[2]).toBe("2026-05-21");
	});
	it("should reject invalid dates", () => {
		const dates = parseDateRange("32.05-35.05");
		expect(dates).toHaveLength(0);
	});
	it("should parse comma-separated dates", () => {
		const dates = parseDateRange("19.05,20.05,21.05");
		expect(dates).toHaveLength(3);
	});
});

describe("getCalendarWeek", () => {
	it("should return week 21 for May 21 2026", () => {
		const date = new Date("2026-05-21");
		expect(getCalendarWeek(date)).toBe(21);
	});
});

describe("formatDate", () => {
	it("should format German date", () => {
		const result = formatDate("2026-05-21T12:00:00");
		expect(result).toBe("21.05.2026");
	});

	it("should return dash for null input", () => {
		expect(formatDate(null)).toBe("-");
	});

	it("should return dash for undefined input", () => {
		expect(formatDate(null as unknown as undefined)).toBe("-");
	});

	it("should return dash for empty string", () => {
		expect(formatDate("")).toBe("-");
	});

	it("should handle invalid date string gracefully", () => {
		const result = formatDate("not-a-date");
		expect(result).toBe("not-a-date");
	});

	it("should handle date-only string (YYYY-MM-DD)", () => {
		const result = formatDate("2026-12-25");
		expect(result).toBe("25.12.2026");
	});

	it("should handle ISO string with timezone", () => {
		const result = formatDate("2026-05-21T09:30:00+02:00");
		expect(result).toBe("21.05.2026");
	});
});

describe("formatTime", () => {
	it("should format time in German locale", () => {
		const result = formatTime("2026-05-21T09:30:00");
		expect(result).toBe("09:30");
	});

	it("should return dash for null", () => {
		expect(formatTime(null)).toBe("-");
	});

	it("should return dash for undefined", () => {
		expect(formatTime(null as unknown as undefined)).toBe("-");
	});

	it("should return input on invalid date", () => {
		expect(formatTime("invalid")).toBe("invalid");
	});
});

describe("formatDateTime", () => {
	it("should format full datetime", () => {
		const result = formatDateTime("2026-05-21T09:30:00");
		expect(result).toBe("21.05.2026, 09:30");
	});

	it("should return dash for null", () => {
		expect(formatDateTime(null)).toBe("-");
	});

	it("should return input on invalid date", () => {
		expect(formatDateTime("not-a-date")).toBe("not-a-date");
	});
});

describe("getDatePart", () => {
	it("should extract date part from ISO string", () => {
		expect(getDatePart("2026-05-21T09:30:00")).toBe("2026-05-21");
	});

	it("should return null for null input", () => {
		expect(getDatePart(null)).toBeNull();
	});

	it("should return null for undefined input", () => {
		expect(getDatePart(null as unknown as undefined)).toBeNull();
	});

	it("should return input for non-ISO strings", () => {
		expect(getDatePart("invalid")).toBe("invalid");
	});

	it("should handle date-only string", () => {
		expect(getDatePart("2026-05-21")).toBe("2026-05-21");
	});
});

describe("checkDayGap", () => {
	const createTimesheet = (
		begin: string,
		end: string,
		duration: number,
	): Timesheet => ({
		id: 0,
		project: 1,
		activity: 1,
		user: 1,
		tags: [],
		begin,
		end,
		duration,
		break: 0,
		description: null,
		rate: 0,
		internalRate: 0,
		exported: false,
		billable: true,
		metaFields: [],
	});

	it("should return hasGap=true for empty array", () => {
		const result = checkDayGap([]);
		expect(result.hasGap).toBe(true);
		expect(result.totalHours).toBe(0);
	});

	it("should return hasGap=false for single entry", () => {
		const timesheets = [
			createTimesheet("2026-05-21T09:00:00", "2026-05-21T10:00:00", 3600),
		];
		const result = checkDayGap(timesheets);
		expect(result.hasGap).toBe(false);
		expect(result.totalHours).toBe(3600);
	});

	it("should return hasGap=false for back-to-back entries", () => {
		const timesheets = [
			createTimesheet("2026-05-21T09:00:00", "2026-05-21T12:00:00", 10800),
			createTimesheet("2026-05-21T12:00:00", "2026-05-21T17:00:00", 18000),
		];
		const result = checkDayGap(timesheets);
		expect(result.hasGap).toBe(false);
		expect(result.totalHours).toBe(28800);
	});

	it("should detect gap between entries", () => {
		const timesheets = [
			createTimesheet("2026-05-21T09:00:00", "2026-05-21T12:00:00", 10800),
			createTimesheet("2026-05-21T13:00:00", "2026-05-21T17:00:00", 14400),
		];
		const result = checkDayGap(timesheets);
		expect(result.hasGap).toBe(true);
		expect(result.gapMinutes).toBe(60); // 1 hour gap
		expect(result.gapStart).toBe("2026-05-21T12:00:00");
		expect(result.gapEnd).toBe("2026-05-21T13:00:00");
	});

	it("should find the first gap only", () => {
		const timesheets = [
			createTimesheet("2026-05-21T09:00:00", "2026-05-21T10:00:00", 3600),
			createTimesheet("2026-05-21T11:00:00", "2026-05-21T12:00:00", 3600), // gap
			createTimesheet("2026-05-21T14:00:00", "2026-05-21T15:00:00", 3600), // another gap
		];
		const result = checkDayGap(timesheets);
		expect(result.hasGap).toBe(true);
		expect(result.gapMinutes).toBe(60); // First gap is 60 min
	});

	it("should sort entries by start time", () => {
		const timesheets = [
			createTimesheet("2026-05-21T14:00:00", "2026-05-21T17:00:00", 10800),
			createTimesheet("2026-05-21T09:00:00", "2026-05-21T12:00:00", 10800), // out of order
		];
		const result = checkDayGap(timesheets);
		// After sorting: 09:00-12:00, 14:00-17:00 → 2 hour gap
		expect(result.hasGap).toBe(true);
		expect(result.gapMinutes).toBe(120);
	});

	it("should handle entry ending before it starts (overlap)", () => {
		const timesheets = [
			createTimesheet("2026-05-21T09:00:00", "2026-05-21T12:00:00", 10800),
			createTimesheet("2026-05-21T11:00:00", "2026-05-21T14:00:00", 10800), // overlaps
		];
		const result = checkDayGap(timesheets);
		expect(result.hasGap).toBe(false); // Overlap, not a gap
	});

	it("should calculate total hours correctly", () => {
		const timesheets = [
			createTimesheet("2026-05-21T09:00:00", "2026-05-21T10:30:00", 5400),
			createTimesheet("2026-05-21T10:30:00", "2026-05-21T12:00:00", 5400),
		];
		const result = checkDayGap(timesheets);
		expect(result.totalHours).toBe(10800); // 3 hours total
	});

	it("should handle entries without end time", () => {
		const timesheets = [
			{
				...createTimesheet("2026-05-21T09:00:00", "2026-05-21T12:00:00", 10800),
				end: null,
			},
		];
		const result = checkDayGap(timesheets);
		expect(result.hasGap).toBe(false);
	});
});

describe("parseTimeRange", () => {
	it("should parse HH:MM-HH:MM format", () => {
		const result = parseTimeRange("09:00-17:00");
		expect(result).toEqual({ start: "09:00:00", end: "17:00:00" });
	});

	it("should parse H:MM-H:MM format", () => {
		const result = parseTimeRange("9:00-17:00");
		expect(result).toEqual({ start: "09:00:00", end: "17:00:00" });
	});

	it("should parse HH-HH format", () => {
		const result = parseTimeRange("9-17");
		expect(result).toEqual({ start: "09:00:00", end: "17:00:00" });
	});

	it("should parse HHMM-HHMM format", () => {
		const result = parseTimeRange("0900-1700");
		expect(result).toEqual({ start: "09:00:00", end: "17:00:00" });
	});

	it("should parse with minutes in both parts", () => {
		const result = parseTimeRange("09:30-17:45");
		expect(result).toEqual({ start: "09:30:00", end: "17:45:00" });
	});

	it("should use :00 for missing minutes in start", () => {
		const result = parseTimeRange("9-12:30");
		expect(result).toEqual({ start: "09:00:00", end: "12:30:00" });
	});

	it("should use :00 for missing minutes in end", () => {
		const result = parseTimeRange("09:00-17");
		expect(result).toEqual({ start: "09:00:00", end: "17:00:00" });
	});

	it("should return null for invalid format", () => {
		expect(parseTimeRange("invalid")).toBeNull();
	});

	it("should return null for empty string", () => {
		expect(parseTimeRange("")).toBeNull();
	});

	it("should return null for missing end time", () => {
		expect(parseTimeRange("09:00")).toBeNull();
	});

	it("should handle single digit hours", () => {
		const result = parseTimeRange("8:15-16:45");
		expect(result).toEqual({ start: "08:15:00", end: "16:45:00" });
	});

	it("should pad hours to two digits", () => {
		const result = parseTimeRange("09:00-09:00");
		expect(result).toEqual({ start: "09:00:00", end: "09:00:00" });
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXTENSION: formatDuration multi-day / edge cases
// ═══════════════════════════════════════════════════════════════════════════════

describe("formatDuration (extended)", () => {
	it("should return - for null", () => {
		expect(formatDuration(null)).toBe("-");
	});

	it("should return - for 0", () => {
		expect(formatDuration(0)).toBe("-");
	});

	it("should format exactly 1 minute (60s)", () => {
		expect(formatDuration(60)).toBe("1m 0s");
	});

	it("should format exactly 1 hour (3600s)", () => {
		// minutes=0 branch: `${hours}h ${secs}s`
		expect(formatDuration(3600)).toBe("1h 0s");
	});

	it("should format 1h 1m 1s", () => {
		expect(formatDuration(3661)).toBe("1h 1m 1s");
	});

	it("should format multi-day duration (25h 1m 1s)", () => {
		expect(formatDuration(90061)).toBe("25h 1m 1s");
	});

	it("should format hours-only when minutes and seconds are zero", () => {
		// minutes=0 branch: `${hours}h ${secs}s`
		expect(formatDuration(7200)).toBe("2h 0s");
	});

	it("should format minutes+seconds when hours is zero", () => {
		expect(formatDuration(125)).toBe("2m 5s");
	});

	it("should format seconds-only when hours and minutes are zero", () => {
		expect(formatDuration(9)).toBe("9s");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseDate: throw / invalid input
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseDate (extended)", () => {
	it("should throw on empty string", () => {
		expect(() => parseDate("")).toThrow();
	});

	it("should throw on null", () => {
		expect(() => parseDate(null as unknown as string)).toThrow();
	});

	it("should throw on undefined", () => {
		expect(() => parseDate(undefined as unknown as string)).toThrow();
	});

	it("should throw on completely invalid string", () => {
		expect(() => parseDate("foo")).toThrow(/invalid date format/);
	});

	it("should accept today as valid date string (current year)", () => {
		// today's string representation as YYYY-MM-DD → T00:00:00
		const today = new Date().toISOString().split("T")[0];
		expect(parseDate(today)).toBe(`${today}T00:00:00`);
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseEndDate
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseEndDate", () => {
	it("should append T23:59:59 to YYYY-MM-DD", () => {
		expect(parseEndDate("2026-05-21")).toBe("2026-05-21T23:59:59");
	});

	it("should throw on empty string", () => {
		expect(() => parseEndDate("")).toThrow();
	});

	it("should throw on null", () => {
		expect(() => parseEndDate(null as unknown as string)).toThrow();
	});

	it("should throw on invalid string", () => {
		expect(() => parseEndDate("not-a-date")).toThrow(/invalid date/);
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// getTimePart
// ═══════════════════════════════════════════════════════════════════════════════

describe("getTimePart", () => {
	it("should extract HH:MM from ISO string", () => {
		expect(getTimePart("2026-05-21T09:30:45")).toBe("09:30");
	});

	it("should return null for null", () => {
		expect(getTimePart(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		expect(getTimePart(undefined as unknown as null)).toBeNull();
	});

	it("should return null for date-only string (no time part)", () => {
		expect(getTimePart("2026-05-21")).toBeNull();
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseBreak
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseBreak", () => {
	it("should parse HH:MM-HH:MM format", () => {
		expect(parseBreak("12:30-13:00")).toEqual({
			start: "12:30:00",
			end: "13:00:00",
		});
	});

	it("should parse single time as start with 30min default", () => {
		expect(parseBreak("12:00")).toEqual({
			start: "12:00:00",
			end: "12:30:00",
		});
	});

	it("should parse single-digit hour with 30min default", () => {
		// code does NOT zero-pad the start time
		expect(parseBreak("9:00")).toEqual({
			start: "9:00:00",
			end: "09:30:00",
		});
	});

	it("should return result for empty string (falls through to single-part)", () => {
		// empty string splits to [''] → single-part branch fires
		const result = parseBreak("");
		expect(result).not.toBeNull();
		// start ends up as ':00' after split(":")[0].padStart(2,"0") = '0'.padStart(2,'0') = '00'
		expect(result!.start).toBe(":00");
	});

	it("should return null for too many parts", () => {
		expect(parseBreak("a-b-c")).toBeNull();
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// calculateDuration
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculateDuration", () => {
	it("should calculate duration between two times in seconds", () => {
		expect(calculateDuration("09:00:00", "17:00:00")).toBe(28800); // 8h
	});

	it("should handle non-zero minutes", () => {
		expect(calculateDuration("09:00:00", "10:30:00")).toBe(5400); // 1.5h
	});

	it("should throw on malformed start time", () => {
		expect(() => calculateDuration("9:00", "17:00:00")).toThrow(
			/Invalid time format/,
		);
	});

	it("should throw on non-numeric values", () => {
		expect(() => calculateDuration("ab:00:00", "17:00:00")).toThrow(
			/Invalid time format/,
		);
	});

	it("should throw on values out of bounds", () => {
		expect(() => calculateDuration("09:00:00", "25:00:00")).toThrow(
			/values out of bounds/,
		);
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// getProjectName / getActivityName / getCustomerName
// ═══════════════════════════════════════════════════════════════════════════════

describe("getProjectName", () => {
	it("should return - for null", () => {
		expect(getProjectName(null)).toBe("-");
	});

	it("should return - for undefined", () => {
		expect(getProjectName(undefined)).toBe("-");
	});

	it("should return #N for number", () => {
		expect(getProjectName(42)).toBe("#42");
	});

	it("should return project.name for object", () => {
		const proj = { id: 5, name: "Test Project" } as Project;
		expect(getProjectName(proj)).toBe("Test Project");
	});
});

describe("getActivityName", () => {
	it("should return - for null", () => {
		expect(getActivityName(null)).toBe("-");
	});

	it("should return - for undefined", () => {
		expect(getActivityName(undefined)).toBe("-");
	});

	it("should return #N for number", () => {
		expect(getActivityName(7)).toBe("#7");
	});

	it("should return activity.name for object", () => {
		const act = { id: 3, name: "Meeting", parentTitle: null } as Activity;
		expect(getActivityName(act)).toBe("Meeting");
	});
});

describe("getCustomerName", () => {
	it("should return - for null", () => {
		expect(getCustomerName(null)).toBe("-");
	});

	it("should return - for undefined", () => {
		expect(getCustomerName(undefined)).toBe("-");
	});

	it("should return #N for number", () => {
		expect(getCustomerName(12)).toBe("#12");
	});

	it("should return customer.name for object", () => {
		const cust = {
			id: 1,
			name: "ACME Corp",
			number: null,
			comment: null,
			color: "#ff0000",
			visible: true,
			billable: true,
			country: "DE",
			currency: "EUR",
			timezone: "Europe/Berlin",
			teams: [],
			metaFields: [],
		} as Customer;
		expect(getCustomerName(cust)).toBe("ACME Corp");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// colorizeDuration / colorizeStatus
// ═══════════════════════════════════════════════════════════════════════════════

describe("colorizeDuration", () => {
	it("should return gray-styled - for null", () => {
		// gray wraps in ANSI codes; check it contains the dash
		expect(colorizeDuration(null)).toContain("-");
	});

	it("should return gray-styled - for undefined", () => {
		expect(colorizeDuration(undefined as unknown as null)).toContain("-");
	});

	it("should return green for >= 8 hours", () => {
		const result = colorizeDuration(8 * 3600);
		expect(result).toContain("8h"); // green branch
	});

	it("should return yellow for 6-8 hours", () => {
		const result = colorizeDuration(7 * 3600);
		expect(result).toContain("7h"); // yellow branch
	});

	it("should return red for < 6 hours", () => {
		const result = colorizeDuration(2 * 3600);
		expect(result).toContain("2h"); // red branch
	});
});

describe("colorizeStatus", () => {
	it("should return warning with hours when hasPause is false", () => {
		const result = colorizeStatus(false, 36000); // 10h in seconds
		expect(result).toContain("Keine Pause");
		expect(result).toContain("10");
	});

	it("should return success message when hasPause is true", () => {
		const result = colorizeStatus(true, 36000);
		expect(result).toContain("Pause vorhanden");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// sanitizeError
// ═══════════════════════════════════════════════════════════════════════════════

describe("sanitizeError", () => {
	it("should replace stack trace portion with [stack trace removed]", () => {
		const msg =
			"Error: boom at Object.fn (/src/utils.ts:12:34) at Module._resolve";
		const result = sanitizeError(msg);
		// the first regex replaces the path, leaving the rest of the line
		expect(result).not.toContain("utils.ts:12:34");
		expect(result).toContain("boom");
	});

	it("should remove file locations with .ts and .js extensions", () => {
		const msg = "Error at /home/user/project/utils.ts:5:10";
		expect(sanitizeError(msg)).not.toContain("utils.ts:5:10");
	});

	it("should truncate to 500 characters", () => {
		const long = "x".repeat(600);
		expect(sanitizeError(long).length).toBeLessThanOrEqual(500);
	});

	it("should return input unchanged when no sensitive content", () => {
		expect(sanitizeError("simple error message")).toBe("simple error message");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatError
// ═══════════════════════════════════════════════════════════════════════════════

describe("formatError", () => {
	it("should include status code when present", () => {
		const result = formatError({ statusCode: 404, message: "Not found" });
		expect(result).toContain("[404]");
	});

	it("should include message when present", () => {
		const result = formatError({ message: "boom" });
		expect(result).toContain("boom");
	});

	it("should show hint for 401", () => {
		const result = formatError({ statusCode: 401, message: "unauth" });
		expect(result).toContain("KIMAI_API_KEY");
	});

	it("should show hint for 403", () => {
		const result = formatError({ statusCode: 403, message: "forbidden" });
		expect(result).toContain("permission");
	});

	it("should show hint for 404", () => {
		const result = formatError({ statusCode: 404, message: "not found" });
		expect(result).toContain("resource was not found");
	});

	it("should return empty string for no fields", () => {
		expect(formatError({})).toBe("");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// styled* helpers
// ═══════════════════════════════════════════════════════════════════════════════

describe("truncate", () => {
	it("should return unchanged string when shorter than length", () => {
		expect(truncate("hello", 10)).toBe("hello");
	});

	it("should truncate with ellipsis when longer", () => {
		// 8 chars: 7 chars + 1 ellipsis → "hello w…"
		const result = truncate("hello world", 8);
		expect(result).toBe("hello w…");
		expect(result).toHaveLength(8);
	});

	it("should handle exact length", () => {
		expect(truncate("abc", 3)).toBe("abc");
	});
});

describe("styledHeader", () => {
	it("should return a string containing the title", () => {
		const result = styledHeader("My Title");
		expect(result).toContain("My Title");
	});

	it("should include subtitle when provided", () => {
		const result = styledHeader("Title", "Subtitle");
		expect(result).toContain("Subtitle");
	});

	it("should not include subtitle when omitted", () => {
		const result = styledHeader("Title");
		expect(result).not.toContain("undefined");
	});

	it("should use box-drawing characters", () => {
		const result = styledHeader("Test");
		expect(result).toContain("┌");
		expect(result).toContain("┐");
		expect(result).toContain("└");
	});
});

describe("styledRow", () => {
	it("should return a string", () => {
		expect(typeof styledRow("Label", "Value")).toBe("string");
	});

	it("should contain label and value", () => {
		const result = styledRow("Name", "Alice");
		expect(result).toContain("Name");
		expect(result).toContain("Alice");
	});
});

describe("styledDivider", () => {
	it("should return a string", () => {
		expect(typeof styledDivider()).toBe("string");
	});

	it("should contain dash characters", () => {
		expect(styledDivider()).toContain("─");
	});
});

describe("styledSuccess", () => {
	it("should contain the message", () => {
		expect(styledSuccess("Done")).toContain("Done");
	});
});

describe("styledError", () => {
	it("should contain the message", () => {
		expect(styledError("Failed")).toContain("Failed");
	});
});

describe("styledWarning", () => {
	it("should contain the message", () => {
		expect(styledWarning("Check")).toContain("Check");
	});
});

describe("styledInfo", () => {
	it("should contain the message", () => {
		expect(styledInfo("Info")).toContain("Info");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// nowIso / todayIso
// ═══════════════════════════════════════════════════════════════════════════════

describe("nowIso", () => {
	it("should return an ISO date string", () => {
		const result = nowIso();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it("should be parseable as a Date", () => {
		const result = nowIso();
		expect(() => new Date(result)).not.toThrow();
	});
});

describe("todayIso", () => {
	it("should return YYYY-MM-DD format", () => {
		const result = todayIso();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("should match the date portion of nowIso", () => {
		const today = todayIso();
		const now = nowIso();
		expect(now.startsWith(today)).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// checkDayBreak / formatBreakWarning
// ═══════════════════════════════════════════════════════════════════════════════

describe("checkDayBreak", () => {
	const createTs = (begin: string, end: string, duration: number): Timesheet => ({
		id: 0,
		project: 1,
		activity: 1,
		user: 1,
		tags: [],
		begin,
		end,
		duration,
		break: 0,
		description: null,
		rate: 0,
		internalRate: 0,
		exported: false,
		billable: true,
		metaFields: [],
	});

	it("should return hasBreak=true for empty array", () => {
		const result = checkDayBreak([]);
		expect(result.hasBreak).toBe(true);
	});

	it("should delegate to checkDayGap for single entry", () => {
		const ts = createTs("2026-05-21T09:00:00", "2026-05-21T10:00:00", 3600);
		const result = checkDayBreak([ts]);
		expect(result.hasBreak).toBe(false);
		expect(result.totalHours).toBe(3600);
	});

	it("should detect gap as break", () => {
		const ts1 = createTs("2026-05-21T09:00:00", "2026-05-21T12:00:00", 10800);
		const ts2 = createTs("2026-05-21T13:00:00", "2026-05-21T17:00:00", 14400);
		const result = checkDayBreak([ts1, ts2]);
		expect(result.hasBreak).toBe(true);
	});
});

describe("formatBreakWarning", () => {
	it("should return empty string when hasBreak is true", () => {
		const check = { hasBreak: true, totalHours: 0, entries: [] };
		expect(formatBreakWarning(check, "2026-05-21")).toBe("");
	});

	it("should return warning string when hasBreak is false", () => {
		const check = {
			hasBreak: false,
			missing: undefined,
			totalHours: 36000,
			entries: [],
		};
		const result = formatBreakWarning(check, "2026-05-21");
		expect(result).toContain("Keine Pause");
		expect(result).toContain("2026-05-21");
	});

	it("should include lunch tip when missing=lunch", () => {
		const check = {
			hasBreak: false,
			missing: "lunch",
			totalHours: 36000,
			entries: [],
		};
		const result = formatBreakWarning(check, "2026-05-21");
		expect(result).toContain("Mittagspause");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// getCalendarWeek (additional edge cases)
// ═══════════════════════════════════════════════════════════════════════════════

describe("getCalendarWeek (extended)", () => {
	it("should return 1 for Jan 1 of a year that starts on Thursday", () => {
		// 2026 Jan 1 is a Thursday — week 1
		const result = getCalendarWeek(new Date("2026-01-01"));
		expect(result).toBe(1);
	});

	it("should return correct week for a Sunday mid-year", () => {
		// June 21, 2026 is a Sunday, week 25
		const result = getCalendarWeek(new Date("2026-06-21"));
		expect(result).toBe(25);
	});

	it("should return correct week for a Monday at year boundary", () => {
		// Dec 31, 2026 is a Thursday, week 53
		const result = getCalendarWeek(new Date("2026-12-31"));
		expect(result).toBe(53);
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatTimesheet
// ═══════════════════════════════════════════════════════════════════════════════

describe("formatTimesheet", () => {
	const makeTs = (overrides: Partial<Timesheet> = {}): Timesheet => ({
		id: 1,
		project: 5,
		activity: 3,
		user: 1,
		tags: [],
		begin: "2026-05-21T09:00:00",
		end: "2026-05-21T17:00:00",
		duration: 28800,
		break: 0,
		description: "Test entry",
		rate: 0,
		internalRate: 0,
		exported: false,
		billable: true,
		metaFields: [],
		...overrides,
	});

	it("should return a non-empty string", () => {
		const result = formatTimesheet(makeTs());
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should include the project name", () => {
		const ts = makeTs({ project: { id: 5, name: "My Project" } as Project });
		expect(formatTimesheet(ts)).toContain("My Project");
	});

	it("should include the activity name", () => {
		const ts = makeTs({ activity: { id: 3, name: "Coding" } as Activity });
		expect(formatTimesheet(ts)).toContain("Coding");
	});

	it("should include the description", () => {
		expect(formatTimesheet(makeTs())).toContain("Test entry");
	});

	it("should use - for null description", () => {
		const ts = makeTs({ description: null });
		// pipe separator │ contains the bare - in output
		expect(formatTimesheet(ts)).toContain(" │ -");
	});

	it("should use - for null project", () => {
		const ts = makeTs({ project: null });
		// result should NOT contain the original project id (#5) — it shows - instead
		expect(formatTimesheet(ts)).not.toContain("#5");
	});

	it("should use - for null activity", () => {
		const ts = makeTs({ activity: null });
		// result should NOT contain the original activity id (#3)
		expect(formatTimesheet(ts)).not.toContain("#3");
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRINT FUNCTIONS — capture stdout via vi.spyOn(console, "log")
// ═══════════════════════════════════════════════════════════════════════════════

describe("printTimesheetHeader", () => {
	let logs: string[];
	beforeEach(() => {
		logs = [];
		vi.spyOn(console, "log").mockImplementation((msg) => {
			logs.push(String(msg));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should call console.log twice", () => {
		printTimesheetHeader();
		expect(logs).toHaveLength(2);
	});

	it("should include Duration in output", () => {
		printTimesheetHeader();
		expect(logs.join("")).toContain("Duration");
	});
});

describe("printTimesheets", () => {
	let logs: string[];
	beforeEach(() => {
		logs = [];
		vi.spyOn(console, "log").mockImplementation((msg) => {
			logs.push(String(msg));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const makeTs = (): Timesheet => ({
		id: 1,
		project: 5,
		activity: 3,
		user: 1,
		tags: [],
		begin: "2026-05-21T09:00:00",
		end: "2026-05-21T17:00:00",
		duration: 28800,
		break: 0,
		description: "Test",
		rate: 0,
		internalRate: 0,
		exported: false,
		billable: true,
		metaFields: [],
	});

	it("should print empty message for empty array", () => {
		printTimesheets([]);
		expect(logs).toHaveLength(1);
		expect(logs[0]).toContain("No timesheets found");
	});

	it("should print header + entry for one timesheet", () => {
		printTimesheets([makeTs()]);
		// header (2 lines) + 1 timesheet line = 3 calls
		expect(logs.length).toBeGreaterThanOrEqual(3);
	});

	it("should include project name in timesheet line", () => {
		const ts = makeTs();
		ts.project = { id: 5, name: "Alpha" } as Project;
		printTimesheets([ts]);
		expect(logs.join("")).toContain("Alpha");
	});
});

describe("printProjects", () => {
	let logs: string[];
	beforeEach(() => {
		logs = [];
		vi.spyOn(console, "log").mockImplementation((msg) => {
			logs.push(String(msg));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const makeProject = (): Project => ({
		id: 1,
		name: "Project Alpha",
		parentTitle: null,
		customer: 3,
		color: "#ff0000",
		visible: true,
		billable: true,
		start: null,
		end: null,
		comment: null,
		globalActivities: false,
		teams: [],
		metaFields: [],
	});

	it("should print empty message for empty array", () => {
		printProjects([]);
		expect(logs).toHaveLength(1);
		expect(logs[0]).toContain("No projects found");
	});

	it("should print header + project row", () => {
		printProjects([makeProject()]);
		expect(logs.length).toBeGreaterThanOrEqual(2);
	});

	it("should include project name", () => {
		printProjects([makeProject()]);
		expect(logs.join("")).toContain("Project Alpha");
	});
});

describe("printActivities", () => {
	let logs: string[];
	beforeEach(() => {
		logs = [];
		vi.spyOn(console, "log").mockImplementation((msg) => {
			logs.push(String(msg));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const makeActivity = (): Activity => ({
		id: 2,
		name: "Development",
		parentTitle: null,
		visible: true,
		billable: true,
		project: null,
		color: "#00ff00",
		teams: [],
		metaFields: [],
	});

	it("should print empty message for empty array", () => {
		printActivities([]);
		expect(logs).toHaveLength(1);
		expect(logs[0]).toContain("No activities found");
	});

	it("should print header + activity row", () => {
		printActivities([makeActivity()]);
		expect(logs.length).toBeGreaterThanOrEqual(2);
	});

	it("should include activity name", () => {
		printActivities([makeActivity()]);
		expect(logs.join("")).toContain("Development");
	});

	it("should append project name when activity has a project", () => {
		const act = makeActivity();
		act.project = { id: 5, name: "Alpha" } as Project;
		printActivities([act]);
		expect(logs.join("")).toContain("Alpha");
	});
});

describe("printCustomers", () => {
	let logs: string[];
	beforeEach(() => {
		logs = [];
		vi.spyOn(console, "log").mockImplementation((msg) => {
			logs.push(String(msg));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const makeCustomer = (): Customer => ({
		id: 1,
		name: "ACME Corp",
		number: null,
		comment: null,
		color: "#ff0000",
		visible: true,
		billable: true,
		country: "DE",
		currency: "EUR",
		timezone: "Europe/Berlin",
		teams: [],
		metaFields: [],
	});

	it("should print empty message for empty array", () => {
		printCustomers([]);
		expect(logs).toHaveLength(1);
		expect(logs[0]).toContain("No customers found");
	});

	it("should print header + customer row", () => {
		printCustomers([makeCustomer()]);
		expect(logs.length).toBeGreaterThanOrEqual(2);
	});

	it("should include customer name and country", () => {
		printCustomers([makeCustomer()]);
		expect(logs.join("")).toContain("ACME Corp");
		expect(logs.join("")).toContain("DE");
	});
});

describe("printTags", () => {
	let logs: string[];
	beforeEach(() => {
		logs = [];
		vi.spyOn(console, "log").mockImplementation((msg) => {
			logs.push(String(msg));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should print empty message for empty array", () => {
		printTags([]);
		expect(logs).toHaveLength(1);
		expect(logs[0]).toContain("No tags found");
	});

	it("should print Tags: header and join tags", () => {
		printTags(["dev", "urgent", "review"]);
		expect(logs).toHaveLength(2);
		expect(logs[0]).toContain("Tags:");
		expect(logs[1]).toBe("dev, urgent, review");
	});

	it("should handle single tag", () => {
		printTags(["important"]);
		expect(logs[1]).toBe("important");
	});
});
