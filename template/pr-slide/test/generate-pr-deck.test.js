import { describe, expect, it } from "vitest";

import { buildDeck } from "../src/generate-pr-deck.js";

describe("buildDeck", () => {
  it("turns structural PR context into a presentation-shaped Slidev deck", () => {
    const markdown = buildDeck({
      title: "Hello world persistence",
      purpose: "Teams can verify the starter path from browser to database.",
      branch: "feature/hello-history",
      base: "main",
      generatedAt: new Date("2026-05-22T12:00:00.000Z"),
      sections: {
        pages: [
          {
            label: "Hello page",
            detail: "Keeps the starter screen focused on the hello-world flow.",
            image: "./assets/hello-page.png",
          },
        ],
        behaviors: [
          {
            label: "The happy path gets a spotlight",
            detail: "e2e/features/helloworld.feature",
          },
        ],
        designSystem: [
          {
            label: "Starter component examples",
            detail: "Keeps design-system examples free of product-specific copy.",
          },
        ],
        backend: [
          {
            label: "Greeter service",
            detail: "Records submitted names before returning a greeting.",
          },
        ],
        database: [
          {
            label: "Create Hello World Inputs",
            detail: "server/migrations/20260524160000_create_hello_world_inputs.sql",
            migrationSummary: [
              "Creates `hello_world_inputs`.",
              "Stores each submitted hello-world input.",
            ],
          },
        ],
        protos: [
          {
            label: "Hello World",
            detail: "proto/helloworld/v1/helloworld.proto",
            protoServices: [
              {
                name: "GreeterService",
                rpcs: [
                  {
                    description: "returns a greeting for the submitted name.",
                    name: "SayHello",
                  },
                ],
              },
            ],
          },
        ],
      },
      changedFiles: [
        "client/src/pages/hello/hello-page.tsx",
        "e2e/tests/helloworld.spec.ts",
        "proto/helloworld/v1/helloworld.proto",
      ],
    });

    expect(markdown).toContain("class=\"retro-stage");
    expect(markdown).toContain("Prepared for the Review Committee");
    expect(markdown).toContain("WINDOW 3.1-ish");
    expect(markdown).toContain("<h1>Hello world persistence</h1>");
    expect(markdown).toContain("## User-Facing Page Changes");
    expect(markdown).toContain("./assets/hello-page.png");
    expect(markdown).toContain("deck-screenshot");
    expect(markdown).toContain("Hello page");
    expect(markdown).toContain("## Features");
    expect(markdown).toContain("Feature specification");
    expect(markdown).not.toContain("<v-clicks>");
    expect(markdown).toContain("Evidence");
    expect(markdown).toContain("<h1>Technical Implementation</h1>");
    expect(markdown).toContain("## GreeterService");
    expect(markdown).toContain("We added this service with these RPCs:");
    expect(markdown).toContain("SayHello");
    expect(markdown).toContain("## Create Hello World Inputs");
    expect(markdown).toContain("Creates `hello_world_inputs`.");
    expect(markdown).toContain("client/src/pages/hello/hello-page.tsx");
  });

  it("keeps empty structural buckets presentation-ready", () => {
    const markdown = buildDeck({
      title: "Tiny docs polish",
      purpose: "The docs read more clearly.",
      branch: "docs/polish",
      base: "main",
      generatedAt: new Date("2026-05-22T12:00:00.000Z"),
      sections: {
        pages: [],
        behaviors: [],
        designSystem: [],
        backend: [],
        database: [],
        protos: [],
      },
      changedFiles: [],
    });

    expect(markdown).toContain("No page-level UI changes detected yet.");
    expect(markdown).toContain("No backend implementation changes detected yet.");
    expect(markdown).toContain("No focused changed-file list was provided.");
    expect(markdown).toContain("class=\"empty-desk\"");
  });
});
