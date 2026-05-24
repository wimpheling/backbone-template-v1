import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export function listPresentations(root) {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => presentationFromDirectory(root, name))
    .filter((presentation) => presentation !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function resolvePresentationSlidesPath(root, name) {
  const slidesPath = resolve(root, name, "slides.md");

  if (!existsSync(slidesPath)) {
    throw new Error(`Presentation "${name}" does not exist at ${slidesPath}`);
  }

  return slidesPath;
}

function presentationFromDirectory(root, name) {
  const slidesPath = join(root, name, "slides.md");

  if (!existsSync(slidesPath)) {
    return undefined;
  }

  const manifest = readManifest(join(root, name, "manifest.json"));

  return {
    name,
    title: manifest.title || name,
    branch: manifest.branch || "",
    slidesPath,
  };
}

function readManifest(path) {
  if (!existsSync(path)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}
