mod sqlx {
    pub fn query<T>(_sql: T) {}
}

mod reqwest {
    pub struct Client;
}

mod connectrpc {
    pub struct ConnectError;
    pub struct ErrorCode;
}

mod axum {
    pub mod http {
        pub struct StatusCode;
    }

    pub mod response {
        pub trait IntoResponse {}
    }
}

use axum::{http::StatusCode, response::IntoResponse};
use connectrpc::{ConnectError, ErrorCode};
use reqwest::Client;

trait TasksService {
    fn list_tasks(&self);
}

struct TasksRpcService;

impl TasksService for TasksRpcService {
    fn list_tasks(&self) {}
}

pub fn external_webhook_handler() {}

fn read_database_url() {
    let _ = std::env::var("DATABASE_URL");
}

fn list_rows() {
    sqlx::query("SELECT 1");
}

fn dynamic_rows(table: &str) {
    sqlx::query(format!("SELECT * FROM {table}"));
}

fn main() {
    read_database_url();
    list_rows();
    dynamic_rows("tasks");
    let _ = (Client, ConnectError, ErrorCode, StatusCode);
    let service = TasksRpcService;
    service.list_tasks();
}
