//! `start` — start a running timer.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::models::CreateTimesheetOptions;
use crate::spinner::Spinner;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct StartArgs {
    #[arg(short, long)]
    pub project: Option<String>,

    #[arg(short, long)]
    pub activity: Option<String>,

    #[arg(short = 'n', long)]
    pub description: Option<String>,

    #[arg(short, long)]
    pub yes: bool,
}

pub fn run(args: StartArgs, ctx: &Ctx) -> Result<(), CliError> {
    let project = args
        .project
        .as_deref()
        .ok_or_else(|| CliError::MissingRequired { flag: "project".to_string() })?;
    let project_id = utils::parse_id(project, "project")?;

    let activity = args
        .activity
        .as_deref()
        .ok_or_else(|| CliError::MissingRequired { flag: "activity".to_string() })?;
    let activity_id = utils::parse_id(activity, "activity")?;

    let opts = CreateTimesheetOptions {
        project: project_id,
        activity: activity_id,
        description: args.description,
        begin: chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
        end: None, // No end → still running
        tags: None,
    };

    let spinner = Spinner::start("Starting timer...");
    match ctx.api.create_timesheet(&opts) {
        Ok(t) => {
            spinner.succeed(&format!("Timer started: #{}", t.id));
            println!("   Project:  {}", utils::project_name(&t.project));
            println!("   Activity: {}", utils::activity_name(&t.activity));
            Ok(())
        }
        Err(e) => {
            spinner.fail("Failed to start timer");
            Err(e)
        }
    }
}
