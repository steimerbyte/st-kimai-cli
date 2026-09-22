# Rust Port Specification — st-kimai-cli v3.0.1

Phase 1 code-scan output. Source of truth for Phase 2 plan.

## 1. Command Matrix (21 commands)

| Rust struct | clap derives | Handler signature | API endpoints | Special |
|---|---|---|---|---|
| `AddCmd` | `-p <id> -a <id> -n <text> -t <range> [-d] [-y] [--force]` | `fn execute(&self, ctx: &mut Ctx) -> ExitCode` | `GET /api/timesheets?begin=&end=` (conflict check) + `POST /api/timesheets` | Overlap detection, --force bypass |
| `EditCmd` | `<id> -p -a -n -t -d [-y] [--force]` | same | `GET /api/timesheets` (size=500) + `GET /api/timesheets?begin=&end=` + `PATCH /api/timesheets/:id` | Same conflict check as add |
| `RemoveCmd` | `<id> [-y]` | same | `DELETE /api/timesheets/:id` | Confirmation prompt unless -y |
| `ShowCmd` | `<id> [--json]` | same | `GET /api/timesheets?size=500` then find by ID | Single-entry printer |
| `StartCmd` | `-p -a -n [-y]` | same | `POST /api/timesheets` with end=null | Starts active timer |
| `StopCmd` | `[-y]` | same | `PATCH /api/timesheets/:id` (set end=now) | Stops active timer |
| `ListCmd` | `[--today --week --month --from --to] [--project] [--query] [--json] [--csv]` | same | `GET /api/timesheets?...` | Preset ranges mutually exclusive |
| `ProjectsCmd` | `[--json]` | same | `GET /api/projects` | List with IDs |
| `ProjectCmd` | `<id> [--json]` | same | `GET /api/projects/:id` | Single project |
| `ActivitiesCmd` | `[-P <project>] [--json]` | same | `GET /api/activities?project=` | Filter by project |
| `ActivityCmd` | `<id> [--json]` | same | `GET /api/activities/:id` | Single activity |
| `CustomersCmd` | `[--json]` | same | `GET /api/customers` | List |
| `TagsCmd` | `[--json]` | same | `GET /api/tags` | List |
| `DuplicateCmd` | `<id> [-d] [-y]` | same | `GET /api/timesheets?size=1` (fetch source) + `POST /api/timesheets` (clone) | Clone to target date |
| `SuggestCmd` | `[-p <project>] [--json]` | same | `GET /api/timesheets?size=20&project=` (recent usage) | Smart suggestions |
| `WhoamiCmd` | `[--json]` | same | `GET /api/users/me` | Show authenticated user |
| `ConfigCmd` | `[--json]` | same | (no API) | Show local config |
| `AuthLoginCmd` | (none) | same | `GET /api/version` (verify) | TTY-only, prompts for URL+key |
| `AuthLogoutCmd` | `[-y]` | same | (no API) | Removes auth.json |
| `HelpCmd` | `[cmd]` | same | (no API) | Print per-command help |
| `VersionCmd` | (none) | same | (no API) | Print version |

## 2. Kimai API Surface

Auth: `Authorization: Bearer <token>` header on every request.

| Method | Path | Request body | Response | Errors |
|---|---|---|---|---|
| `GET` | `/api/timesheets` | query params: `begin`, `end`, `project`, `activity`, `user`, `state`, `billable`, `exported`, `full`, `page`, `size` | `Timesheet[]` | 401/403 |
| `GET` | `/api/timesheets/:id` | — | `Timesheet` (full) | 404 |
| `POST` | `/api/timesheets` | `{project, activity, begin, end?, description?, tags?}` | `Timesheet` (created) | 400 (validation), 409 (conflict) |
| `PATCH` | `/api/timesheets/:id` | partial fields | `Timesheet` | 400, 404 |
| `DELETE` | `/api/timesheets/:id` | — | empty | 404 |
| `GET` | `/api/projects` | — | `Project[]` | 401 |
| `GET` | `/api/projects/:id` | — | `Project` | 404 |
| `GET` | `/api/activities` | query: `project` | `Activity[]` | 401 |
| `GET` | `/api/activities/:id` | — | `Activity` | 404 |
| `GET` | `/api/customers` | — | `Customer[]` | 401 |
| `GET` | `/api/tags` | — | `string[]` | 401 |
| `GET` | `/api/users/me` | — | `User` | 401 |
| `GET` | `/api/version` | — | `Version` | (any) |

**Security (must mirror):** `redirect: "manual"` in reqwest, refuse any 3xx, treat as `KimaiApiError`.

**Timeout:** 30s default (`DEFAULT_TIMEOUT_MS`).

## 3. Auth and Config

