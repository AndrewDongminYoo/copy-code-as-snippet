# Codebase Review Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.
> The root agent owns staging, commits, and final verification.

**Goal:** Resolve the repository review findings while preserving existing default snippet output and adding opt-in path-safety and standard-Markdown UX.

**Architecture:** Keep VS Code lifecycle, configuration, document access, prompts, and clipboard behavior in `src/extension.ts`.
Move formatting, escaping, fence selection, range labels, language detection, and sample assembly into a dependency-free `src/snippet.ts` module with fast Node unit tests.
Exercise the installed extension once per Extension Host suite and verify the supported VS Code floor plus latest stable in CI.

**Tech Stack:** TypeScript 5.9, VS Code Extension API, Mocha and Sinon in the Extension Host, Node 24 built-in test runner, Yarn Classic, webpack, GitHub Actions, Trunk, OSV Scanner, and `@vscode/vsce`.

## Global Constraints

- Preserve command ID `copy-code-as-snippet.copy` and all existing setting defaults.
- Add `copy-code-as-snippet.markdown.pathPlacement` with values `legacy | header` and default `legacy`.
- Add `copy-code-as-snippet.outsideWorkspacePath` with values `absolute | basename` and default `absolute`.
- AI mode ignores `markdown.pathPlacement` and retains the existing file, language, and range header layout.
- Do not add migration state, telemetry, a service layer, new language mappings, a version bump, publishing, pushing, or pull-request operations.
- Do not add an automated test that freezes the absence of the non-contractual scaffold activation log; verify that approved cleanup by focused source inspection and the integration suite.
- Implement all other behavior changes through RED-GREEN-REFACTOR and keep unrelated code untouched.
- Use two-space indentation, double-quoted TypeScript strings, semicolons, and English identifiers and documentation.
- Stage explicit paths only and create one Conventional Commit per reviewable concern.

## File Map

- Create `src/snippet.ts`: pure snippet types and formatting helpers.
- Create `src/test/snippet.unit.ts`: Node unit tests for pure snippet behavior.
- Modify `src/extension.ts`: VS Code lifecycle, configuration, path resolution, efficient document reads, prompts, and clipboard operations.
- Modify `src/test/extension.test.ts`: single activation ownership and command-flow integration coverage.
- Modify `.vscode-test.mjs`: deterministic default VS Code version with environment override.
- Modify `package.json`: settings, menus, keybinding, scripts, type declarations, and VSIX tooling.
- Modify `yarn.lock`: CI-equivalent dependency resolution for manifest changes.
- Modify `.github/workflows/ci.yml`: unit test and two-version Extension Host gates.
- Modify `README.md`: actual UX, settings, Yarn commands, tests, packaging, and Issues URL.
- Modify `CHANGELOG.md`: unreleased behavior summary.

---

### Task 1: Stabilize Extension Host Activation Ownership

**Files:**

- Modify: `src/test/extension.test.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: VS Code extension ID `dongminyu.copy-code-as-snippet` and command ID `copy-code-as-snippet.copy`.
- Produces: One Extension Host activation per suite and a stable integration test gate that later tasks can reuse.

- [ ] **Step 1: Reconfirm the existing failure before changing the harness**

Run:

```bash
yarn compile-tests
yarn compile
for test_attempt in 1 2 3; do yarn -s vscode-test --reporter dot || exit $?; done
```

Expected: At least one run fails in the `before each` hook with `Error: command 'copy-code-as-snippet.copy' already exists`.
If all three pass because the defect is timing-dependent, retain the repository-review reproduction as RED evidence and do not change the production command registration.

- [ ] **Step 2: Replace per-test direct activation with suite-owned installed-extension activation**

Remove the `activate` import, synthetic `ExtensionContext`, and `activate(context)` call from `setup()`.
Use the real development extension once:

```typescript
suite("Copy Code as Snippet Extension Test Suite", () => {
  let extension: vscode.Extension<unknown>;

  suiteSetup(async () => {
    const installedExtension = vscode.extensions.getExtension(
      "dongminyu.copy-code-as-snippet",
    );
    assert.ok(installedExtension, "Development extension should be installed");
    extension = installedExtension;
    await extension.activate();
  });

  setup(() => {
    // Create only per-test API stubs and configuration values here.
  });

  teardown(() => {
    // Restore only per-test stubs and the clipboard replacement here.
    sinon.restore();
  });
});
```

Change the activation assertion to the observable host state:

```typescript
test("Extension should be activated", () => {
  assert.strictEqual(extension.isActive, true);
});
```

Retain the clipboard replacement only if `sinon.stub(vscode.env.clipboard, "writeText")` is not supported by the real API object.
Remove local manual `.restore()` calls that `sinon.restore()` now owns so a failing assertion cannot leak a stub into the next test.

- [ ] **Step 3: Run the suite three times to verify GREEN**

Run:

```bash
yarn compile-tests
yarn compile
for test_attempt in 1 2 3; do yarn -s vscode-test --reporter dot || exit $?; done
```

Expected: All nine current tests pass in each of the three new Extension Host processes and no duplicate-command error appears.

- [ ] **Step 4: Restore one integration test job in CI**

Add a stable-version job after `verify` in `.github/workflows/ci.yml`:

```yaml
integration:
  name: Extension Host Test
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

    - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
      with:
        node-version-file: .node-version
        cache: yarn

    - run: yarn install --frozen-lockfile
    - run: yarn compile-tests
    - run: yarn compile
    - run: xvfb-run -a yarn -s vscode-test
