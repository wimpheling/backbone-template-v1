mod hello_world;
#[cfg(test)]
mod hello_world_tests;

use anyhow::Context as _;
use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};

#[derive(Clone)]
pub struct Db {
    pool: SqlitePool,
}

impl Db {
    pub async fn connect(database_url: &str) -> anyhow::Result<Self> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await
            .context("connect database")?;

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .context("run database migrations")?;

        Ok(Self { pool })
    }

    #[cfg(test)]
    async fn in_memory() -> anyhow::Result<Self> {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await?;

        sqlx::migrate!("./migrations").run(&pool).await?;
        Ok(Self { pool })
    }
}
