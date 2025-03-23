// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";

let isActivated = false;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  if (isActivated) {
    return;
  }
  isActivated = true;

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

      // 워크스페이스 폴더 기준의 상대 경로 구하기
      let relativePath = filePath;
      if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        relativePath = path.relative(workspaceFolder, filePath);
      }

      // 기본 언어는 현재 문서의 languageId
      let language = document.languageId;
      // 예: 안드로이드 폴더 내의 build.gradle 파일이면 language를 'groovy'로 설정
      if (
        relativePath.includes("android") &&
        path.basename(filePath) === "build.gradle"
      ) {
        language = "groovy";
      }

      // 파일의 전체 내용 읽기
      const fileContent = document.getText();

      // 마크다운 코드 스니펫 생성
      const snippet = `\`\`\`${language}:${relativePath}\n${fileContent}\n\`\`\``;

      // 클립보드에 복사
      await vscode.env.clipboard.writeText(snippet);
      vscode.window.showInformationMessage(
        "The code snippet was copied to Clipboard.",
      );
    },
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
