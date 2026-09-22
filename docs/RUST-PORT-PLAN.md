# Rust Port Plan — st-kimai-cli v3.0.1

Phase 2 plan based on Phase 1 spec.

## Cargo Project Layout

```
/home/pi/workspace/st-kimai-cli/
├── rust/                           # NEW — Rust workspace
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── src/
│   │   ├── main.rs                 # entrypoint: clap Cli parse → dispatch
│   │   ├── cli.rs                  # Cli struct + Args enums (clap derive)
│   │   ├── commands/
│   │   │   ├── mod.rs              # Command trait + dispatch
│   │   │   ├── add.rs
│   │   │   ├── edit.rs
│   │   │   ├── remove.rs
│   │   │   ├── show.rs
│   │   │   ├── start.rs
│   │   │   ├── stop.rs
│   │   │   ├── list.rs
│   │   │   ├── projects.rs
│   │   │   ├── project.rs
│   │   │   ├── activities.rs
│   │   │   ├── activity.rs
│   │   │   ├── customers.rs
│   │   │   ├── tags.rs
│   │   │   ├── duplicate.rs
│   │   │   ├── suggest.rs
│   │   │   ├── whoami.rs
│   │   │   ├── config.rs
│   │   │   ├── auth.rs             # login + logout subcommands
│   │   │   ├── help.rs
│   │   │   └── version.rs
│   │   ├── api/
│   │   │   ├── mod.rs              # KimaiApi struct
│   │   │   ├── timesheets.rs
│   │   │   ├── projects.rs
│   │   │   ├── activities.rs
│   │   │   ├── customers.rs
│   │   │   ├── tags.rs
│   │   │   ├── users.rs
│   │   │   └── errors.rs           # KimaiApiError
│   │   ├── models.rs               # Timesheet, Project, Activity, ...
│   │   ├── config.rs               # load_auth_config, get_config_path
│   │   ├── setup.rs                # login_wizard
│   │   ├── utils.rs                # parse_id, parse_time_range, parse_date, format_duration
│   │   ├── output.rs               # ASCII table, JSON, CSV printers
│   │   ├── spinner.rs              # indicatif wrappers
│   │   ├── errors.rs               # anyhow + thiserror types
│   │   └── ctx.rs                  # shared Ctx struct (api + auth + flags)
│   └── tests/
│       ├── common/
│       │   ├── mod.rs              # test helpers (mock server, fixtures)
│       │   └── mock_server.rs      # wiremock setup
│       ├── commands/
│       │   ├── add.rs
│       │   ├── edit.rs
│       │   ├── remove.rs
│       │   └── ...
│       └── utils.rs                # parse_id, parse_time_range tests
├── docs/
│   ├── RUST-PORT-SPEC.md           # Phase 1 (DONE)
│   └── RUST-PORT-PLAN.md           # Phase 2 (THIS FILE)
├── src/                            # Node.js source (unchanged on rust-fork branch)
├── package.json                    # Node.js package (unchanged)
└── ...
```

**Why a subdirectory `rust/`?** Keeps Node.js build artifacts (`dist/`, `node_modules/`) separate from Cargo's `target/`. Both can coexist on `rust-fork` branch during parallel development.

## Cargo.toml

```toml
[package]
name = "kimai-cli"
version = "3.0.1"
edition = "2021"
description = "CLI for Kimai time-tracking with single static binary"
license = "MIT"
repository = "https://github.com/steimerbyte/st-kimai-cli"
rust-version = "1.75"

[[bin]]
name = "kimai-cli"
path = "src/main.rs"

[dependencies]
clap = { version = "4.5", features = ["derive", "cargo"] }
reqwest = { version = "0.12", default-features = false, features = ["blocking", "json", "rustls-tls"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
chrono = { version = "0.4", features = ["serde"] }
dirs = "5.0"
indicatif = "0.17"
owo-colors = { version = "4.0", features = ["supports-colors"] }
anyhow = "1.0"
thiserror = "1.0"
csv = "1.3"
rust_decimal = { version = "1.36", features = ["serde"] }

[dev-dependencies]
wiremock = "0.6"
assert_cmd = "2.0"
predicates = "3.1"
tempfile = "3.10"
```

