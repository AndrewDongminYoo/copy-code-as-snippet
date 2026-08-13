# Codebase Review Follow-ups Design

## Context

The repository-wide review found one reproducible test-isolation defect, three output-correctness defects, an avoidable large-file memory cost, gaps in the supported-version test matrix, incomplete command-surface UX, and stale development documentation.
The work will preserve the current public command identifier and default snippet output while adding opt-in safer and more standards-oriented behavior.

## Goals

- Make the extension test suite deterministic and restore integration tests to CI.
- Preserve user content exactly in HTML snippets.
- Generate Markdown fences that cannot collide with backtick runs in the copied content.
- Report selected line ranges according to VS Code's end-exclusive selection semantics.
- Avoid reading an entire document when a selection, cancellation, or head/tail sample makes that unnecessary.
- Add an opt-in standard Markdown path layout without changing the legacy default.
- Add an opt-in basename policy for documents outside the workspace without changing the absolute-path default.
- Make the command available from the editor context menu and a platform-appropriate default shortcut.
- Test the declared minimum VS Code version and the latest stable VS Code version.
- Provide a repository-declared VSIX packaging command and accurate development documentation.

## Non-goals

- Do not rename `copy-code-as-snippet.copy` or change its existing command-palette title.
- Do not change the default Markdown output, AI mode output, `includeFilePath` default, snippet format default, large-file threshold, or large-file prompt default.
- Do not add automatic configuration migration or per-user state.
- Do not change the extension version, publish a release, push the branch, or open a pull request as part of this implementation.
- Do not introduce a service layer, dependency-injection framework, or new state-management abstraction.
- Do not add more language-detection rules without a concrete requirement.

## Compatibility Contract

Existing users must receive the same output with the default settings except where the old output was malformed or factually incorrect.
The intentional correctness changes are removal of HTML-only decoration whitespace, safe Markdown fences for content containing long backtick runs, and accurate AI selection-range metadata.

The following defaults remain unchanged:

- `copy-code-as-snippet.includeFilePath`: `true`
- `copy-code-as-snippet.format`: `markdown`
- `copy-code-as-snippet.aiMode.enabled`: `false`
- `copy-code-as-snippet.markdown.fenceStrategy`: `default`
- `copy-code-as-snippet.largeFile.lineThreshold`: `1000`
- `copy-code-as-snippet.largeFile.promptEnabled`: `false`

Two new settings provide opt-in behavior:

- `copy-code-as-snippet.markdown.pathPlacement`: `legacy | header`, default `legacy`
- `copy-code-as-snippet.outsideWorkspacePath`: `absolute | basename`, default `absolute`

`markdown.pathPlacement=legacy` retains the current Markdown opening fence format, such as ` ```typescript:src/file.ts `.
`markdown.pathPlacement=header` emits `### File: src/file.ts`, a blank line, and a language-only opening fence.
When `includeFilePath=false`, header placement omits the file header and uses only the language fence.
AI mode retains its existing file, language, and range headers and ignores `markdown.pathPlacement` because AI mode already has a defined header layout.
HTML uses the resolved path as `data-filename`, and plain text continues to contain no path metadata.

`outsideWorkspacePath=absolute` retains the current absolute-path behavior for documents that have no containing workspace folder.
`outsideWorkspacePath=basename` uses `path.basename(document.uri.fsPath)` for those documents.
Documents inside a workspace continue to use a workspace-relative path for both policies.

## Command Surface

The existing command will remain available in the Command Palette.
It will also be contributed to `editor/context` when `editorTextFocus` is true.
The default keybinding will be `Cmd+Alt+C` on macOS and `Ctrl+Alt+C` on Windows and Linux, also restricted by `editorTextFocus`.
No second command will be introduced because all behavior remains configuration-driven.

## Code Structure

`src/extension.ts` remains the VS Code integration boundary.
It will own activation, configuration reads, editor and document access, workspace-relative path resolution, user prompts, range-based document reads, clipboard writes, and notifications.

A new `src/snippet.ts` module will contain pure logic that does not import `vscode`.
It will own snippet format types, Markdown formatting, HTML formatting and escaping, fence resolution, selected-range labels, and head/tail sample assembly.
The module will export only the functions and types required by `extension.ts` and unit tests.

This split is limited to logic being changed by the review follow-ups.
Language detection may move into the pure module if required for focused unit testing, but no unrelated extension refactor is permitted.

## Output Behavior

### HTML

HTML output will place the escaped source content immediately between the `<code>` tags.
Formatting whitespace outside `<code>` may remain, but no newline or indentation may be injected into the copied code value.
The language class and optional escaped `data-filename` attribute remain unchanged.

### Markdown Fences

`default` continues to use three backticks even when the content contains backticks because changing it would alter the documented default behavior.
`tilde` continues to use three tildes.
`autoUpgrade` will detect the longest consecutive run of backticks in the content and use a backtick fence whose length is at least three and strictly longer than that run.
Content containing three backticks therefore uses four, content containing four uses five, and content with no three-backtick run uses three.

### Selection Metadata

