//! Timesheet CRUD endpoints.

use reqwest::Method;

use super::KimaiApi;
use crate::errors::CliError;
use crate::models::{CreateTimesheetOptions, ListTimesheetsOptions, Timesheet};

impl KimaiApi {
    pub fn get_timesheets(
        &self,
        opts: &ListTimesheetsOptions,
    ) -> Result<Vec<Timesheet>, CliError> {
        let resp = self.get_with_query("/timesheets", opts)?;
        Ok(resp.json()?)
    }

    pub fn get_timesheet(&self, id: u32) -> Result<Timesheet, CliError> {
        let resp = self.request(Method::GET, &format!("/timesheets/{}", id), None::<&()>)?;
        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(CliError::Other(format!("timesheet #{} not found", id)));
        }
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }

    pub fn create_timesheet(
        &self,
        opts: &CreateTimesheetOptions,
    ) -> Result<Timesheet, CliError> {
        let resp = self.request(Method::POST, "/timesheets", Some(opts))?;
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }

    pub fn update_timesheet(
        &self,
        id: u32,
        updates: &serde_json::Value,
    ) -> Result<Timesheet, CliError> {
        let resp = self.request(
            Method::PATCH,
            &format!("/timesheets/{}", id),
            Some(updates),
        )?;
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }

    pub fn delete_timesheet(&self, id: u32) -> Result<(), CliError> {
        let resp = self.request(
            Method::DELETE,
            &format!("/timesheets/{}", id),
            None::<&()>,
        )?;
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(())
    }

    /// Helper for GET with query params (skip_serializing_if means absent fields
    /// don't show up in the URL).
    fn get_with_query<T: serde::Serialize>(
        &self,
        endpoint: &str,
        query: &T,
    ) -> Result<reqwest::blocking::Response, CliError> {
        let url = format!("{}{}", self.base_url, endpoint);
        let resp = self.client.get(&url).query(query).send()?;
        if resp.status().is_redirection() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: format!("Unexpected redirect from {}", url),
            });
        }
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp)
    }
}
