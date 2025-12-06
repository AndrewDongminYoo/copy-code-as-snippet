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
- AI-friendly Markdown mode (opt-in) that adds file/language/range headers
- Fence strategy controls to avoid broken Markdown when code includes triple backticks or to force `~~~`
- Optional head/tail sampling prompt for very large files, with presets and custom head/tail counts

## Usage

1. Open any file in VS Code
2. Run the command **"Copy Code as Snippet"** using one of these methods:
   - Press the keyboard shortcut (if configured)
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for "Copy Code as Snippet"
   - Right-click in the editor and select "Copy Code as Snippet" (if added to context menu)
3. The snippet will be copied to your clipboard in the selected format:

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

<details>
<summary>Example (AI mode header + range)</summary>

````markdown
### File: src/extension.ts

### Language: typescript

### Range: lines 12-34 (selection)

```typescript
// selected code...
```
````

</details>

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

## Why Use This Extension?

This extension is particularly useful for:

- Creating rich code examples for documentation and presentations
- Sharing code in chats and forums with language-aware formatting
- Providing context to AI assistants with file-level information
- Pasting syntax-highlighted snippets in HTML/Markdown documents

## Requirements

No dependencies or special requirements.

## Extension Settings

| Setting                                        | Type                                         | Default    | Description                                                                                                        |
| ---------------------------------------------- | -------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `copy-code-as-snippet.includeFilePath`         | `boolean`                                    | `true`     | Whether to include the relative file path in the snippet                                                           |
| `copy-code-as-snippet.format`                  | `string` (`markdown`, `html`, `plain`)       | `markdown` | Output format for the snippet                                                                                      |
| `copy-code-as-snippet.aiMode.enabled`          | `boolean`                                    | `false`    | Adds Markdown headers (file, language, range) and uses language-only fences (markdown only)                        |
| `copy-code-as-snippet.markdown.fenceStrategy`  | `string` (`default`, `autoUpgrade`, `tilde`) | `default`  | Fence style: keep triple backticks, auto-upgrade to four backticks when content has backticks, or always use `~~~` |
| `copy-code-as-snippet.largeFile.lineThreshold` | `number`                                     | `1000`     | Line count threshold to treat a file as large                                                                      |
| `copy-code-as-snippet.largeFile.promptEnabled` | `boolean`                                    | `false`    | When true and over threshold, prompt to copy full file or a head/tail sample (pick presets or enter custom counts) |

## Known Issues

None at this time. Please report any issues via [GitHub Issues](https://github.com/your-repo-url/issues).

## Release Notes

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
npm install
npm run compile
```

### Testing the Extension

- Press `F5` to open a new VS Code window with your extension loaded
- Run the command "Copy Code as Snippet"
- Verify that the clipboard contains the expected snippet format

### Publishing

```bash
vsce package
vsce publish
```

## License

[MIT](LICENSE)
