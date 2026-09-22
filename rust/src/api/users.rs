//! User endpoints.

use reqwest::Method;

use super::KimaiApi;
use crate::errors::CliError;
use crate::models::User;

impl KimaiApi {
    pub fn get_me(&self) -> Result<User, CliError> {
        let resp = self.request(Method::GET, "/users/me", None::<&()>)?;
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }
}
