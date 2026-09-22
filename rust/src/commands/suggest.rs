//! `suggest` — smart suggestions based on recent history.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::models::ListTimesheetsOptions;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct SuggestArgs {
    #[arg(short, long)]
    pub project: Option<String>,
    #[arg(long)]
    pub json: bool,
}

pub fn run(args: SuggestArgs, ctx: &Ctx) -> Result<(), CliError> {
    let mut opts = ListTimesheetsOptions {
        size: Some(20),
        ..Default::default()
    };
    if let Some(p) = &args.project {
        opts.project = Some(utils::parse_id(p, "project")?);
    }

    let recent = ctx.api.get_timesheets(&opts)?;
    if recent.is_empty() {
        println!("No previous timesheets found.");
        return Ok(());
    }

    if args.json {
        println!("{}", serde_json::to_string_pretty(&recent).unwrap());
    } else {
        println!("Recent timesheets (most recent first):");
        for t in recent.iter().take(5) {
            println!(
                "  #{}: {} {} - {} ({})",
                t.id,
                utils::project_name(&t.project),
                utils::activity_name(&t.activity),
                t.description.clone().unwrap_or_default(),
                t.begin.split('T').next().unwrap_or("")
            );
        }
    }
    Ok(())
}
