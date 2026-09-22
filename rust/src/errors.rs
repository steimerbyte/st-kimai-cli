//! Error types for the CLI.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum CliError {
    #[error("auth not configured. Run: kimai-cli auth login")]
    AuthMissing,

    #[error("missing required --{flag}")]
    MissingRequired { flag: String },

    #[error("--{flag} '{value}' is invalid ({reason})")]
    InvalidValue {
        flag: String,
        value: String,
        reason: String,
    },

    #[error("overlaps existing entry #{id} ({begin}-{end}). Use --force to override.")]
    Overlap {
        id: u32,
        begin: String,
        end: String,
    },

    #[error("api error ({status}): {message}")]
    Api { status: u16, message: String },

    #[error("io: {0}")]
    Io(#[from] std::io::Error),

    #[error("json: {0}")]
    Json(#[from] serde_json::Error),

    #[error("http: {0}")]
    Http(#[from] reqwest::Error),

    #[error("{0}")]
    Other(String),
}

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("config file not found at {0}")]
    NotFound(String),

    #[error("config file is a symlink — refusing to follow (replace with regular file: rm {0})")]
    Symlink(String),

    #[error("config file has insecure permissions ({mode}). Run: chmod 600 {path}")]
    InsecurePerms { path: String, mode: String },

    #[error("invalid auth.json: {0}")]
    Invalid(String),

    #[error("home directory not found — set $HOME")]
    NoHomeDir,
}