**File:** `~/.kimai-cli/auth.json` (mode 0600). Linux/macOS: enforce via `chmod`. Windows: skip.

**Format:**
```json
{
  "url": "https://kimai.example.com",
  "apiKey": "<redacted>"
}
```

**Env overrides (priority order):**
1. `KIMAI_API_KEY` (always wins)
2. `KIMAI_URL` or `KIMAI_API_URL` (alias)
3. `~/.kimai-cli/auth.json`

**Skip flags:**
- `KIMAI_NO_SETUP=1` → skip wizard entirely
- `KIMAI_RELAX_PERMS=1` → allow world-readable config (with warning)
- `--no-setup` flag on CLI

**Symlink rejection:** `lstat` config file, refuse if `S_IFLNK`. Mirrors Node behavior.

**Home dir detection:** `dirs::home_dir()`. Panic with clear message if unavailable.

## 4. Data Model (Rust)

```rust
// src/models.rs
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Timesheet {
    pub id: u32,
    #[serde(rename = "activity")]
    pub activity: ActivityRef,
    #[serde(rename = "project")]
    pub project: ProjectRef,
    #[serde(rename = "user")]
    pub user: Option<UserRef>,
    pub tags: Vec<String>,
    pub begin: String,           // ISO 8601
    pub end: Option<String>,
    pub duration: Option<i32>,
    pub #[serde(rename = "break")] break_secs: i32,
    pub description: Option<String>,
    pub rate: f64,
    #[serde(rename = "internalRate")] pub internal_rate: f64,
    pub exported: bool,
    pub billable: bool,
    #[serde(rename = "metaFields")] pub meta_fields: Vec<MetaField>,
}

pub enum ActivityRef { Id(u32), Full(Activity) }
pub enum ProjectRef  { Id(u32), Full(Project) }
pub enum UserRef     { Id(u32), Full(User) }

// Activity has `project: Option<ProjectRef>` — used for filtering
pub struct Activity {
    pub id: u32,
    pub name: String,
    #[serde(rename = "parentTitle")] pub parent_title: Option<String>,
    pub project: Option<ProjectRef>,
    pub color: String,
    pub visible: bool,
    pub billable: bool,
    pub comment: Option<String>,
    #[serde(rename = "globalActivities")] pub global_activities: bool,
    pub teams: Vec<Team>,
    #[serde(rename = "metaFields")] pub meta_fields: Vec<MetaField>,
}

// AuthConfig
pub struct AuthConfig { pub url: String, pub api_key: String }
```

## 5. Output Formatting

**Default mode (TTY):** ASCII table, no box, columns:
```
ID    | Date       | Start  | End    | Duration | Project | Activity | Description
------|------------|--------|--------|----------|---------|----------|-----------
123   | 22.09.2026 | 07:15  | 12:30  | 5h 15m   | #5      | #8       | Ausschreibung
```

**`--json` mode:** `serde_json::to_string_pretty(&entries)?`

**`--csv` mode:** `csv::Writer::from_writer(io::stdout())` with header row.

**`--verbose` mode:** boxed style with `divider()` lines, project/activity names expanded.

**TTY auto-detect:** `std::io::stdout().is_terminal()`. Disable ANSI when false.

**`--no-color` flag:** force disable.

## 6. Loading Spinners

Use `indicatif` with manual control:

```rust
let pb = ProgressBar::new_spinner();
pb.set_message("Creating timesheet...");
api_call.await?;
pb.finish_with_message("✔ Timesheet created");
```

For non-TTY: skip the spinner, just print messages.

## 7. Validation Rules

| Rule | Function | Behavior on failure |
|---|---|---|
| `parse_id("abc")` | `Result<u32, Error>` | Reject with `must be a positive integer (got: 'abc')` |
| `parse_id("-1")` | same | Reject with `must be a positive integer (got: '-1')` |
| `parse_time_range("HH:MM-HH:MM")` | `Result<(u32,u32,u32,u32), Error>` | Reject if not 2 parts, begin >= end |
| `parse_date("DD.MM.YYYY")` | `Result<NaiveDate, Error>` | Reject if malformed, far future/past |
| `validate_time_range(b, e)` | `Result<(), Error>` | begin must be < end |
| Overlap detection | Check existing entries for same date | Conflict → suggest --force |

## 8. Error UX

```rust
fn die(msg: &str) -> ! { eprintln!("❌ {}", msg); std::process::exit(1); }
```

| Scenario | Format | Exit |
|---|---|---|
| Auth missing | `❌ <cmd>: auth not configured. Run: kimai-cli auth login` | 1 |
| Required flag missing | `❌ <cmd>: missing required --<flag>` | 1 |
| Flag invalid value | `❌ <cmd>: --<flag> '<value>' is invalid (<reason>)` | 1 |
| API error | `❌ <cmd>: <message from response body>` | 1 |
| Conflict | `❌ <cmd>: overlaps existing entry #<id> (<begin>-<end>). Use --force to override.` | 1 |
| Unknown subcommand | `unknown command '<x>'. Run: kimai-cli help` | 1 |
| No subcommand | Print help | 0 |

