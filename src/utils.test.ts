import { describe, it, expect } from "vitest";
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
} from "./utils";
import type { Timesheet } from "./types";

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
