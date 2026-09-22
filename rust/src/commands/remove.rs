//! `remove` — delete a timesheet by ID.

use clap::Args;
use std::io::{self, IsTerminal, Write};

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::spinner::Spinner;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct RemoveArgs {
    pub id: String,

    #[arg(short, long)]
    pub yes: bool,
}

pub fn run(args: RemoveArgs, ctx: &Ctx) -> Result<(), CliError> {
    let id = utils::parse_id(&args.id, "id")?;

    if !args.yes && io::stdin().is_terminal() && !std::env::var("KIMAI_SKIP_PROMPTS").is_ok() {
        print!("Delete timesheet #{}? [y/N] ", id);
        io::stdout().flush().ok();
        let mut ans = String::new();
        io::stdin().read_line(&mut ans).map_err(CliError::Io)?;
        if ans.trim().to_lowercase() != "y" {
            println!("Cancelled.");
            return Ok(());
        }
    }

    let spinner = Spinner::start("Deleting timesheet...");
    match ctx.api.delete_timesheet(id) {
        Ok(_) => {
            spinner.succeed(&format!("Timesheet #{} deleted", id));
            Ok(())
        }
        Err(e) => {
            spinner.fail("Failed to delete timesheet");
            Err(e)
        }
    }
}
