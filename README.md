# st-kimai-cli

A modern CLI for Kimai time-tracking. One-liner entries, pause detection, and smart defaults.

[![Coverage](https://img.shields.io/badge/coverage-87%25-yellowgreen)](#testing)

> **v3.0.0 — BREAKING CLI redesign.** All commands redesigned for consistency. 17 commands removed, 21 single-shot commands remain. See [MIGRATION.md](./MIGRATION.md) for the upgrade guide.

---

## Installation

### From source (recommended)

```bash
git clone https://github.com/steimerbyte/st-kimai-cli.git
cd st-kimai-cli
npm ci
npm run build
npm link            # makes `kimai-cli` available globally
```

To uninstall the global link: `npm unlink -g st-kimai-cli`.

### Download tarball

Grab `st-kimai-cli-2.0.0.tgz` from the [GitHub release](https://github.com/steimerbyte/st-kimai-cli/releases/tag/v2.0.0), then:

```bash
mkdir st-kimai-cli && cd st-kimai-cli
tar -xzf ../st-kimai-cli-2.0.0.tgz
npm install --omit=dev
node ./package/dist/index.js --help
```

---

## Setup

### Authentication

The CLI requires credentials (Kimai URL + API key). Configure them interactively:

```bash
kimai-cli auth login   # interactive TTY prompt; saves to ~/.kimai-cli/auth.json
```

For CI or scripted environments, use environment variables instead:

```bash
export KIMAI_URL="https://your-kimai-server.com"
export KIMAI_API_KEY="your-api-key"
```

URLs must use `https://` (plain `http://` is rejected to avoid leaking the API key on the wire).

### Manual setup

Create `~/.kimai-cli/auth.json`:

```json
{
  "url": "https://your-kimai-server.com",
  "apiKey": "<your-api-token>"
}
```

Or use environment variables:

```bash
export KIMAI_URL="https://your-kimai-server.com"
export KIMAI_API_KEY="<your-api-token>"
```

### Security defaults (v2.0.1+)

The CLI applies several hardening defaults. If you hit any of them in legacy setups:

| Behavior | Opt-out |
|---|---|
| Refuses HTTP redirects (`fetch` follows none; any 3xx becomes an error) | None — contact upstream Kimai if you see 3xx |
| Refuses to read auth.json with mode `> 0600` (other-readable bits set) | `KIMAI_RELAX_PERMS=1` |
| Refuses to follow a symlinked auth.json | None — replace with a regular file |
| Config path is resolved via `os.homedir()`; cwd-relative `./auth.json` is no longer auto-discovered | Pass `--config <path>` explicitly |

---

## Quick Start

The `add` command is the primary way to log time:

```bash
# Basic - project + activity + note + time range
kimai-cli add -p 5 -a 8 -n "Projektarbeit" -t 09:00-17:00

# With specific date
kimai-cli add -p 5 -a 8 -n "Meeting" -t 09:00-10:30 -d 22.05.2026

# Start a running timer
kimai-cli start -p 5 -a 8 -n "Working"
kimai-cli stop
```

### Options

| Flag | Description | Example |
|------|-------------|---------|
| `-p <id>` | Project ID | `-p 5` |
| `-a <id>` | Activity ID | `-a 8` |
| `-n <text>` | Description / note | `-n "Meeting"` |
| `-d <date>` | Date DD.MM.YYYY | `-d 22.05` |
| `-t <range>` | Time range HH:MM-HH:MM | `-t 09:00-17:00` |

---

## Find IDs

```bash
kimai-cli projects      # List all projects with IDs
kimai-cli activities    # List all activities with IDs
```

---

## Common Tasks

### Start/Stop Timer

```bash
kimai-cli start -p 5 -a 8 -n "Working"
kimai-cli stop
```

### Edit Entry

```bash
kimai-cli edit 123 -n "Updated note"
kimai-cli edit 123 -t 10:00-12:00
kimai-cli edit 123 -a 4
```

### Duplicate Entry

```bash
kimai-cli duplicate 123              # Copy to next day
kimai-cli duplicate 123 -d 22.05.2026  # Copy to specific date
```

### View Entries

```bash
kimai-cli list --today           # Today's entries
kimai-cli list --week            # This week
kimai-cli list --month           # Current month
kimai-cli list --from 01.05 --to 31.05  # Date range
kimai-cli list --project 5      # Filter by project
kimai-cli list --query "meeting" # Search descriptions
```

---

## Smart Features

- **Pause Detection**: Warns when no lunch break detected
- **Gap Detection**: Shows missing time between entries
- **Date Formats**: ISO, DD.MM.YYYY (today is the default on `add`)

---

## All Commands

```bash
kimai-cli add -p <id> -a <id> -n <text> -t HH:MM-HH:MM [-d DD.MM.YYYY]  # Log completed time
kimai-cli edit <id>          # Edit description, time, project, activity
kimai-cli remove <id>        # Delete a timesheet
kimai-cli show <id>          # Show timesheet details
kimai-cli start -p <id> -a <id> [-n <text>]  # Start a running timer
kimai-cli stop               # Stop running timer(s)
kimai-cli list               # List timesheets (--today|--week|--month|--from|--to)
kimai-cli duplicate <id>     # Duplicate to next day or specific date
kimai-cli projects           # List all projects
kimai-cli project <id>       # Show project details
kimai-cli activities         # List activities
kimai-cli activity <id>      # Show activity details
kimai-cli customers          # List customers
kimai-cli tags               # List tags
kimai-cli suggest            # Quick reference: projects + activities
kimai-cli whoami             # Show authenticated user
kimai-cli config             # Show current auth config
kimai-cli auth login         # Configure credentials (interactive)
kimai-cli auth logout        # Remove stored credentials
kimai-cli help [cmd]         # Show help
kimai-cli version            # Show version
```

---

## Development

```bash
npm ci                    # clean install (use this, not npm install)
npm run build             # tsc + chmod +x
npm run test:run          # one-shot vitest
npm run test              # vitest watch
```

Built artifacts land in `dist/`. The build script runs `chmod +x dist/index.js` automatically, so the `bin` entry stays executable after every build.

---

## Testing

Run the test suite with [Vitest](https://vitest.dev):

| Command | Description |
|---|---|
| `npm run test` | Vitest in watch mode (re-runs on file changes) |
| `npm run test:run` | One-shot Vitest run (CI-friendly) |
| `npm run coverage` | Run tests with v8 coverage enabled |
| `npm run coverage:html` | Generate an HTML coverage report under `coverage/` |

### Coverage thresholds

The project enforces minimum coverage thresholds that will fail the build:

| Metric | Threshold |
|---|---|
| Lines | 70% |
| Statements | 70% |
| Functions | 70% |
| Branches | 60% |

### Current coverage

Coverage (from the 5 passing test suites) is currently at **87% lines / 86% statements / 80% functions / 79% branches**. The project tracks growth toward full coverage.

### Test files

- `src/api.test.ts` — API client tests
- `src/config.test.ts` — Configuration loading and validation tests
- `src/setup.test.ts` — First-run wizard tests
- `src/utils.test.ts` — Utility function tests
- `src/loading.test.ts` — Spinner and loading-state tests (added in v2.0.2)
- `src/design-system.test.ts` — Design-system (colors, icons, pad, truncate, etc.) tests (added in v2.0.2)

### CI

GitHub Actions runs the same suite on every push — see [`.github/workflows/test.yml`](.github/workflows/test.yml).

---

## License

MIT

---

## Hinweis zur KI-Unterstützung

Bei der Entwicklung dieses Projekts wurden teilweise oder vollständig KI-gestützte Tools und Technologien eingesetzt.
