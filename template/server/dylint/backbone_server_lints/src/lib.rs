#![feature(rustc_private)]

extern crate rustc_hir;
extern crate rustc_errors;
extern crate rustc_lint;
extern crate rustc_session;
extern crate rustc_span;

use rustc_errors::{DiagDecorator, DiagMessage, MultiSpan};
use rustc_hir::{Expr, ExprKind, ImplItemKind, Item, ItemKind, QPath};
use rustc_lint::{LateContext, LateLintPass, Lint, LintContext, LintStore};
use rustc_session::{Session, declare_lint, impl_lint_pass};
use rustc_span::{FileName, Span};
use std::collections::HashSet;
use std::path::{Component, Path};

const MAX_FILE_LINES: usize = 300;

dylint_linting::dylint_library!();

declare_lint! {
    /// ### What it does
    ///
    /// Warns when a Rust source file grows beyond the server file length limit.
    ///
    /// ### Why is this bad?
    ///
    /// Long files tend to hide unrelated responsibilities and make the server
    /// architecture harder to scan.
    pub MAX_FILE_LENGTH,
    Warn,
    "server Rust files should stay below the configured maximum line count"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when `sqlx` is used outside a `db` source directory.
    ///
    /// ### Why is this bad?
    ///
    /// Database access should be isolated behind the server's database module.
    pub SQLX_ONLY_IN_DB_FOLDER,
    Deny,
    "sqlx calls and imports are only allowed in db modules"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when environment variables are read outside a `config` source
    /// directory or `config.rs`.
    ///
    /// ### Why is this bad?
    ///
    /// Configuration loading should stay centralized so required environment
    /// variables fail with explicit startup errors.
    pub NO_DIRECT_ENV_VAR_OUTSIDE_CONFIG,
    Deny,
    "environment variables should only be read in config modules"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when RPC service implementations live outside `rpc/<service>/mod.rs`
    /// or do not have a sibling file for each RPC method.
    ///
    /// ### Why is this bad?
    ///
    /// Each RPC method should have its own file so services stay small and
    /// discoverable.
    pub RPC_METHOD_IN_SEPARATE_FILE,
    Deny,
    "RPC methods should be bridged from rpc/<service>/mod.rs with logic in per-method files"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when Axum-style endpoint handlers live outside a `rest` source
    /// directory.
    ///
    /// ### Why is this bad?
    ///
    /// REST and webhook endpoints should be kept away from RPC and database
    /// modules.
    pub REST_ENDPOINT_IN_REST_FOLDER,
    Deny,
    "Axum endpoint handlers should live in rest modules"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when `reqwest` is used outside integration modules.
    ///
    /// ### Why is this bad?
    ///
    /// External HTTP clients should be isolated behind integration clients.
    pub NO_HTTP_CLIENT_OUTSIDE_INTEGRATIONS,
    Deny,
    "reqwest usage should live in integrations modules"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when Connect RPC error types are used outside RPC modules.
    ///
    /// ### Why is this bad?
    ///
    /// Lower layers should return application errors and let the RPC boundary
    /// map them to transport errors.
    pub RPC_ERRORS_MAPPED_AT_BOUNDARY,
    Deny,
    "Connect RPC errors should be mapped in rpc modules"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when RPC code constructs `ConnectError` outside the central
    /// app-error adapter.
    ///
    /// ### Why is this bad?
    ///
    /// User-facing RPC failures must carry structured app error reasons so the
    /// client can handle them without parsing backend message strings.
    pub NO_DIRECT_CONNECT_ERROR_CONSTRUCTION,
    Deny,
    "ConnectError should only be constructed by the app-error adapter"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when Axum response error types are used outside REST modules.
    ///
    /// ### Why is this bad?
    ///
    /// Lower layers should avoid HTTP response concerns.
    pub REST_ERRORS_MAPPED_AT_BOUNDARY,
    Deny,
    "Axum response errors should be mapped in rest modules"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when SQL passed to `sqlx::query*` is not a string literal.
    ///
    /// ### Why is this bad?
    ///
    /// Static SQL and sqlx macros are easier to audit and avoid accidental
    /// interpolation bugs.
    pub NO_SQL_STRING_CONSTRUCTION,
    Warn,
    "sqlx query strings should be static"
}

