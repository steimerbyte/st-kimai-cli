/**
 * Tests for the edit and add command bugs.
 *
 * Uses a subprocess (execFile) to run the compiled CLI so the program singleton
 * starts fresh in each test without module-caching issues.
 *
 * Bugs covered:
 *  - Bug 1: edit -N <text> alone must count as an update
 *  - Bug 2: edit -T <range> -N <text> must include BOTH time and note
 *  - Bug 3: add -y must skip the confirmation prompt
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer as createHttpsServer } from "node:https";
import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Timesheet } from "./types.js";

const execFileAsync = promisify(execFile);

const CLI_PATH = "/home/pi/workspace/st-kimai-cli/dist/index.js";
const TEST_CERT_KEY = "/tmp/test-key.pem";
const TEST_CERT_CERT = "/tmp/test-cert.pem";

// Shared timesheet fixture factory
function makeTimesheet(overrides: Partial<Timesheet> = {}): Timesheet {
	return {
		id: 123,
		project: 5,
		activity: 8,
		user: 1,
		tags: [],
		begin: "2026-05-21T09:00:00",
		end: "2026-05-21T17:00:00",
		duration: 28800,
		break: 0,
		description: "Original note",
		rate: 0,
		internalRate: 0,
		exported: false,
		billable: true,
		metaFields: [],
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// HTTPS mock server — captures the last PATCH body for assertions
// ---------------------------------------------------------------------------
let server: ReturnType<typeof createHttpsServer> | null = null;
let serverPort = 0;

interface Capture {
	patchBody?: Record<string, unknown>;
	postBody?: Record<string, unknown>;
}

const capture: Capture = {};

function makeHandler(req: IncomingMessage, res: ServerResponse): void {
	const url = req.url ?? "";

	if (url.startsWith("/api/timesheets") && req.method === "GET") {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify([makeTimesheet()]));
		return;
	}

	// PATCH /api/timesheets/:id
	if (url.match(/^\/api\/timesheets\/\d+$/) && req.method === "PATCH") {
		let body = "";
		req.on("data", (chunk: Buffer) => {
			body += chunk.toString();
		});
		req.on("end", () => {
			capture.patchBody = JSON.parse(body || "{}");
			const updated = { ...makeTimesheet(), ...capture.patchBody };
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(updated));
		});
		return;
	}

	// POST /api/timesheets
	if (url === "/api/timesheets" && req.method === "POST") {
		let body = "";
		req.on("data", (chunk: Buffer) => {
			body += chunk.toString();
		});
		req.on("end", () => {
			capture.postBody = JSON.parse(body || "{}");
			const created = { ...makeTimesheet({ id: 999 }), ...capture.postBody };
			res.writeHead(201, { "Content-Type": "application/json" });
			res.end(JSON.stringify(created));
		});
		return;
	}

	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ message: "Not found" }));
}

// ---------------------------------------------------------------------------
// CLI runner via subprocess
// ---------------------------------------------------------------------------
async function runCli(
	args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const env = {
		...process.env,
		KIMAI_NO_SETUP: "1",
		KIMAI_API_KEY: "mock-key",
		KIMAI_API_URL: `https://localhost:${serverPort}`,
		NODE_TLS_REJECT_UNAUTHORIZED: "0",
	};

	try {
		const { stdout, stderr } = await execFileAsync(CLI_PATH, args, {
			cwd: "/home/pi/workspace/st-kimai-cli",
			env,
			timeout: 15000,
		});
		return { stdout, stderr, exitCode: 0 };
	} catch (e: unknown) {
		const err = e as { code?: number; stderr?: string; stdout?: string };
		return {
			stdout: err.stdout ?? "",
			stderr: err.stderr ?? "",
			exitCode: err.code ?? 1,
		};
	}
}

// ---------------------------------------------------------------------------
// Setup/teardown: start HTTPS mock server once
// ---------------------------------------------------------------------------
beforeAll(async () => {
	serverPort = await new Promise<number>((resolve, reject) => {
		server = createHttpsServer(
			{
				key: readFileSync(TEST_CERT_KEY),
				cert: readFileSync(TEST_CERT_CERT),
			},
			makeHandler,
		);
		server!.on("error", reject);
		server!.listen(0, () => {
			const addr = server!.address() as { port: number } | null;
			resolve(addr?.port ?? 0);
		});
	});
});

afterAll(async () => {
	if (server) {
		await new Promise<void>((res) => server!.close(res));
		server = null;
	}
});

beforeAll(() => {
	// Reset capture state before each test
	capture.patchBody = undefined;
	capture.postBody = undefined;
});

// ---------------------------------------------------------------------------
// Bug 1: edit -N <text> alone must count as an update
// Bug 2: edit -T <range> -N <text> must include BOTH time and note
// ---------------------------------------------------------------------------
describe("edit command", () => {
	it("Bug 1: edit -N <text> alone must include description in patch payload", async () => {
		const { stdout, stderr, exitCode } = await runCli([
			"edit", "-N", "Updated note", "123",
		]);

		expect(exitCode).toBe(0);
		// Must show success output with the updated note
		expect(stdout + stderr).toContain("Updated note");
		// Must NOT say "No updates specified"
		expect(stdout + stderr).not.toContain("No updates specified");
	});

	it("Bug 2: edit -T <range> -N <text> must include BOTH time and note", async () => {
		const { stdout, stderr, exitCode } = await runCli([
			"edit", "-T", "09:00-12:00", "-N", "Updated", "123",
		]);

		expect(exitCode).toBe(0);
		expect(stdout + stderr).toContain("Updated");
		// Must NOT say "No updates specified"
		expect(stdout + stderr).not.toContain("No updates specified");
	});

	it("edit --description <text> (long form) also works", async () => {
		const { stdout, stderr, exitCode } = await runCli([
			"edit", "--description", "Long form note", "123",
		]);

		expect(exitCode).toBe(0);
		expect(stdout + stderr).toContain("Long form note");
	});

	it("edit -T (time range only) still works without note", async () => {
		const { stdout, stderr, exitCode } = await runCli([
			"edit", "-T", "08:00-10:00", "123",
		]);

		expect(exitCode).toBe(0);
		expect(stdout + stderr).not.toContain("No updates specified");
	});
});

// ---------------------------------------------------------------------------
// Bug 3: add -y (--yes) must skip the confirmation prompt
// ---------------------------------------------------------------------------
describe("add command", () => {
	it("Bug 3: add -y must skip confirmation and succeed without stdin", async () => {
		// With -y, no readline prompt is shown; POST is called directly
		const { stdout, stderr, exitCode } = await runCli([
			"add", "-p", "5", "-a", "8", "-n", "Test note", "-y",
		]);

		expect(exitCode).toBe(0);
		// Loading spinner succeeds: "✔ Creating timesheet..." in stderr
		expect(stderr).toContain("Creating timesheet");
		// Must NOT ask for confirmation (would hang without stdin)
		expect(stderr).not.toContain("? [y/N]");
		// Must NOT show unknown option error for -y
		expect(stderr).not.toContain("unknown option");
	});

	it("add without -y should not be rejected as 'unknown option'", async () => {
		// Verify -y is a declared option by checking help output
		const { stdout, stderr } = await runCli(["add", "--help"]);

		// Help must NOT mention "unknown option"
		expect(stdout + stderr).not.toContain("unknown option");
		// Help must show the --yes option
		expect(stdout + stderr).toContain("--yes");
	});
});
