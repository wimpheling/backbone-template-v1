use super::Db;

impl Db {
    pub async fn record_hello_world_input(&self, input: &str) -> anyhow::Result<()> {
        sqlx::query(
            r"
            INSERT INTO hello_world_inputs (input)
            VALUES (?)
            ",
        )
        .bind(input)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    #[cfg(test)]
    pub async fn list_hello_world_inputs(&self) -> anyhow::Result<Vec<String>> {
        let rows = sqlx::query(
            r"
            SELECT input
            FROM hello_world_inputs
            ORDER BY created_at, id
            ",
        )
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(|row| Ok(sqlx::Row::try_get(&row, "input")?))
            .collect()
    }
}
