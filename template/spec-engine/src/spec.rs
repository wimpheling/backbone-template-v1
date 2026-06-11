use serde::Serialize;

#[derive(Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSpec {
    pub schema_version: u8,
    pub app: AppInfoSpec,
    pub client: ClientSpec,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct AppInfoSpec {
    pub name: String,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ClientSpec {
    pub components: Vec<ClientComponentSpec>,
    pub pages: Vec<ClientPageSpec>,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct ClientComponentSpec {
    pub name: String,
    pub stories: Vec<LadleStorySpec>,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientPageSpec {
    pub id: String,
    pub name: String,
    pub route_path: String,
    pub components: Vec<PageComponentNodeSpec>,
    pub stories: Vec<LadleStorySpec>,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct PageComponentNodeSpec {
    pub name: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<PageComponentNodeSpec>,
}

#[derive(Debug, Eq, PartialEq, Serialize)]
pub struct LadleStorySpec {
    pub name: String,
    pub file: String,
}