declare_lint! {
    /// ### What it does
    ///
    /// Warns when `src/lib.rs` exports a top-level module outside the approved
    /// architecture areas.
    ///
    /// ### Why is this bad?
    ///
    /// Public module sprawl makes architecture boundaries harder to keep clear.
    pub CONTROLLED_PUBLIC_MODULES,
    Warn,
    "top-level public modules should be approved architecture areas"
}

#[unsafe(no_mangle)]
pub fn register_lints(sess: &Session, lint_store: &mut LintStore) {
    dylint_linting::init_config(sess);

    lint_store.register_lints(&[
        MAX_FILE_LENGTH,
        SQLX_ONLY_IN_DB_FOLDER,
        NO_DIRECT_ENV_VAR_OUTSIDE_CONFIG,
        RPC_METHOD_IN_SEPARATE_FILE,
        REST_ENDPOINT_IN_REST_FOLDER,
        NO_HTTP_CLIENT_OUTSIDE_INTEGRATIONS,
        RPC_ERRORS_MAPPED_AT_BOUNDARY,
        NO_DIRECT_CONNECT_ERROR_CONSTRUCTION,
        REST_ERRORS_MAPPED_AT_BOUNDARY,
        NO_SQL_STRING_CONSTRUCTION,
        CONTROLLED_PUBLIC_MODULES,
    ]);
    lint_store.register_late_pass(|_| Box::<BackboneServerLints>::default());
}

#[derive(Default)]
struct BackboneServerLints {
    checked_files: HashSet<String>,
}

impl_lint_pass!(BackboneServerLints => [
    MAX_FILE_LENGTH,
    SQLX_ONLY_IN_DB_FOLDER,
    NO_DIRECT_ENV_VAR_OUTSIDE_CONFIG,
    RPC_METHOD_IN_SEPARATE_FILE,
    REST_ENDPOINT_IN_REST_FOLDER,
    NO_HTTP_CLIENT_OUTSIDE_INTEGRATIONS,
    RPC_ERRORS_MAPPED_AT_BOUNDARY,
    NO_DIRECT_CONNECT_ERROR_CONSTRUCTION,
    REST_ERRORS_MAPPED_AT_BOUNDARY,
    NO_SQL_STRING_CONSTRUCTION,
    CONTROLLED_PUBLIC_MODULES,
]);

impl<'tcx> LateLintPass<'tcx> for BackboneServerLints {
    fn check_crate(&mut self, cx: &LateContext<'tcx>) {
        let source_map = cx.tcx.sess.source_map();

        for file in source_map.files().iter() {
            self.check_file_length(cx, &file);
        }
    }

    fn check_item(&mut self, cx: &LateContext<'tcx>, item: &'tcx Item<'tcx>) {
        if let ItemKind::Use(path, _) = item.kind {
            let segments = path_segments(path.segments);

            if is_sqlx_path(&segments) && !is_in_dir(cx, item.span, "db") {
                span_lint(
                    cx,
                    SQLX_ONLY_IN_DB_FOLDER,
                    item.span,
                    "sqlx imports are only allowed in db modules",
                );
            }

            if is_env_path(&segments) && !is_in_config(cx, item.span) {
                span_lint(
                    cx,
                    NO_DIRECT_ENV_VAR_OUTSIDE_CONFIG,
                    item.span,
                    "environment variable access should be centralized in config modules",
                );
            }

            check_boundary_path(cx, item.span, &segments);
        }

        if let ItemKind::Fn { ident, .. } = item.kind
            && is_rest_handler_name(ident.name.as_str())
            && !is_in_dir(cx, item.span, "rest")
        {
            span_lint(
                cx,
                REST_ENDPOINT_IN_REST_FOLDER,
                item.span,
                "Axum endpoint handlers should live in rest modules",
            );
        }

        if is_unapproved_public_module(cx, item) {
            span_lint(
                cx,
                CONTROLLED_PUBLIC_MODULES,
                item.span,
                "top-level public modules should be one of config, db, integrations, proto, rest, rpc, or state",
            );
        }

        if item_contains_dynamic_sql_query(cx, item) {
            span_lint(
                cx,
                NO_SQL_STRING_CONSTRUCTION,
                item.span,
                "sqlx query strings should be string literals or sqlx macros",
            );
        }

        if let ItemKind::Impl(impl_) = item.kind
            && let Some(of_trait) = impl_.of_trait
        {
            let trait_segments = path_segments(of_trait.trait_ref.path.segments);
            let Some(service_dir) = service_dir_from_trait(&trait_segments) else {
                return;
            };

            for &item_ref in impl_.items {
                let impl_item = cx.tcx.hir_impl_item(item_ref);

                if !matches!(impl_item.kind, ImplItemKind::Fn(..)) {
                    continue;
                }

                let method_name = impl_item.ident.name.as_str();

                if !is_rpc_bridge_module(cx, impl_item.span, &service_dir)
                    || !rpc_method_file_exists(cx, impl_item.span, &method_name)
                {
                    span_lint(
                        cx,
                        RPC_METHOD_IN_SEPARATE_FILE,
                        impl_item.span,
                        "RPC method implementations should be bridged from rpc/<service>/mod.rs with logic in a sibling method file",
                    );
                }
            }
        }
    }

