# st-kimai-cli

A modern CLI for Kimai time-tracking. One-liner entries, pause detection, and smart defaults.

> **v2.0.0 — ESM-only release.** Project now ships as native ESM (`"type": "module"`, `module: NodeNext`). Requires Node 18+. Consumers using `require()` must migrate to dynamic `import()`.

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

### First-run wizard

If no `auth.json` exists and no `KIMAI_API_KEY` env var is set, the CLI will prompt for your Kimai URL and API key on first use, then save them to `~/.kimai-cli/auth.json` (mode `0600`). On non-interactive runs (CI, scripts) the wizard is skipped automatically.

Pass `--no-setup` to bypass the wizard in any environment.

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

---

## Quick Start (One-Liner Entry)

The fastest way to log time:

```bash
# Basic - project + activity + note
kimai-cli -p 5 -a 8 -n "Projektarbeit"

# With time range
kimai-cli -p 5 -a 8 -n "Meeting" -t 09:00-10:30

# With date
kimai-cli -p 5 -a 8 -n "Coding" -d 22.05.2026 -t 09:00-12:00

# Duration shortcut (+ means hours from start)
kimai-cli -p 5 -a 8 -n "Working" -d 22.05 -t 09:00+3h
```

### Options

| Flag | Description | Example |
|------|-------------|---------|
| `-p <id>` | Project ID | `-p 5` |
| `-a <id>` | Activity ID | `-a 8` |
| `-n <text>` | Note/description | `-n "Meeting"` |
| `-d <date>` | Date (YYYY-MM-DD or DD.MM.YYYY) | `-d 22.05` |
| `-t <range>` | Time range | `-t 09:00-12:00` |
| `-b <HH:MM>` | Start time | `-b 09:00` |
| `-e <HH:MM>` | End time | `-e 17:00` |
| `-g <tags>` | Tags | `-g meeting,client` |

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

### Copy Entry

```bash
kimai-cli copy 123 1        # Copy to tomorrow
kimai-cli copy 123 1 5       # Copy next 5 days
```

### View Entries

```bash
kimai-cli today           # Today's entries
kimai-cli week            # This week
kimai-cli month           # Current month
kimai-cli day             # Day view with gap detection
kimai-cli list -p 5       # Filter by project
```

### Search

```bash
kimai-cli search "meeting"
kimai-cli tagged important
```

---

## Smart Features

- **Pause Detection**: Warns when no lunch break detected
- **Gap Detection**: Shows missing time between entries
- **Date Formats**: ISO, DD.MM.YYYY, relative (today, yesterday)
- **Duration Shortcuts**: `09:00+2h` = 2 hours from 09:00

---

## All Commands

```bash
kimai-cli status              # API connection check
kimai-cli projects            # List projects
kimai-cli activities          # List activities
kimai-cli customers           # List customers
kimai-cli tags                # List tags
kimai-cli current             # Running timers
kimai-cli timer               # Interactive timer mode
kimai-cli range               # Batch add for date range
kimai-cli summary             # Totals by project/activity
```

---

## Options

Most commands support:

- `--json` - JSON output
- `-y, --yes` - Skip confirmation
- `-c, --config <path>` - Custom config file

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

## License

MIT

---

## Hinweis zur KI-Unterstützung

Bei der Entwicklung dieses Projekts wurden teilweise oder vollständig KI-gestützte Tools und Technologien eingesetzt.
