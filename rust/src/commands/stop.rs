//! `stop` — stop the active timer.

use clap::Args;
use serde_json::json;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::models::ListTimesheetsOptions;
use crate::spinner::Spinner;

#[derive(Args, Debug, Clone)]
pub struct StopArgs {
    #[arg(short, long)]
    pub yes: bool,
}

pub fn run(_args: StopArgs, ctx: &Ctx) -> Result<(), CliError> {
    let opts = ListTimesheetsOptions {
        state: Some("active".to_string()),
        size: Some(10),
        ..Default::default()
    };
    let active = ctx.api.get_timesheets(&opts)?;
    let running = active
        .iter()
        .find(|t| t.end.is_none())
        .ok_or_else(|| CliError::Other("no active timer running".to_string()))?;

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let updates = json!({ "end": now });

    let spinner = Spinner::start("Stopping timer...");
    match ctx.api.update_timesheet(running.id, &updates) {
        Ok(t) => {
            spinner.succeed(&format!("Timer stopped: #{}", t.id));
            let dur = t.duration.map(crate::utils::format_duration).unwrap_or_default();
            println!("   Duration: {}", dur);
            Ok(())
        }
        Err(e) => {
            spinner.fail("Failed to stop timer");
            Err(e)
        }
    }
}
