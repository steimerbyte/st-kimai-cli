# v2.0.2 — Test Coverage Release

## Tests

This release adds test coverage across all source files. The project now has a
working `npm run coverage` script and a configured v8 coverage provider with
thresholds (lines 70%, branches 60%, functions 70%, statements 70%) that fail
the build if coverage regresses.

### New test files

- `src/loading.test.ts` — full coverage of the ora-based spinner helpers
  (`startLoading`, `succeedLoading`, `failLoading`, `warnLoading`,
  `infoLoading`, `createLoading`, `withLoading`, `withLoadingPersistent`).
- `src/design-system.test.ts` — full coverage of the design-system formatting
  helpers (color detection, headers, separators, status messages).

### Extended test files

- `src/api.test.ts` — adds tests for the v2.0.1 redirect-leak fix: 3xx responses
  are now refused, `Authorization: Bearer` header is forwarded, and the happy
  path (200) still works.
- `src/setup.test.ts` — adds `validateKimaiUrl` helper tests covering
  https-only, http-rejection, empty input, ftp/javascript: schemes, and
  trailing-slash normalization. TTY-only wizard integration via mocked
  readline.
- `src/utils.test.ts` — coverage gaps filled: `formatDuration`, `parseDate`,
  `parseTimeRange`, `parseBreak`, `getCalendarWeek`, `getProjectName`,
  `getActivityName`, `shouldUseColor`, all printer functions, plus
  `sanitizeError` / `formatError` / `truncate` / `colorizeDuration` /
  `colorizeStatus` paths.

### Coverage tool

- `@vitest/coverage-v8` added as devDependency.
- `vitest.config.ts` extracted from package.json (vitest 4.x requires the file).
- `npm run coverage` runs the full test suite with v8 coverage; `npm run
  coverage:html` writes an HTML report under `coverage/`.

## Other

- `.gitignore` excludes the `coverage/` directory.

## Upgrade notes

No user-facing changes. Behavior identical to v2.0.1. Drop-in replacement.
