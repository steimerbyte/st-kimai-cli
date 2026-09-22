//! Customer endpoints.

use reqwest::Method;

use super::KimaiApi;
use crate::errors::CliError;
use crate::models::Customer;

impl KimaiApi {
    pub fn get_customers(&self) -> Result<Vec<Customer>, CliError> {
        let resp = self.request(Method::GET, "/customers", None::<&()>)?;
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }
}
