//! Activity endpoints.

use reqwest::Method;

use super::KimaiApi;
use crate::errors::CliError;
use crate::models::Activity;

impl KimaiApi {
    pub fn get_activities(
        &self,
        project_id: Option<u32>,
    ) -> Result<Vec<Activity>, CliError> {
        let mut url = "/activities".to_string();
        if let Some(pid) = project_id {
            url = format!("/activities?project={}", pid);
        }
        let resp = self.request(Method::GET, &url, None::<&()>)?;
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }

    pub fn get_activity(&self, id: u32) -> Result<Activity, CliError> {
        let resp = self.request(Method::GET, &format!("/activities/{}", id), None::<&()>)?;
        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(CliError::Other(format!("activity #{} not found", id)));
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
