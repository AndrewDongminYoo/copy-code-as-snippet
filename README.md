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

## Why Use This Extension?

This extension is particularly useful for:

- Creating rich code examples for documentation and presentations
- Sharing code in chats and forums with language-aware formatting
- Providing context to AI assistants with file-level information
- Pasting syntax-highlighted snippets in HTML/Markdown documents

## Requirements

No dependencies or special requirements.

## Extension Settings

| Setting                                | Type                                   | Default    | Description                                              |
| -------------------------------------- | -------------------------------------- | ---------- | -------------------------------------------------------- |
| `copy-code-as-snippet.includeFilePath` | `boolean`                              | `true`     | Whether to include the relative file path in the snippet |
| `copy-code-as-snippet.format`          | `string` (`markdown`, `html`, `plain`) | `markdown` | Output format for the snippet                            |

## Known Issues

None at this time. Please report any issues via [GitHub Issues](https://github.com/your-repo-url/issues).

## Release Notes

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
