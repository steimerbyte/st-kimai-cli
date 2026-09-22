//! `projects` — list projects.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;

#[derive(Args, Debug, Clone)]
pub struct ProjectsArgs {
    #[arg(long)]
    pub json: bool,
}

pub fn run(args: ProjectsArgs, ctx: &Ctx) -> Result<(), CliError> {
    let projects = ctx.api.get_projects()?;
    if args.json {
        println!("{}", serde_json::to_string_pretty(&projects).unwrap());
    } else {
        println!("{:<6} {}", "ID", "Name");
        println!("{}", "-".repeat(50));
        for p in projects {
            println!("{:<6} {}", p.id, p.name);
        }
    }
    Ok(())
}
