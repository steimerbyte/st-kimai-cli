import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		environment: "node",
	},
	coverage: {
		enabled: true,
		provider: "v8",
		reportsDirectory: "./coverage",
		reporter: ["text", "html", "json-summary"],
		include: ["src/**/*.ts"],
		exclude: [
			"src/**/*.test.ts",
			"src/types.ts",
			"src/constants.ts",
			"src/index.ts",
		],
		thresholds: {
			lines: 70,
			branches: 60,
			functions: 70,
			statements: 70,
		},
	},
});
