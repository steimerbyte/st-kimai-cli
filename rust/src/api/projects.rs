//! Project endpoints.

use reqwest::Method;

use super::KimaiApi;
use crate::errors::CliError;
use crate::models::Project;

impl KimaiApi {
    pub fn get_projects(&self) -> Result<Vec<Project>, CliError> {
        let resp = self.request(Method::GET, "/projects", None::<&()>)?;
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }

    pub fn get_project(&self, id: u32) -> Result<Project, CliError> {
        let resp = self.request(Method::GET, &format!("/projects/{}", id), None::<&()>)?;
        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(CliError::Other(format!("project #{} not found", id)));
        }
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }
}
