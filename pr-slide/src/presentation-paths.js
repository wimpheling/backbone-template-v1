export function branchToPresentationDirName(branch) {
  const slug = branch
    .trim()
    .replace(/^refs\/heads\//, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "detached-head";
}
