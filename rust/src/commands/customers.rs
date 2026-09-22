//! `customers` — list customers.

use clap::Args;

use crate::ctx::Ctx;
use crate::errors::CliError;

#[derive(Args, Debug, Clone)]
pub struct CustomersArgs {
    #[arg(long)]
    pub json: bool,
}

pub fn run(args: CustomersArgs, ctx: &Ctx) -> Result<(), CliError> {
    let customers = ctx.api.get_customers()?;
    if args.json {
        println!("{}", serde_json::to_string_pretty(&customers).unwrap());
    } else {
        println!("{:<6} {}", "ID", "Name");
        println!("{}", "-".repeat(50));
        for c in customers {
            println!("{:<6} {}", c.id, c.name);
        }
    }
    Ok(())
}
