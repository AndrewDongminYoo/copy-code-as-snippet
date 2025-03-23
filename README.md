# Copy Code as Snippet

A Visual Studio Code extension that allows you to copy the entire content of a file as a Markdown code snippet with language and file path information.

## Features

- Copy the entire file content as a Markdown code snippet
- Automatically includes the language identifier based on the file type
- Includes the relative file path from the workspace root
- Special handling for certain file types (e.g., Android build.gradle files are marked as Groovy)

## Usage

1. Open any file in VS Code
2. Run the command "Copy Code as Snippet" using one of these methods:

   - Press the keyboard shortcut (if configured)
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for "Copy Code as Snippet"
   - Right-click in the editor and select "Copy Code as Snippet" (if configured in context menu)

3. The code will be copied to your clipboard in the following format:

   ````
   ```language:path/to/file
   file content
   ```
   ````

4. Paste the snippet wherever you need it (documentation, chat, etc.)

## Why Use This Extension?

This extension is particularly useful for:

- Sharing code in documentation
- Providing context in technical discussions
- Creating code examples with proper file path references
- Preparing code snippets for AI assistants that benefit from file path context

## Requirements

No special requirements or dependencies.

## Extension Settings

This extension does not contribute any settings yet.

## Known Issues

None at this time. Please report any issues on the GitHub repository.

## Release Notes

### 1.0.0

- Initial release
- Support for copying entire file content as a Markdown code snippet with language and path information

---

## Development

### Building the Extension

```bash
npm install
npm run compile
```

### Testing the Extension

- Press `F5` to open a new window with your extension loaded
- Run the command "Copy Code as Snippet"
- Verify the copied content in your clipboard

### Publishing

```bash
vsce package
vsce publish
```

## License

[MIT](LICENSE)