```

Remove the comment that intentionally excludes `yarn test`.
The two-version matrix replaces this single-version shape in Task 5.

- [ ] **Step 5: Verify the focused concern**

Run:

```bash
yarn lint
yarn compile-tests
yarn compile
trunk check src/test/extension.test.ts .github/workflows/ci.yml --ci
```

Expected: All commands pass with no modified generated files staged.

- [ ] **Step 6: Commit the stable harness**

The root agent stages and commits:

```bash
git add src/test/extension.test.ts .github/workflows/ci.yml
git diff --cached --check
git commit -m "test: stabilize extension host lifecycle"
```

---

### Task 2: Extract and Correct Pure Snippet Formatting

**Files:**

- Create: `src/snippet.ts`
- Create: `src/test/snippet.unit.ts`
- Modify: `src/extension.ts`
- Modify: `src/test/extension.test.ts`

**Interfaces:**

- Consumes: Existing snippet formats, fence strategies, language rules, and legacy Markdown output.
- Produces: `SnippetFormat`, `FenceStrategy`, `MarkdownPathPlacement`, `SnippetOptions`, `createSnippet(options)`, `createSelectionRangeText(startLine, endLine, endCharacter)`, `createHeadTailSample(headContent, tailContent, omittedLines)`, and `detectLanguage(filePath, defaultLanguage)`.

- [ ] **Step 1: Write RED characterization tests for the missing pure module**

Create `src/test/snippet.unit.ts` with Node's built-in runner and literal expectations:

````typescript
import * as assert from "assert";
import { describe, it } from "node:test";
import { createSnippet, detectLanguage, SnippetFormat } from "../snippet";

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
````

Run `yarn compile-tests`.
Expected: FAIL because `../snippet` does not exist.

- [ ] **Step 2: Move current pure logic without changing behavior**

Create `src/snippet.ts` with:

```typescript
import * as path from "path";

export const enum SnippetFormat {
  Markdown = "markdown",
  Html = "html",
  Plain = "plain",
}

export type FenceStrategy = "default" | "autoUpgrade" | "tilde";
export type MarkdownPathPlacement = "legacy" | "header";

