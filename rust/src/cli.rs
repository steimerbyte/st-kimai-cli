//! CLI argument parsing and dispatch.

use clap::{Parser, Subcommand};

use crate::commands;
use crate::ctx::Ctx;
use crate::errors::CliError;

#[derive(Parser, Debug)]
#[command(name = "kimai-cli", version, about = "Kimai time-tracking CLI")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Command>,
}

#[derive(Subcommand, Debug)]
pub enum Command {
    /// Create a new timesheet entry
    Add(commands::add::AddArgs),
    /// Edit an existing timesheet
    Edit(commands::edit::EditArgs),
    /// Delete a timesheet
    Remove(commands::remove::RemoveArgs),
    /// Show details of a single timesheet
    Show(commands::show::ShowArgs),
    /// Start a running timer
    Start(commands::start::StartArgs),
    /// Stop the active timer
    Stop(commands::stop::StopArgs),
    /// List timesheets
    List(commands::list::ListArgs),
    /// List projects
    Projects(commands::projects::ProjectsArgs),
    /// Show a single project
    Project(commands::project::ProjectArgs),
    /// List activities (optionally filtered by project)
    Activities(commands::activities::ActivitiesArgs),
    /// Show a single activity
    Activity(commands::activity::ActivityArgs),
    /// List customers
    Customers(commands::customers::CustomersArgs),
    /// List tags
    Tags(commands::tags::TagsArgs),
    /// Clone a timesheet
    Duplicate(commands::duplicate::DuplicateArgs),
    /// Smart suggestions from history
    Suggest(commands::suggest::SuggestArgs),
    /// Show authenticated user
    Whoami(commands::whoami::WhoamiArgs),
    /// Show local config
    Config(commands::config::ConfigArgs),
    /// Auth subcommands
    Auth {
        #[command(subcommand)]
        action: commands::auth::AuthAction,
    },
    /// Show help for a command
    Help { cmd: Option<String> },
    /// Print version
    Version,
}

impl Cli {
    pub fn parse_args() -> Self {
        Self::parse()
    }
}

pub fn run(args: Cli) -> std::process::ExitCode {
    match dispatch(args) {
        Ok(code) => code,
        Err(e) => {
            eprintln!("❌ {}", e);
            std::process::ExitCode::from(1)
        }
    }
}

fn dispatch(cli: Cli) -> Result<std::process::ExitCode, CliError> {
    let cmd = match cli.command {
        Some(c) => c,
        None => {
            // No subcommand: print help, exit 0
            use clap::CommandFactory;
            let mut cmd = Cli::command();
            cmd.print_help().ok();
            println!();
            return Ok(std::process::ExitCode::from(0));
        }
    };

    // Build context (loads auth, sets up client)
    let ctx = match &cmd {
        Command::Auth { action } => {
            // auth login/logout has its own auth handling
            return commands::auth::run(action.clone());
        }
        Command::Help { cmd } => {
            return commands::help::run(cmd.clone());
        }
        Command::Version => {
            println!("kimai-cli {}", env!("CARGO_PKG_VERSION"));
            return Ok(std::process::ExitCode::from(0));
        }
        Command::Config(args) => {
            return commands::config::run(args.clone());
        }
        _ => Ctx::load()?,
    };

    // Dispatch to command handler
    let result: Result<(), CliError> = match cmd {
        Command::Add(args) => commands::add::run(args, &ctx),
        Command::Edit(args) => commands::edit::run(args, &ctx),
        Command::Remove(args) => commands::remove::run(args, &ctx),
        Command::Show(args) => commands::show::run(args, &ctx),
        Command::Start(args) => commands::start::run(args, &ctx),
        Command::Stop(args) => commands::stop::run(args, &ctx),
        Command::List(args) => commands::list::run(args, &ctx),
        Command::Projects(args) => commands::projects::run(args, &ctx),
        Command::Project(args) => commands::project::run(args, &ctx),
        Command::Activities(args) => commands::activities::run(args, &ctx),
        Command::Activity(args) => commands::activity::run(args, &ctx),
        Command::Customers(args) => commands::customers::run(args, &ctx),
        Command::Tags(args) => commands::tags::run(args, &ctx),
        Command::Duplicate(args) => commands::duplicate::run(args, &ctx),
        Command::Suggest(args) => commands::suggest::run(args, &ctx),
        Command::Whoami(args) => commands::whoami::run(args, &ctx),
        Command::Auth { .. } | Command::Help { .. } | Command::Version | Command::Config(_) => {
            unreachable!("handled above")
        }
    };

    result.map(|_| std::process::ExitCode::from(0))
}
