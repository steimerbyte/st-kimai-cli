//! Command modules — each command lives in its own file.
//!
//! Convention: each module exposes a `Args` struct (clap derive) and a
//! `run(args: Args, ctx: &Ctx) -> Result<(), CliError>` function.

pub mod activities;
pub mod activity;
pub mod add;
pub mod auth;
pub mod config;
pub mod customers;
pub mod duplicate;
pub mod edit;
pub mod help;
pub mod list;
pub mod project;
pub mod projects;
pub mod remove;
pub mod show;
pub mod start;
pub mod stop;
pub mod suggest;
pub mod tags;
pub mod whoami;
