//! `help` — print per-command help.

use clap::CommandFactory;

use crate::cli::Cli;
use crate::errors::CliError;

pub fn run(cmd: Option<String>) -> Result<std::process::ExitCode, CliError> {
    let mut c = Cli::command();
    if let Some(name) = cmd {
        if let Some(sub) = c.find_subcommand_mut(&name) {
            let mut buf = Vec::new();
            sub.write_help(&mut buf).ok();
            print!("{}", String::from_utf8_lossy(&buf));
        } else {
            eprintln!("unknown command '{}'. Run: kimai-cli help", name);
            return Ok(std::process::ExitCode::from(1));
        }
    } else {
        let mut buf = Vec::new();
        c.write_help(&mut buf).ok();
        print!("{}", String::from_utf8_lossy(&buf));
    }
    Ok(std::process::ExitCode::from(0))
}
