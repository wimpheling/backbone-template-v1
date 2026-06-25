use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context as _, anyhow, bail};
use serde_json::Value;

use crate::spec::{
    AppInfoSpec, AppSpec, ClientComponentSpec, ClientPageSpec, ClientSpec, LadleStorySpec,
    PageComponentNodeSpec,
};

pub fn extract_spec(project_root: impl AsRef<Path>) -> anyhow::Result<AppSpec> {
    let project_root = project_root.as_ref();
    let route_paths = extract_route_paths(project_root)?;

    Ok(AppSpec {
        schema_version: 1,
        app: AppInfoSpec {
            name: extract_app_name(project_root)?,
        },
        client: ClientSpec {
            components: extract_client_components(project_root)?,
            pages: extract_client_pages(project_root, &route_paths)?,
        },
    })
}

fn extract_app_name(project_root: &Path) -> anyhow::Result<String> {
    let package_json_path = project_root.join("package.json");
    let package_json = fs::read_to_string(&package_json_path)
        .with_context(|| format!("read {}", package_json_path.display()))?;
    let parsed: Value = serde_json::from_str(&package_json)
        .with_context(|| format!("parse {}", package_json_path.display()))?;

    parsed
        .get("name")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .ok_or_else(|| anyhow!("root package.json must contain a string name"))
}

fn extract_client_components(project_root: &Path) -> anyhow::Result<Vec<ClientComponentSpec>> {
    let components_dir = project_root.join("client/packages/design-system-basic/src");

    if !components_dir.exists() {
        return Ok(Vec::new());
    }

    let mut components = Vec::new();

    for file_path in list_files(&components_dir)? {
        if !is_component_source_file(&file_path) {
            continue;
        }

        let source = fs::read_to_string(&file_path)
            .with_context(|| format!("read {}", file_path.display()))?;
        let name = extract_exported_component_name(&source)
            .unwrap_or_else(|| pascal_case(file_stem(&file_path)));
        let story_path = file_path.with_file_name(format!("{}.stories.tsx", file_stem(&file_path)));

        components.push(ClientComponentSpec {
            name,
            stories: extract_stories(project_root, &story_path)?,
        });
    }

    components.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(components)
}

fn extract_client_pages(
    project_root: &Path,
    route_paths: &HashMap<String, String>,
) -> anyhow::Result<Vec<ClientPageSpec>> {
    let pages_dir = project_root.join("client/src/pages");

    if !pages_dir.exists() {
        return Ok(Vec::new());
    }

    let mut pages = Vec::new();

    for file_path in list_files(&pages_dir)? {
        if !is_page_source_file(&file_path) {
            continue;
        }

        let source = fs::read_to_string(&file_path)
            .with_context(|| format!("read {}", file_path.display()))?;
        let id = file_stem(&file_path)
            .strip_suffix("-page")
            .map(ToOwned::to_owned)
            .ok_or_else(|| anyhow!("page file must end with -page.tsx: {}", file_path.display()))?;
        let name = extract_exported_component_name(&source)
            .unwrap_or_else(|| format!("{}Page", pascal_case(id.as_str())));
        let route_component = format!("{name}Route");
        let story_path = file_path.with_file_name(format!("{}.stories.tsx", file_stem(&file_path)));

        pages.push(ClientPageSpec {
            id,
            name,
            route_path: route_paths
                .get(&route_component)
                .cloned()
                .unwrap_or_default(),
            components: extract_component_tree(&source),
            stories: extract_stories(project_root, &story_path)?,
        });
    }

    pages.sort_by(|left, right| left.id.cmp(&right.id));
    Ok(pages)
}

fn extract_route_paths(project_root: &Path) -> anyhow::Result<HashMap<String, String>> {
    let app_path = project_root.join("client/src/App.tsx");

    if !app_path.exists() {
        return Ok(HashMap::new());
    }

    let source =
        fs::read_to_string(&app_path).with_context(|| format!("read {}", app_path.display()))?;
    let mut route_paths = HashMap::new();
    let mut position = 0;

    while let Some(route_offset) = source[position..].find("<Route") {
        let route_start = position + route_offset;
        let Some(route_end) = find_tag_end(&source, route_start) else {
            break;
        };
        let route_tag = &source[route_start..=route_end];

        if let (Some(path), Some(component_name)) = (
            extract_string_attribute(route_tag, "path"),
            extract_route_element_component(route_tag),
        ) {
            route_paths.insert(component_name, path);
        }

        position = route_end + 1;
    }

    Ok(route_paths)
}