export interface SnippetOptions {
  format: SnippetFormat;
  language: string;
  relativePath: string;
  content: string;
  includeFilePath: boolean;
  fenceStrategy: FenceStrategy;
  aiModeEnabled: boolean;
  rangeText: string;
  pathPlacement: MarkdownPathPlacement;
}
```

Move the current `detectLanguage`, `createSnippet`, Markdown, HTML, escaping, and fence helpers into this module.
Keep helper implementations unchanged, except adapt arguments to `SnippetOptions` and private narrower option types.
Import the public types and functions in `src/extension.ts`, pass `pathPlacement: "legacy"` temporarily, and delete only the moved declarations.

Run:

```bash
yarn compile-tests
node --test out/test/snippet.unit.js
yarn compile
yarn -s vscode-test --reporter dot
```

Expected: All characterization and integration tests pass.

- [ ] **Step 3: Fix HTML content preservation through RED-GREEN**

Add a test expecting the exact output below for source content that starts with two spaces and ends with a newline:

```typescript
'<pre><code class="language-typescript" data-filename="src/index.ts">  const value = &quot;&lt;&amp;&quot;;\n</code></pre>';
```

Run the unit suite.
Expected RED: Existing decoration whitespace appears inside `<code>`.

Replace the HTML return with:

```typescript
return `<pre><code class="${classAttr}"${filenameAttr}>${escapeHtml(content)}</code></pre>`;
```

Run the unit suite again.
Expected GREEN: Exact output passes.

- [ ] **Step 4: Fix arbitrary backtick runs through RED-GREEN**

Add table cases mapping content to opening fence:

```````typescript
[
  ["const value = 1;", "```typescript"],
  ["```", "````typescript"],
  ["````", "`````typescript"],
  ["`````", "``````typescript"],
];
```````

Use `includeFilePath: false`, `fenceStrategy: "autoUpgrade"`, and assert `snippet.split("\n", 1)[0]` against each literal.
Expected RED: Four- and five-backtick cases fail.

Implement:

```typescript
const longestRun = Math.max(
  0,
  ...Array.from(content.matchAll(/`+/g), (match) => match[0].length),
);
return "`".repeat(Math.max(3, longestRun + 1));
```

Retain `default` as three backticks and `tilde` as three tildes.
Add a separate literal tilde test expecting `~~~typescript` as the opening fence and `~~~` as the closing fence even when content contains backticks.
Expected GREEN: All literal cases pass.

- [ ] **Step 5: Fix end-exclusive line metadata through RED-GREEN**

Add tests:

```typescript
assert.strictEqual(createSelectionRangeText(4, 9, 0), "lines 5-9 (selection)");
assert.strictEqual(createSelectionRangeText(4, 9, 3), "lines 5-10 (selection)");
```

Expected RED: `createSelectionRangeText` is not exported.

Implement:

```typescript
export function createSelectionRangeText(
  startLine: number,
  endLine: number,
  endCharacter: number,
): string {
  const inclusiveEndLine =
    endCharacter === 0 && endLine > startLine ? endLine : endLine + 1;
  return `lines ${startLine + 1}-${inclusiveEndLine} (selection)`;
}
```

Use it for non-empty selections in `src/extension.ts`.
Change the existing integration fixture to return the real end-exclusive slice and expect `lines 5-9 (selection)`.

- [ ] **Step 6: Verify and commit the formatting concern**

Run:

```bash
yarn lint
yarn compile-tests
node --test out/test/snippet.unit.js
yarn compile
yarn -s vscode-test --reporter dot
```

The root agent stages and commits:

```bash
git add src/snippet.ts src/test/snippet.unit.ts src/extension.ts src/test/extension.test.ts
git diff --cached --check
git commit -m "fix: preserve snippet output semantics"
```

---

### Task 3: Avoid Unnecessary Full-Document Reads

**Files:**

- Modify: `src/extension.ts`
- Modify: `src/snippet.ts`
- Modify: `src/test/extension.test.ts`
- Modify: `src/test/snippet.unit.ts`

**Interfaces:**

- Consumes: `createHeadTailSample(headContent, tailContent, omittedLines)` from `src/snippet.ts`.
- Produces: Selection, cancellation, and head/tail code paths that do not call zero-argument `document.getText()` unless full content is required.

- [ ] **Step 1: Write RED integration tests for selection and cancellation reads**

For a non-empty selection, use a `getText` stub that asserts a range is present and returns `selected line`.
Execute the command and assert the literal copied snippet.
Expected RED: The current command first calls `getText()` without a range.

For a large document whose first `showQuickPick` resolves `undefined`, make every `getText` call throw `Content should not be read after cancellation` and assert no clipboard write.
Expected RED: The current command reads full content before the prompt.

Run:

```bash
yarn compile-tests
yarn compile
yarn -s vscode-test --grep "full document|canceled prompt"
```

- [ ] **Step 2: Write RED unit coverage for sample assembly**

Add:

```typescript
assert.strictEqual(
  createHeadTailSample("line 1\nline 2", "line 9\nline 10", 6),
  "line 1\nline 2\n... 6 lines omitted ...\nline 9\nline 10",
);
```

Run `yarn compile-tests`.
Expected: FAIL because the three-argument helper does not exist.

- [ ] **Step 3: Implement pure sample assembly**

Replace the whole-content splitter with:

```typescript
export function createHeadTailSample(
  headContent: string,
  tailContent: string,
  omittedLines: number,
): string {
  return `${headContent}\n... ${omittedLines} lines omitted ...\n${tailContent}`;
}
```

Run `yarn compile-tests && node --test out/test/snippet.unit.js`.
Expected: PASS.

- [ ] **Step 4: Defer reads until the copy scope is known**

Restructure `src/extension.ts` into these mutually exclusive branches:

```typescript
let fileContent: string;

if (hasSelection) {
  fileContent = document.getText(selection);
  rangeText = createSelectionRangeText(
    selection.start.line,
    selection.end.line,
    selection.end.character,
  );
} else if (largeFilePromptEnabled && totalLines > lineThreshold) {
  const choice = await vscode.window.showQuickPick(/* existing choices */);
  if (!choice || choice === "Cancel") {
    return;
  }
  if (choice.startsWith("Copy head")) {
    const headTail = await pickHeadTailLines(30, 30);
    if (!headTail) {
      return;
    }
    fileContent = readHeadTailSample(document, headTail.head, headTail.tail);
    rangeText = `lines 1-${totalLines} (head/tail sample: head ${headTail.head}, tail ${headTail.tail})`;
  } else {
    fileContent = document.getText();
  }
} else {
  fileContent = document.getText();
}
```

Keep `rangeText` initialized to the full-file label before the branches.

- [ ] **Step 5: Read exact head and tail ranges**

Add VS Code-specific helpers:

```typescript
function getDocumentLineRange(
  document: vscode.TextDocument,
  startLine: number,
  endLineExclusive: number,
): vscode.Range {
  const lastLine = document.lineAt(endLineExclusive - 1);
  return new vscode.Range(
    new vscode.Position(startLine, 0),
    lastLine.range.end,
  );
}

function readHeadTailSample(
  document: vscode.TextDocument,
  headLines: number,
  tailLines: number,
): string {
  const omittedLines = document.lineCount - headLines - tailLines;
  if (omittedLines <= 0) {
    return document.getText();
  }
  const headContent = document.getText(
    getDocumentLineRange(document, 0, headLines),
  );
  const tailContent = document.getText(
    getDocumentLineRange(
      document,
      document.lineCount - tailLines,
      document.lineCount,
    ),
  );
  return createHeadTailSample(headContent, tailContent, omittedLines);
}
```

Update large-file document doubles to provide `lineAt(line).range.end`.
For Head 20 / Tail 20 on 120 lines, assert two ranged `getText` calls, no zero-argument call, literal marker `... 80 lines omitted ...`, and unchanged snippet output.
Add a boundary case where the chosen head and tail counts cover the document; assert one zero-argument full read and no omission marker.

- [ ] **Step 6: Verify and commit document-read efficiency**

Run:

```bash
yarn lint
yarn compile-tests
node --test out/test/snippet.unit.js
yarn compile
yarn -s vscode-test --reporter dot
```

The root agent stages and commits:

```bash
git add src/extension.ts src/snippet.ts src/test/extension.test.ts src/test/snippet.unit.ts
git diff --cached --check
git commit -m "perf: avoid unnecessary document reads"
```

---

### Task 4: Add Compatible UX Options and Command Surfaces

**Files:**

- Modify: `src/snippet.ts`
- Modify: `src/extension.ts`
- Modify: `src/test/snippet.unit.ts`
- Modify: `src/test/extension.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: `MarkdownPathPlacement`, workspace folder resolution, and installed extension manifest.
- Produces: Opt-in standard Markdown headers, opt-in outside-workspace basename paths, editor context menu, and default keybinding.

- [ ] **Step 1: Write RED unit tests for header placement**

Assert these literals using `pathPlacement: "header"`:

````typescript
"### File: src/index.ts\n\n```typescript\nconst value = 1;\n```";
"```typescript\nconst value = 1;\n```"; // includeFilePath=false
````

Add an AI-mode case with `pathPlacement: "header"` and expect the existing AI file, language, and range headers.
Expected RED: Non-AI header placement still produces the legacy fence; AI characterization passes.

- [ ] **Step 2: Implement standard headers after the AI branch**

Add to `createMarkdownSnippet`:

```typescript
if (options.pathPlacement === "header" && options.includePath) {
  return `### File: ${options.relativePath}\n\n${fence}${options.language}\n${options.content}\n${fence}`;
}
```

Leave the existing legacy calculation as the final branch.
Run the unit suite and expect GREEN.

- [ ] **Step 3: Write RED integration tests for setting behavior and fallbacks**

- For `/some/private/path/test.js` outside a workspace with `outsideWorkspacePath=basename`, expect ` ```javascript:test.js `.
- With an invalid value, expect the compatibility fallback ` ```javascript:/some/private/path/test.js `.
- With `markdown.pathPlacement=header`, expect the standard header output.
- With an invalid path placement, expect legacy output.

Expected RED: Basename and standard-header tests fail because the command does not read either setting.

- [ ] **Step 4: Normalize settings and resolve the path**

Use:

```typescript
const configuredPathPlacement = config.get<string>(
  "markdown.pathPlacement",
  "legacy",
);
const pathPlacement: MarkdownPathPlacement =
  configuredPathPlacement === "header" ? "header" : "legacy";
const configuredOutsidePath = config.get<string>(
  "outsideWorkspacePath",
  "absolute",
);
const outsideWorkspacePath =
  configuredOutsidePath === "basename" ? "basename" : "absolute";
```

Initialize `relativePath` to either `path.basename(filePath)` or `filePath`, then override it with `path.relative(...)` when `getWorkspaceFolder(document.uri)` succeeds.
Pass `pathPlacement` into `createSnippet`.

- [ ] **Step 5: Write RED manifest tests**

From the suite-owned real extension's `packageJSON`, assert:

- `editor/context` contains the command with `when: "editorTextFocus"`.
- Keybinding is `ctrl+alt+c`, mac override is `cmd+alt+c`, and `when` is `editorTextFocus`.
- New enum/default pairs are `legacy | header` with `legacy`, and `absolute | basename` with `absolute`.
- `largeFile.lineThreshold` has `type: "integer"` and `minimum: 1`.

Expected RED: Contributions and constraints are missing.

- [ ] **Step 6: Add the exact approved manifest surface**

Add:

```json
"menus": {
  "editor/context": [
    {
      "command": "copy-code-as-snippet.copy",
      "when": "editorTextFocus"
    }
  ]
},
"keybindings": [
  {
    "command": "copy-code-as-snippet.copy",
    "key": "ctrl+alt+c",
    "mac": "cmd+alt+c",
    "when": "editorTextFocus"
  }
]
```

Add both new setting schemas and change only the threshold schema to integer with minimum 1.
Do not change existing defaults.

- [ ] **Step 7: Complete command-flow regression coverage**

Add focused Extension Host tests with literal clipboard or message expectations for the remaining declared behavior:

- `format=html` preserves the exact escaped HTML output established in Task 2.
- `format=plain` copies the selected or full source text exactly.
- `includeFilePath=false` emits a language-only Markdown fence.
- Dockerfile and docker-compose documents use `dockerfile` and `docker-compose` fence languages.
- A rejected `clipboard.writeText` call shows `Error copying to clipboard: denied` through a per-test `showErrorMessage` stub.
- Choosing `Copy full file` for an over-threshold document performs one zero-argument `getText()` call and copies the full literal source.

These are characterization and integration-boundary tests for behavior already implemented or fixed earlier in the plan; they must not trigger adjacent production refactoring.
Run each new test with `--grep` as it is added, then run the whole Extension Host suite.

- [ ] **Step 8: Verify and commit UX**

Run:

```bash
yarn lint
yarn compile-tests
node --test out/test/snippet.unit.js
yarn compile
yarn -s vscode-test --reporter dot
trunk check package.json src/snippet.ts src/extension.ts src/test/snippet.unit.ts src/test/extension.test.ts --ci
```

The root agent stages and commits:

```bash
git add package.json src/snippet.ts src/extension.ts src/test/snippet.unit.ts src/test/extension.test.ts
git diff --cached --check
git commit -m "feat: add compatible snippet UX options"
```

---

### Task 5: Align Supported Versions, Test Scripts, CI, and VSIX Packaging

**Files:**

- Modify: `.vscode-test.mjs`
- Modify: `.vscodeignore`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `yarn.lock`

**Interfaces:**

- Consumes: Engine floor `1.106.1`, `.node-version` value `24`, and both test files.
- Produces: `test:unit`, `test:integration`, `test:repeat`, and `vsix` scripts; `VSCODE_TEST_VERSION` override; minimum/stable CI matrix; direct packaging tool.

- [ ] **Step 1: Demonstrate the current version override gap**

Run:

```bash
VSCODE_TEST_VERSION=1.106.1 yarn -s vscode-test --list-configuration
```

Expected RED: The configuration JSON has no `version` property and still resolves latest stable.

- [ ] **Step 2: Make the test version deterministic**

Change `.vscode-test.mjs` to:

```javascript
import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test/**/*.test.js",
  version: process.env.VSCODE_TEST_VERSION ?? "1.106.1",
});
```

Run the listing with `1.106.1` and `stable` and confirm each literal appears as `version`.

- [ ] **Step 3: Align declaration packages and add the official VSIX tool**

Registry checks on 2026-08-13 confirmed `@types/vscode@1.106.0`, `@types/node@24.13.3`, and `@vscode/vsce@3.9.2` with Node engine `>=20`.
Run:

```bash
yarn add --dev --exact @types/vscode@1.106.0 @types/node@24.13.3
yarn add --dev @vscode/vsce@^3.9.2
```

Do not hand-edit `yarn.lock`.

- [ ] **Step 4: Add explicit scripts**

Retain `pretest` and add:

```json
"test": "yarn test:unit && yarn test:integration",
"test:unit": "node --test out/test/*.unit.js",
"test:integration": "vscode-test",
"test:repeat": "for test_attempt in 1 2 3; do yarn test:integration || exit $?; done",
"vsix": "vsce package"
```

The unit glob selects Node tests; `.vscode-test.mjs` continues to select only `*.test.js` Extension Host tests.

- [ ] **Step 5: Expand CI to the supported-version matrix**

Add `yarn test:unit` after `compile-tests` in `verify`.
Replace the temporary integration job with:

```yaml
integration:
  name: Extension Host Test (${{ matrix.vscode-version }})
  runs-on: ubuntu-latest
  strategy:
    fail-fast: false
    matrix:
      vscode-version: ["1.106.1", stable]
  steps:
    - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
    - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
      with:
        node-version-file: .node-version
        cache: yarn
    - run: yarn install --frozen-lockfile
    - run: yarn compile-tests
    - run: yarn compile
    - run: xvfb-run -a yarn test:integration
      env:
        VSCODE_TEST_VERSION: ${{ matrix.vscode-version }}
