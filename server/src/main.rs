use std::{net::SocketAddr, sync::Arc};

use anyhow::Context as _;
use axum::{Router, routing::get};
use connectrpc::Router as ConnectRouter;
use server::{
    config::ServerConfig, db::Db, proto::helloworld::v1::GreeterServiceExt,
    rpc::greeter::GreeterRpcService, state::AppState,
};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;
use tracing_subscriber::{EnvFilter, fmt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("server=info".parse()?))
        .init();

    let config = ServerConfig::from_env()?;
    let bind_addr = config.bind_addr();
    let db = Db::connect(&config.database_url).await?;
    let app_state = AppState::new(db);

    let connect =
        Arc::new(GreeterRpcService::new(app_state.clone())).register(ConnectRouter::new());
    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .fallback_service(connect.into_axum_service())
        .with_state(app_state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .with_context(|| format!("bind {bind_addr}"))?;
    let addr: SocketAddr = listener.local_addr().context("read bound address")?;

    info!("server listening on http://{addr}");
    axum::serve(listener, app).await.context("serve")?;

    Ok(())
}