fn extract_stories(project_root: &Path, story_path: &Path) -> anyhow::Result<Vec<LadleStorySpec>> {
    if !story_path.exists() {
        return Ok(Vec::new());
    }

    let source =
        fs::read_to_string(story_path).with_context(|| format!("read {}", story_path.display()))?;
    let file = relative_path(project_root, story_path)?;

    Ok(extract_exported_const_names(&source)
        .into_iter()
        .filter(|name| starts_with_uppercase(name))
        .map(|name| LadleStorySpec {
            name,
            file: file.clone(),
        })
        .collect())
}

fn extract_exported_component_name(source: &str) -> Option<String> {
    extract_exported_const_names(source)
        .into_iter()
        .find(|name| starts_with_uppercase(name))
}

fn extract_exported_const_names(source: &str) -> Vec<String> {
    let mut names = Vec::new();
    let mut position = 0;
    let marker = "export const ";

    while let Some(offset) = source[position..].find(marker) {
        let name_start = position + offset + marker.len();
        let name_end = source[name_start..]
            .find(|value: char| !is_identifier_char(value))
            .map_or(source.len(), |name_offset| name_start + name_offset);

        if name_end > name_start {
            names.push(source[name_start..name_end].to_owned());
        }

        position = name_end;
    }

    names
}

fn extract_component_tree(source: &str) -> Vec<PageComponentNodeSpec> {
    let mut roots = Vec::new();
    let mut stack: Vec<Vec<usize>> = Vec::new();
    let mut scheduled_pops: Vec<(usize, Vec<usize>)> = Vec::new();
    let mut position = 0;

    while position < source.len() {
        pop_scheduled_paths(&mut stack, &mut scheduled_pops, position);

        let Some(tag_offset) = source[position..].find('<') else {
            break;
        };
        let tag_start = position + tag_offset;

        if is_probably_type_parameter(source, tag_start) {
            position = tag_start + 1;
            continue;
        }

        pop_scheduled_paths(&mut stack, &mut scheduled_pops, tag_start);

        if source[tag_start..].starts_with("</") {
            if let Some((name, tag_end)) = parse_closing_tag(source, tag_start) {
                if starts_with_uppercase(name) {
                    pop_component_name(&roots, &mut stack, name);
                }
                position = tag_end + 1;
            } else {
                position = tag_start + 1;
            }
            continue;
        }

        if let Some((name, name_end, tag_end, self_closing)) = parse_opening_tag(source, tag_start)
        {
            if starts_with_uppercase(name) {
                let path = push_component_node(&mut roots, &stack, name);
                stack.push(path.clone());

                if self_closing {
                    scheduled_pops.push((tag_end + 1, path));
                    scheduled_pops.sort_by_key(|(pop_position, _)| *pop_position);
                }
            }

            position = name_end;
        } else {
            position = tag_start + 1;
        }
    }

    roots
}

fn parse_opening_tag(source: &str, tag_start: usize) -> Option<(&str, usize, usize, bool)> {
    let name_start = tag_start.checked_add(1)?;
    let first = source[name_start..].chars().next()?;

    if !is_identifier_start(first) {
        return None;
    }

    let name_end = source[name_start..]
        .find(|value: char| !is_tag_name_char(value))
        .map_or(source.len(), |offset| name_start + offset);
    let tag_end = find_tag_end(source, tag_start)?;
    let self_closing = source[..tag_end].trim_end().ends_with('/');

    Some((
        &source[name_start..name_end],
        name_end,
        tag_end,
        self_closing,
    ))
}

fn is_probably_type_parameter(source: &str, tag_start: usize) -> bool {
    source[..tag_start]
        .chars()
        .next_back()
        .is_some_and(is_identifier_char)
}

