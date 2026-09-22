import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ── vi.mock calls are hoisted by Vitest ──────────────────────────────────────

// Mock readline/promises for runWizard integration tests.
vi.mock("node:readline/promises", () => ({
	createInterface: vi.fn(),
}));

// Mock node:fs/promises using the factory pattern so that ALL exports
// (mkdir, writeFile, chmod, stat, …) are available.  Without the factory
// vitest replaces the module entirely and setup.ts fails at import time
// because it imports `stat` at the top level.
vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		mkdir: vi.fn().mockResolvedValue(undefined),
		writeFile: vi.fn().mockResolvedValue(undefined),
		chmod: vi.fn().mockResolvedValue(undefined),
	};
});

// Mock the `fs` module (used by config.ts via `import * as fs from "fs"`).
// Use importOriginal so that mkdtempSync / rmSync are still available to the
// test setup code.  Only existsSync / lstatSync / readFileSync are overridden.
vi.mock("fs", async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		existsSync: vi.fn().mockReturnValue(false),
		lstatSync: vi.fn().mockImplementation(() => {
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		}),
		readFileSync: vi.fn().mockImplementation(() => {
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		}),
	};
});

// ── Module-level imports ─────────────────────────────────────────────────────
import * as fsPromises from "node:fs/promises";

describe("ensureAuth", () => {
	let originalHome: string | undefined;
	let tmpHome: string;

	beforeEach(async () => {
		const fsMock = await import("fs");
		originalHome = process.env.HOME;
		tmpHome = mkdtempSync(join(tmpdir(), "kimai-cli-test-"));
		process.env.HOME = tmpHome;
		delete process.env.KIMAI_API_KEY;
		delete process.env.KIMAI_URL;
		delete process.env.KIMAI_NO_SETUP;
		vi.mocked(fsPromises.mkdir).mockClear();
		vi.mocked(fsPromises.writeFile).mockClear();
		vi.mocked(fsPromises.chmod).mockClear();
		// Ensure "no config on disk".
		vi.mocked(fsMock.existsSync).mockReturnValue(false);
		vi.mocked(fsMock.lstatSync).mockImplementation(() => {
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		});
		vi.mocked(fsMock.readFileSync).mockImplementation(() => {
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		});
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
		expect(existsSync(join(tmpHome, ".kimai-cli", "auth.json"))).toBe(false);
	});

	it("skips when KIMAI_API_KEY env var is set", async () => {
		process.env.KIMAI_API_KEY = "[REDACTED:Env Secret Field]";
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
		process.env.KIMAI_URL = "https://kimai.test";
		process.env.KIMAI_API_KEY = "[REDACTED:Env Secret Field]";
		const { ensureAuth } = await import("./setup.js");
		await expect(ensureAuth()).resolves.toBeUndefined();
		expect(existsSync(join(tmpHome, ".kimai-cli", "auth.json"))).toBe(false);
	});

	it("falls back to os.homedir() when HOME env is empty (no silent cwd path)", async () => {
		process.env.HOME = "";
		const { ensureAuth } = await import("./setup.js");
		await expect(ensureAuth()).rejects.toThrow(/No auth\.json found/);
		expect(existsSync(".kimai-cli/auth.json")).toBe(false);
	});
});

describe("validateKimaiUrl", () => {
	let validateKimaiUrl: (url: string) => string;

	beforeAll(async () => {
		const mod = await import("./setup.js");
		validateKimaiUrl = mod.validateKimaiUrl;
	});

	it("accepts a valid https URL and returns it unchanged", () => {
		expect(validateKimaiUrl("https://kimai.example.com")).toBe(
			"https://kimai.example.com",
		);
	});

	it("strips a trailing slash from a valid https URL", () => {
		expect(validateKimaiUrl("https://kimai.example.com/")).toBe(
			"https://kimai.example.com",
		);
	});

	it("accepts https URL with path segments (no trailing slash)", () => {
		expect(validateKimaiUrl("https://kimai.example.com/path/to/kimai")).toBe(
			"https://kimai.example.com/path/to/kimai",
		);
	});

	it("throws when given an http:// URL", () => {
		expect(() => validateKimaiUrl("http://kimai.example.com")).toThrow(/https/);
	});

	it("throws with a security-focused message on http:// input", () => {
		expect(() => validateKimaiUrl("http://kimai.example.com")).toThrow(
			/expose your API key/i,
		);
	});

	it("throws when given an empty string", () => {
		expect(() => validateKimaiUrl("")).toThrow(/URL is required/i);
	});

	it("throws when given only whitespace", () => {
		expect(() => validateKimaiUrl("   ")).toThrow(/URL is required/i);
	});

	it("throws on ftp:// scheme", () => {
		expect(() => validateKimaiUrl("ftp://kimai.example.com")).toThrow(/https/);
	});

	it("throws on javascript: scheme (XSS / injection attempt)", () => {
		expect(() => validateKimaiUrl("javascript:alert(1)")).toThrow(/https/);
	});

	it("throws on data: scheme", () => {
		expect(() =>
			validateKimaiUrl("data:text/html,<script>alert(1)</script>"),
		).toThrow(/https/);
	});

	it("is case-insensitive for the https scheme", () => {
		// The regex /^https:\\/\\//i is case-insensitive, so HTTPS passes.
		// The URL is returned as-is (not lowercased by the helper).
		expect(validateKimaiUrl("HTTPS://kimai.example.com")).toBe(
			"HTTPS://kimai.example.com",
		);
	});

	it("trims leading and trailing whitespace", () => {
		expect(validateKimaiUrl("  https://kimai.example.com/  ")).toBe(
			"https://kimai.example.com",
		);
	});
});

