//! Tag endpoints.

use reqwest::Method;

use super::KimaiApi;
use crate::errors::CliError;

impl KimaiApi {
    pub fn get_tags(&self) -> Result<Vec<String>, CliError> {
        let resp = self.request(Method::GET, "/tags", None::<&()>)?;
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }
}
