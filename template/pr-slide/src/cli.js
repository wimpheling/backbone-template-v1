import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { buildDeck } from "./generate-pr-deck.js";
import { collectGitContext } from "./git-context.js";
import { branchToPresentationDirName } from "./presentation-paths.js";
import {
  listPresentations,
  resolvePresentationSlidesPath,
} from "./presentations.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(packageRoot, "..");
const presentationRoot = join(repoRoot, ".agents", "pr-presentation");
const command = process.argv[2] ?? "dev";
const args = process.argv.slice(3);

if (command === "generate") {
  const output = writeCurrentDeck(parseOptions(args));
  console.log(output.slidesPath);
} else if (command === "list") {
  printPresentations();
} else if (command === "open") {
  openPresentation(args);
} else if (command === "dev" || command === "build" || command === "export") {
  const output = writeCurrentDeck(parseOptions(args));
  runSlidev(command, output.slidesPath, args);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

export function writeCurrentDeck(options = {}) {
  const context = collectGitContext(options);
  const deckDir = resolve(
    repoRoot,
    options.out ??
      join(presentationRoot, branchToPresentationDirName(context.branch)),
  );
  enrichContextWithAssets(context, deckDir);
  const markdown = buildDeck(context);
  const slidesPath = join(deckDir, "slides.md");
  const manifestPath = join(deckDir, "manifest.json");

  mkdirSync(deckDir, { recursive: true });
  writeFileSync(slidesPath, markdown);
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        title: context.title,
        branch: context.branch,
        base: context.base,
        generatedAt: context.generatedAt.toISOString(),
        changedFiles: context.changedFiles,
      },
      null,
      2,
    ) + "\n",
  );

  return { slidesPath, manifestPath };
}

function enrichContextWithAssets(context, deckDir) {
  const sections = context.sections ?? {};

  for (const items of Object.values(sections)) {
    for (const item of items) {
      const asset = findItemAsset(deckDir, item);

      if (asset) {
        item.image = asset;
      }

      enrichItemFromFile(item);
    }
  }
}

function enrichItemFromFile(item) {
  if (!item.detail || !existsSync(join(repoRoot, item.detail))) {
    return;
  }

  if (item.detail.endsWith(".proto")) {
    item.protoServices = parseProtoServices(readFileSync(join(repoRoot, item.detail), "utf8"));
  }

  if (item.detail.includes("/migrations/") && item.detail.endsWith(".sql")) {
    item.migrationSummary = summarizeMigrationSql(
      readFileSync(join(repoRoot, item.detail), "utf8"),
    );
  }
}

function parseProtoServices(source) {
  const services = [];
  const servicePattern = /service\s+(\w+)\s*\{([\s\S]*?)\}/g;

  for (const match of source.matchAll(servicePattern)) {
    const [, name, body] = match;
    const rpcs = [...body.matchAll(/rpc\s+(\w+)\s*\((\w+)\)\s+returns\s+\((\w+)\)/g)].map(
      (rpcMatch) => ({
        name: rpcMatch[1],
        request: rpcMatch[2],
        response: rpcMatch[3],
        description: describeRpc(rpcMatch[1]),
      }),
    );

    services.push({ name, rpcs });
  }

  return services;
}

function describeRpc(name) {
  const descriptions = {
    SayHello: "returns a greeting for the submitted name.",
  };

  return descriptions[name] ?? `${humanizeIdentifier(name).toLowerCase()}.`;
}

function summarizeMigrationSql(source) {
  const statements = [];

  for (const match of source.matchAll(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/gi)) {
    statements.push(`Adds \`${match[2]}\` to \`${match[1]}\`.`);
  }

  for (const match of source.matchAll(/UPDATE\s+(\w+)\s+SET\s+([^;]+)/gi)) {
    statements.push(`Backfills \`${match[1]}\` rows with ${match[2].trim().replace(/\s+/g, " ")}.`);
  }

  return statements.length > 0 ? statements : ["Updates the database schema for this PR."];
}

function humanizeIdentifier(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

function findItemAsset(deckDir, item) {
  const candidates = [
    item.label,
    item.label.replace(/:.*$/, ""),
    item.detail?.split("/").at(-1)?.replace(/\.[^.]+$/, ""),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const relativePath = `assets/${slug(candidate)}.png`;

    if (existsSync(join(deckDir, relativePath))) {
      return `./${relativePath}`;
    }
  }

  return undefined;
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function printPresentations() {
  const presentations = listPresentations(presentationRoot);

  if (presentations.length === 0) {
    console.log("No PR presentations found.");
    return;
  }

  for (const presentation of presentations) {
    const branch = presentation.branch ? ` (${presentation.branch})` : "";
    console.log(`${presentation.name}${branch} - ${presentation.title}`);
  }
}

function openPresentation(values) {
  const openArgs = values[0] === "--" ? values.slice(1) : values;
  const name = openArgs[0];

  if (!name) {
    console.error("Usage: pnpm --filter @backbone/pr-slide run open -- <name>");
    process.exit(1);
  }

  const slidesPath = resolvePresentationSlidesPath(presentationRoot, name);
  runSlidev("dev", slidesPath, openArgs.slice(1));
}

function runSlidev(slidevCommand, slidesPath, originalArgs) {
  const passthrough = stripLocalOptions(originalArgs);
  const themeArgs = passthrough.includes("--theme")
    ? []
    : ["--theme", join(packageRoot, "node_modules", "@slidev", "theme-default")];
  const commandArgs =
    slidevCommand === "dev" ? [slidesPath] : [slidevCommand, slidesPath];
  const result = spawnSync(
    "pnpm",
    ["exec", "slidev", ...commandArgs, ...themeArgs, ...passthrough],
    {
      cwd: packageRoot,
      stdio: "inherit",
    },
  );

  process.exit(result.status ?? 1);
}

function parseOptions(values) {
  const options = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--git-base") {
      options.base = values[index + 1];
      index += 1;
    } else if (value === "--title") {
      options.title = values[index + 1];
      index += 1;
    } else if (value === "--purpose") {
      options.purpose = values[index + 1];
      index += 1;
    } else if (value === "--deck-out") {
      options.out = values[index + 1];
      index += 1;
    }
  }

  return options;
}

function stripLocalOptions(values) {
  const stripped = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--") {
      continue;
    }

    if (["--git-base", "--title", "--purpose", "--deck-out"].includes(value)) {
      index += 1;
    } else {
      stripped.push(value);
    }
  }

  return stripped;
}