    fn check_expr(&mut self, cx: &LateContext<'tcx>, expr: &'tcx Expr<'tcx>) {
        if let ExprKind::Path(qpath) = expr.kind {
            let segments = qpath_segments(qpath);

            if is_sqlx_path(&segments) && !is_in_dir(cx, expr.span, "db") {
                span_lint(
                    cx,
                    SQLX_ONLY_IN_DB_FOLDER,
                    expr.span,
                    "sqlx calls are only allowed in db modules",
                );
            }

            if is_env_path(&segments) && !is_in_config(cx, expr.span) {
                span_lint(
                    cx,
                    NO_DIRECT_ENV_VAR_OUTSIDE_CONFIG,
                    expr.span,
                    "environment variable access should be centralized in config modules",
                );
            }

            check_boundary_path(cx, expr.span, &segments);
        }

        if let ExprKind::Call(callee, args) = expr.kind {
            let sql = args.first();

            if is_sqlx_query_callee(cx, callee) && is_dynamic_sql_expr(cx, expr, sql) {
                span_lint(
                    cx,
                    NO_SQL_STRING_CONSTRUCTION,
                    sql.map_or(expr.span, |sql| sql.span),
                    "sqlx query strings should be string literals or sqlx macros",
                );
            }

            if is_connect_error_constructor(cx, callee) && !is_app_error_module(cx, expr.span) {
                span_lint(
                    cx,
                    NO_DIRECT_CONNECT_ERROR_CONSTRUCTION,
                    expr.span,
                    "ConnectError construction should go through rpc/app_error.rs so user-visible RPC errors are structured",
                );
            }
        }
    }
}

impl BackboneServerLints {
    fn check_file_length<'tcx>(
        &mut self,
        cx: &LateContext<'tcx>,
        file: &rustc_span::SourceFile,
    ) {
        let path = file_path(&file.name);

        if !self.checked_files.insert(path.clone()) || should_skip_file_length(&path) {
            return;
        }

        let line_count = file.count_lines();

        if line_count > MAX_FILE_LINES {
            span_lint(
                cx,
                MAX_FILE_LENGTH,
                Span::with_root_ctxt(file.start_pos, file.start_pos),
                format!(
                    "Rust source file has {line_count} lines; split files above {MAX_FILE_LINES} lines",
                ),
            );
        }
    }
}

fn qpath_segments(qpath: QPath<'_>) -> Vec<String> {
    match qpath {
        QPath::Resolved(_, path) => path_segments(path.segments),
        QPath::TypeRelative(_, segment) => vec![segment.ident.name.as_str().to_string()],
    }
}

fn span_lint<S, M>(cx: &LateContext<'_>, lint: &'static Lint, span: S, message: M)
where
    S: Into<MultiSpan>,
    M: Into<DiagMessage>,
{
    let span = span.into();

    cx.emit_span_lint(
        lint,
        span.clone(),
        DiagDecorator(|diag| {
            diag.primary_message(message);
            diag.span(span);
        }),
    );
}

