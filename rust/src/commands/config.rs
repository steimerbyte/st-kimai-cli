//! `config` — show local config (auth path, current settings).

use clap::Args;

use crate::config;
use crate::errors::CliError;

#[derive(Args, Debug, Clone)]
pub struct ConfigArgs {
    #[arg(long)]
    pub json: bool,
}

pub fn run(args: ConfigArgs) -> Result<std::process::ExitCode, CliError> {
    let path = config::find_config_path();
    let env_key_set = std::env::var("KIMAI_API_KEY").is_ok();
    let env_url = std::env::var("KIMAI_URL")
        .ok()
        .or_else(|| std::env::var("KIMAI_API_URL").ok());

    if args.json {
        let json = serde_json::json!({
            "auth_file": path.as_ref().map(|p| p.display().to_string()),
            "env_api_key_set": env_key_set,
            "env_url": env_url,
        });
        println!("{}", serde_json::to_string_pretty(&json).unwrap());
    } else {
        println!("kimai-cli configuration:");
        match path {
            Some(p) => println!("  Auth file:  {}", p.display()),
            None => println!("  Auth file:  (none — using env vars)"),
        }
        println!("  Env API key: {}", if env_key_set { "set" } else { "unset" });
        if let Some(u) = env_url {
            println!("  Env URL:    {}", u);
        }
    }
    Ok(std::process::ExitCode::from(0))
}
