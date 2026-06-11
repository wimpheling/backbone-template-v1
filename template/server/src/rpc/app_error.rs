use std::collections::BTreeMap;

use base64::Engine as _;
use buffa::{Enumeration as _, Message as _};
use connectrpc::{ConnectError, ErrorCode, Response, error::ErrorDetail};
use serde_json::json;
use tracing::error;

use crate::proto::helloworld::v1::{AppErrorDetail, AppErrorParam, AppErrorReason};

#[derive(Debug)]
#[allow(dead_code)]
pub(crate) enum AppError {
    UserFacing { code: ErrorCode, kind: AppErrorKind },
    Internal(anyhow::Error),
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[allow(dead_code)]
pub(crate) enum AppErrorKind {
    InvalidArgument,
}

impl AppError {
    #[allow(dead_code)]
    pub(crate) fn invalid_argument(kind: AppErrorKind) -> Self {
        Self::UserFacing {
            code: ErrorCode::InvalidArgument,
            kind,
        }
    }

    pub(crate) fn internal(error: anyhow::Error) -> Self {
        Self::Internal(error)
    }

    pub(crate) fn into_connect_error(self) -> ConnectError {
        match self {
            Self::UserFacing { code, kind } => {
                ConnectError::new(code, kind.debug_message()).with_detail(kind.error_detail())
            }
            Self::Internal(error) => {
                error!(error = ?error, "server internal error");
                ConnectError::new(ErrorCode::Internal, "Internal server error")
            }
        }
    }
}

impl AppErrorKind {
    pub(crate) fn reason(&self) -> AppErrorReason {
        match self {
            Self::InvalidArgument => AppErrorReason::APP_ERROR_REASON_INVALID_ARGUMENT,
        }
    }

    pub(crate) fn translation_key(&self) -> &'static str {
        match self {
            Self::InvalidArgument => "errors.rpc.invalidArgument",
        }
    }

    #[allow(clippy::unused_self)]
    pub(crate) fn params(&self) -> BTreeMap<String, String> {
        BTreeMap::new()
    }

    fn debug_message(&self) -> &'static str {
        match self {
            Self::InvalidArgument => "invalid argument",
        }
    }

    fn error_detail(&self) -> ErrorDetail {
        let detail = AppErrorDetail {
            params: self
                .params()
                .into_iter()
                .map(|(key, value)| AppErrorParam {
                    key,
                    value,
                    ..Default::default()
                })
                .collect(),
            reason: self.reason().into(),
            translation_key: self.translation_key().to_string(),
            ..Default::default()
        };
        let debug = json!({
            "params": detail
                .params
                .iter()
                .map(|param| (param.key.clone(), param.value.clone()))
                .collect::<BTreeMap<_, _>>(),
            "reason": self.reason().proto_name(),
            "translationKey": self.translation_key(),
        });

        ErrorDetail {
            debug: Some(debug),
            type_url: "helloworld.v1.AppErrorDetail".to_string(),
            value: Some(base64::engine::general_purpose::STANDARD.encode(detail.encode_to_vec())),
        }
    }
}

pub(crate) type RpcResult<T> = Result<T, AppError>;

#[allow(clippy::unnecessary_wraps)]
pub(crate) fn ok<T>(body: T) -> RpcResult<Response<T>> {
    Ok(Response::new(body))
}