fn path_segments(segments: &[rustc_hir::PathSegment<'_>]) -> Vec<String> {
    segments
        .iter()
        .map(|segment| segment.ident.name.as_str().to_string())
        .collect()
}

fn is_sqlx_path(segments: &[String]) -> bool {
    segments.first().is_some_and(|segment| segment == "sqlx")
}

fn is_env_path(segments: &[String]) -> bool {
    matches!(
        segments,
        [first, second, third, ..]
            if first == "std" && second == "env" && matches!(third.as_str(), "var" | "var_os")
    ) || matches!(
        segments,
        [first, second, ..] if first == "env" && matches!(second.as_str(), "var" | "var_os")
    )
}

fn check_boundary_path(cx: &LateContext<'_>, span: Span, segments: &[String]) {
    if is_reqwest_path(segments) && !is_in_dir(cx, span, "integrations") {
        span_lint(
            cx,
            NO_HTTP_CLIENT_OUTSIDE_INTEGRATIONS,
            span,
            "reqwest usage should live behind integrations modules",
        );
    }

    if is_connect_error_path(segments) && !is_allowed_connect_error_path(cx, span) {
        span_lint(
            cx,
            RPC_ERRORS_MAPPED_AT_BOUNDARY,
            span,
            "Connect RPC errors should only be mapped in rpc/app_error.rs or service bridge modules",
        );
    }

    if is_axum_response_error_path(segments) && !is_in_dir(cx, span, "rest") {
        span_lint(
            cx,
            REST_ERRORS_MAPPED_AT_BOUNDARY,
            span,
            "Axum response error types should only be mapped in rest modules",
        );
    }
}

fn is_reqwest_path(segments: &[String]) -> bool {
    segments.first().is_some_and(|segment| segment == "reqwest")
}

fn is_connect_error_path(segments: &[String]) -> bool {
    segments.first().is_some_and(|segment| segment == "connectrpc")
        && segments.iter().any(|segment| {
            matches!(segment.as_str(), "ConnectError" | "ErrorCode")
        })
}

fn is_axum_response_error_path(segments: &[String]) -> bool {
    segments.first().is_some_and(|segment| segment == "axum")
        && segments.iter().any(|segment| {
            matches!(
                segment.as_str(),
                "StatusCode" | "IntoResponse" | "Response"
            )
        })
}

fn is_sqlx_query_call(segments: &[String]) -> bool {
    matches!(segments, [first, second, ..] if first == "sqlx" && second.starts_with("query"))
}

fn is_sqlx_query_callee(cx: &LateContext<'_>, callee: &Expr<'_>) -> bool {
    if let ExprKind::Path(qpath) = callee.kind
        && is_sqlx_query_call(&qpath_segments(qpath))
    {
        return true;
    }

    span_snippet(cx, callee.span).is_some_and(|snippet| {
        let snippet = snippet.trim_start();
        snippet.starts_with("sqlx::query")
    })
}

fn is_connect_error_constructor(cx: &LateContext<'_>, callee: &Expr<'_>) -> bool {
    if span_snippet(cx, callee.span).is_some_and(|snippet| {
        let snippet = snippet.trim_start();
        snippet.starts_with("ConnectError::") || snippet.starts_with("connectrpc::ConnectError::")
    }) {
        return true;
    }

    let ExprKind::Path(qpath) = callee.kind else {
        return false;
    };

    cx.typeck_results()
        .qpath_res(&qpath, callee.hir_id)
        .opt_def_id()
        .or_else(|| cx.typeck_results().type_dependent_def_id(callee.hir_id))
        .is_some_and(|def_id| {
            let path = cx.tcx.def_path_str(def_id);

            path.contains("connectrpc") && path.contains("ConnectError") && path.ends_with("::new")
        })
}

fn is_dynamic_sql_expr(cx: &LateContext<'_>, call: &Expr<'_>, _sql: Option<&Expr<'_>>) -> bool {
    span_snippet(cx, call.span).is_some_and(|snippet| snippet.contains("format!("))
}

fn item_contains_dynamic_sql_query(cx: &LateContext<'_>, item: &Item<'_>) -> bool {
    matches!(item.kind, ItemKind::Fn { .. })
        && span_snippet(cx, item.span).is_some_and(|snippet| {
            snippet.contains("sqlx::query(format!(")
                || snippet.contains("sqlx::query_as(format!(")
        })
}

fn service_dir_from_trait(segments: &[String]) -> Option<String> {
    let trait_name = segments.last()?;
    let service_name = trait_name.strip_suffix("Service")?;

    if service_name.is_empty() {
        return None;
    }

    Some(to_snake_case(service_name))
}

fn is_rest_handler_name(name: &str) -> bool {
    name.ends_with("_handler")
}

fn is_unapproved_public_module(cx: &LateContext<'_>, item: &Item<'_>) -> bool {
    let path = span_path(cx, item.span);

    if !path.ends_with("/src/lib.rs") && !path.ends_with("ui/lib.rs") {
        return false;
    }

    let ItemKind::Mod(ident, ..) = item.kind else {
        return false;
    };

    if is_allowed_public_module(ident.name.as_str()) {
        return false;
    }

    cx.tcx
        .sess
        .source_map()
        .span_to_snippet(item.span)
        .is_ok_and(|snippet| snippet.trim_start().starts_with("pub mod "))
}

fn is_allowed_public_module(name: &str) -> bool {
    matches!(
        name,
        "config" | "db" | "integrations" | "proto" | "rest" | "rpc" | "state"
    )
}

fn is_in_config(cx: &LateContext<'_>, span: Span) -> bool {
    let path = span_path(cx, span);

    path.ends_with("/config.rs") || has_path_component(&path, "config")
}

fn is_app_error_module(cx: &LateContext<'_>, span: Span) -> bool {
    span_path(cx, span).ends_with("/rpc/app_error.rs")
}

fn is_allowed_connect_error_path(cx: &LateContext<'_>, span: Span) -> bool {
    let path = span_path(cx, span);

    path.ends_with("/rpc/app_error.rs")
        || path.ends_with("/rpc/mod.rs")
        || path.ends_with("_tests.rs")
        || is_rpc_service_bridge_path(&path)
}

fn is_rpc_service_bridge_path(path: &str) -> bool {
    let path = Path::new(path);
    path.file_name().is_some_and(|name| name == "mod.rs")
        && path
            .parent()
            .and_then(Path::parent)
            .is_some_and(|parent| parent.ends_with("rpc"))
}

fn span_snippet(cx: &LateContext<'_>, span: Span) -> Option<String> {
    cx.tcx.sess.source_map().span_to_snippet(span).ok()
}

fn is_in_dir(cx: &LateContext<'_>, span: Span, dirname: &str) -> bool {
    has_path_component(&span_path(cx, span), dirname)
}

fn is_rpc_bridge_module(cx: &LateContext<'_>, span: Span, service_dir: &str) -> bool {
    let path = span_path(cx, span);
    path.ends_with(&format!("/rpc/{service_dir}/mod.rs"))
}

fn rpc_method_file_exists(cx: &LateContext<'_>, span: Span, method_name: &str) -> bool {
    let path = span_path(cx, span);
    let Some(dir) = Path::new(&path).parent() else {
        return false;
    };

    dir.join(format!("{method_name}.rs")).exists()
}

fn has_path_component(path: &str, component: &str) -> bool {
    Path::new(path).components().any(|path_component| {
        matches!(path_component, Component::Normal(name) if name == component)
    })
}

fn should_skip_file_length(path: &str) -> bool {
    !path.ends_with(".rs")
        || path.contains("/target/")
        || path.contains("/.cargo/")
        || path.contains("/rustc/")
        || path.contains("/rust/deps/")
        || path.ends_with("/mod.rs")
        || path.ends_with("/build.rs")
}

fn span_path(cx: &LateContext<'_>, span: Span) -> String {
    source_file(cx, span)
        .map(|file| file_path(&file.name))
        .unwrap_or_default()
}

fn source_file(cx: &LateContext<'_>, span: Span) -> Option<std::sync::Arc<rustc_span::SourceFile>> {
    let source_map = cx.tcx.sess.source_map();
    source_map.lookup_source_file(span.lo()).into()
}

fn file_path(filename: &FileName) -> String {
    filename
        .prefer_local_unconditionally()
        .to_string_lossy()
        .replace('\\', "/")
}

fn to_snake_case(value: &str) -> String {
    let mut output = String::new();

    for (index, character) in value.chars().enumerate() {
        if character.is_uppercase() {
            if index > 0 {
                output.push('_');
            }

            output.extend(character.to_lowercase());
        } else {
            output.push(character);
        }
    }

    output
}

#[test]
fn ui() {
    dylint_testing::ui_test(env!("CARGO_PKG_NAME"), "ui");
}
