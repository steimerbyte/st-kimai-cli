//! Auth config loading with permission and symlink checks.

use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;

use crate::errors::ConfigError;
use crate::models::AuthConfig;

/// Resolve auth config from env vars or `~/.kimai-cli/auth.json`.
pub fn load_auth_config(override_path: Option<&str>) -> Result<AuthConfig, ConfigError> {
    let env_key = std::env::var("KIMAI_API_KEY").ok();
    let env_url = std::env::var("KIMAI_URL")
        .ok()
        .or_else(|| std::env::var("KIMAI_API_URL").ok());

    if let Some(api_key) = env_key {
        eprintln!("Using API key from KIMAI_API_KEY environment variable");
        return Ok(AuthConfig {
            url: env_url.unwrap_or_else(|| "https://kimai.example.com".to_string()),
            api_key,
        });
    }

    let path = match override_path {
        Some(p) => PathBuf::from(p),
        None => default_config_path()?,
    };

    if !path.exists() {
        return Err(ConfigError::NotFound(path.display().to_string()));
    }

    // Reject symlinks (security)
    let metadata = fs::symlink_metadata(&path).map_err(|e| {
        ConfigError::Invalid(format!("cannot stat {}: {}", path.display(), e))
    })?;
    let file_type = metadata.file_type();
    if file_type.is_symlink() {
        return Err(ConfigError::Symlink(path.display().to_string()));
    }

    // Check permissions (Unix only)
    #[cfg(unix)]
    {
        let mode = metadata.permissions().mode() & 0o777;
        if mode & 0o077 != 0 {
            let perm_str = format!("{:o}", mode);
            if std::env::var("KIMAI_RELAX_PERMS").as_deref() != Ok("1") {
                return Err(ConfigError::InsecurePerms {
                    path: path.display().to_string(),
                    mode: perm_str,
                });
            }
            eprintln!(
                "⚠️  Warning: Config file has permissive permissions ({}).",
                perm_str
            );
        }
    }

    let content = fs::read_to_string(&path).map_err(|e| {
        ConfigError::Invalid(format!("cannot read {}: {}", path.display(), e))
    })?;
    let config: AuthConfig = serde_json::from_str(&content).map_err(|e| {
        ConfigError::Invalid(format!("JSON parse: {}", e))
    })?;

    if config.url.is_empty() || config.api_key.is_empty() {
        return Err(ConfigError::Invalid("missing 'url' or 'apiKey'".to_string()));
    }

    Ok(config)
}

/// Return path to `~/.kimai-cli/auth.json` if it exists, else None.
pub fn find_config_path() -> Option<PathBuf> {
    let path = default_config_path().ok()?;
    if path.exists() { Some(path) } else { None }
}

fn default_config_path() -> Result<PathBuf, ConfigError> {
    let home = dirs::home_dir().ok_or(ConfigError::NoHomeDir)?;
    Ok(home.join(".kimai-cli").join("auth.json"))
}