## 9. Crate Recommendations

| Crate | Version | Why |
|---|---|---|
| `clap` | 4.5+ | CLI parsing, derive macros |
| `reqwest` | 0.12+, blocking + rustls-tls | HTTP client, blocking (no async needed for CLI) |
| `serde` + `serde_json` | 1.0, latest | JSON ser/de |
| `chrono` | 0.4+ with serde | Date/time parsing |
| `dirs` | 5.0+ | Home dir |
| `indicatif` | 0.17+ | Spinners |
| `owo-colors` | 4.0+ | ANSI colors (compile-time off via env) |
| `anyhow` + `thiserror` | latest | Error handling |
| `csv` | 1.3+ | CSV output |
| `wiremock` | 0.6+ | HTTP mocking for tests |
| `assert_cmd` | 2.0+ | CLI integration tests |

**No async runtime** — use blocking reqwest to keep binary small (~2-3 MB) and avoid tokio dependency.

## 10. Test Strategy

| Layer | Tool | Coverage |
|---|---|---|
| Unit (utils) | `#[test]` inline | parseId, parseTimeRange, parseDate, formatDuration |
| Integration (commands) | `assert_cmd` | Each of 21 commands: happy path + validation + error |
| HTTP mocking | `wiremock` | All API endpoints |
| Auth file | `tempfile` | Permission/symlink/parse tests |
| Output | snapshot tests | ASCII/JSON/CSV output formats |

**Coverage target:** ≥ 90% lines via `cargo llvm-cov`.

**CI:** GitHub Actions matrix builds:
- `ubuntu-latest` (x86_64-unknown-linux-gnu)
- `macos-latest` (aarch64-apple-darwin)
- `windows-latest` (x86_64-pc-windows-msvc)

## 11. Build and Release

**Local:** `cargo build --release` → `target/release/kimai-cli` (single binary, ~3-5 MB)

**Linux static:** `cargo build --release --target x86_64-unknown-linux-musl` (no glibc dependency)

**Cross-compile:** `cargo-zigbuild` for macOS/Windows from Linux host:
```bash
cargo install cargo-zigbuild
cargo zigbuild --release --target aarch64-apple-darwin
cargo zigbuild --release --target x86_64-pc-windows-msvc
```

**Release pipeline (Phase 5):**
1. `cargo test` → must pass
2. `cargo build --release` for host + targets
3. Strip with `strip target/release/kimai-cli`
4. SHA-256 checksums
5. GitHub Release `v3.0.1` with binary assets attached

**Version:** `3.0.1` per user directive.

## 12. File-by-file Porting Checklist

| Node file | LOC | Rust target | Estimated Rust LOC |
|---|---|---|---|
| `src/index.ts` | 1194 | `src/main.rs` + `src/commands/*.rs` (21 files) | ~1500 |
| `src/api.ts` | ~360 | `src/api.rs` | ~400 |
| `src/types.ts` | 169 | `src/models.rs` | ~250 |
| `src/config.ts` | 155 | `src/config.rs` | ~180 |
| `src/setup.ts` | 147 | `src/setup.rs` | ~200 |
| `src/utils.ts` | 819 | `src/utils.rs` | ~600 |
| `src/loading.ts` | 218 | `src/spinner.rs` | ~80 |
| `src/design-system.ts` | ~150 | inline in `src/output.rs` | ~200 |
| `src/entry-wrapper.ts` | 14 | (not needed — single binary) | 0 |
| Tests | ~2500 | `tests/*.rs` + `#[cfg(test)]` modules | ~1500 |
| **Total** | **~7000** | | **~4900** |

**Rust LOC will be ~30% smaller** thanks to enum patterns, derive macros, and Rust's type system catching errors at compile time.

## Open Questions for Phase 2 (Plan)

1. **Async vs blocking:** Recommend blocking reqwest. Smaller binary, simpler code, no tokio.
2. **Output format library:** Recommend `tabled` or manual? Manual gives more control over Kimai-specific format.
3. **Release artifacts:** Just the binary, or also `.deb` / `.rpm` / Homebrew formula? Start with binary only.
4. **Windows console:** ANSI on Windows requires `crossterm` or `enable-ansi-support`. Confirm requirement.
5. **Shell completions:** Generate bash/zsh/fish completions from clap derive? Nice-to-have for v3.0.1.

---

**Next phase:** Plan (Phase 2) — Cargo project structure, file layout, dependency pinning, test scaffolding.
