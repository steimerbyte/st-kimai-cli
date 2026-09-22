//! `whoami` — show authenticated user.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;

#[derive(Args, Debug, Clone)]
pub struct WhoamiArgs {
    #[arg(long)]
    pub json: bool,
}

pub fn run(args: WhoamiArgs, ctx: &Ctx) -> Result<(), CliError> {
    let me = ctx.api.get_me()?;
    if args.json {
        println!("{}", serde_json::to_string_pretty(&me).unwrap());
    } else {
        println!("{} ({})", me.username, me.email);
        println!("ID: {}", me.id);
        println!("Timezone: {}", me.timezone);
    }
    Ok(())
}
