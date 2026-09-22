//! Spinner wrapper around indicatif. No-op when stdout is not a TTY.

use indicatif::{ProgressBar, ProgressStyle};
use std::time::Duration;

pub struct Spinner {
    bar: Option<ProgressBar>,
}

impl Spinner {
    pub fn start(msg: &str) -> Self {
        if !atty::is(atty::Stream::Stdout) {
            eprintln!("{}", msg);
            return Self { bar: None };
        }
        let pb = ProgressBar::new_spinner();
        pb.set_style(
            ProgressStyle::default_spinner()
                .tick_strings(&["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"])
                .template("{spinner} {msg}")
                .unwrap(),
        );
        pb.set_message(msg.to_string());
        pb.enable_steady_tick(Duration::from_millis(80));
        Self { bar: Some(pb) }
    }

    pub fn succeed(&self, msg: &str) {
        match &self.bar {
            Some(b) => b.finish_with_message(format!("✔ {}", msg)),
            None => println!("✔ {}", msg),
        }
    }

    pub fn fail(&self, msg: &str) {
        match &self.bar {
            Some(b) => b.finish_with_message(format!("✖ {}", msg)),
            None => eprintln!("✖ {}", msg),
        }
    }
}

pub fn stdin_is_terminal() -> bool {
    atty::is(atty::Stream::Stdin)
}

pub fn stdout_is_terminal() -> bool {
    atty::is(atty::Stream::Stdout)
}
