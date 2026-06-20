mod say_hello;

use connectrpc::{ConnectError, RequestContext, Response};

use crate::{
    proto::helloworld::v1::{GreeterService, OwnedSayHelloRequestView, SayHelloResponse},
    rpc::AppError,
    state::AppState,
};

#[derive(Clone)]
pub struct GreeterRpcService {
    pub(super) state: AppState,
}

impl GreeterRpcService {
    #[must_use]
    pub fn new(state: AppState) -> Self {
        Self { state }
    }
}

#[allow(refining_impl_trait)]
impl GreeterService for GreeterRpcService {
    async fn say_hello(
        &self,
        ctx: RequestContext,
        request: OwnedSayHelloRequestView,
    ) -> Result<Response<SayHelloResponse>, ConnectError> {
        say_hello::handle(self, ctx, &request)
            .await
            .map_err(AppError::into_connect_error)
    }
}
