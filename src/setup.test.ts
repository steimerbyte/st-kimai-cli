import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("ensureAuth", () => {
	let originalHome: string | undefined;
	let tmpHome: string;

	beforeEach(() => {
		originalHome = process.env.HOME;
		tmpHome = mkdtempSync(join(tmpdir(), "kimai-cli-test-"));
		process.env.HOME = tmpHome;
		// Ensure no env-var shortcut.
		delete process.env.KIMAI_API_KEY;
		delete process.env.KIMAI_URL;
		delete process.env.KIMAI_NO_SETUP;
	});

	afterEach(() => {
		process.env.HOME = originalHome;
		rmSync(tmpHome, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	it("skips when --no-setup is passed", async () => {
		process.env.KIMAI_NO_SETUP = "1";
		const { ensureAuth } = await import("./setup.js");
		await ensureAuth({ skip: true });
		// No auth.json should be created.
		expect(existsSync(join(tmpHome, ".kimai-cli", "auth.json"))).toBe(false);
	});

	it("skips when KIMAI_API_KEY env var is set", async () => {
		process.env.KIMAI_API_KEY = "env-token";
		const { ensureAuth } = await import("./setup.js");
		await ensureAuth();
		expect(existsSync(join(tmpHome, ".kimai-cli", "auth.json"))).toBe(false);
	});

	it("throws when no config and no TTY", async () => {
		// stdin/stdout are non-TTY in vitest by default.
		const { ensureAuth } = await import("./setup.js");
		await expect(ensureAuth()).rejects.toThrow(/No auth.json found/);
	});

	it("treats KIMAI_API_KEY as a sufficient credential source", async () => {
		// If env vars are present, ensureAuth must not attempt the wizard
		// even when there's no auth.json on disk.
		process.env.KIMAI_URL = "https://kimai.test";
		process.env.KIMAI_API_KEY = "test-token";
		const { ensureAuth } = await import("./setup.js");
		await expect(ensureAuth()).resolves.toBeUndefined();
		expect(existsSync(join(tmpHome, ".kimai-cli", "auth.json"))).toBe(false);
	});

	it("falls back to os.homedir() when HOME env is empty (no silent cwd path)", async () => {
		// Regression: previously `process.env.HOME || ""` collapsed an empty HOME
		// to a cwd-relative path. The wizard must use os.homedir() instead so
		// credentials never end up in an unexpected directory.
		process.env.HOME = "";
		const { ensureAuth } = await import("./setup.js");
		await expect(ensureAuth()).rejects.toThrow(/No auth\.json found/);
		// Crucially: it should NOT resolve to a cwd-relative path.
		expect(existsSync(".kimai-cli/auth.json")).toBe(false);
	});
});
