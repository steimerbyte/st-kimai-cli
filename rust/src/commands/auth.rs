//! `auth login` / `auth logout`.

use clap::Subcommand;

use crate::errors::CliError;
use crate::setup;

#[derive(Subcommand, Debug, Clone)]
pub enum AuthAction {
    /// Set up auth.json interactively
    Login,
    /// Remove auth.json
    Logout {
        #[arg(short, long)]
        yes: bool,
    },
}

pub fn run(action: AuthAction) -> Result<std::process::ExitCode, CliError> {
    match action {
        AuthAction::Login => {
            setup::login_wizard()?;
            Ok(std::process::ExitCode::from(0))
        }
        AuthAction::Logout { .. } => {
            setup::logout()?;
            Ok(std::process::ExitCode::from(0))
        }
    }
}
