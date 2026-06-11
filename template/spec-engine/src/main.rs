#![allow(unknown_lints, max_file_length)]

use std::io::Write as _;

use spec_engine::extractor::{extract_spec, parse_cli_args, write_spec_json};

fn main() -> anyhow::Result<()> {
    let args: Vec<String> = std::env::args().skip(1).collect();

    if args.iter().any(|arg| arg == "--help" || arg == "-h") {
        std::io::stdout().write_all(help_text().as_bytes())?;
        return Ok(());
    }

    let (project_root, output_path) = parse_cli_args(&args)?;

    if let Some(output_path) = output_path {
        write_spec_json(project_root, output_path)?;
    } else {
        let spec = extract_spec(project_root)?;
        let json = serde_json::to_string_pretty(&spec)?;
        std::io::stdout().write_all(format!("{json}\n").as_bytes())?;
    }

    Ok(())
}

fn help_text() -> &'static str {
    "Usage:\n  spec-extractor [--project-root <path>] [--out <path>]\n"
}