fn parse_closing_tag(source: &str, tag_start: usize) -> Option<(&str, usize)> {
    let name_start = tag_start.checked_add(2)?;
    let first = source[name_start..].chars().next()?;

    if !is_identifier_start(first) {
        return None;
    }

    let name_end = source[name_start..]
        .find(|value: char| !is_tag_name_char(value))
        .map_or(source.len(), |offset| name_start + offset);
    let tag_end = source[name_end..].find('>')? + name_end;

    Some((&source[name_start..name_end], tag_end))
}

fn find_tag_end(source: &str, tag_start: usize) -> Option<usize> {
    let mut quote: Option<char> = None;
    let mut brace_depth = 0usize;
    let mut escaped = false;

    for (offset, value) in source[tag_start + 1..].char_indices() {
        if let Some(quote_value) = quote {
            if escaped {
                escaped = false;
            } else if value == '\\' {
                escaped = true;
            } else if value == quote_value {
                quote = None;
            }
            continue;
        }

        match value {
            '"' | '\'' | '`' => quote = Some(value),
            '{' => brace_depth = brace_depth.saturating_add(1),
            '}' => brace_depth = brace_depth.saturating_sub(1),
            '>' if brace_depth == 0 => return Some(tag_start + 1 + offset),
            _ => {}
        }
    }

    None
}

fn push_component_node(
    roots: &mut Vec<PageComponentNodeSpec>,
    parent_path: &[Vec<usize>],
    name: &str,
) -> Vec<usize> {
    let node = PageComponentNodeSpec {
        name: name.to_owned(),
        children: Vec::new(),
    };

    if let Some(path) = parent_path.last() {
        let parent = node_at_mut(roots, path);
        parent.children.push(node);

        let mut child_path = path.clone();
        child_path.push(parent.children.len() - 1);
        child_path
    } else {
        roots.push(node);
        vec![roots.len() - 1]
    }
}

fn pop_scheduled_paths(
    stack: &mut Vec<Vec<usize>>,
    scheduled_pops: &mut Vec<(usize, Vec<usize>)>,
    position: usize,
) {
    let pop_count = scheduled_pops
        .iter()
        .take_while(|(pop_position, _)| *pop_position <= position)
        .count();

    for (_, path) in scheduled_pops.drain(..pop_count) {
        pop_component_path(stack, &path);
    }
}

fn pop_component_name(roots: &[PageComponentNodeSpec], stack: &mut Vec<Vec<usize>>, name: &str) {
    while let Some(path) = stack.pop() {
        if node_at(roots, &path).name == name {
            return;
        }
    }
}

fn pop_component_path(stack: &mut Vec<Vec<usize>>, path: &[usize]) {
    while let Some(current_path) = stack.pop() {
        if current_path == path {
            return;
        }
    }
}

fn node_at<'a>(roots: &'a [PageComponentNodeSpec], path: &[usize]) -> &'a PageComponentNodeSpec {
    let mut node = &roots[path[0]];

    for index in &path[1..] {
        node = &node.children[*index];
    }

    node
}

fn node_at_mut<'a>(
    roots: &'a mut [PageComponentNodeSpec],
    path: &[usize],
) -> &'a mut PageComponentNodeSpec {
    let Some((first, rest)) = path.split_first() else {
        unreachable!("component path is never empty");
    };
    let mut node = &mut roots[*first];

    for index in rest {
        node = &mut node.children[*index];
    }

    node
}

fn extract_string_attribute(tag: &str, attribute_name: &str) -> Option<String> {
    let attribute_start = tag.find(attribute_name)?;
    let after_name = &tag[attribute_start + attribute_name.len()..];
    let after_equals = after_name.trim_start().strip_prefix('=')?.trim_start();
    let quote = after_equals.chars().next()?;

    if quote != '"' && quote != '\'' {
        return None;
    }

    let value_start = quote.len_utf8();
    let value_end = after_equals[value_start..].find(quote)? + value_start;
    Some(after_equals[value_start..value_end].to_owned())
}

fn extract_route_element_component(tag: &str) -> Option<String> {
    let element_start = tag.find("element")?;
    let after_element = &tag[element_start + "element".len()..];
    let component_start = after_element.find(|value: char| value.is_ascii_uppercase())?;
    let name_start = element_start + "element".len() + component_start;
    let name_end = tag[name_start..]
        .find(|value: char| !is_identifier_char(value))
        .map_or(tag.len(), |offset| name_start + offset);

    Some(tag[name_start..name_end].to_owned())
}

