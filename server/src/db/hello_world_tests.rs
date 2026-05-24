use super::Db;

#[tokio::test]
async fn record_hello_world_input_persists_submitted_names() -> anyhow::Result<()> {
    let db = Db::in_memory().await?;

    db.record_hello_world_input("Playwright").await?;

    assert_eq!(db.list_hello_world_inputs().await?, vec!["Playwright"]);
    Ok(())
}
