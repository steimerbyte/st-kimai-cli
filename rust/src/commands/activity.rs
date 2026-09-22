//! `activity <id>` — show one activity.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct ActivityArgs {
    pub id: String,
    #[arg(long)]
    pub json: bool,
}

pub fn run(args: ActivityArgs, ctx: &Ctx) -> Result<(), CliError> {
    let id = utils::parse_id(&args.id, "id")?;
    let a = ctx.api.get_activity(id)?;
    if args.json {
        println!("{}", serde_json::to_string_pretty(&a).unwrap());
    } else {
        println!("Activity #{}", a.id);
        println!("Name:    {}", a.name);
        println!("Visible: {}", a.visible);
        println!("Billable: {}", a.billable);
    }
    Ok(())
}
