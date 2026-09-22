//! Interactive setup wizard for first-run auth configuration.

use std::fs;
use std::io::{self, Write};
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;

use crate::config;
use crate::errors::{CliError, ConfigError};
use crate::models::AuthConfig;
use crate::spinner;

/// Validate a Kimai URL: trim whitespace, strip trailing slashes, require https://.
pub fn validate_kimai_url(raw: &str) -> Result<String, CliError> {
    let url = raw.trim().trim_end_matches('/').to_string();
    if url.is_empty() {
        return Err(CliError::Other("URL is required".to_string()));
    }
    if !url.to_lowercase().starts_with("https://") {
        return Err(CliError::Other(format!(
            "URL must use https://. Plain http would expose your API key. (got: {})",
            url
        )));
    }
    Ok(url)
}

/// Interactive login wizard: prompt for URL + API key, save to `~/.kimai-cli/auth.json` mode 0600.
pub fn login_wizard() -> Result<AuthConfig, CliError> {
    if !spinner::stdin_is_terminal() || !spinner::stdout_is_terminal() {
        return Err(CliError::Other(
            "auth login requires a TTY. Run in a terminal or set KIMAI_URL and KIMAI_API_KEY env vars."
                .to_string(),
        ));
    }

    let mut url = String::new();
    print!("Kimai URL (e.g. https://kimai.example.com): ");
    io::stdout().flush().ok();
    io::stdin().read_line(&mut url).map_err(CliError::Io)?;
    let url = validate_kimai_url(&url)?;

    let mut api_key = String::new();
    print!("API key: ");
    io::stdout().flush().ok();
    io::stdin().read_line(&mut api_key).map_err(CliError::Io)?;
    let api_key = api_key.trim().to_string();
    if api_key.is_empty() {
        return Err(CliError::Other("API key is required".to_string()));
    }

    let home = dirs::home_dir().ok_or_else(|| CliError::Other(ConfigError::NoHomeDir.to_string()))?;
    let config_dir = home.join(".kimai-cli");
    let config_path = config_dir.join("auth.json");

    fs::create_dir_all(&config_dir).map_err(CliError::Io)?;
    fs::set_permissions(&config_dir, fs::Permissions::from_mode(0o700)).ok();

    let body = serde_json::json!({
        "url": url,
        "apiKey": api_key,
    });
    fs::write(&config_path, serde_json::to_string_pretty(&body).unwrap() + "\n")
        .map_err(CliError::Io)?;
    fs::set_permissions(&config_path, fs::Permissions::from_mode(0o600)).ok();

    // Verify it loads
    let cfg = config::load_auth_config(Some(config_path.to_str().unwrap()))
        .map_err(|e| CliError::Other(format!("config verification failed: {}", e)))?;

    println!("✓ Saved credentials to {} (mode 0600).", config_path.display());
    Ok(cfg)
}

/// Remove the auth config file.
pub fn logout() -> Result<(), CliError> {
    let path: Option<PathBuf> = config::find_config_path();
    match path {
        Some(p) => {
            fs::remove_file(&p).map_err(CliError::Io)?;
            println!("✓ Removed {}", p.display());
            Ok(())
        }
        None => {
            println!("No config file found.");
            Ok(())
        }
    }
}
