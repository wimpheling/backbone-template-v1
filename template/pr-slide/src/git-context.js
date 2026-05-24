import { execFileSync } from "node:child_process";

import { classifyChangedFiles, inferPurpose } from "./generate-pr-deck.js";

export function collectGitContext(options = {}) {
  const repoRoot = git(process.cwd(), ["rev-parse", "--show-toplevel"]);
  const branch = git(repoRoot, ["branch", "--show-current"]) || "HEAD";
  const base =
    options.base ?? detectBase(repoRoot, ["main", "master", "origin/main", "origin/master"]);
  const mergeBase = base ? maybeGit(repoRoot, ["merge-base", "HEAD", base]) : "";
  const committed = mergeBase ? diffNames(repoRoot, [mergeBase + "..HEAD"]) : [];
  const staged = diffNames(repoRoot, ["--cached"]);
  const unstaged = diffNames(repoRoot, []);
  const untracked = gitLines(repoRoot, ["ls-files", "--others", "--exclude-standard"]);
  const changedFiles = unique([...committed, ...staged, ...unstaged, ...untracked])
    .filter((file) => !file.startsWith(".agents/pr-presentation/"))
    .sort();
  const latestSubject = maybeGit(repoRoot, ["log", "-1", "--pretty=%s"]);
  const title = options.title ?? titleFromBranch(branch, latestSubject);
  const purpose = options.purpose ?? inferPurpose(changedFiles);

  return {
    repoRoot,
    title,
    purpose,
    branch,
    base: base ?? "working tree",
    generatedAt: new Date(),
    sections: classifyChangedFiles(changedFiles),
    changedFiles,
  };
}

function detectBase(repoRoot, candidates) {
  for (const candidate of candidates) {
    if (maybeGit(repoRoot, ["rev-parse", "--verify", candidate])) {
      return candidate;
    }
  }

  return undefined;
}

function diffNames(repoRoot, args) {
  const output = maybeGit(repoRoot, ["diff", "--name-only", ...args]);

  return output ? output.split("\n").filter(Boolean) : [];
}

function gitLines(repoRoot, args) {
  const output = maybeGit(repoRoot, args);

  return output ? output.split("\n").filter(Boolean) : [];
}

function titleFromBranch(branch, fallback) {
  if (branch && branch !== "HEAD") {
    return branch
      .replace(/^[^/]+\//, "")
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");
  }

  return fallback || "Current PR";
}

function git(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  } catch (error) {
    if (typeof error.stdout === "string" && error.stdout.trim()) {
      return error.stdout.trim();
    }

    throw error;
  }
}

function maybeGit(cwd, args) {
  try {
    return git(cwd, args);
  } catch {
    return "";
  }
}

function unique(values) {
  return [...new Set(values)];
}
