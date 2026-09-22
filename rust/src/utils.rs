//! Utility functions: parsers and formatters.

use chrono::Datelike;

use crate::errors::CliError;

/// Parse an ID string into a positive u32. Rejects non-numeric, negative, zero.
pub fn parse_id(s: &str, flag: &str) -> Result<u32, CliError> {
    let n: i64 = s
        .parse()
        .map_err(|_| CliError::InvalidValue {
            flag: flag.to_string(),
            value: s.to_string(),
            reason: "must be a positive integer".to_string(),
        })?;
    if n <= 0 {
        return Err(CliError::InvalidValue {
            flag: flag.to_string(),
            value: s.to_string(),
            reason: "must be a positive integer".to_string(),
        });
    }
    Ok(n as u32)
}

/// Parse "HH:MM-HH:MM" into (begin_h, begin_m, end_h, end_m). Validates begin < end.
pub fn parse_time_range(s: &str) -> Result<(u32, u32, u32, u32), CliError> {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 2 {
        return Err(CliError::InvalidValue {
            flag: "time".to_string(),
            value: s.to_string(),
            reason: "expected HH:MM-HH:MM".to_string(),
        });
    }
    let begin = parse_hh_mm(parts[0], "time")?;
    let end = parse_hh_mm(parts[1], "time")?;
    if begin.0 * 60 + begin.1 >= end.0 * 60 + end.1 {
        return Err(CliError::InvalidValue {
            flag: "time".to_string(),
            value: s.to_string(),
            reason: "begin must be < end".to_string(),
        });
    }
    Ok((begin.0, begin.1, end.0, end.1))
}

fn parse_hh_mm(s: &str, flag: &str) -> Result<(u32, u32), CliError> {
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() != 2 {
        return Err(CliError::InvalidValue {
            flag: flag.to_string(),
            value: s.to_string(),
            reason: "expected HH:MM".to_string(),
        });
    }
    let h: u32 = parts[0]
        .parse()
        .map_err(|_| CliError::InvalidValue {
            flag: flag.to_string(),
            value: s.to_string(),
            reason: "hour must be a number".to_string(),
        })?;
    let m: u32 = parts[1]
        .parse()
        .map_err(|_| CliError::InvalidValue {
            flag: flag.to_string(),
            value: s.to_string(),
            reason: "minute must be a number".to_string(),
        })?;
    if h > 23 || m > 59 {
        return Err(CliError::InvalidValue {
            flag: flag.to_string(),
            value: s.to_string(),
            reason: "HH must be 00-23, MM must be 00-59".to_string(),
        });
    }
    Ok((h, m))
}

/// Parse "DD.MM.YYYY" into (day, month, year).
pub fn parse_date(s: &str) -> Result<(u32, u32, u32), CliError> {
    let parts: Vec<&str> = s.split('.').collect();
    if parts.len() != 3 {
        return Err(CliError::InvalidValue {
            flag: "date".to_string(),
            value: s.to_string(),
            reason: "expected DD.MM.YYYY".to_string(),
        });
    }
    let d: u32 = parts[0].parse().map_err(|_| CliError::InvalidValue {
        flag: "date".to_string(),
        value: s.to_string(),
        reason: "day must be a number".to_string(),
    })?;
    let mo: u32 = parts[1].parse().map_err(|_| CliError::InvalidValue {
        flag: "date".to_string(),
        value: s.to_string(),
        reason: "month must be a number".to_string(),
    })?;
    let y: u32 = parts[2].parse().map_err(|_| CliError::InvalidValue {
        flag: "date".to_string(),
        value: s.to_string(),
        reason: "year must be a number".to_string(),
    })?;
    if !(1..=31).contains(&d) || !(1..=12).contains(&mo) || y < 2000 || y > 2100 {
        return Err(CliError::InvalidValue {
            flag: "date".to_string(),
            value: s.to_string(),
            reason: "out of valid range".to_string(),
        });
    }
    Ok((d, mo, y))
}

/// Format a duration in seconds to "Hh Mm Ss" or "Xm" if under an hour.
pub fn format_duration(secs: i32) -> String {
    let abs = secs.unsigned_abs();
    let h = abs / 3600;
    let m = (abs % 3600) / 60;
    let s = abs % 60;
    let sign = if secs < 0 { "-" } else { "" };
    if h > 0 {
        format!("{}{}h {}m {}s", sign, h, m, s)
    } else if m > 0 {
        format!("{}{}m {}s", sign, m, s)
    } else {
        format!("{}{}s", sign, s)
    }
}

