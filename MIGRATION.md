# Migration Guide: v2.x → v3.0.0

This guide covers every breaking change introduced in v3.0.0. The full release notes are in the v3.0.0 release notes.

---

## Overview

v3.0.0 is a breaking redesign of the CLI command surface. The number of single-shot commands grew from 4 to 21, while 17 old commands were removed. The CLI is now built around explicit verbs (`add`, `edit`, `remove`, `show`, `list`) with a consistent flag interface.

Why breaking: the old implicit entry mode (`kimai-cli -p 5 -a 8 -n "X"`) was removed in favor of a single `add` command with required flags. This change makes the CLI predictable, scriptable, and easier to extend.

---

## Removed Commands

Replace each old command with the new equivalent:

| Old command | Use instead |
|---|---|
| `kimai-cli delete <id>` | `kimai-cli remove <id>` |
| `kimai-cli log <desc>` | `kimai-cli add -p <id> -a <id> -n <desc> -t HH:MM-HH:MM` |
| `kimai-cli quick <desc>` | `kimai-cli add -p <id> -a <id> -n <desc> -t HH:MM-HH:MM` |
| `kimai-cli today` | `kimai-cli list --today` |
| `kimai-cli week` | `kimai-cli list --week` |
| `kimai-cli month` | `kimai-cli list --month` |
| `kimai-cli timesheet <id>` | `kimai-cli show <id>` |
| `kimai-cli status` | `kimai-cli list --today` (or pipe to `--json`) |
| `kimai-cli current` | `kimai-cli list --today` then `kimai-cli show <id>` |
| `kimai-cli summary` | `kimai-cli list --week --json \| jq` |
| `kimai-cli search <query>` | `kimai-cli list --query <query>` |
| `kimai-cli range` | `kimai-cli list --from DD.MM --to DD.MM` |
| `kimai-cli day [date]` | `kimai-cli list --from DD.MM --to DD.MM` |
| `kimai-cli repeat <id>` | `kimai-cli duplicate <id>` |
| `kimai-cli copy <id>` | `kimai-cli duplicate <id>` |
| `kimai-cli tagged <tag>` | `kimai-cli list --query "#<tag>"` |
| `kimai-cli timer` | `kimai-cli start` / `kimai-cli stop` |

---

## Removed Magic-Default Mode

The most significant behavioral change: bare flags with no subcommand no longer create a timesheet.

**Before (v2.x):**
```bash
# Implicit: creates a timesheet automatically
kimai-cli -p 5 -a 8 -n "Meeting"
kimai-cli -p 5 -a 8 -n "Coding" -t 09:00-12:00
```

**After (v3.0.0):**
```bash
# Explicit: the `add` subcommand is required
kimai-cli add -p 5 -a 8 -n "Meeting" -t 09:00-17:00
kimai-cli add -p 5 -a 8 -n "Coding" -t 09:00-12:00
```

The time range (`-t HH:MM-HH:MM`) is required on `add`. Omit it to use the default `09:00-17:00`.

---

## Flag Renames

| Old | New | Notes |
|---|---|---|
| `kimai-cli -p 5 -a 8 -n "X"` (bare) | `kimai-cli add -p 5 -a 8 -n "X" -t HH:MM-HH:MM` | `add` subcommand required; time range required |
| `-T HH:MM-HH:MM` | `-t, --time HH:MM-HH:MM` | Short flag changed from `-T` to `-t` |
| `-b HH:MM` (edit only) | `-t HH:MM-HH:MM` | Separate begin/end flags replaced by one time-range flag |
| `-e HH:MM` (edit only) | `-t HH:MM-HH:MM` | Same as above |
| `-g <tags>` | removed | Tags are part of the description (`-n`) for now |

The `-n, --description` flag exists on `add`, `edit`, and `start`. It was previously named `-N, --note` on `edit` only.

---

## Behavior Changes

### First-run wizard removed

The automatic first-run wizard is gone. On first use without credentials, the CLI exits with an error directing you to run `kimai-cli auth login` explicitly.

```bash
kimai-cli auth login   # interactive TTY prompt for URL + API key
```

For non-interactive environments, use environment variables:

```bash
export KIMAI_URL="https://your-kimai.example.com"
export KIMAI_API_KEY="your-api-key"
```

The `KIMAI_SKIP_SETUP` / `--no-setup` flag is removed. Use `KIMAI_NO_SETUP=1` instead (or set the env vars above).

### Validation errors name the field and bad value

Errors now report the offending value:

```
kimai-cli add: time range "25:00-17:00" is invalid (expected HH:MM-HH:MM)
```

### Conflict detection on `add` and `edit`

If the time range overlaps an existing entry, `add` and `edit` exit with an error. Override with `--force`:

```bash
kimai-cli add -p 5 -a 8 -n "Urgent work" -t 09:00-11:00 --force
```

### Color output

`--no-color` is set automatically when stdout is not a TTY. Passing `--no-color` explicitly is no longer necessary in scripts or pipes.

### No subcommand prints help and exits 0

Running `kimai-cli` with no arguments prints the help text and exits 0 (previously behavior was undefined).

### Unknown subcommand exits 1

```bash
$ kimai-cli foobar
unknown command 'foobar'. Run: kimai-cli help
$ echo $?
1
```

---

## Examples: Old vs New

### Log 2 hours of work

```bash
# Old
kimai-cli -p 5 -a 8 -n "Projektarbeit" -t 09:00+2h

# New
kimai-cli add -p 5 -a 8 -n "Projektarbeit" -t 09:00-11:00
```

### Edit an entry's description

```bash
# Old
kimai-cli edit 123 -n "Updated note"

# New
kimai-cli edit 123 -n "Updated note"
```

The syntax is unchanged, but `edit <id>` is now required (no bare edit without ID).

### Delete a typo entry

```bash
# Old
kimai-cli delete 123

# New
kimai-cli remove 123
```

### List today's entries

```bash
# Old
kimai-cli today

# New
kimai-cli list --today
```

### Clone yesterday's entry to today

```bash
# Old
kimai-cli copy 123

# New
kimai-cli duplicate 123 -d $(date +%d.%m.%Y)
```

Without `-d`, `duplicate` copies to the next day by default.
