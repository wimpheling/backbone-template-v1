import { describe, expect, it } from "vitest";

import { branchToPresentationDirName } from "../src/presentation-paths.js";

describe("branchToPresentationDirName", () => {
  it("turns branch names into one filesystem-safe presentation directory", () => {
    expect(branchToPresentationDirName("feat/hello-history")).toBe("feat-hello-history");
    expect(branchToPresentationDirName("refs/heads/fix/hello copy")).toBe("fix-hello-copy");
  });

  it("falls back when Git is not on a named branch", () => {
    expect(branchToPresentationDirName("   ")).toBe("detached-head");
  });
});
