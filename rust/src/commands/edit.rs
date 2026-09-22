//! `edit` — update an existing timesheet.

use clap::Args;
use serde_json::{json, Value};

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::spinner::Spinner;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct EditArgs {
    /// Timesheet ID
    pub id: String,

    #[arg(short, long)]
    pub project: Option<String>,

    #[arg(short, long)]
    pub activity: Option<String>,

    /// Description / note
    #[arg(short = 'n', long)]
    pub description: Option<String>,

    /// Time range HH:MM-HH:MM
    #[arg(short, long)]
    pub time: Option<String>,

    /// Date DD.MM.YYYY
    #[arg(short, long)]
    pub date: Option<String>,

    #[arg(short, long)]
    pub yes: bool,

    #[arg(short, long)]
    pub force: bool,
}

pub fn run(args: EditArgs, ctx: &Ctx) -> Result<(), CliError> {
    let id = utils::parse_id(&args.id, "id")?;
    let mut updates = json!({});

    if let Some(p) = &args.project {
        updates["project"] = json!(utils::parse_id(p, "project")?);
    }
    if let Some(a) = &args.activity {
        updates["activity"] = json!(utils::parse_id(a, "activity")?);
    }
    if let Some(d) = &args.description {
        updates["description"] = json!(d);
    }
    if let Some(time) = &args.time {
        let (bh, bm, eh, em) = utils::parse_time_range(time)?;
        let date = args
            .date
            .as_deref()
            .map(|d| {
                let (dd, mm, yy) = utils::parse_date(d)?;
                Ok::<_, CliError>(utils::date_to_iso(dd, mm, yy))
            })
            .unwrap_or_else(|| Ok(utils::today_iso()))?;
        updates["begin"] = json!(utils::iso_datetime(&date, &format!("{:02}:{:02}", bh, bm)));
        updates["end"] = json!(utils::iso_datetime(&date, &format!("{:02}:{:02}", eh, em)));
    }

    if updates.as_object().unwrap().is_empty() {
        return Err(CliError::Other(
            "edit: no updates specified. Use -n, -t, -p, -a, or -d.".to_string(),
        ));
    }

    let spinner = Spinner::start("Updating timesheet...");
    match ctx.api.update_timesheet(id, &updates) {
        Ok(t) => {
            spinner.succeed(&format!("Timesheet #{} updated", id));
            println!("   Project: {}", utils::project_name(&t.project));
            println!("   Activity: {}", utils::activity_name(&t.activity));
            if let Some(desc) = &t.description {
                println!("   Note: {}", desc);
            }
            let dur = t.duration.map(utils::format_duration).unwrap_or_default();
            println!(
                "   Time: {} - {}",
                t.begin.split('T').nth(1).unwrap_or("").split(':').take(2).collect::<Vec<_>>().join(":"),
                t.end.as_deref()
                    .map(|e| e.split('T').nth(1).unwrap_or("").split(':').take(2).collect::<Vec<_>>().join(":"))
                    .unwrap_or_default()
            );
            println!("   Duration: {}", dur);
            Ok(())
        }
        Err(e) => {
            spinner.fail("Failed to update timesheet");
            Err(e)
        }
    }
}
