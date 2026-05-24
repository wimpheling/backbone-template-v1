fn main() -> Result<(), Box<dyn std::error::Error>> {
    connectrpc_build::Config::new()
        .files(&["../proto/helloworld/v1/helloworld.proto"])
        .includes(&["../proto"])
        .include_file("_connectrpc.rs")
        .compile()?;

    Ok(())
}