Selection ranges will remain one-based and line-oriented.
When a non-empty selection ends at character zero on a later line, the reported final line is the previous line because the end position is exclusive.
Otherwise, the reported final line is `selection.end.line + 1`.
The label remains `lines <start>-<end> (selection)`.

### Large Files

The command will use `document.lineCount` before reading content.
When a selection exists, it will call `document.getText(selection)` and will not call `document.getText()` for the full document.
When the large-file prompt is shown, cancellation will return before any full-content read.
Choosing full copy will read the document once.
Choosing head/tail sampling will read only the selected head and tail ranges, unless the requested counts cover the entire document, in which case it will read the document once and omit the marker.
The sample marker remains `... <count> lines omitted ...` and sample segments remain joined with `\n` for compatibility.

`copy-code-as-snippet.largeFile.lineThreshold` will declare a minimum of `1` and require an integer in the extension configuration schema.
Custom head and tail counts will continue to require integers greater than zero.

## Test Design

### Pure Unit Tests

`src/test/snippet.unit.ts` will exercise the exported pure functions with Node's built-in test runner and `assert`.
The unit suite will cover legacy and header Markdown layouts, hidden paths, AI mode precedence, three-, four-, and five-backtick content, tilde fences, exact HTML content preservation and escaping, plain text, end-exclusive selection labels, and head/tail sample boundaries.
The unit runner will execute independently of VS Code so formatting failures are fast and deterministic.

### Extension Host Integration Tests

`src/test/extension.test.ts` will activate the installed development extension once for the suite through the VS Code extension registry.
It will not import and call `activate()` before every test.
Per-test stubs and configuration changes will be restored after each test, while command registration will remain owned by the extension host until suite shutdown.

The integration suite will cover no active editor, workspace-relative and outside-workspace paths, both outside-workspace policies, selected text, Markdown and HTML and plain formats, `includeFilePath=false`, Dockerfile and Android Gradle language detection, clipboard failures, prompt cancellation, full large-file copy, preset sampling, and custom sampling.
It will assert that selection and cancellation paths do not request the full document.

A repeat verification command will start the Extension Host test suite three times in sequence.
All three executions must pass to close the known command-registration isolation defect.

### Supported Versions and CI

The test configuration will accept a `VSCODE_TEST_VERSION` environment variable and otherwise use the declared minimum VS Code version `1.106.1`.
CI will run unit tests once and Extension Host tests on a matrix containing `1.106.1` and `stable` under `xvfb-run` on Linux.
The TypeScript declaration dependency will be aligned with the minimum supported VS Code major and minor version, and Node declarations will be aligned with `.node-version` value `24`.
The existing lint, TypeScript compilation, webpack build, and Trunk jobs remain required.

## Packaging and Documentation

The official `@vscode/vsce` package will be added as a direct development dependency and locked in `yarn.lock`.
The `yarn vsix` script will invoke `vsce package`, which in turn uses the existing `vscode:prepublish` production bundle.
Generated `.vsix` files remain ignored by Git.

`README.md` will document Yarn-based setup, the verified command surfaces, all settings and defaults, the two Markdown path layouts, the outside-workspace privacy option, test commands, and the repository's actual Issues URL.
It will not claim that there are no known issues until the deterministic suite and full verification pass.
`CHANGELOG.md` will gain an `Unreleased` section rather than a fabricated release version.
The scaffold activation congratulation log will be removed.

## Error Handling

Cancellation remains silent and does not write to the clipboard.
Clipboard failures continue to surface through `showErrorMessage` with the original error message converted safely to text.
Invalid configuration values outside the declared schema will fall back to the compatibility defaults in runtime reads.
No telemetry or persistent diagnostic state will be added.

## Task Boundaries

1. Stabilize Extension Host activation ownership and restore integration-test execution in CI.
2. Extract pure snippet logic and fix HTML whitespace, dynamic fences, and end-exclusive range metadata through test-first changes.
3. Refactor document reads so selections, cancellations, and samples avoid unnecessary full-content allocation.
4. Add the opt-in Markdown path placement and outside-workspace basename settings, editor context menu, and default keybinding.
5. Align supported-version tooling, add the CI version matrix, validate the threshold schema, and add reproducible VSIX packaging.
6. Update README and changelog content and remove obsolete scaffold logging.

Each task will be implemented with a failing test or reproducible failing gate before production changes, followed by its focused verification and a separate Conventional Commit.

## Verification

The branch is complete only when all of the following pass from a clean checkout with the committed lockfile:

- `yarn install --frozen-lockfile`
- `yarn lint`
- `yarn compile-tests`
- `yarn compile`
- `yarn package`
- the pure Node unit-test command introduced by the implementation
- the Extension Host integration-test command at VS Code `1.106.1`
- the Extension Host integration-test command at VS Code `stable`
- the three-run Extension Host isolation command
- `yarn vsix`
- `osv-scanner scan source --lockfile yarn.lock`
- `trunk check --all --ci`

The final verification must also confirm that the worktree contains no generated `.vsix`, `out`, `dist`, test cache, or unrelated staged changes.
