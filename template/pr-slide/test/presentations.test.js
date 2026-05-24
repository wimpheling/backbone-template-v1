import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  listPresentations,
  resolvePresentationSlidesPath,
} from "../src/presentations.js";

describe("presentations", () => {
  it("lists directories that contain slides with manifest metadata", () => {
    const root = mkdtempSync(join(tmpdir(), "pr-slide-"));
    mkdirSync(join(root, "feat-one"));
    mkdirSync(join(root, "fix-two"));
    mkdirSync(join(root, "empty"));
    writeFileSync(join(root, "feat-one", "slides.md"), "# One\n");
    writeFileSync(
      join(root, "feat-one", "manifest.json"),
      JSON.stringify({ title: "Feature One", branch: "feat/one" }),
    );
    writeFileSync(join(root, "fix-two", "slides.md"), "# Two\n");

    expect(listPresentations(root)).toEqual([
      {
        name: "feat-one",
        title: "Feature One",
        branch: "feat/one",
        slidesPath: join(root, "feat-one", "slides.md"),
      },
      {
        name: "fix-two",
        title: "fix-two",
        branch: "",
        slidesPath: join(root, "fix-two", "slides.md"),
      },
    ]);
  });

  it("resolves a named presentation to its Slidev entry", () => {
    const root = mkdtempSync(join(tmpdir(), "pr-slide-"));
    mkdirSync(join(root, "feat-one"));
    writeFileSync(join(root, "feat-one", "slides.md"), "# One\n");

    expect(resolvePresentationSlidesPath(root, "feat-one")).toBe(
      join(root, "feat-one", "slides.md"),
    );
  });
});
