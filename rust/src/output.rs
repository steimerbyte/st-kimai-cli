//! Output formatting: ASCII table, JSON, CSV.

use crate::models::Timesheet;

/// Print a list of timesheets as an ASCII table.
pub fn print_timesheet_table(entries: &[Timesheet]) {
    if entries.is_empty() {
        println!("No timesheets found.");
        return;
    }

    println!(
        "{:<6} {:<10} {:<5} {:<5} {:<10} {:<10} {:<10} {}",
        "ID", "Date", "Start", "End", "Duration", "Project", "Activity", "Description"
    );
    println!("{}", "-".repeat(80));
    for t in entries {
        let date = extract_date(&t.begin);
        let start = extract_time(&t.begin);
        let end = t.end.as_deref().map(extract_time).unwrap_or_else(|| "-".to_string());
        let duration = t.duration.map(crate::utils::format_duration).unwrap_or_else(|| "-".to_string());
        let proj = crate::utils::project_name(&t.project);
        let act = crate::utils::activity_name(&t.activity);
        let desc = t.description.clone().unwrap_or_default();
        println!(
            "{:<6} {:<10} {:<5} {:<5} {:<10} {:<10} {:<10} {}",
            t.id, date, start, end, duration, proj, act, desc
        );
    }
}

/// Print a list of timesheets as JSON.
pub fn print_timesheet_json(entries: &[Timesheet]) {
    match serde_json::to_string_pretty(entries) {
        Ok(s) => println!("{}", s),
        Err(e) => eprintln!("❌ JSON error: {}", e),
    }
}

/// Print a list of timesheets as CSV.
pub fn print_timesheet_csv(entries: &[Timesheet]) {
    let mut wtr = csv::Writer::from_writer(std::io::stdout());
    wtr.write_record(&[
        "id", "date", "begin", "end", "duration", "project", "activity", "description", "tags",
    ])
    .ok();
    for t in entries {
        let date = extract_date(&t.begin);
        let begin = t.begin.clone();
        let end = t.end.clone().unwrap_or_default();
        let duration = t.duration.map(|d| d.to_string()).unwrap_or_default();
        let proj = crate::utils::project_name(&t.project);
        let act = crate::utils::activity_name(&t.activity);
        let desc = t.description.clone().unwrap_or_default();
        let tags = t.tags.join(";");
        wtr.write_record(&[
            &t.id.to_string(),
            &date,
            &begin,
            &end,
            &duration,
            &proj,
            &act,
            &desc,
            &tags,
        ])
        .ok();
    }
    wtr.flush().ok();
}

fn extract_date(iso: &str) -> String {
    // "2026-09-22T07:15:00+0200" → "22.09.2026"
    let parts: Vec<&str> = iso.split('T').collect();
    if parts.is_empty() {
        return iso.to_string();
    }
    let ymd: Vec<&str> = parts[0].split('-').collect();
    if ymd.len() != 3 {
        return iso.to_string();
    }
    format!("{}.{}.{}", ymd[2], ymd[1], ymd[0])
}

fn extract_time(iso: &str) -> String {
    // "2026-09-22T07:15:00+0200" → "07:15"
    let parts: Vec<&str> = iso.split('T').collect();
    if parts.len() < 2 {
        return iso.to_string();
    }
    let hm: Vec<&str> = parts[1].split(':').collect();
    if hm.len() < 2 {
        return iso.to_string();
    }
    format!("{}:{}", hm[0], hm[1])
}