```

- [ ] **Step 6: Verify the graph, supported API floor, and both hosts**

Run:

```bash
yarn install --frozen-lockfile
yarn list --pattern '@types/vscode|@types/node|@vscode/vsce' --depth=0
yarn lint
yarn compile-tests
yarn compile
yarn test:unit
VSCODE_TEST_VERSION=1.106.1 yarn test:integration
VSCODE_TEST_VERSION=stable yarn test:integration
VSCODE_TEST_VERSION=1.106.1 yarn test:repeat
```

Expected: The direct versions match the manifest and all four Extension Host executions pass.

- [ ] **Step 7: Build once to expose unintended package contents**

Run:

```bash
yarn vsix
unzip -l copy-code-as-snippet-1.2.0.vsix
```

Expected RED: The new `docs/` implementation artifacts and repository-only files not already covered by `.vscodeignore` appear in the archive.
After inspection, remove only the verified ignored artifact with `rm copy-code-as-snippet-1.2.0.vsix`.

- [ ] **Step 8: Restrict and reverify the package contents**

Add repository-only entries confirmed by the RED archive to `.vscodeignore`, including `docs/**`, `.github/**`, `AGENTS.md`, `.node-version`, and `yarn.lock` when present.
Do not exclude README, changelog, license, manifest, runtime bundle, or images.

Run `yarn vsix` and `unzip -l copy-code-as-snippet-1.2.0.vsix` again.
Expected GREEN inclusions: `extension/dist/extension.js`, `extension/package.json`, README, changelog, license, and images.
Expected GREEN exclusions: `src`, `out`, `.vscode-test`, source maps, `node_modules`, `docs`, `.github`, `AGENTS.md`, `.node-version`, and `yarn.lock`.
Remove the verified ignored artifact.

- [ ] **Step 9: Run security and config gates, then commit**

Run:

```bash
osv-scanner scan source --lockfile yarn.lock
trunk check package.json yarn.lock .vscode-test.mjs .vscodeignore .github/workflows/ci.yml --ci
git diff --check
```

The root agent stages and commits:

```bash
git add package.json yarn.lock .vscode-test.mjs .vscodeignore .github/workflows/ci.yml
git diff --cached --check
git commit -m "build: verify supported VS Code versions"
```

---

### Task 6: Remove Obsolete Activation Logging

**Files:**

- Modify: `src/extension.ts`

**Interfaces:**

- Consumes: Existing `activate(context)` entry point.
- Produces: Activation without the generated scaffold congratulation message.

- [ ] **Step 1: Confirm and remove only the approved scaffold side effect**

Run `rg -n 'Congratulations|console\.log' src/extension.ts` and confirm the current greeting.
Delete that call and its two explanatory comments.
Do not add a brittle test for the absence of a diagnostic string.

- [ ] **Step 2: Verify and commit cleanup**

Run:

```bash
yarn lint
yarn compile
rg -n 'Congratulations|console\.log' src/extension.ts && exit 1 || true
```

The root agent stages and commits:

```bash
git add src/extension.ts
git diff --cached --check
git commit -m "chore: remove scaffold activation log"
```

---

### Task 7: Document the Implemented UX and Workflows

**Files:**

- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: Final settings, shortcuts, menus, scripts, packaging command, and verified behavior.
- Produces: User and contributor documentation matching the implementation.

- [ ] **Step 1: Update README against the final manifest**

- State that the editor context menu is available.
- Document `Cmd+Alt+C` on macOS and `Ctrl+Alt+C` on Windows and Linux.
- Show `legacy` and `header` path placement examples and AI-mode precedence.
- Document `absolute` and `basename`, including the privacy trade-off.
- Add both new settings and the integer minimum to the table.
- Replace the placeholder Issues URL with `https://github.com/AndrewDongminYoo/copy-code-as-snippet/issues`.
- Replace npm setup commands with `yarn install --frozen-lockfile` and `yarn compile`.
- Document `yarn test`, `yarn test:repeat`, `yarn package`, and `yarn vsix`.
- Replace the exhaustive `None at this time` known-issues claim with the real Issues link.

- [ ] **Step 2: Add an Unreleased changelog section**

Add before `1.2.0`:

```markdown
## Unreleased

- Fixed HTML snippets adding formatting whitespace around copied code.
- Fixed automatic Markdown fences for content containing four or more consecutive backticks.
- Fixed AI selection metadata for selections ending at the start of a later line.
- Reduced full-document reads for selections, canceled prompts, and head/tail samples.
- Added opt-in standard Markdown path headers and outside-workspace basename paths.
- Added an editor context-menu command and default keyboard shortcut.
- Added deterministic minimum/latest VS Code testing and repository-managed VSIX packaging.
```

- [ ] **Step 3: Format, validate, and commit docs**

Cross-check every documented key, enum, default, shortcut, and script against `package.json`, then run:

```bash
trunk fmt README.md CHANGELOG.md
trunk check README.md CHANGELOG.md --ci
git diff --check
```

The root agent stages and commits:

```bash
git add README.md CHANGELOG.md
git diff --cached --check
git commit -m "docs: document snippet UX and workflows"
```

---

## Final Verification

- [ ] **Step 1: Run all local gates from the committed lockfile**

```bash
yarn install --frozen-lockfile
yarn lint
yarn compile-tests
yarn compile
yarn package
yarn test:unit
VSCODE_TEST_VERSION=1.106.1 yarn test:integration
VSCODE_TEST_VERSION=stable yarn test:integration
VSCODE_TEST_VERSION=1.106.1 yarn test:repeat
yarn vsix
osv-scanner scan source --lockfile yarn.lock
trunk check --all --ci
```

Expected: Every command exits zero, minimum and stable hosts pass, the minimum host passes three additional runs, OSV reports no issues, and Trunk reports no issues.

- [ ] **Step 2: Inspect and remove generated verification artifacts**

Run:

```bash
unzip -l copy-code-as-snippet-1.2.0.vsix
rm copy-code-as-snippet-1.2.0.vsix
git status --short --branch
```

Expected: VSIX contents match Task 5 and the worktree is clean.

- [ ] **Step 3: Review the complete branch**

Run:

```bash
git log --oneline origin/main..HEAD
git diff --check origin/main...HEAD
git diff --name-status origin/main...HEAD
git diff origin/main...HEAD -- src package.json .vscode-test.mjs .github/workflows/ci.yml README.md CHANGELOG.md docs
```

Confirm no public command ID or compatibility default changed, no broad refactor entered the diff, every new behavior has RED and GREEN evidence, and there are no generated or author-unknown changes.
