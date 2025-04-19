// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";

/**
 * Enum for supported snippet output formats.
 */
const enum SnippetFormat {
  Markdown = "markdown",
  Html = "html",
  Plain = "plain",
}

/**
 * Called when the extension is activated.
 * Registers the command and performs initialization.
 */
export function activate(context: vscode.ExtensionContext) {
  if (context.globalState.get("isActivated")) {
    return;
  }

  context.globalState.update("isActivated", true);

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "copy-code-as-snippet" is now active!',
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "copy-code-as-snippet.copy",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No editors are activated.");
        return;
      }

      const document = editor.document;
      const filePath = document.uri.fsPath;

      // Calculate workspace-relative path
      let relativePath = filePath;
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (workspaceFolder) {
        relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
      }

      // Detect language
      const language = detectLanguage(filePath, document.languageId);

      // Get selected or full content
      const selection = editor.selection;
      const fileContent = selection.isEmpty
        ? document.getText()
        : document.getText(selection);

      // Read configuration
      const config = vscode.workspace.getConfiguration("copy-code-as-snippet");
      const includeFilePath = config.get<boolean>("includeFilePath", true);
      const snippetFormat = config.get<SnippetFormat>(
        "format",
        SnippetFormat.Markdown,
      );

      // Generate snippet
      const snippet = createSnippet(
        snippetFormat,
        language,
        relativePath,
        fileContent,
        includeFilePath,
      );

      try {
        await vscode.env.clipboard.writeText(snippet);
        vscode.window.showInformationMessage(
          "The code snippet was copied to Clipboard.",
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error copying to clipboard: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
  );

  context.subscriptions.push(disposable);
}

/**
 * Detects the appropriate language for syntax highlighting.
 * @param filePath Full file path
 * @param defaultLanguage Language ID from VS Code
 * @returns Detected language string
 */
function detectLanguage(filePath: string, defaultLanguage: string): string {
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(filePath);
  // Mapping for various file types
  if (filePath.includes("android") && fileName === "build.gradle") {
    return "groovy";
  }

  // Add mapping for other file types
  if (fileName === "Dockerfile") {
    return "dockerfile";
  }

  if (fileExtension === ".yml" || fileExtension === ".yaml") {
    if (fileName.includes("docker-compose")) {
      return "docker-compose";
    }
  }

  // Additional language detection logic can be implemented here

  return defaultLanguage;
}

/**
 * Generates a code snippet in the specified format.
 * @param format Snippet format
 * @param language Language identifier
 * @param relativePath Relative path for metadata
 * @param content Code content
 * @param includeFilePath Whether to include file path in the snippet
 * @returns Formatted snippet string
 */
function createSnippet(
  format: SnippetFormat,
  language: string,
  relativePath: string,
  content: string,
  includeFilePath: boolean,
): string {
  switch (format) {
    case SnippetFormat.Markdown:
      return createMarkdownSnippet(
        language,
        relativePath,
        content,
        includeFilePath,
      );
    case SnippetFormat.Html:
      return createHtmlSnippet(
        language,
        relativePath,
        content,
        includeFilePath,
      );
    case SnippetFormat.Plain:
      return content;
    default:
      return createMarkdownSnippet(
        language,
        relativePath,
        content,
        includeFilePath,
      );
  }
}

/**
 * Creates a Markdown-formatted code block.
 * @param language Language identifier
 * @param relativePath Relative file path
 * @param content Code content
 * @param includePath Whether to include file path
 * @returns Markdown string
 */
function createMarkdownSnippet(
  language: string,
  relativePath: string,
  content: string,
  includePath: boolean,
): string {
  return includePath
    ? `\`\`\`${language}:${relativePath}\n${content}\n\`\`\``
    : `\`\`\`${language}\n${content}\n\`\`\``;
}

/**
 * Creates an HTML-formatted code block.
 * @param language Language identifier
 * @param relativePath Relative file path
 * @param content Code content
 * @param includePath Whether to include file path as attribute
 * @returns HTML string
 */
function createHtmlSnippet(
  language: string,
  relativePath: string,
  content: string,
  includePath: boolean,
): string {
  const classAttr = `language-${language}`;
  const filenameAttr = includePath
    ? ` data-filename="${escapeHtml(relativePath)}"`
    : "";
  return `<pre><code class="${classAttr}"${filenameAttr}>${escapeHtml(content)}</code></pre>`;
}

/**
 * Escapes HTML special characters.
 * @param text Input string
 * @returns Escaped HTML string
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate() {}
