pub mod config;
pub mod db;

#[allow(clippy::pedantic)]
pub mod proto {
    connectrpc::include_generated!();
}

pub mod rpc;
pub mod state;
