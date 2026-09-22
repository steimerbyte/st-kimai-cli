//! `activities` — list activities, optionally filtered by project.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct ActivitiesArgs {
    /// Filter by project ID
    #[arg(short = 'P', long)]
    pub project: Option<String>,

    #[arg(long)]
    pub json: bool,
}

pub fn run(args: ActivitiesArgs, ctx: &Ctx) -> Result<(), CliError> {
    let project_id = match &args.project {
        Some(p) => Some(utils::parse_id(p, "project")?),
        None => None,
    };

    let activities = ctx.api.get_activities(project_id)?;

    // Client-side filter (activities may have project field)
    let filtered: Vec<_> = if let Some(pid) = project_id {
        activities
            .into_iter()
            .filter(|a| match &a.project {
                Some(crate::models::ProjectRef::Id(id)) => *id == pid,
                Some(crate::models::ProjectRef::Full(p)) => p.id == pid,
                None => a.global_activities,
            })
            .collect()
    } else {
        activities
    };

    if args.json {
        println!("{}", serde_json::to_string_pretty(&filtered).unwrap());
    } else {
        let header = match project_id {
            Some(pid) => format!("Activities for project #{}", pid),
            None => "All activities".to_string(),
        };
        println!("{}", header);
        println!("{:<6} {}", "ID", "Name");
        println!("{}", "-".repeat(50));
        for a in filtered {
            println!("{:<6} {}", a.id, a.name);
        }
    }
    Ok(())
}
