use connectrpc::{RequestContext, Response};

use crate::proto::helloworld::v1::{OwnedSayHelloRequestView, SayHelloResponse};

use super::GreeterRpcService;
use crate::rpc::{AppError, RpcResult, ok};

pub async fn handle(
    service: &GreeterRpcService,
    _ctx: RequestContext,
    request: &OwnedSayHelloRequestView,
) -> RpcResult<Response<SayHelloResponse>> {
    let name = request.name.trim();
    let name = if name.is_empty() { "World" } else { name };

    service
        .state
        .db
        .record_hello_world_input(name)
        .await
        .map_err(AppError::internal)?;

    ok(SayHelloResponse {
        greeting: format!("Hello, {name}!"),
        ..Default::default()
    })
}
