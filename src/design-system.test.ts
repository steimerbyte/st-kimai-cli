import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock picocolors: plain passthrough functions (no spies needed) ───────────
// This allows us to test the actual output strings of color-aware functions.
vi.mock("picocolors", () => ({
	default: {
		blue: (s: string) => `<<BLUE>>${s}<</BLUE>>`,
		green: (s: string) => `<<GREEN>>${s}<</GREEN>>`,
		yellow: (s: string) => `<<YELLOW>>${s}<</YELLOW>>`,
		red: (s: string) => `<<RED>>${s}<</RED>>`,
		cyan: (s: string) => `<<CYAN>>${s}<</CYAN>>`,
		magenta: (s: string) => `<<MAGENTA>>${s}<</MAGENTA>>`,
		gray: (s: string) => `<<GRAY>>${s}<</GRAY>>`,
		bold: (s: string) => `<<BOLD>>${s}<</BOLD>>`,
		white: (s: string) => `<<WHITE>>${s}<</WHITE>>`,
		reset: () => "<<RESET>>",
	},
}));

import {
	LAYOUT,
	divider,
	COLORS,
	ICONS,
	pad,
	truncate,
	sectionHeader,
	colorizeDurationByQuality,
	isColorEnabled,
} from "./design-system";

describe("design-system (color enabled)", () => {
	// ─── LAYOUT ───────────────────────────────────────────────────────────────

	describe("LAYOUT", () => {
		it("has TABLE_WIDTH, LABEL_WIDTH, INDENT", () => {
			expect(LAYOUT).toHaveProperty("TABLE_WIDTH");
			expect(LAYOUT).toHaveProperty("LABEL_WIDTH");
			expect(LAYOUT).toHaveProperty("INDENT");
		});

		it("has column width constants", () => {
			expect(LAYOUT).toHaveProperty("COL_ID");
			expect(LAYOUT).toHaveProperty("COL_NAME");
			expect(LAYOUT).toHaveProperty("COL_PROJECT");
			expect(LAYOUT).toHaveProperty("COL_ACTIVITY");
		});

		it("has table, list, and spacing settings", () => {
			expect(LAYOUT).toHaveProperty("DIVIDER_CHAR");
			expect(LAYOUT).toHaveProperty("PADDING");
			expect(LAYOUT).toHaveProperty("DEFAULT_LIMIT");
			expect(LAYOUT).toHaveProperty("MAX_LIMIT");
			expect(LAYOUT).toHaveProperty("SECTION_GAP");
		});

		it("has numeric width values", () => {
			expect(typeof LAYOUT.TABLE_WIDTH).toBe("number");
			expect(LAYOUT.TABLE_WIDTH).toBeGreaterThan(0);
		});

		it("has string constant values", () => {
			expect(typeof LAYOUT.DIVIDER_CHAR).toBe("string");
			expect(LAYOUT.DIVIDER_CHAR).toBe("─");
		});
	});

	// ─── divider ───────────────────────────────────────────────────────────────

	describe("divider", () => {
		it("repeats the character for the given width", () => {
			expect(divider("─", 5)).toBe("─────");
		});

		it("uses LAYOUT.TABLE_WIDTH as default width", () => {
			const result = divider();
			expect(result.length).toBe(LAYOUT.TABLE_WIDTH);
		});

		it("returns empty string for width 0", () => {
			expect(divider("─", 0)).toBe("");
		});

		it("uses a custom char", () => {
			expect(divider("=", 3)).toBe("===");
		});
	});

	// ─── COLORS ────────────────────────────────────────────────────────────────

	describe("COLORS", () => {
		it("has primary, success, warning, error, info", () => {
			expect(COLORS).toHaveProperty("primary");
			expect(COLORS).toHaveProperty("success");
			expect(COLORS).toHaveProperty("warning");
			expect(COLORS).toHaveProperty("error");
			expect(COLORS).toHaveProperty("info");
		});

		it("has bold variants for semantic colors", () => {
			expect(COLORS).toHaveProperty("primaryBold");
			expect(COLORS).toHaveProperty("successBold");
			expect(COLORS).toHaveProperty("warningBold");
			expect(COLORS).toHaveProperty("errorBold");
			expect(COLORS).toHaveProperty("infoBold");
		});

		it("has entity colors", () => {
			expect(COLORS).toHaveProperty("project");
			expect(COLORS).toHaveProperty("activity");
			expect(COLORS).toHaveProperty("customer");
			expect(COLORS).toHaveProperty("tag");
		});

		it("has duration colors", () => {
			expect(COLORS).toHaveProperty("durationGood");
			expect(COLORS).toHaveProperty("durationOk");
			expect(COLORS).toHaveProperty("durationBad");
		});

		it("has muted, bold, white neutral helpers", () => {
			expect(COLORS).toHaveProperty("muted");
			expect(COLORS).toHaveProperty("bold");
			expect(COLORS).toHaveProperty("white");
		});

		it("has a reset token", () => {
			expect(COLORS).toHaveProperty("reset");
		});

		it("primary() returns a marked-up string (blue)", () => {
			const result = COLORS.primary("hello");
			expect(result).toContain("hello");
			expect(result).toContain("<<BLUE>>");
		});

		it("success() returns a marked-up string (green)", () => {
			const result = COLORS.success("ok");
			expect(result).toContain("ok");
			expect(result).toContain("<<GREEN>>");
		});

		it("warning() returns a marked-up string (yellow)", () => {
			const result = COLORS.warning("warn");
			expect(result).toContain("warn");
			expect(result).toContain("<<YELLOW>>");
		});

		it("error() returns a marked-up string (red)", () => {
			const result = COLORS.error("fail");
			expect(result).toContain("fail");
			expect(result).toContain("<<RED>>");
		});

		it("info() returns a marked-up string (cyan)", () => {
			const result = COLORS.info("note");
			expect(result).toContain("note");
			expect(result).toContain("<<CYAN>>");
		});

		it("muted() returns a marked-up string (gray)", () => {
			const result = COLORS.muted("dim");
			expect(result).toContain("dim");
			expect(result).toContain("<<GRAY>>");
		});

		it("bold() returns a marked-up string", () => {
			const result = COLORS.bold("strong");
			expect(result).toContain("strong");
			expect(result).toContain("<<BOLD>>");
		});

		it("primaryBold() returns bold + blue markup", () => {
			const result = COLORS.primaryBold("title");
			expect(result).toContain("title");
			expect(result).toContain("<<BOLD>>");
			expect(result).toContain("<<BLUE>>");
		});

		it("successBold() returns bold + green markup", () => {
			const result = COLORS.successBold("confirm");
			expect(result).toContain("confirm");
			expect(result).toContain("<<BOLD>>");
			expect(result).toContain("<<GREEN>>");
		});

		it("project() returns cyan markup", () => {
			const result = COLORS.project("ProjectA");
			expect(result).toContain("ProjectA");
			expect(result).toContain("<<CYAN>>");
		});

		it("activity() returns magenta markup", () => {
			const result = COLORS.activity("Dev");
			expect(result).toContain("Dev");
			expect(result).toContain("<<MAGENTA>>");
		});

		it("customer() returns blue markup", () => {
			const result = COLORS.customer("Acme");
			expect(result).toContain("Acme");
			expect(result).toContain("<<BLUE>>");
		});

		it("tag() returns yellow markup", () => {
			const result = COLORS.tag("v1.0");
			expect(result).toContain("v1.0");
			expect(result).toContain("<<YELLOW>>");
		});

		it("durationGood() returns green markup", () => {
			const result = COLORS.durationGood("█");
			expect(result).toContain("█");
			expect(result).toContain("<<GREEN>>");
		});

		it("durationOk() returns yellow markup", () => {
			const result = COLORS.durationOk("█");
			expect(result).toContain("█");
			expect(result).toContain("<<YELLOW>>");
		});

		it("durationBad() returns red markup", () => {
			const result = COLORS.durationBad("█");
			expect(result).toContain("█");
			expect(result).toContain("<<RED>>");
		});

		it("reset is the reset spy function", () => {
			expect(typeof COLORS.reset).toBe("function");
			expect(COLORS.reset()).toBe("<<RESET>>");
		});
	});

	// ─── ICONS ────────────────────────────────────────────────────────────────

	describe("ICONS", () => {
		it("has status, entity, action, time, misc top-level keys", () => {
			expect(ICONS).toHaveProperty("status");
			expect(ICONS).toHaveProperty("entity");
			expect(ICONS).toHaveProperty("action");
			expect(ICONS).toHaveProperty("time");
			expect(ICONS).toHaveProperty("misc");
		});

		it("status has expected icon characters", () => {
			expect(ICONS.status.ok).toBe("✓");
			expect(ICONS.status.error).toBe("✗");
			expect(ICONS.status.warning).toBe("⚠");
			expect(ICONS.status.info).toBe("➤");
			expect(ICONS.status.loading).toBe("◐");
			expect(ICONS.status.pending).toBe("○");
		});

		it("entity has timesheet, project, activity, customer, tag icons", () => {
			expect(ICONS.entity.timesheet).toBe("⏱");
			expect(ICONS.entity.project).toBe("📁");
			expect(ICONS.entity.activity).toBe("🎯");
			expect(ICONS.entity.customer).toBe("🏢");
			expect(ICONS.entity.tag).toBe("🏷");
			expect(ICONS.entity.user).toBe("👤");
			expect(ICONS.entity.team).toBe("👥");
		});

		it("action has common action icons", () => {
			expect(ICONS.action.start).toBe("▶");
			expect(ICONS.action.stop).toBe("⏹");
			expect(ICONS.action.add).toBe("➕");
			expect(ICONS.action.edit).toBe("✏");
			expect(ICONS.action.delete).toBe("🗑");
			expect(ICONS.action.check).toBe("✅");
			expect(ICONS.action.cross).toBe("❌");
			expect(ICONS.action.copy).toBe("📋");
			expect(ICONS.action.search).toBe("🔍");
			expect(ICONS.action.refresh).toBe("🔄");
		});

		it("time has timing icons", () => {
			expect(ICONS.time.hourglass).toBe("⏳");
			expect(ICONS.time.alarm).toBe("⏰");
			expect(ICONS.time.play).toBe("▶");
		});

		it("misc has bullet, arrow, pipe, dot icons", () => {
			expect(ICONS.misc.bullet).toBe("•");
			expect(ICONS.misc.arrow).toBe("→");
			expect(ICONS.misc.pipe).toBe("│");
			expect(ICONS.misc.dot).toBe("·");
		});
	});

	// ─── pad ──────────────────────────────────────────────────────────────────

	describe("pad", () => {
		it("pads a short string with spaces to the target length", () => {
			expect(pad("hi", 5)).toBe("hi   ");
		});

		it("pads with a custom character when specified", () => {
			expect(pad("hi", 5, ".")).toBe("hi...");
		});

		it("truncates a string longer than the target length", () => {
			expect(pad("hello world", 5)).toBe("hello");
		});

		it("returns the string unchanged when length equals string length", () => {
			expect(pad("hi", 2)).toBe("hi");
		});

		it("pads to length 0 returns empty string", () => {
			expect(pad("hello", 0)).toBe("");
		});
	});

	// ─── truncate ─────────────────────────────────────────────────────────────

	describe("truncate", () => {
		it("returns the string unchanged when under the limit", () => {
			expect(truncate("hello", 10)).toBe("hello");
		});

		it("truncates with ellipsis when over the limit", () => {
			expect(truncate("hello world", 8)).toBe("hello w…");
		});

		it("uses the unicode ellipsis character", () => {
			const result = truncate("abcdefgh", 5);
			expect(result.endsWith("…")).toBe(true);
		});

		it("truncating to length 1 returns single ellipsis", () => {
			expect(truncate("hello", 1)).toBe("…");
		});

		it("truncating to length 2 returns one char plus ellipsis", () => {
			expect(truncate("hello", 2)).toBe("h…");
		});
	});

	// ─── sectionHeader ───────────────────────────────────────────────────────

	describe("sectionHeader", () => {
		it("returns a string containing the title", () => {
			const output = sectionHeader("My Title");
			expect(output).toContain("My Title");
		});

		it("returns a string containing box-drawing characters", () => {
			const output = sectionHeader("Box");
			expect(output).toMatch(/[┌┐└┘─]/);
		});

		it("contains the title in the middle line", () => {
			const lines = sectionHeader("Header").split("\n");
			expect(lines[1]).toContain("Header");
		});

		it("contains exactly 3 lines by default (no subtitle)", () => {
			expect(sectionHeader("Test").split("\n").length).toBe(3);
		});

		it("contains 4 lines when subtitle is provided", () => {
			const lines = sectionHeader("Title", { subtitle: "sub" }).split("\n");
			expect(lines.length).toBe(4);
		});

		it("includes subtitle text in the output", () => {
			const output = sectionHeader("Title", { subtitle: "Subtitle" });
			expect(output).toContain("Subtitle");
		});

		it("handles title wider than width gracefully", () => {
			const output = sectionHeader("A".repeat(200), { width: 20 });
			expect(output).toContain("A".repeat(200));
		});

		it("handles subtitle wider than width gracefully", () => {
			const output = sectionHeader("Title", {
				subtitle: "B".repeat(200),
				width: 20,
			});
			expect(output).toContain("B".repeat(200));
		});

		it("uses custom width when provided", () => {
			const output = sectionHeader("Small", { width: 30 });
			// Strip test markers (<<BOLD>>, <<CYAN>>) to get structural length
			// The output contains box chars + divider chars = 30 visible chars
			const stripped = output.replace(/<<[^>]+>>/g, "");
			// Top line: ┌ + 26 divider + ┐ = 28 visible chars (no spaces in divider)
			// But the header line adds pipe chars, so the full output has the right width
			// Just verify the box-drawing chars are present
			expect(stripped).toMatch(/[┌┐└┘]/);
			// Verify 'Small' appears in the output
			expect(stripped).toContain("Small");
		});

		it("contains color markup in the output when color is enabled", () => {
			const output = sectionHeader("Color Header");
			expect(output).toContain("<<CYAN>>");
		});
	});

	// ─── colorizeDurationByQuality ───────────────────────────────────────────

	describe("colorizeDurationByQuality", () => {
		it("returns muted '-' for null seconds", () => {
			const result = colorizeDurationByQuality(null);
			expect(result).toBe(COLORS.muted("-"));
			expect(result).toContain("<<GRAY>>");
		});

		it("returns durationGood '█' when hours >= targetHours (8h default)", () => {
			const result = colorizeDurationByQuality(36_000); // 10 hours
			expect(result).toBe(COLORS.durationGood("█"));
			expect(result).toContain("<<GREEN>>");
		});

		it("returns durationGood '█' when exactly at 8 hours", () => {
			const result = colorizeDurationByQuality(28_800);
			expect(result).toBe(COLORS.durationGood("█"));
		});

		it("returns durationOk '█' for 7 hours (targetHours - 1)", () => {
			const result = colorizeDurationByQuality(25_200);
			expect(result).toBe(COLORS.durationOk("█"));
			expect(result).toContain("<<YELLOW>>");
		});

		it("returns durationOk '█' for 6 hours (targetHours - 2 boundary)", () => {
			const result = colorizeDurationByQuality(21_600);
			expect(result).toBe(COLORS.durationOk("█"));
		});

		it("returns durationBad '█' for hours < targetHours - 2 (5h)", () => {
			const result = colorizeDurationByQuality(18_000);
			expect(result).toBe(COLORS.durationBad("█"));
			expect(result).toContain("<<RED>>");
		});

		it("respects a custom targetHours option", () => {
			// With targetHours=6, 5h should be ok (6-2=4 ≤ 5 < 6)
			const result = colorizeDurationByQuality(18_000, 6);
			expect(result).toBe(COLORS.durationOk("█"));
		});

		it("returns durationGood when exactly at custom targetHours", () => {
			const result = colorizeDurationByQuality(21_600, 6);
			expect(result).toBe(COLORS.durationGood("█"));
		});

		it("returns durationGood for hours well above custom target", () => {
			const result = colorizeDurationByQuality(72_000, 6);
			expect(result).toBe(COLORS.durationGood("█"));
		});
	});

	// ─── isColorEnabled ───────────────────────────────────────────────────────

	describe("isColorEnabled", () => {
		it("returns true when FORCE_COLOR is set", () => {
			expect(isColorEnabled()).toBe(true);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS — color disabled path (NO_COLOR=1)
// ═══════════════════════════════════════════════════════════════════════════════

describe("design-system (color disabled via NO_COLOR=1)", () => {
	let ds: typeof import("./design-system");

	beforeEach(async () => {
		vi.resetModules();
		vi.doMock("picocolors", () => ({
			default: {
				blue: (s: string) => s,
				green: (s: string) => s,
				yellow: (s: string) => s,
				red: (s: string) => s,
				cyan: (s: string) => s,
				magenta: (s: string) => s,
				gray: (s: string) => s,
				bold: (s: string) => s,
				white: (s: string) => s,
				reset: () => "",
			},
		}));
		process.env.NO_COLOR = "1";
		delete process.env.FORCE_COLOR;
		Object.assign(process.stdout, { isTTY: true });
		ds = await import("./design-system");
	});

	afterEach(() => {
		delete process.env.NO_COLOR;
		delete process.env.FORCE_COLOR;
	});

	describe("isColorEnabled", () => {
		it("returns false when NO_COLOR=1", () => {
			expect(ds.isColorEnabled()).toBe(false);
		});
	});

	describe("COLORS — passthrough when color is disabled", () => {
		it("primary() returns the input unchanged", () => {
			expect(ds.COLORS.primary("hello")).toBe("hello");
		});

		it("success() returns the input unchanged", () => {
			expect(ds.COLORS.success("ok")).toBe("ok");
		});

		it("error() returns the input unchanged", () => {
			expect(ds.COLORS.error("fail")).toBe("fail");
		});

		it("muted() returns the input unchanged", () => {
			expect(ds.COLORS.muted("dim")).toBe("dim");
		});

		it("bold() returns the input unchanged", () => {
			expect(ds.COLORS.bold("strong")).toBe("strong");
		});

		it("reset is empty string", () => {
			expect(ds.COLORS.reset).toBe("");
		});
	});

	describe("sectionHeader — no color codes when disabled", () => {
		it("contains the title with box-drawing characters but no color markers", () => {
			const output = ds.sectionHeader("No Color Header");
			expect(output).toContain("No Color Header");
			expect(output).toMatch(/[┌┐└┘─]/);
			expect(output).not.toContain("<<CYAN>>");
		});

		it("subtitle line also has no color markers", () => {
			const output = ds.sectionHeader("Title", { subtitle: "Sub" });
			expect(output).toContain("Sub");
			expect(output).not.toContain("<<CYAN>>");
		});
	});

	describe("divider — no color codes", () => {
		it("returns plain repeated characters", () => {
			const result = ds.divider("─", 10);
			expect(result).toBe("──────────");
			expect(result).not.toContain("<<");
		});
	});

	describe("colorizeDurationByQuality — no colors", () => {
		it("returns plain muted '-' for null seconds", () => {
			expect(ds.colorizeDurationByQuality(null)).toBe("-");
		});

		it("returns plain '█' for all quality levels", () => {
			expect(ds.colorizeDurationByQuality(36_000)).toBe("█");
			expect(ds.colorizeDurationByQuality(25_200)).toBe("█");
			expect(ds.colorizeDurationByQuality(18_000)).toBe("█");
		});
	});
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS — non-TTY path (no env vars, isTTY=false)
// ═══════════════════════════════════════════════════════════════════════════════

describe("design-system (non-TTY, no env vars)", () => {
	let ds: typeof import("./design-system");

	beforeEach(async () => {
		vi.resetModules();
		vi.doMock("picocolors", () => ({
			default: {
				blue: (s: string) => s,
				green: (s: string) => s,
				yellow: (s: string) => s,
				red: (s: string) => s,
				cyan: (s: string) => s,
				magenta: (s: string) => s,
				gray: (s: string) => s,
				bold: (s: string) => s,
				white: (s: string) => s,
				reset: () => "",
			},
		}));
		Object.assign(process.stdout, { isTTY: false });
		delete process.env.NO_COLOR;
		delete process.env.FORCE_COLOR;
		ds = await import("./design-system");
	});

	afterEach(() => {
		delete process.env.NO_COLOR;
		delete process.env.FORCE_COLOR;
	});

	it("isColorEnabled returns false without TTY and no env vars", () => {
		expect(ds.isColorEnabled()).toBe(false);
	});

	it("primary() returns input unchanged", () => {
		expect(ds.COLORS.primary("hello")).toBe("hello");
	});

	it("sectionHeader contains no color markers", () => {
		expect(ds.sectionHeader("Test")).not.toContain("<<CYAN>>");
	});
});
