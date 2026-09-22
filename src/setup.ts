import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdir, writeFile, chmod, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { loadAuthConfig, getConfigPath } from "./config.js";

export interface EnsureAuthOptions {
	skip?: boolean;
}

const DEFAULT_CONFIG_DIR = "~/.kimai-cli";
const DEFAULT_CONFIG_PATH = "~/.kimai-cli/auth.json";

/**
 * Ensure auth credentials exist. If not, run an interactive setup wizard.
 *
 * Skip conditions (in order):
 * - opts.skip is true (e.g. --no-setup flag)
 * - KIMAI_API_KEY env var is set
 * - KIMAI_NO_SETUP=1
 * - auth.json already exists at any known location
 *
 * Throws when credentials are missing AND we cannot prompt (no TTY, no env).
 */
export async function ensureAuth(opts: EnsureAuthOptions = {}): Promise<void> {
	if (opts.skip) return;
	if (process.env.KIMAI_API_KEY) return;
	if (process.env.KIMAI_NO_SETUP === "1") return;

	// Already configured? Just verify it loads.
	if (getConfigPath()) {
		loadAuthConfig();
		return;
	}
	const envUrl = process.env.KIMAI_URL || process.env.KIMAI_API_URL;
	if (envUrl && process.env.KIMAI_API_KEY) {
		loadAuthConfig();
		return;
	}

	// No config and no usable env vars — need interactive setup.
	if (!input.isTTY || !output.isTTY) {
		throw new Error(
			`No auth.json found at ${DEFAULT_CONFIG_PATH} or ./auth.json.\n` +
				`Set KIMAI_URL and KIMAI_API_KEY env vars, or run interactively in a terminal.\n` +
				`Pass --no-setup to suppress this check in scripts/CI.`,
		);
	}

	await loginWizard();
}

/**
 * Validate and normalise a Kimai URL entered by the user.
 *
 * - Trims whitespace.
 * - Strips trailing slashes.
 * - Requires the https:// scheme (HTTP would leak the API key).
 *
 * @param rawUrl - The raw user input.
 * @returns The validated, normalised URL (no trailing slash).
 * @throws Error on empty, non-https, or otherwise invalid input.
 */
export function validateKimaiUrl(rawUrl: string): string {
	const url = rawUrl.trim().replace(/\/+$/, "");
	if (!url) {
		throw new Error("URL is required");
	}
	if (!/^https:\/\//i.test(url)) {
		throw new Error(
			`URL must use https://. Plain http would expose your API key. (got: ${url})`,
		);
	}
	return url;
}

/**
 * Interactive first-run wizard: prompt for URL + API key, save to ~/.kimai-cli/auth.json.
 *
 * Exported so tests can call it directly without going through ensureAuth,
 * which avoids module-caching issues in the test environment.
 */
export async function loginWizard(): Promise<void> {
	const rl = createInterface({ input, output });

	try {
		console.error("\n🔧 First-run setup — Kimai credentials");
		console.error(
			`No config found at ${DEFAULT_CONFIG_PATH}. Let's create one.\n`,
		);

		const rawUrl = await rl.question(
			"Kimai URL (e.g. https://kimai.example.com): ",
		);
		const url = validateKimaiUrl(rawUrl);

		const apiKey = (await rl.question("API key: ")).trim();
		if (!apiKey) {
			throw new Error("API key is required");
		}

		const configDir = expandHome(DEFAULT_CONFIG_DIR);
		const configPath = expandHome(DEFAULT_CONFIG_PATH);

		await mkdir(configDir, { recursive: true, mode: 0o700 });
		await writeFile(
			configPath,
			JSON.stringify({ url, apiKey }, null, 2) + "\n",
			{ mode: 0o600 },
		);
		// Ensure mode even when file already existed from a previous partial run.
		try {
			await chmod(configPath, 0o600);
		} catch {
			/* ignore chmod failures on platforms that don't support it */
		}

		// Verify it loads.
		loadAuthConfig();

		console.error(`\n✓ Saved credentials to ${configPath} (mode 0600).`);
		console.error(
			"  Tip: re-run with --no-setup if you ever need to bypass this wizard.\n",
		);
	} finally {
		rl.close();
	}
}

/**
 * @deprecated Use loginWizard instead.
 */
export const runWizard = loginWizard;

function expandHome(p: string): string {
	const home = homedir();
	if (p === "~") return home;
	if (p.startsWith("~/")) return join(home, p.slice(2));
	return p;
}

// Re-export so callers don't need a separate config import.
export { loadAuthConfig, getConfigPath };

// Suppress unused-import warning for `stat` (kept for future permission audit).
void stat;