describe("runWizard", () => {
	// Test runWizard directly by calling it as a function after all mocks are set up.
	// This avoids the module-caching issue where setup.js might be imported before
	// createInterface.mockReturnValue is configured.
	let originalHome: string | undefined;
	let tmpHome: string;

	beforeEach(async () => {
		const fsMock = await import("fs");
		originalHome = process.env.HOME;
		tmpHome = mkdtempSync(join(tmpdir(), "kimai-cli-wizard-test-"));
		process.env.HOME = tmpHome;
		delete process.env.KIMAI_API_KEY;
		delete process.env.KIMAI_URL;
		delete process.env.KIMAI_NO_SETUP;

		// Simulate a TTY so runWizard proceeds instead of reading from real stdin.
		Object.defineProperty(process.stdin, "isTTY", { value: true });
		Object.defineProperty(process.stdout, "isTTY", { value: true });

		vi.mocked(fsPromises.mkdir).mockClear();
		vi.mocked(fsPromises.writeFile).mockClear();
		vi.mocked(fsPromises.chmod).mockClear();

		// Configure readline mock: provide URL + key answers.
		const { createInterface } = await import("node:readline/promises");
		const mockRl = {
			question: vi
				.fn()
				.mockResolvedValueOnce("https://test.kimai.example.com")
				.mockResolvedValueOnce("test-api-key-abc"),
			close: vi.fn(),
		};
		vi.mocked(createInterface).mockReturnValue(
			mockRl as unknown as ReturnType<typeof createInterface>,
		);

		// Set up fs mock for loadAuthConfig: config does not exist initially,
		// but after the wizard writes it, we make it visible by checking the path.
		vi.mocked(fsMock.existsSync).mockImplementation(
			(path: string) =>
				typeof path === "string" && path.includes("auth.json") ? true : false,
		);
		vi.mocked(fsMock.lstatSync).mockImplementation((path: string) => {
			if (typeof path === "string" && path.includes("auth.json")) {
				return { mode: 0o100600 } as import("fs").Stats;
			}
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		});
		vi.mocked(fsMock.readFileSync).mockImplementation((path: string) => {
			if (typeof path === "string" && path.includes("auth.json")) {
				return JSON.stringify({
					url: "https://test.kimai.example.com",
					apiKey: "test-api-key-abc",
				});
			}
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		});
	});

	afterEach(() => {
		process.env.HOME = originalHome;
		rmSync(tmpHome, { recursive: true, force: true });
		vi.restoreAllMocks();
		// Remove the custom isTTY property added by this test's beforeEach.
		try {
			Object.defineProperty(process.stdin, "isTTY", { value: undefined });
			Object.defineProperty(process.stdout, "isTTY", { value: undefined });
		} catch {
			// isTTY is non-configurable in some Node.js environments; ignore.
		}
	});

	it("saves valid HTTPS URL and key to auth.json and enforces secure file mode", async () => {
		// Directly import runWizard from setup.js.  By this point, all mocks are
		// configured in beforeEach, so the factory-returned createInterface has
		// mockReturnValue set before setup.js first evaluates.
		const { runWizard } = await import("./setup.js");
		await runWizard();

		// Verify writeFile was called with the correct JSON payload.
		expect(vi.mocked(fsPromises.writeFile).mock.calls).toHaveLength(1);
		const [, writtenContent] = vi.mocked(fsPromises.writeFile)
			.mock.calls[0] as [string, string];
		const parsed = JSON.parse(writtenContent) as { url: string; apiKey: string };
		expect(parsed.url).toBe("https://test.kimai.example.com");
		expect(parsed.apiKey).toBe("test-api-key-abc");

		// Verify mkdir was called with mode 0o700 (secure directory).
		expect(vi.mocked(fsPromises.mkdir).mock.calls).toHaveLength(1);
		const [, mkdirOpts] = vi.mocked(fsPromises.mkdir)
			.mock.calls[0] as [string, { mode?: number }];
		expect(mkdirOpts.mode).toBe(0o700);

		// Verify chmod was called to enforce mode 0o600 on the config file.
		expect(vi.mocked(fsPromises.chmod).mock.calls).toHaveLength(1);
	});

	it("trims trailing slash from the saved URL", async () => {
		// Override the default mock values for this specific test.
		const { createInterface } = await import("node:readline/promises");
		const mockRl = {
			question: vi
				.fn()
				.mockResolvedValueOnce("https://kimai.example.com/")
				.mockResolvedValueOnce("key"),
			close: vi.fn(),
		};
		vi.mocked(createInterface).mockReturnValue(
			mockRl as unknown as ReturnType<typeof createInterface>,
		);

		// Update readFileSync to return the trimmed URL.
		const fsMock = await import("fs");
		vi.mocked(fsMock.readFileSync).mockImplementation((path: string) => {
			if (typeof path === "string" && path.includes("auth.json")) {
				return JSON.stringify({
					url: "https://kimai.example.com",
					apiKey: "key",
				});
			}
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		});

		const { runWizard } = await import("./setup.js");
		await runWizard();

		const [, writtenContent] = vi.mocked(fsPromises.writeFile)
			.mock.calls[0] as [string, string];
		const parsed = JSON.parse(writtenContent) as { url: string };
		expect(parsed.url).toBe("https://kimai.example.com");
	});
});
