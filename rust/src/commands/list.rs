//! `list` — list timesheets with optional filters.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::models::ListTimesheetsOptions;
use crate::output;
use crate::utils;
use chrono::Datelike;

#[derive(Args, Debug, Clone)]
pub struct ListArgs {
    /// List today's timesheets
    #[arg(long, conflicts_with_all = &["week", "month", "from"])]
    pub today: bool,

    /// List this week's timesheets
    #[arg(long, conflicts_with_all = &["today", "month", "from"])]
    pub week: bool,

    /// List this month's timesheets
    #[arg(long, conflicts_with_all = &["today", "week", "from"])]
    pub month: bool,

    /// Start date DD.MM.YYYY
    #[arg(long)]
    pub from: Option<String>,

    /// End date DD.MM.YYYY
    #[arg(long, requires = "from")]
    pub to: Option<String>,

    /// Filter by project ID
    #[arg(long)]
    pub project: Option<String>,

    /// Search in descriptions
    #[arg(long)]
    pub query: Option<String>,

    #[arg(long)]
    pub json: bool,

    #[arg(long)]
    pub csv: bool,
}

pub fn run(args: ListArgs, ctx: &Ctx) -> Result<(), CliError> {
    let opts = build_options(&args)?;
    let entries = ctx.api.get_timesheets(&opts)?;

    if args.json {
        output::print_timesheet_json(&entries);
    } else if args.csv {
        output::print_timesheet_csv(&entries);
    } else {
        output::print_timesheet_table(&entries);
    }
    Ok(())
}

fn build_options(args: &ListArgs) -> Result<ListTimesheetsOptions, CliError> {
    let mut opts = ListTimesheetsOptions {
        size: Some(500),
        ..Default::default()
    };

    if let Some(p) = &args.project {
        opts.project = Some(utils::parse_id(p, "project")?);
    }

    if args.today {
        let today = utils::today_iso();
        opts.begin = Some(format!("{}T00:00:00", today));
        opts.end = Some(format!("{}T23:59:59", today));
    } else if args.week {
        // This week (Monday → Sunday)
        let now = chrono::Local::now().date_naive();
        let weekday = now.format("%u").to_string().parse::<u32>().unwrap_or(1);
        let monday = now - chrono::Duration::days((weekday - 1) as i64);
        let sunday = monday + chrono::Duration::days(6);
        opts.begin = Some(format!("{}T00:00:00", monday.format("%Y-%m-%d")));
        opts.end = Some(format!("{}T23:59:59", sunday.format("%Y-%m-%d")));
    } else if args.month {
        let now = chrono::Local::now().date_naive();
        let first = chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap();
        opts.begin = Some(format!("{}T00:00:00", first.format("%Y-%m-%d")));
        opts.end = Some(format!("{}T23:59:59", now.format("%Y-%m-%d")));
    } else if let Some(from) = &args.from {
        let (d, m, y) = utils::parse_date(from)?;
        let from_iso = utils::date_to_iso(d, m, y);
        opts.begin = Some(format!("{}T00:00:00", from_iso));
        if let Some(to) = &args.to {
            let (td, tm, ty) = utils::parse_date(to)?;
            let to_iso = utils::date_to_iso(td, tm, ty);
            opts.end = Some(format!("{}T23:59:59", to_iso));
        } else {
            opts.end = Some(format!("{}T23:59:59", from_iso));
        }
    } else {
        // Default: today
        let today = utils::today_iso();
        opts.begin = Some(format!("{}T00:00:00", today));
        opts.end = Some(format!("{}T23:59:59", today));
    }

    Ok(opts)
}
