//! Kimai REST API client.
//!
//! Uses blocking reqwest for simplicity and a smaller binary footprint.

use std::time::Duration;

use reqwest::blocking::{Client, ClientBuilder};
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE};

pub mod activities;
pub mod customers;
pub mod projects;
pub mod tags;
pub mod timesheets;
pub mod users;

use crate::errors::CliError;
use crate::models::AuthConfig;

pub const DEFAULT_TIMEOUT_MS: u64 = 30_000;

pub struct KimaiApi {
    client: Client,
    base_url: String,
}

impl KimaiApi {
    pub fn new(config: AuthConfig) -> Self {
        // Validate HTTPS
        if !config.url.starts_with("https://") {
            eprintln!(
                "Warning: KIMAI_URL must use HTTPS. HTTP would expose your API key. Got: {}",
                config.url
            );
        }

        let base_url = format!("{}/api", config.url.trim_end_matches('/'));
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            format!("Bearer {}", config.api_key).parse().unwrap(),
        );
        headers.insert(ACCEPT, "application/json".parse().unwrap());
        headers.insert(CONTENT_TYPE, "application/json".parse().unwrap());

        let client = ClientBuilder::new()
            .default_headers(headers)
            .timeout(Duration::from_millis(DEFAULT_TIMEOUT_MS))
            .redirect(reqwest::redirect::Policy::custom(|attempt| {
                // SECURITY: refuse any redirect to avoid leaking bearer tokens
                eprintln!("⚠️  Refusing redirect to {}", attempt.url());
                attempt.stop()
            }))
            .danger_accept_invalid_certs(false)
            .build()
            .expect("failed to build HTTP client");

        Self { client, base_url }
    }

    pub(crate) fn request(
        &self,
        method: reqwest::Method,
        endpoint: &str,
        body: Option<&impl serde::Serialize>,
    ) -> Result<reqwest::blocking::Response, CliError> {
        let url = format!("{}{}", self.base_url, endpoint);
        let mut req = self.client.request(method, &url);

        if let Some(b) = body {
            req = req.json(b);
        }

        let response = req.send()?;

        // SECURITY: refuse 3xx redirects
        if response.status().is_redirection() {
            return Err(CliError::Api {
                status: response.status().as_u16(),
                message: format!(
                    "Unexpected redirect from {}. The CLI refuses to follow redirects to avoid leaking credentials.",
                    url
                ),
            });
        }

        Ok(response)
    }

    /// Verify auth works by hitting /api/version
    pub fn ping(&self) -> Result<crate::models::Version, CliError> {
        let resp = self.request(reqwest::Method::GET, "/version", None::<&()>)?;
        if !resp.status().is_success() {
            return Err(CliError::Api {
                status: resp.status().as_u16(),
                message: resp.text().unwrap_or_default(),
            });
        }
        Ok(resp.json()?)
    }
}
