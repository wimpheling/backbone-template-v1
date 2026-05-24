use anyhow::Context as _;

#[derive(Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: String,
    pub database_url: String,
}

impl ServerConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            host: read_env("SERVER_HOST")?,
            port: read_env("SERVER_PORT")?,
            database_url: read_env("DATABASE_URL")?,
        })
    }

    #[must_use]
    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

fn read_env(name: &str) -> anyhow::Result<String> {
    std::env::var(name).with_context(|| format!("read {name}"))
}
