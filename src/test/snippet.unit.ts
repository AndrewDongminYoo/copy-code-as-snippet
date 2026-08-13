import * as assert from "assert";
import { describe, it } from "node:test";
import {
  createHeadTailSample,
  createSelectionRangeText,
  createSnippet,
  detectLanguage,
  SnippetFormat,
} from "../snippet";

describe("snippet formatting", () => {
  it("preserves the legacy Markdown default", () => {
    assert.strictEqual(
      createSnippet({
        format: SnippetFormat.Markdown,
        language: "typescript",
        relativePath: "src/index.ts",
        content: "const value = 1;",
        includeFilePath: true,
        fenceStrategy: "default",
        aiModeEnabled: false,
        rangeText: "lines 1-1 (full file)",
        pathPlacement: "legacy",
      }),
      "```typescript:src/index.ts\nconst value = 1;\n```",
    );
  });

  it("places an included path above a standard Markdown fence", () => {
    assert.strictEqual(
      createSnippet({
        format: SnippetFormat.Markdown,
        language: "typescript",
        relativePath: "src/index.ts",
        content: "const value = 1;",
        includeFilePath: true,
        fenceStrategy: "default",
        aiModeEnabled: false,
        rangeText: "lines 1-1 (full file)",
        pathPlacement: "header",
      }),
      "### File: src/index.ts\n\n```typescript\nconst value = 1;\n```",
    );
  });

  it("omits the header when header placement has no included path", () => {
    assert.strictEqual(
      createSnippet({
        format: SnippetFormat.Markdown,
        language: "typescript",
        relativePath: "src/index.ts",
        content: "const value = 1;",
        includeFilePath: false,
        fenceStrategy: "default",
        aiModeEnabled: false,
        rangeText: "lines 1-1 (full file)",
        pathPlacement: "header",
      }),
      "```typescript\nconst value = 1;\n```",
    );
  });

  it("keeps the AI header layout when header placement is configured", () => {
    assert.strictEqual(
      createSnippet({
        format: SnippetFormat.Markdown,
        language: "typescript",
        relativePath: "src/index.ts",
        content: "const value = 1;",
        includeFilePath: true,
        fenceStrategy: "default",
        aiModeEnabled: true,
        rangeText: "lines 1-1 (full file)",
        pathPlacement: "header",
      }),
      [
        "### File: src/index.ts",
        "### Language: typescript",
        "### Range: lines 1-1 (full file)",
        "",
        "```typescript",
        "const value = 1;",
        "```",
      ].join("\n"),
    );
  });

  it("preserves plain text exactly", () => {
    assert.strictEqual(
      createSnippet({
        format: SnippetFormat.Plain,
        language: "plaintext",
        relativePath: "notes.txt",
        content: "  unchanged\n",
        includeFilePath: true,
        fenceStrategy: "default",
        aiModeEnabled: false,
        rangeText: "lines 1-2 (full file)",
        pathPlacement: "legacy",
      }),
      "  unchanged\n",
    );
  });

  it("does not inject whitespace into HTML code content", () => {
    assert.strictEqual(
      createSnippet({
        format: SnippetFormat.Html,
        language: "typescript",
        relativePath: "src/index.ts",
        content: '  const value = "<&";\n',
        includeFilePath: true,
        fenceStrategy: "default",
        aiModeEnabled: false,
        rangeText: "lines 1-2 (full file)",
        pathPlacement: "legacy",
      }),
      '<pre><code class="language-typescript" data-filename="src/index.ts">  const value = &quot;&lt;&amp;&quot;;\n</code></pre>',
    );
  });

  for (const [content, openingFence] of [
    ["const value = 1;", "```typescript"],
    ["```", "````typescript"],
    ["````", "`````typescript"],
    ["`````", "``````typescript"],
  ] as const) {
    it(`uses a safe auto-upgrade fence for a ${content.length}-character fixture`, () => {
      const snippet = createSnippet({
        format: SnippetFormat.Markdown,
        language: "typescript",
        relativePath: "src/index.ts",
        content,
        includeFilePath: false,
        fenceStrategy: "autoUpgrade",
        aiModeEnabled: false,
        rangeText: "lines 1-1 (full file)",
        pathPlacement: "legacy",
      });

      assert.strictEqual(snippet.split("\n", 1)[0], openingFence);
    });
  }

  it("uses tilde fences without inspecting backtick content", () => {
    assert.strictEqual(
      createSnippet({
        format: SnippetFormat.Markdown,
        language: "typescript",
        relativePath: "src/index.ts",
        content: "`````",
        includeFilePath: false,
        fenceStrategy: "tilde",
        aiModeEnabled: false,
        rangeText: "lines 1-1 (full file)",
        pathPlacement: "legacy",
      }),
      "~~~typescript\n`````\n~~~",
    );
  });

  it("detects the existing Android Gradle special case", () => {
    assert.strictEqual(
      detectLanguage("/workspace/android/build.gradle", "gradle"),
      "groovy",
    );
  });

  it("detects the existing Dockerfile special case", () => {
    assert.strictEqual(
      detectLanguage("/workspace/Dockerfile", "plaintext"),
      "dockerfile",
    );
  });

  it("detects the existing docker-compose YAML special case", () => {
    assert.strictEqual(
      detectLanguage("/workspace/docker-compose.yaml", "yaml"),
      "docker-compose",
    );
  });
});

describe("head and tail samples", () => {
  it("joins ranged document reads with an omission marker", () => {
    assert.strictEqual(
      createHeadTailSample("line 1\nline 2", "line 9\nline 10", 6),
      "line 1\nline 2\n... 6 lines omitted ...\nline 9\nline 10",
    );
  });
});

describe("selection range metadata", () => {
  it("excludes a later line when the selection ends at character zero", () => {
    assert.strictEqual(
      createSelectionRangeText(4, 9, 0),
      "lines 5-9 (selection)",
    );
  });

  it("includes the ending line when the selection ends after character zero", () => {
    assert.strictEqual(
      createSelectionRangeText(4, 9, 3),
      "lines 5-10 (selection)",
    );
  });
});
