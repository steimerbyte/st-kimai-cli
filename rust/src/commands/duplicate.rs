//! `duplicate` — clone an existing timesheet to today (or specified date).

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::models::CreateTimesheetOptions;
use crate::spinner::Spinner;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct DuplicateArgs {
    pub id: String,

    /// Target date DD.MM.YYYY (default: today)
    #[arg(short, long)]
    pub date: Option<String>,

    #[arg(short, long)]
    pub yes: bool,
}

pub fn run(args: DuplicateArgs, ctx: &Ctx) -> Result<(), CliError> {
    let id = utils::parse_id(&args.id, "id")?;
    let source = ctx.api.get_timesheet(id)?;

    let date = args.date.as_deref().unwrap_or_else(|| {
        Box::leak(utils::today_de().into_boxed_str())
    });
    let (d, m, y) = utils::parse_date(date)?;
    let iso_date = utils::date_to_iso(d, m, y);

    let source_begin = source.begin.clone();
    let time_part = source_begin.split('T').nth(1).unwrap_or("00:00:00");
    let hhmm = time_part.split(':').take(2).collect::<Vec<_>>().join(":");
    let begin = utils::iso_datetime(&iso_date, &hhmm);

    let end = if let Some(e) = &source.end {
        let ep = e.split('T').nth(1).unwrap_or("00:00:00");
        let ehhmm = ep.split(':').take(2).collect::<Vec<_>>().join(":");
        Some(utils::iso_datetime(&iso_date, &ehhmm))
    } else {
        None
    };

    let project_id = utils::project_id(&source.project);
    let activity_id = utils::activity_id(&source.activity);

    let opts = CreateTimesheetOptions {
        project: project_id,
        activity: activity_id,
        description: source.description,
        begin,
        end,
        tags: if source.tags.is_empty() { None } else { Some(source.tags) },
    };

    let spinner = Spinner::start("Duplicating timesheet...");
    match ctx.api.create_timesheet(&opts) {
        Ok(t) => {
            spinner.succeed(&format!("Duplicated as #{}", t.id));
            Ok(())
        }
        Err(e) => {
            spinner.fail("Duplicate failed");
            Err(e)
        }
    }
}
