mod app_error;
pub mod greeter;

#[cfg(test)]
mod app_error_tests;

#[allow(unused_imports)]
pub(crate) use app_error::{AppError, AppErrorKind, RpcResult, ok};

#[cfg(test)]
mod tests {
    use connectrpc::ErrorCode;

    use super::AppError;

    #[test]
    fn app_error_hides_internal_error_details() {
        let error = AppError::internal(anyhow::anyhow!(
            "database password leaked in lower-level error"
        ))
        .into_connect_error();

        assert_eq!(error.code, ErrorCode::Internal);
        assert_eq!(error.message.as_deref(), Some("Internal server error"));
    }
}
