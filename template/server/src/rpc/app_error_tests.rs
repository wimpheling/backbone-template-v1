use connectrpc::ErrorCode;

use crate::proto::helloworld::v1::AppErrorReason;
use crate::rpc::{AppError, AppErrorKind};

#[test]
fn invalid_argument_error_has_translatable_reason() {
    let kind = AppErrorKind::InvalidArgument;

    assert_eq!(
        kind.reason(),
        AppErrorReason::APP_ERROR_REASON_INVALID_ARGUMENT,
    );
    assert_eq!(kind.translation_key(), "errors.rpc.invalidArgument");
    assert!(kind.params().is_empty());
}

#[test]
fn app_error_converts_to_connect_error_with_structured_detail() {
    let error = AppError::invalid_argument(AppErrorKind::InvalidArgument).into_connect_error();

    assert_eq!(error.code, ErrorCode::InvalidArgument);
    assert_eq!(error.message.as_deref(), Some("invalid argument"));

    assert_eq!(error.details.len(), 1);
    let detail = &error.details[0];

    assert_eq!(detail.type_url, "helloworld.v1.AppErrorDetail");
    assert!(
        detail
            .value
            .as_deref()
            .is_some_and(|value| !value.is_empty())
    );
    assert_eq!(
        detail.debug.as_ref().and_then(|debug| debug.get("reason")),
        Some(&serde_json::json!("APP_ERROR_REASON_INVALID_ARGUMENT")),
    );
}