/// Extract a numeric ID from any ActivityRef/ProjectRef/UserRef variant.
pub fn get_entity_id<T>(entity: &Option<crate::models::ActivityRef>) -> Option<u32> {
    // Generic helper — specialized at call sites
    entity.as_ref().and_then(|r| match r {
        crate::models::ActivityRef::Id(id) => Some(*id),
        crate::models::ActivityRef::Full(a) => Some(a.id),
    })
}

/// Get just the ID out of a ProjectRef.
pub fn project_id(r: &crate::models::ProjectRef) -> u32 {
    match r {
        crate::models::ProjectRef::Id(id) => *id,
        crate::models::ProjectRef::Full(p) => p.id,
    }
}

/// Get just the ID out of an ActivityRef.
pub fn activity_id(r: &crate::models::ActivityRef) -> u32 {
    match r {
        crate::models::ActivityRef::Id(id) => *id,
        crate::models::ActivityRef::Full(a) => a.id,
    }
}

/// Project name with fallback to `#<id>`.
pub fn project_name(r: &crate::models::ProjectRef) -> String {
    match r {
        crate::models::ProjectRef::Id(id) => format!("#{}", id),
        crate::models::ProjectRef::Full(p) => p.name.clone(),
    }
}

/// Activity name with fallback to `#<id>`.
pub fn activity_name(r: &crate::models::ActivityRef) -> String {
    match r {
        crate::models::ActivityRef::Id(id) => format!("#{}", id),
        crate::models::ActivityRef::Full(a) => a.name.clone(),
    }
}

/// Build ISO 8601 datetime string from date and time parts.
/// `date_str` is "YYYY-MM-DD", `time_str` is "HH:MM".
pub fn iso_datetime(date_str: &str, time_str: &str) -> String {
    format!("{}T{}:00", date_str, time_str)
}

/// Convert "DD.MM.YYYY" to "YYYY-MM-DD".
pub fn date_to_iso(d: u32, m: u32, y: u32) -> String {
    format!("{:04}-{:02}-{:02}", y, m, d)
}

/// Current date in "DD.MM.YYYY" format.
pub fn today_de() -> String {
    let now = chrono::Local::now().date_naive();
    format!("{:02}.{:02}.{:04}", now.day(), now.month(), now.year())
}

/// Current date in "YYYY-MM-DD" format.
pub fn today_iso() -> String {
    chrono::Local::now().date_naive().format("%Y-%m-%d").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_id_accepts_positive() {
        assert_eq!(parse_id("42", "p").unwrap(), 42);
    }

    #[test]
    fn parse_id_rejects_abc() {
        assert!(parse_id("abc", "p").is_err());
    }

    #[test]
    fn parse_id_rejects_zero() {
        assert!(parse_id("0", "p").is_err());
    }

    #[test]
    fn parse_id_rejects_negative() {
        assert!(parse_id("-1", "p").is_err());
    }

    #[test]
    fn parse_time_range_happy() {
        assert_eq!(parse_time_range("09:00-12:00").unwrap(), (9, 0, 12, 0));
    }

    #[test]
    fn parse_time_range_invalid_format() {
        assert!(parse_time_range("9-12").is_err());
    }

    #[test]
    fn parse_time_range_begin_eq_end() {
        assert!(parse_time_range("09:00-09:00").is_err());
    }

    #[test]
    fn parse_time_range_begin_gt_end() {
        assert!(parse_time_range("12:00-09:00").is_err());
    }

    #[test]
    fn parse_date_happy() {
        assert_eq!(parse_date("22.09.2026").unwrap(), (22, 9, 2026));
    }

    #[test]
    fn parse_date_invalid_format() {
        assert!(parse_date("2026-09-22").is_err());
    }

    #[test]
    fn parse_date_invalid_month() {
        assert!(parse_date("22.13.2026").is_err());
    }

    #[test]
    fn format_duration_under_hour() {
        assert_eq!(format_duration(900), "15m 0s");
    }

    #[test]
    fn format_duration_over_hour() {
        assert_eq!(format_duration(3690), "1h 1m 30s");
    }

    #[test]
    fn iso_datetime_joins() {
        assert_eq!(iso_datetime("2026-09-22", "09:00"), "2026-09-22T09:00:00");
    }

    #[test]
    fn date_to_iso_pads() {
        assert_eq!(date_to_iso(3, 1, 2026), "2026-01-03");
    }
}
