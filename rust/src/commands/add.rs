//! `add` — create a new timesheet entry.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::models::{CreateTimesheetOptions, ListTimesheetsOptions, Timesheet};
use crate::output;
use crate::spinner::Spinner;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct AddArgs {
    /// Project ID
    #[arg(short, long)]
    pub project: Option<String>,

    /// Activity ID
    #[arg(short, long)]
    pub activity: Option<String>,

    /// Description / note
    #[arg(short = 'n', long)]
    pub description: Option<String>,

    /// Time range HH:MM-HH:MM
    #[arg(short, long)]
    pub time: Option<String>,

    /// Date DD.MM.YYYY (default: today)
    #[arg(short, long)]
    pub date: Option<String>,

    /// Skip confirmation prompt
    #[arg(short, long)]
    pub yes: bool,

    /// Override conflict detection
    #[arg(short, long)]
    pub force: bool,
}

pub fn run(args: AddArgs, ctx: &Ctx) -> Result<(), CliError> {
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

    let time_str = args
        .time
        .as_deref()
        .ok_or_else(|| CliError::MissingRequired { flag: "time".to_string() })?;
    let (bh, bm, eh, em) = utils::parse_time_range(time_str)?;

    let date = args.date.as_deref().unwrap_or_else(|| {
        // Use a thread_local-like trick: just compute today
        Box::leak(utils::today_de().into_boxed_str())
    });
    let (d, m, y) = utils::parse_date(date)?;
    let iso_date = utils::date_to_iso(d, m, y);
    let begin = utils::iso_datetime(&iso_date, &format!("{:02}:{:02}", bh, bm));
    let end = utils::iso_datetime(&iso_date, &format!("{:02}:{:02}", eh, em));

    // Conflict detection (unless --force)
    if !args.force {
        let opts = ListTimesheetsOptions {
            begin: Some(format!("{}T00:00:00", iso_date)),
            end: Some(format!("{}T23:59:59", iso_date)),
            size: Some(500),
            ..Default::default()
        };
        let day_entries = ctx.api.get_timesheets(&opts)?;
        for entry in &day_entries {
            if overlaps(&entry.begin, entry.end.as_deref(), &begin, &end) {
                return Err(CliError::Overlap {
                    id: entry.id,
                    begin: entry.begin.clone(),
                    end: entry.end.clone().unwrap_or_default(),
                });
            }
        }
    }

    let opts = CreateTimesheetOptions {
        project: project_id,
        activity: activity_id,
        description: args.description,
        begin,
        end: Some(end),
        tags: None,
    };

    let spinner = Spinner::start("Creating timesheet...");
    match ctx.api.create_timesheet(&opts) {
        Ok(t) => {
            spinner.succeed(&format!("Timesheet #{} created", t.id));
            print_summary(&t);
            Ok(())
        }
        Err(e) => {
            spinner.fail("Failed to create timesheet");
            Err(e)
        }
    }
}

fn overlaps(b1: &str, e1: Option<&str>, b2: &str, e2: &str) -> bool {
    // Simple string comparison works for ISO 8601 timestamps
    let e1 = e1.unwrap_or("9999");
    !(e1 <= b2 || e2 <= b1)
}

fn print_summary(t: &Timesheet) {
    let proj = utils::project_name(&t.project);
    let act = utils::activity_name(&t.activity);
    let dur = t.duration.map(utils::format_duration).unwrap_or_default();
    println!("   Project: {}", proj);
    println!("   Activity: {}", act);
    if let Some(desc) = &t.description {
        println!("   Note: {}", desc);
    }
    println!(
        "   Time: {} - {}",
        extract_time(&t.begin),
        t.end.as_deref().map(extract_time).unwrap_or_default()
    );
    println!("   Duration: {}", dur);
}

fn extract_time(iso: &str) -> String {
    iso.split('T').nth(1).unwrap_or("").split(':').take(2).collect::<Vec<_>>().join(":")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overlaps_detects_overlap() {
        assert!(overlaps("2026-09-22T07:00:00", Some("2026-09-22T09:00:00"),
                         "2026-09-22T08:00:00", "2026-09-22T10:00:00"));
    }

    #[test]
    fn overlaps_passes_through() {
        assert!(!overlaps("2026-09-22T07:00:00", Some("2026-09-22T09:00:00"),
                          "2026-09-22T09:00:00", "2026-09-22T10:00:00"));
    }
}
