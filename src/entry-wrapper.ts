/**
 * Test wrapper for CLI integration testing.
 * Prevents index.ts from calling program.parse() at import time.
 * Instead, it exports a `run` function that calls program.parseAsync(args).
 *
 * Usage in tests:
 *   import { run } from "./entry-wrapper.js";
 *   await run(["edit", "-N", "Updated", "123"]);
 */
import { program } from "./index.js";

export async function run(args: string[]): Promise<void> {
	await program.parseAsync(["kimai-cli", ...args]);
}