fn list_files(root: &Path) -> anyhow::Result<Vec<PathBuf>> {
    let mut files = Vec::new();

    for entry in fs::read_dir(root).with_context(|| format!("read directory {}", root.display()))? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            files.extend(list_files(&path)?);
        } else if path.is_file() {
            files.push(path);
        }
    }

    files.sort();
    Ok(files)
}

fn is_component_source_file(path: &Path) -> bool {
    let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };
    let is_tsx = path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("tsx"));

    is_tsx && file_name != "index.tsx" && !file_name.ends_with(".stories.tsx")
}

fn is_page_source_file(path: &Path) -> bool {
    let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };

    file_name.ends_with("-page.tsx")
}

fn relative_path(root: &Path, path: &Path) -> anyhow::Result<String> {
    let relative = path
        .strip_prefix(root)
        .with_context(|| format!("make {} relative to {}", path.display(), root.display()))?;

    Ok(relative
        .to_string_lossy()
        .replace(std::path::MAIN_SEPARATOR, "/"))
}

fn file_stem(path: &Path) -> &str {
    path.file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
}

fn pascal_case(value: &str) -> String {
    value
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|part| !part.is_empty())
        .fold(String::new(), |mut output, part| {
            let mut chars = part.chars();
            let Some(first) = chars.next() else {
                return output;
            };

            output.push(first.to_ascii_uppercase());
            output.push_str(chars.as_str());
            output
        })
}

fn starts_with_uppercase(value: &str) -> bool {
    value
        .chars()
        .next()
        .is_some_and(|character| character.is_ascii_uppercase())
}

fn is_identifier_start(value: char) -> bool {
    value.is_ascii_alphabetic() || value == '_'
}

fn is_identifier_char(value: char) -> bool {
    value.is_ascii_alphanumeric() || value == '_'
}

fn is_tag_name_char(value: char) -> bool {
    is_identifier_char(value) || value == '.'
}

pub fn write_spec_json(
    project_root: impl AsRef<Path>,
    output_path: impl AsRef<Path>,
) -> anyhow::Result<()> {
    let spec = extract_spec(project_root)?;
    let json = serde_json::to_string_pretty(&spec)?;
    let output_path = output_path.as_ref();

    if let Some(parent) = output_path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        fs::create_dir_all(parent).with_context(|| format!("create {}", parent.display()))?;
    }

    fs::write(output_path, format!("{json}\n"))
        .with_context(|| format!("write {}", output_path.display()))?;

    Ok(())
}

