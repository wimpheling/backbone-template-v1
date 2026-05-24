# Backbone Server Lints

Custom Dylint rules for the Rust server architecture. The crate is built
explicitly by `cargo dylint` through the root workspace metadata, but its own
empty `[workspace]` table keeps it out of regular server Cargo builds.
