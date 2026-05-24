use crate::db::Db;

#[derive(Clone)]
pub struct AppState {
    pub db: Db,
}

impl AppState {
    #[must_use]
    pub fn new(db: Db) -> Self {
        Self { db }
    }
}