pub fn parse_cli_args(args: &[String]) -> anyhow::Result<(PathBuf, Option<PathBuf>)> {
    let mut project_root = PathBuf::from(".");
    let mut output_path = None;
    let mut position = 0;

    while position < args.len() {
        match args[position].as_str() {
            "--project-root" => {
                position += 1;
                project_root = args
                    .get(position)
                    .map(PathBuf::from)
                    .ok_or_else(|| anyhow!("--project-root requires a path"))?;
            }
            "--out" => {
                position += 1;
                output_path = Some(
                    args.get(position)
                        .map(PathBuf::from)
                        .ok_or_else(|| anyhow!("--out requires a path"))?,
                );
            }
            "--help" | "-h" => bail!("HELP"),
            unknown => bail!("unknown argument: {unknown}"),
        }

        position += 1;
    }

    Ok((project_root, output_path))
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    use crate::{
        extractor::{extract_component_tree, extract_spec},
        spec::{LadleStorySpec, PageComponentNodeSpec},
    };

    #[test]
    fn extracts_capitalized_component_tree_without_props() {
        let source = r#"
            export const HelloPage = () => (
              <>
                <Navigation items={items} />
                <Layout
                  middle={
                    <Stack gap="lg">
                      <Stack gap="sm">
                        <Text>{eyebrow}</Text>
                        <Heading>{title}</Heading>
                      </Stack>
                      <Form onSubmit={(event) => event.preventDefault()}>
                        <FormField label={label}>
                          <Inline>
                            <TextInput value={name} />
                            <Button>{submitLabel}</Button>
                          </Inline>
                        </FormField>
                      </Form>
                      {error && <Notice tone="danger">{error}</Notice>}
                    </Stack>
                  }
                />
              </>
            )
        "#;

        assert_eq!(
            extract_component_tree(source),
            vec![
                node("Navigation", vec![]),
                node(
                    "Layout",
                    vec![node(
                        "Stack",
                        vec![
                            node("Stack", vec![node("Text", vec![]), node("Heading", vec![])]),
                            node(
                                "Form",
                                vec![node(
                                    "FormField",
                                    vec![node(
                                        "Inline",
                                        vec![node("TextInput", vec![]), node("Button", vec![])]
                                    )]
                                )]
                            ),
                            node("Notice", vec![])
                        ]
                    )]
                )
            ]
        );
    }

    #[test]
    fn extracts_client_spec_from_project_files() -> anyhow::Result<()> {
        let project = TestProject::new()?;
        project.write(
            "package.json",
            r#"{ "name": "sample-app", "private": true }"#,
        )?;
        project.write(
            "client/packages/design-system-basic/src/button.tsx",
            r"export const Button = () => <button />",
        )?;
        project.write(
            "client/packages/design-system-basic/src/button.stories.tsx",
            r"
                export const Primary = () => <Button />
                export const Disabled = () => <Button />
            ",
        )?;
        project.write(
            "client/packages/design-system-basic/src/index.tsx",
            r#"export * from "./button""#,
        )?;
        project.write(
            "client/src/App.tsx",
            r#"
                export function App() {
                  return <Routes><Route path="/" element={<HelloPageRoute />} /></Routes>
                }
            "#,
        )?;
        project.write(
            "client/src/pages/hello/hello-page.tsx",
            r"
                export const HelloPage = () => (
                  <Layout middle={<Stack><Button /></Stack>} />
                )
            ",
        )?;
        project.write(
            "client/src/pages/hello/hello-page.stories.tsx",
            r"
                const previewStates = {}
                export const Ready = () => <HelloPage />
                export const Error = () => <HelloPage />
            ",
        )?;

        let spec = extract_spec(project.root())?;

        assert_eq!(spec.app.name, "sample-app");
        assert_eq!(spec.client.components.len(), 1);
        assert_eq!(spec.client.components[0].name, "Button");
        assert_eq!(
            spec.client.components[0].stories,
            vec![
                story(
                    "Primary",
                    "client/packages/design-system-basic/src/button.stories.tsx"
                ),
                story(
                    "Disabled",
                    "client/packages/design-system-basic/src/button.stories.tsx"
                ),
            ]
        );
        assert_eq!(spec.client.pages.len(), 1);
        assert_eq!(spec.client.pages[0].id, "hello");
        assert_eq!(spec.client.pages[0].name, "HelloPage");
        assert_eq!(spec.client.pages[0].route_path, "/");
        assert_eq!(
            spec.client.pages[0].components,
            vec![node(
                "Layout",
                vec![node("Stack", vec![node("Button", vec![])])]
            )]
        );
        assert_eq!(
            spec.client.pages[0].stories,
            vec![
                story("Ready", "client/src/pages/hello/hello-page.stories.tsx"),
                story("Error", "client/src/pages/hello/hello-page.stories.tsx"),
            ]
        );

        Ok(())
    }

    fn node(name: &str, children: Vec<PageComponentNodeSpec>) -> PageComponentNodeSpec {
        PageComponentNodeSpec {
            name: name.to_owned(),
            children,
        }
    }

    fn story(name: &str, file: &str) -> LadleStorySpec {
        LadleStorySpec {
            name: name.to_owned(),
            file: file.to_owned(),
        }
    }

    struct TestProject {
        root: PathBuf,
    }

    impl TestProject {
        fn new() -> anyhow::Result<Self> {
            let suffix = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();
            let root = std::env::temp_dir().join(format!("spec-engine-test-{suffix}"));

            fs::create_dir_all(&root)?;

            Ok(Self { root })
        }

        fn root(&self) -> &Path {
            &self.root
        }

        fn write(&self, relative_path: &str, contents: &str) -> anyhow::Result<()> {
            let path = self.root.join(relative_path);

            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)?;
            }

            fs::write(path, contents)?;
            Ok(())
        }
    }

    impl Drop for TestProject {
        fn drop(&mut self) {
            let _ignored = fs::remove_dir_all(&self.root);
        }
    }
}
