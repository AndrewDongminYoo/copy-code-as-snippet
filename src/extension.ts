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

type FenceStrategy = "default" | "autoUpgrade" | "tilde";

/**
 * Called when the extension is activated.
 * Registers the command and performs initialization.
 */
export function activate(context: vscode.ExtensionContext) {
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

      // Read configuration
      const config = vscode.workspace.getConfiguration("copy-code-as-snippet");
      const includeFilePath = config.get<boolean>("includeFilePath", true);
      const snippetFormat = config.get<SnippetFormat>(
        "format",
        SnippetFormat.Markdown,
      );
      const fenceStrategy = config.get<FenceStrategy>(
        "markdown.fenceStrategy",
        "default",
      );
      const aiModeEnabled = config.get<boolean>("aiMode.enabled", false);
      const lineThreshold = config.get<number>("largeFile.lineThreshold", 1000);
      const largeFilePromptEnabled = config.get<boolean>(
        "largeFile.promptEnabled",
        false,
      );

      // Determine content and range
      const selection = editor.selection;
      const hasSelection = !selection.isEmpty;
      const fullContent = document.getText();
      const totalLines =
        document.lineCount || fullContent.split(/\r?\n/).length || 1;
      let fileContent = hasSelection
        ? document.getText(selection)
        : fullContent;
      let rangeText = hasSelection
        ? `lines ${selection.start.line + 1}-${selection.end.line + 1} (selection)`
        : `lines 1-${totalLines} (full file)`;

      if (
        largeFilePromptEnabled &&
        !hasSelection &&
        totalLines > lineThreshold
      ) {
        const choice = await vscode.window.showQuickPick(
          [
            "Copy full file",
            "Copy head & tail (first 30 + last 30 lines)",
            "Cancel",
          ],
          {
            placeHolder: `File has ${totalLines} lines (threshold ${lineThreshold}). Choose snippet scope.`,
          },
        );

        if (!choice || choice === "Cancel") {
          return;
        }

        if (choice.startsWith("Copy head")) {
          fileContent = createHeadTailSample(fullContent);
          rangeText = `lines 1-${totalLines} (head/tail sample)`;
        }
      }

      // Generate snippet
      const snippet = createSnippet({
        format: snippetFormat,
        language,
        relativePath,
        content: fileContent,
        includeFilePath,
        fenceStrategy,
        aiModeEnabled:
          snippetFormat === SnippetFormat.Markdown && aiModeEnabled,
        rangeText,
      });

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
function createSnippet(options: {
  format: SnippetFormat;
  language: string;
  relativePath: string;
  content: string;
  includeFilePath: boolean;
  fenceStrategy: FenceStrategy;
  aiModeEnabled: boolean;
  rangeText: string;
}): string {
  switch (options.format) {
    case SnippetFormat.Markdown:
      return createMarkdownSnippet({
        language: options.language,
        relativePath: options.relativePath,
        content: options.content,
        includePath: options.includeFilePath,
        fenceStrategy: options.fenceStrategy,
        aiModeEnabled: options.aiModeEnabled,
        rangeText: options.rangeText,
      });
    case SnippetFormat.Html:
      return createHtmlSnippet(
        options.language,
        options.relativePath,
        options.content,
        options.includeFilePath,
      );
    case SnippetFormat.Plain:
      return options.content;
    default:
      return createMarkdownSnippet({
        language: options.language,
        relativePath: options.relativePath,
        content: options.content,
        includePath: options.includeFilePath,
        fenceStrategy: options.fenceStrategy,
        aiModeEnabled: options.aiModeEnabled,
        rangeText: options.rangeText,
      });
  }
}

/**
 * Creates a Markdown-formatted code block.
 */
function createMarkdownSnippet(options: {
  language: string;
  relativePath: string;
  content: string;
  includePath: boolean;
  fenceStrategy: FenceStrategy;
  aiModeEnabled: boolean;
  rangeText: string;
}): string {
  const fence = resolveFence(options.fenceStrategy, options.content);

  if (options.aiModeEnabled) {
    const headerParts = [
      options.includePath ? `### File: ${options.relativePath}` : undefined,
      `### Language: ${options.language}`,
      options.rangeText ? `### Range: ${options.rangeText}` : undefined,
    ].filter(Boolean);

    const header = headerParts.join("\n");
    return `${header}\n\n${fence}${options.language}\n${options.content}\n${fence}`;
  }

  const header = options.includePath
    ? `${options.language}:${options.relativePath}`
    : options.language;

  return `${fence}${header}\n${options.content}\n${fence}`;
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
  return `
<pre>
  <code class="${classAttr}"${filenameAttr}>
  ${escapeHtml(content)}
  </code>
</pre>`;
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

function resolveFence(fenceStrategy: FenceStrategy, content: string): string {
  if (fenceStrategy === "tilde") {
    return "~~~";
  }

  if (fenceStrategy === "autoUpgrade" && content.includes("```")) {
    return "````";
  }

  return "```";
}

function createHeadTailSample(
  content: string,
  headLines = 30,
  tailLines = 30,
): string {
  const lines = content.split(/\r?\n/);
  if (lines.length <= headLines + tailLines) {
    return content;
  }

  const omitted = lines.length - headLines - tailLines;
  const head = lines.slice(0, headLines);
  const tail = lines.slice(-tailLines);
  const marker = `... ${omitted} lines omitted ...`;

  return [...head, marker, ...tail].join("\n");
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate() {}