**Pinned choices:**
- **Blocking reqwest** over async: smaller binary, simpler code, no tokio dep
- **`rustls-tls` not `native-tls`**: no OpenSSL dependency, static linking friendly
- **`owo-colors`**: zero-overhead ANSI, no runtime cost
- **`rust_decimal`**: precise decimal arithmetic for `rate` field (Kimai sends floats)

## Implementation Order

### Phase 4a: Scaffold (1 commit)
- `rust/Cargo.toml`
- `rust/src/main.rs` (entrypoint with placeholder)
- `rust/src/cli.rs` (Cli struct with all 21 subcommands stubbed)
- `cargo build` → produces binary that prints `kimai-cli 3.0.1`

### Phase 4b: Core (1 commit)
- `rust/src/models.rs` (Timesheet, Project, Activity, etc.)
- `rust/src/errors.rs` (KimaiApiError, CliError)
- `rust/src/api/mod.rs` (client struct + request method)
- `rust/src/api/timesheets.rs` (CRUD endpoints)
- `rust/src/api/projects.rs`, `activities.rs`, etc.
- `cargo build` → compiles, no runtime tests yet

### Phase 4c: Auth + Config (1 commit)
- `rust/src/config.rs` (load_auth_config with permission + symlink checks)
- `rust/src/setup.rs` (login_wizard)
- `rust/src/commands/auth.rs` (login, logout subcommands)
- Tests: `rust/tests/config.rs`, `rust/tests/setup.rs`

### Phase 4d: Utils + Output (1 commit)
- `rust/src/utils.rs` (parse_id, parse_time_range, parse_date, format_duration)
- `rust/src/output.rs` (ASCII table, JSON, CSV printers)
- `rust/src/spinner.rs`
- Tests: `rust/tests/utils.rs`, output snapshot tests

### Phase 4e: Commands batch 1 (1 commit)
- `add`, `edit`, `remove`, `show`
- Integration tests via `assert_cmd` + `wiremock`

### Phase 4f: Commands batch 2 (1 commit)
- `start`, `stop`, `list`, `duplicate`

### Phase 4g: Commands batch 3 (1 commit)
- `projects`, `project`, `activities`, `activity`, `customers`, `tags`

### Phase 4h: Commands batch 4 (1 commit)
- `suggest`, `whoami`, `config`, `help`, `version`

### Phase 4i: Polish (1 commit)
- README updates for Rust binary install
- CHANGELOG entry
- `cargo clippy --all-targets --all-features -- -D warnings`
- `cargo fmt`
- Cross-compile smoke test

**Total estimated:** 9 commits, ~4900 LOC Rust, ~3-5 hours work for a careful Subagent.

## Testing Strategy

- **Unit tests:** inline `#[cfg(test)] mod tests` for utils, models
- **Integration:** `tests/commands/*.rs` use `assert_cmd` + `wiremock`
- **Coverage:** `cargo llvm-cov` with target ≥ 90% lines
- **CI:** GitHub Actions matrix (Linux, macOS, Windows)

## Phase 3 Self-Judge

The plan is **approved** with these caveats:

1. **Scope reduction for v3.0.1:** Skip shell completions, only binary release (no .deb/.rpm). Document as future work.
2. **Async later:** If profiling shows blocking reqwest is a bottleneck (it won't for a CLI), revisit.
3. **Windows ANSI:** Confirm requirement before v3.0.1. If needed, add `crossterm` dep.
4. **Subdirectory layout:** Confirm `rust/` subdir is acceptable vs. separate repo. User said "neue branch" → same repo is fine.

## Phase 5 Release (after all phases pass)

1. `cargo test` (host)
2. `cargo build --release` (host binary)
3. `cargo zigbuild --release --target aarch64-apple-darwin`
4. `cargo zigbuild --release --target x86_64-pc-windows-msvc`
5. `cargo build --release --target x86_64-unknown-linux-musl` (static)
6. SHA-256 sums
7. `gh release create v3.0.1` with all binaries as assets
8. Tag `v3.0.1` and push

## Acceptance Criteria

- [ ] All 21 commands work with same semantics as Node.js v3.0.0
- [ ] `kimai-cli add -p 5 -a 8 -n "X" -t 09:00-12:00` produces identical output
- [ ] Test coverage ≥ 90% lines
- [ ] Static Linux binary < 6 MB
- [ ] All platform binaries in single GitHub Release
- [ ] Documentation updated with Rust install instructions
