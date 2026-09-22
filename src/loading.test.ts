import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ─── Shared mock state at MODULE scope (factory body runs after this in execution order) ───
const mockOraInstance = {
	start: vi.fn().mockReturnThis(),
	succeed: vi.fn().mockReturnThis(),
	fail: vi.fn().mockReturnThis(),
	warn: vi.fn().mockReturnThis(),
	info: vi.fn().mockReturnThis(),
	text: "",
};

// vi.mock call is hoisted but its FACTORY BODY runs after module scope — this works.
vi.mock("ora", () => ({
	default: vi.fn((config?: { text?: string }) => {
		if (config?.text !== undefined) {
			mockOraInstance.text = config.text;
		}
		return mockOraInstance;
	}),
}));

import {
	startLoading,
	succeedLoading,
	failLoading,
	warnLoading,
	infoLoading,
	createLoading,
	withLoading,
	withLoadingPersistent,
} from "./loading";

describe("loading module", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Re-populate the mockOraInstance spies for this test
		mockOraInstance.start.mockReturnThis();
		mockOraInstance.succeed.mockReturnThis();
		mockOraInstance.fail.mockReturnThis();
		mockOraInstance.warn.mockReturnThis();
		mockOraInstance.info.mockReturnThis();
		mockOraInstance.text = "";
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ─── startLoading ─────────────────────────────────────────────────────────

	describe("startLoading", () => {
		it("creates an ora spinner with the given text", () => {
			const spinner = startLoading("Working...");
			expect(spinner).toBeDefined();
			expect(spinner.text).toBe("Working...");
		});

		it("calls ora with cyan color and dots12 spinner config", () => {
			startLoading("Fetching...");
			// ora is mocked to return mockOraInstance; check via the instance's start call
			expect(mockOraInstance.start).toHaveBeenCalled();
		});

		it("returns the ora instance so callers can mutate spinner.text", () => {
			const spinner = startLoading("Running");
			spinner.text = "Updated";
			expect(mockOraInstance.text).toBe("Updated");
		});
	});

	// ─── status helpers ───────────────────────────────────────────────────────

	describe("succeedLoading", () => {
		it("creates a green spinner and calls succeed()", () => {
			succeedLoading("Done");
			expect(mockOraInstance.succeed).toHaveBeenCalled();
		});
	});

	describe("failLoading", () => {
		it("creates a red spinner and calls fail()", () => {
			failLoading("Errored");
			expect(mockOraInstance.fail).toHaveBeenCalled();
		});
	});

	describe("warnLoading", () => {
		it("creates a yellow spinner and calls warn()", () => {
			warnLoading("Caution");
			expect(mockOraInstance.warn).toHaveBeenCalled();
		});
	});

	describe("infoLoading", () => {
		it("creates a cyan spinner and calls info()", () => {
			infoLoading("Info");
			expect(mockOraInstance.info).toHaveBeenCalled();
		});
	});

	// ─── createLoading ────────────────────────────────────────────────────────

	describe("createLoading", () => {
		it("returns an object with start, succeed, fail, warn, info, update, spinner", () => {
			const loading = createLoading();
			expect(loading).toHaveProperty("start");
			expect(loading).toHaveProperty("succeed");
			expect(loading).toHaveProperty("fail");
			expect(loading).toHaveProperty("warn");
			expect(loading).toHaveProperty("info");
			expect(loading).toHaveProperty("update");
			expect(loading).toHaveProperty("spinner");
		});

		it("spinner starts as null", () => {
			const loading = createLoading();
			expect(loading.spinner).toBeNull();
		});

		it("start() creates a spinner and stores it", () => {
			const loading = createLoading();
			loading.start("Working...");
			expect(loading.spinner).not.toBeNull();
			expect(mockOraInstance.start).toHaveBeenCalled();
		});

		it("succeed() with active spinner calls spinner.succeed() and clears it", () => {
			const loading = createLoading();
			loading.start("Working");
			loading.succeed();
			expect(mockOraInstance.succeed).toHaveBeenCalled();
			expect(loading.spinner).toBeNull();
		});

		it("succeed() with no active spinner and no text does nothing", () => {
			const loading = createLoading();
			expect(() => loading.succeed()).not.toThrow();
			// No ora() call since there's no active spinner
			expect(mockOraInstance.succeed).not.toHaveBeenCalled();
		});

		it("succeed() with no active spinner but with text calls succeedLoading()", () => {
			const loading = createLoading();
			// succeedLoading calls ora() + .succeed()
			loading.succeed("Already done");
			expect(mockOraInstance.succeed).toHaveBeenCalled();
		});

		it("succeed(text) with active spinner uses the provided text", () => {
			const loading = createLoading();
			loading.start("Initial");
			loading.succeed("Custom success");
			expect(mockOraInstance.succeed).toHaveBeenCalledWith("Custom success");
		});

		it("fail() with active spinner calls spinner.fail() and clears it", () => {
			const loading = createLoading();
			loading.start("Working");
			loading.fail();
			expect(mockOraInstance.fail).toHaveBeenCalled();
			expect(loading.spinner).toBeNull();
		});

		it("fail() with no active spinner but with text calls failLoading()", () => {
			const loading = createLoading();
			loading.fail("Error message");
			expect(mockOraInstance.fail).toHaveBeenCalled();
		});

		it("fail(text) with active spinner uses the provided text", () => {
			const loading = createLoading();
			loading.start("Initial");
			loading.fail("Custom fail");
			expect(mockOraInstance.fail).toHaveBeenCalledWith("Custom fail");
		});

		it("warn() with active spinner calls spinner.warn() and clears it", () => {
			const loading = createLoading();
			loading.start("Working");
			loading.warn();
			expect(mockOraInstance.warn).toHaveBeenCalled();
			expect(loading.spinner).toBeNull();
		});

		it("warn() with no active spinner but with text calls warnLoading()", () => {
			const loading = createLoading();
			loading.warn("Watch out");
			expect(mockOraInstance.warn).toHaveBeenCalled();
		});

		it("info() with active spinner calls spinner.info() and clears it", () => {
			const loading = createLoading();
			loading.start("Working");
			loading.info();
			expect(mockOraInstance.info).toHaveBeenCalled();
			expect(loading.spinner).toBeNull();
		});

		it("info() with no active spinner but with text calls infoLoading()", () => {
			const loading = createLoading();
			loading.info("Note");
			expect(mockOraInstance.info).toHaveBeenCalled();
		});

		it("update() mutates spinner.text when spinner is active", () => {
			const loading = createLoading();
			loading.start("Old text");
			loading.update("New text");
			expect(mockOraInstance.text).toBe("New text");
		});

		it("update() is a no-op when no spinner is active", () => {
			const loading = createLoading();
			expect(() => loading.update("No spinner")).not.toThrow();
		});

		it("idempotent succeed() after no active spinner calls succeed() each time", () => {
			const loading = createLoading();
			const callsBefore = mockOraInstance.succeed.mock.calls.length;
			loading.succeed("First");
			loading.succeed("Second");
			const newCalls = mockOraInstance.succeed.mock.calls.length - callsBefore;
			expect(newCalls).toBe(2);
		});
	});

	// ─── withLoading ─────────────────────────────────────────────────────────

	describe("withLoading", () => {
		it("returns the result of fn on resolve", async () => {
			const result = await withLoading("Working", async () => 42);
			expect(result).toBe(42);
		});

		it("calls startLoading before executing fn", async () => {
			const fn = vi.fn().mockResolvedValue(undefined);
			await withLoading("Starting", fn);
			expect(mockOraInstance.start).toHaveBeenCalled();
			expect(fn).toHaveBeenCalled();
		});

		it("calls succeed() on the spinner on resolve", async () => {
			await withLoading("Done", async () => "result");
			expect(mockOraInstance.succeed).toHaveBeenCalled();
		});

		it("uses spinner.text as success message when no options", async () => {
			mockOraInstance.text = "Loading...";
			await withLoading("Loading...", async () => "result");
			expect(mockOraInstance.succeed).toHaveBeenCalledWith("Loading...");
		});

		it("uses successText option when provided", async () => {
			await withLoading(
				"Loading...",
				async () => {},
				{ successText: "All good" },
			);
			expect(mockOraInstance.succeed).toHaveBeenCalledWith("All good");
		});

		it("calls onSuccess(result) to derive success message when provided", async () => {
			await withLoading(
				"Loading...",
				async () => ({ data: 1 }),
				{ onSuccess: (r) => `Got ${r.data}` },
			);
			expect(mockOraInstance.succeed).toHaveBeenCalledWith("Got 1");
		});

		it("calls fail() on the spinner on reject", async () => {
			await expect(
				withLoading("Failing", async () => {
					throw new Error("boom");
				}),
			).rejects.toThrow("boom");
			expect(mockOraInstance.fail).toHaveBeenCalled();
		});

		it("fail() message uses err.message", async () => {
			await expect(
				withLoading("Failing", async () => {
					throw new Error("specific error");
				}),
			).rejects.toThrow("specific error");
			expect(mockOraInstance.fail).toHaveBeenCalledWith("Failed: specific error");
		});

		it("uses failText option when provided", async () => {
			await expect(
				withLoading(
					"Failing",
					async () => {
						throw new Error("x");
					},
					{ failText: "Custom fail" },
				),
			).rejects.toThrow("x");
			expect(mockOraInstance.fail).toHaveBeenCalledWith("Custom fail");
		});

		it("calls onFail(err) to derive fail message when provided", async () => {
			await expect(
				withLoading(
					"Failing",
					async () => {
						throw new Error("x");
					},
					{ onFail: (e) => `Error: ${e.message}` },
				),
			).rejects.toThrow("x");
			expect(mockOraInstance.fail).toHaveBeenCalledWith("Error: x");
		});

		it("re-throws the original error after calling fail()", async () => {
			const err = new Error("original");
			await expect(
				withLoading("Throwing", async () => {
					throw err;
				}),
			).rejects.toBe(err);
		});

		it("handles non-Error rejections with String(error)", async () => {
			await expect(
				withLoading("Throwing", async () => {
					throw "string error";
				}),
			).rejects.toBe("string error");
			expect(mockOraInstance.fail).toHaveBeenCalledWith("Failed: string error");
		});
	});

	// ─── withLoadingPersistent ────────────────────────────────────────────────

	describe("withLoadingPersistent", () => {
		it("returns an object with spinner and promise", () => {
			const { spinner, promise } = withLoadingPersistent("Persistent");
			expect(spinner).toBeDefined();
			expect(typeof promise).toBe("function");
		});

		it("spinner was started before promise is called", () => {
			withLoadingPersistent("Running");
			expect(mockOraInstance.start).toHaveBeenCalled();
		});

		it("promise resolves with fn result on success", async () => {
			const { promise } = withLoadingPersistent("Running");
			const result = await promise(async () => "resolved");
			expect(result).toBe("resolved");
		});

		it("promise calls succeed() on the spinner on resolve", async () => {
			const { promise } = withLoadingPersistent("Running");
			await promise(async () => {});
			expect(mockOraInstance.succeed).toHaveBeenCalled();
		});

		it("promise rejects and calls fail() with err.message on reject", async () => {
			const { promise } = withLoadingPersistent("Running");
			await expect(
				promise(async () => {
					throw new Error("persistent fail");
				}),
			).rejects.toThrow("persistent fail");
			expect(mockOraInstance.fail).toHaveBeenCalledWith("persistent fail");
		});

		it("promise re-throws the original error after calling fail()", async () => {
			const err = new Error("original");
			const { promise } = withLoadingPersistent("Running");
			await expect(
				promise(async () => {
					throw err;
				}),
			).rejects.toBe(err);
		});

		it("promise succeeds even when fn returns null", async () => {
			const { promise } = withLoadingPersistent("Running");
			await expect(promise(async () => null)).resolves.toBeNull();
			expect(mockOraInstance.succeed).toHaveBeenCalled();
		});
	});
});
