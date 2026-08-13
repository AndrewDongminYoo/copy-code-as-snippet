// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import {
  createHeadTailSample,
  createSelectionRangeText,
  createSnippet,
  detectLanguage,
  FenceStrategy,
  MarkdownPathPlacement,
  SnippetFormat,
} from "./snippet";

/**
 * Called when the extension is activated.
 * Registers the command and performs initialization.
 */
export function activate(context: vscode.ExtensionContext) {
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
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

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

      let relativePath =
        outsideWorkspacePath === "basename"
          ? path.basename(filePath)
          : filePath;
      if (workspaceFolder) {
        relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
      }

      // Determine content and range
      const selection = editor.selection;
      const hasSelection = !selection.isEmpty;
      const totalLines = document.lineCount;
      let fileContent: string;
      let rangeText = hasSelection
        ? createSelectionRangeText(
            selection.start.line,
            selection.end.line,
            selection.end.character,
          )
        : `lines 1-${totalLines} (full file)`;

      if (hasSelection) {
        fileContent = document.getText(selection);
      } else if (largeFilePromptEnabled && totalLines > lineThreshold) {
        const choice = await vscode.window.showQuickPick(
          ["Copy full file", "Copy head & tail (select ranges...)", "Cancel"],
          {
            placeHolder: `File has ${totalLines} lines (threshold ${lineThreshold}). Choose snippet scope.`,
          },
        );

        if (!choice || choice === "Cancel") {
          return;
        }

        if (choice.startsWith("Copy full")) {
          fileContent = document.getText();
        } else if (choice.startsWith("Copy head")) {
          // ✅ Ask the user once more for the number of head/tail lines
          const headTail = await pickHeadTailLines(30, 30);
          if (!headTail) {
            // If the user canceled midway
            return;
          }

          fileContent = readHeadTailSample(
            document,
            headTail.head,
            headTail.tail,
          );
          rangeText = `lines 1-${totalLines} (head/tail sample: head ${headTail.head}, tail ${headTail.tail})`;
        } else {
          return;
        }
      } else {
        fileContent = document.getText();
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
        pathPlacement,
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

function readHeadTailSample(
  document: vscode.TextDocument,
  headLines: number,
  tailLines: number,
): string {
  if (document.lineCount <= headLines + tailLines) {
    return document.getText();
  }

  const omittedLines = document.lineCount - headLines - tailLines;
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

function getDocumentLineRange(
  document: vscode.TextDocument,
  startLine: number,
  endLineExclusive: number,
): vscode.Range {
  return new vscode.Range(
    new vscode.Position(startLine, 0),
    document.lineAt(endLineExclusive - 1).range.end,
  );
}

interface HeadTailPreset extends vscode.QuickPickItem {
  head: number;
  tail: number;
}

/**
 * Prompts the user to select/enter the number of head/tail lines.
 * Returns undefined if the user cancels.
 */
async function pickHeadTailLines(
  defaultHead = 30,
  defaultTail = 30,
): Promise<{ head: number; tail: number } | undefined> {
  const presets: HeadTailPreset[] = [
    {
      label: "Head 10 / Tail 10",
      description: "First 10 lines + Last 10 lines",
      head: 10,
      tail: 10,
    },
    {
      label: "Head 20 / Tail 20",
      description: "First 20 lines + Last 20 lines",
      head: 20,
      tail: 20,
    },
    {
      label: "Head 30 / Tail 30 (default)",
      description: "First 30 lines + Last 30 lines",
      head: 30,
      tail: 30,
    },
    {
      label: "Custom...",
      description: "Enter the head/tail line count directly.",
      head: -1,
      tail: -1,
    },
  ];

  const picked = await vscode.window.showQuickPick(presets, {
    placeHolder: "Select the number of head and tail lines.",
  });

  if (!picked) {
    // If the user cancels QuickPick
    return undefined;
  }

  // Select preset (not custom)
  if (picked.head >= 0 && picked.tail >= 0) {
    return { head: picked.head, tail: picked.tail };
  }

  // === Custom Input ===
  const headInput = await vscode.window.showInputBox({
    prompt: "Enter the number of head (front) lines.",
    value: String(defaultHead),
    validateInput: (value) => {
      const n = Number(value);
      if (!Number.isInteger(n) || n <= 0) {
        return "Enter an integer greater than 0.";
      }
      return undefined;
    },
  });

  if (!headInput) {
    return undefined;
  }

  const tailInput = await vscode.window.showInputBox({
    prompt: "Enter the number of tail (back) lines.",
    value: String(defaultTail),
    validateInput: (value) => {
      const n = Number(value);
      if (!Number.isInteger(n) || n <= 0) {
        return "Enter an integer greater than 0.";
      }
      return undefined;
    },
  });

  if (!tailInput) {
    return undefined;
  }

  const head = Number(headInput);
  const tail = Number(tailInput);

  return { head, tail };
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate() {}
