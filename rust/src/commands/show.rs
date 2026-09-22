//! `show` — display a single timesheet.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;
use crate::utils;

#[derive(Args, Debug, Clone)]
pub struct ShowArgs {
    pub id: String,

    #[arg(long)]
    pub json: bool,
}

pub fn run(args: ShowArgs, ctx: &Ctx) -> Result<(), CliError> {
    let id = utils::parse_id(&args.id, "id")?;
    let t = ctx.api.get_timesheet(id)?;
    if args.json {
        println!("{}", serde_json::to_string_pretty(&t).unwrap());
    } else {
        println!("Timesheet #{}", t.id);
        println!("{}", "-".repeat(40));
        println!("Project:   {}", utils::project_name(&t.project));
        println!("Activity:  {}", utils::activity_name(&t.activity));
        println!("Start:     {}", t.begin);
        println!("End:       {}", t.end.clone().unwrap_or_default());
        let dur = t.duration.map(utils::format_duration).unwrap_or_default();
        println!("Duration:  {}", dur);
        if let Some(d) = &t.description {
            println!("Description: {}", d);
        }
        if !t.tags.is_empty() {
            println!("Tags: {}", t.tags.join(", "));
        }
        println!("Billable: {}", if t.billable { "Yes" } else { "No" });
        println!("Exported: {}", if t.exported { "Yes" } else { "No" });
    }
    Ok(())
}
