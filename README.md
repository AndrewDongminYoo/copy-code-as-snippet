# Copy Code as Snippet

A Visual Studio Code extension that allows you to copy selected code or the entire content of a file as a Markdown, HTML, or plain text code snippet with language and file path information.

![Demo](images/copy-as-code-snippet-demo.gif)

## Features

- Copy selected code or the entire file content
- Automatically includes the language identifier based on file type
- Optionally includes the relative file path from the workspace
- Supports Markdown, HTML, and plain text snippet formats
- Handles special cases (e.g., `build.gradle` → `groovy`, `Dockerfile`, `docker-compose.yaml`)
- Clipboard-ready output for pasting into docs, chats, or markdown editors
- AI-friendly Markdown mode (opt-in) that adds a single file/language/range heading
- Fence strategy controls to avoid broken Markdown when code includes triple backticks or to force `~~~`
- Optional head/tail sampling prompt for very large files, with presets and custom head/tail counts

## Usage

1. Open any file in VS Code.
2. Run **Copy Code as Snippet** from the editor context menu, the Command Palette, or the default keyboard shortcut: `Cmd+Alt+C` on macOS and `Ctrl+Alt+C` on Windows and Linux.
3. The snippet is copied to your clipboard in the configured format.

<details>
<summary>Example (Markdown with file path)</summary>

````markdown
```typescript:src/extension.ts
export function activate(context: vscode.ExtensionContext) {
  // ...
}
```
````

</details>

The default `legacy` path placement keeps the file path in the opening fence for compatibility.
Set `copy-code-as-snippet.markdown.pathPlacement` to `header` to produce standard Markdown with a separate file header:

<details>
<summary>Example (Markdown header path placement)</summary>

````markdown
### File: src/extension.ts

```typescript
export function activate(context: vscode.ExtensionContext) {
  // ...
}
```
````

</details>

<details>
<summary>Example (AI mode header + range)</summary>

````markdown
### File: src/extension.ts (typescript, lines 12-34 (selection))

```typescript
// selected code...
```
````

</details>

AI mode keeps its own single-heading file/language/range layout regardless of the configured Markdown path placement.
When `includeFilePath` is disabled, the heading leads with the language instead of the file path.

<details>
<summary>Example (large file head/tail sample)</summary>

````markdown
```javascript:src/huge-file.js
// first N lines...
... 9,940 lines omitted ...
// last M lines...
```
````

</details>

When prompted on large files, choose a preset (e.g., Head 10 / Tail 10) or enter custom head/tail line counts.

Files inside a workspace always use workspace-relative paths.
For files outside a workspace, `copy-code-as-snippet.outsideWorkspacePath` defaults to `basename` to avoid copying parent directory names.
Choose `absolute` when the snippet must preserve the full file location.

## Why Use This Extension?

This extension is particularly useful for:

- Creating rich code examples for documentation and presentations
- Sharing code in chats and forums with language-aware formatting
- Providing context to AI assistants with file-level information
- Pasting syntax-highlighted snippets in HTML/Markdown documents

## Requirements

Visual Studio Code 1.106.1 or later.

## Extension Settings

| Setting                                        | Type                                         | Default       | Description                                                                                                                      |
| ---------------------------------------------- | -------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `copy-code-as-snippet.includeFilePath`         | `boolean`                                    | `true`        | Include the resolved file path in Markdown and HTML snippets                                                                     |
| `copy-code-as-snippet.format`                  | `string` (`markdown`, `plain`, `html`)       | `markdown`    | Output format for the snippet                                                                                                    |
| `copy-code-as-snippet.aiMode.enabled`          | `boolean`                                    | `false`       | Add a single Markdown heading led by the file path, or by the language when path inclusion is off, and use a language-only fence |
| `copy-code-as-snippet.markdown.fenceStrategy`  | `string` (`default`, `autoUpgrade`, `tilde`) | `autoUpgrade` | Keep triple backticks, use a backtick fence longer than the copied content, or always use `~~~`                                  |
| `copy-code-as-snippet.markdown.pathPlacement`  | `string` (`legacy`, `header`)                | `legacy`      | Put the path in the opening fence or in a separate Markdown file header; AI mode keeps its own header layout                     |
| `copy-code-as-snippet.outsideWorkspacePath`    | `string` (`absolute`, `basename`)            | `basename`    | Use the full path or only the file name outside a workspace; `basename` reduces exposed directory information                    |
| `copy-code-as-snippet.largeFile.lineThreshold` | `integer` (minimum `1`)                      | `1000`        | Line count threshold for treating a file as large                                                                                |
| `copy-code-as-snippet.largeFile.promptEnabled` | `boolean`                                    | `false`       | When enabled and over the threshold, prompt to copy the full file or a head/tail sample with preset or custom counts             |

## Known Issues

See or report current issues in [GitHub Issues](https://github.com/AndrewDongminYoo/copy-code-as-snippet/issues).

## Release Notes

### 1.4.0

- Simplified opt-in AI mode output to one Markdown heading with file, language, and range metadata.
- Made Markdown fences automatically grow past copied backtick runs by default.
- Changed outside-workspace paths to use only the file name by default.
- Improved VSIX packaging reliability by excluding development-only files.

### 1.3.0

- Added opt-in standard Markdown path headers and basename-only paths for files outside workspaces
- Added the editor context-menu command and default `Cmd+Alt+C` / `Ctrl+Alt+C` shortcut
- Fixed HTML whitespace, collision-safe automatic Markdown fences, and end-exclusive selection range metadata
- Reduced unnecessary full-document reads for selections, canceled prompts, and head/tail samples
- Made invalid configuration values fall back to compatibility defaults
- Added deterministic minimum/latest VS Code testing and repository-managed VSIX packaging

### 1.2.0

- Added AI-friendly Markdown mode with file/language/range header (opt-in)
- Added Markdown fence strategies: default, auto-upgrade when ``` appears, or tilde fences
- Added large-file prompt to choose full copy or head/tail sampling, including presets or custom head/tail counts
- Default settings keep 1.1.x behavior unchanged

### 1.1.0

- Added support for:
  - Snippet format options: `markdown`, `html`, and `plain text`
  - Selecting code instead of copying the full file
  - Customizable settings for file path inclusion and output format
- Improved workspace-relative path detection in multi-root environments
- Improved HTML escaping for enhanced security

### 1.0.0

- Initial release
- Support for copying entire file content as a Markdown code snippet with language and file path information

---

## Development

### Building the Extension

```bash
yarn install --frozen-lockfile
yarn compile
```

### Testing the Extension

- `yarn test` runs the Node unit tests and Extension Host integration tests after the existing pretest compilation and lint gates.
- `yarn test:repeat` runs the Extension Host suite three times to check activation isolation.
- Set `VSCODE_TEST_VERSION=stable` or another supported version when running `yarn test:integration` to override the default minimum host version.
- Press `F5` to open an Extension Development Host for manual verification.

### Packaging

```bash
yarn package
yarn vsix
```

`yarn package` creates the production webpack bundle.
`yarn vsix` runs the production bundle and packages the extension as a VSIX with the repository-managed `@vscode/vsce` dependency.

## License

[MIT](LICENSE)
