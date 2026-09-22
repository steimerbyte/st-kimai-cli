//! Shared context loaded once per CLI invocation.
//!
//! Carries the auth config and a pre-built reqwest client.

use crate::api::KimaiApi;
use crate::config;
use crate::errors::CliError;
use crate::models::AuthConfig;

pub struct Ctx {
    pub auth: AuthConfig,
    pub api: KimaiApi,
}

impl Ctx {
    pub fn load() -> Result<Self, CliError> {
        let auth = config::load_auth_config(None)
            .map_err(|_| CliError::AuthMissing)?;
        let api = KimaiApi::new(auth.clone());
        Ok(Self { auth, api })
    }
}
