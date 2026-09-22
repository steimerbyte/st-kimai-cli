//! Data models for Kimai API entities.
//!
//! Kimai uses snake_case in JSON for most fields, but some nested fields
//! like `internalRate`, `metaFields`, `parentTitle`, `globalActivities`,
//! `break` need explicit rename annotations.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Timesheet {
    pub id: u32,
    pub activity: ActivityRef,
    pub project: ProjectRef,
    pub user: Option<UserRef>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub begin: String,
    pub end: Option<String>,
    pub duration: Option<i32>,
    #[serde(rename = "break", default)]
    pub break_secs: i32,
    pub description: Option<String>,
    #[serde(default)]
    pub rate: f64,
    #[serde(rename = "internalRate", default)]
    pub internal_rate: f64,
    #[serde(default)]
    pub exported: bool,
    pub billable: bool,
    #[serde(rename = "metaFields", default)]
    pub meta_fields: Vec<MetaField>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum ActivityRef {
    Id(u32),
    Full(Box<Activity>),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum ProjectRef {
    Id(u32),
    Full(Box<Project>),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum UserRef {
    Id(u32),
    Full(Box<User>),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Project {
    pub id: u32,
    pub name: String,
    #[serde(rename = "parentTitle")]
    pub parent_title: Option<String>,
    pub customer: Option<CustomerRef>,
    pub color: String,
    pub visible: bool,
    pub billable: bool,
    pub start: Option<String>,
    pub end: Option<String>,
    pub comment: Option<String>,
    #[serde(rename = "globalActivities")]
    pub global_activities: bool,
    #[serde(default)]
    pub teams: Vec<Team>,
    #[serde(rename = "metaFields", default)]
    pub meta_fields: Vec<MetaField>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum CustomerRef {
    Id(u32),
    Full(Box<Customer>),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Activity {
    pub id: u32,
    pub name: String,
    #[serde(rename = "parentTitle")]
    pub parent_title: Option<String>,
    pub project: Option<ProjectRef>,
    pub color: String,
    pub visible: bool,
    pub billable: bool,
    pub comment: Option<String>,
    #[serde(rename = "globalActivities")]
    pub global_activities: bool,
    #[serde(default)]
    pub teams: Vec<Team>,
    #[serde(rename = "metaFields", default)]
    pub meta_fields: Vec<MetaField>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Customer {
    pub id: u32,
    pub name: String,
    pub number: Option<String>,
    pub comment: Option<String>,
    pub color: String,
    pub visible: bool,
    pub billable: bool,
    pub country: String,
    pub currency: String,
    pub timezone: String,
    #[serde(default)]
    pub teams: Vec<Team>,
    #[serde(rename = "metaFields", default)]
    pub meta_fields: Vec<MetaField>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub id: u32,
    pub username: String,
    pub email: String,
    pub alias: Option<String>,
    pub title: Option<String>,
    pub enabled: bool,
    pub color: String,
    pub timezone: String,
    pub locale: String,
    pub language: String,
    pub initials: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Team {
    pub id: u32,
    pub name: String,
    pub color: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MetaField {
    pub name: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Version {
    pub version: String,
    #[serde(rename = "versionId")]
    pub version_id: u32,
    pub copyright: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AuthConfig {
    pub url: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
}

/// Options for creating a new timesheet
#[derive(Serialize, Debug, Clone)]
pub struct CreateTimesheetOptions {
    pub project: u32,
    pub activity: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub begin: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}

/// Query options for listing timesheets
#[derive(Serialize, Debug, Default, Clone)]
pub struct ListTimesheetsOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub activity: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub begin: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub billable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exported: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u32>,
}
