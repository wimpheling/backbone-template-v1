pub mod greeter;

use connectrpc::{ConnectError, ErrorCode};

#[allow(clippy::needless_pass_by_value)]
fn connect_internal(error: anyhow::Error) -> ConnectError {
    ConnectError::new(ErrorCode::Internal, error.to_string())
}
