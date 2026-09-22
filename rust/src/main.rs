//! kimai-cli — single-binary CLI for Kimai time-tracking
//!
//! Entry point: parse CLI args with clap, dispatch to command handlers.

use std::process::ExitCode;

mod api;
mod cli;
mod commands;
mod config;
mod ctx;
mod errors;
mod models;
mod output;
mod setup;
mod spinner;
mod utils;

fn main() -> ExitCode {
    let args = cli::Cli::parse_args();
    cli::run(args)
}
