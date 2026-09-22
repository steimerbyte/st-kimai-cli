//! `tags` — list tags.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;

#[derive(Args, Debug, Clone)]
pub struct TagsArgs {
    #[arg(long)]
    pub json: bool,
}

pub fn run(args: TagsArgs, ctx: &Ctx) -> Result<(), CliError> {
    let tags = ctx.api.get_tags()?;
    if args.json {
        println!("{}", serde_json::to_string_pretty(&tags).unwrap());
    } else {
        for t in tags {
            println!("{}", t);
        }
    }
    Ok(())
}
