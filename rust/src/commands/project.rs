//! `project <id>` — show one project.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct ProjectArgs {
    pub id: String,
    #[arg(long)]
    pub json: bool,
}

pub fn run(args: ProjectArgs, ctx: &Ctx) -> Result<(), CliError> {
    let id = utils::parse_id(&args.id, "id")?;
    let p = ctx.api.get_project(id)?;
    if args.json {
        println!("{}", serde_json::to_string_pretty(&p).unwrap());
    } else {
        println!("Project #{}", p.id);
        println!("Name:     {}", p.name);
        if let Some(c) = &p.comment {
            println!("Comment:  {}", c);
        }
        println!("Visible:  {}", p.visible);
        println!("Billable: {}", p.billable);
    }
    Ok(())
}
