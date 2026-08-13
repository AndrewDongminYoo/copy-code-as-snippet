import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as sinon from "sinon";

suite("Copy Code as Snippet Extension Test Suite", () => {
  let extension: vscode.Extension<unknown>;
  let clipboardSpy: sinon.SinonStub;
  let showInfoMessageSpy: sinon.SinonStub;
  let configurationValues: Record<string, any>;
  let originalClipboard: typeof vscode.env.clipboard;

  suiteSetup(async () => {
    const installedExtension = vscode.extensions.getExtension(
      "dongminyu.copy-code-as-snippet",
    );
    assert.ok(installedExtension, "Development extension should be installed");
    extension = installedExtension;
    await extension.activate();
  });

  setup(() => {
    configurationValues = {};
    sinon.stub(vscode.workspace, "getConfiguration").callsFake(() => {
      return {
        get: (key: string, defaultValue: any) =>
          key in configurationValues ? configurationValues[key] : defaultValue,
      } as any;
    });
    sinon
      .stub(vscode.workspace, "getWorkspaceFolder")
      .callsFake((uri: vscode.Uri) => {
        const workspacePath = "/workspace/project";
        if (uri.fsPath && uri.fsPath.startsWith(workspacePath)) {
          return {
            uri: { fsPath: workspacePath },
            name: "project",
            index: 0,
          } as any;
        }
        return undefined;
      });

    // Stub clipboard: 교체 후 원본 복원 처리
    originalClipboard = vscode.env.clipboard;
    Object.defineProperty(vscode.env, "clipboard", {
      configurable: true,
      writable: true,
      value: {
        writeText: sinon.stub().resolves(),
      },
    });
    clipboardSpy = vscode.env.clipboard.writeText as sinon.SinonStub;

    showInfoMessageSpy = sinon.stub(vscode.window, "showInformationMessage");
  });

  teardown(() => {
    // 원래 clipboard 복원
    Object.defineProperty(vscode.env, "clipboard", {
      configurable: true,
      writable: true,
      value: originalClipboard,
    });
    sinon.restore();
  });

  test("Extension should be activated", () => {
    assert.strictEqual(extension.isActive, true);
  });

  test("Should show message when no editor is active", async () => {
    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(undefined);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(showInfoMessageSpy.calledOnce, true);
    assert.strictEqual(
      showInfoMessageSpy.firstCall.args[0],
      "No editors are activated.",
    );

    activeTextEditorStub.restore();
  });

  test("Should copy code snippet to clipboard", async () => {
    const document = {
      uri: { fsPath: "/workspace/project/src/test.js" },
      languageId: "javascript",
      getText: () => 'const test = "Hello World";',
      lineCount: 1,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value([
        {
          uri: { fsPath: "/workspace/project" },
          name: "project",
          index: 0,
        },
      ]);

    // 명령 실행
    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    const expectedSnippet =
      '```javascript:src/test.js\nconst test = "Hello World";\n```';
    assert.strictEqual(clipboardSpy.calledOnce, true);
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);
    assert.strictEqual(showInfoMessageSpy.calledOnce, true);
    assert.strictEqual(
      showInfoMessageSpy.firstCall.args[0],
      "The code snippet was copied to Clipboard.",
    );

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
  });

  test("Should handle Android build.gradle files correctly", async () => {
    const document = {
      uri: { fsPath: "/workspace/project/android/build.gradle" },
      languageId: "gradle",
      getText: () =>
        'android {\n  defaultConfig {\n    applicationId "com.example.app"\n  }\n}',
      lineCount: 5,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value([
        {
          uri: { fsPath: "/workspace/project" },
          name: "project",
          index: 0,
        },
      ]);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    const expectedSnippet =
      '```groovy:android/build.gradle\nandroid {\n  defaultConfig {\n    applicationId "com.example.app"\n  }\n}\n```';
    assert.strictEqual(clipboardSpy.calledOnce, true);
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
  });

  test("Should use absolute path when no workspace folder is available", async () => {
    const document = {
      uri: { fsPath: "/some/path/outside/workspace/test.js" },
      languageId: "javascript",
      getText: () => 'const test = "Hello World";',
      lineCount: 1,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value(undefined);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    const expectedSnippet =
      '```javascript:/some/path/outside/workspace/test.js\nconst test = "Hello World";\n```';
    assert.strictEqual(clipboardSpy.calledOnce, true);
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
  });

  test("Should upgrade markdown fence when autoUpgrade strategy is set", async () => {
    configurationValues["markdown.fenceStrategy"] = "autoUpgrade";

    const document = {
      uri: { fsPath: "/workspace/project/src/test.js" },
      languageId: "javascript",
      getText: () => 'const test = "```with fence```";',
      lineCount: 1,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value([
        {
          uri: { fsPath: "/workspace/project" },
          name: "project",
          index: 0,
        },
      ]);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    const expectedSnippet =
      '````javascript:src/test.js\nconst test = "```with fence```";\n````';
    assert.strictEqual(clipboardSpy.calledOnce, true);
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
  });

  test("Should generate AI-friendly snippet with header and range", async () => {
    configurationValues["aiMode.enabled"] = true;
    const contentLines = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`);
    const fullContent = contentLines.join("\n");

    const selection = new vscode.Selection(
      new vscode.Position(4, 0),
      new vscode.Position(9, 0),
    );

    const document = {
      uri: { fsPath: "/workspace/project/src/index.ts" },
      languageId: "typescript",
      getText: (range?: vscode.Range) => {
        if (range) {
          return contentLines
            .slice(range.start.line, range.end.line + 1)
            .join("\n");
        }
        return fullContent;
      },
      lineCount: contentLines.length,
    };
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value([
        {
          uri: { fsPath: "/workspace/project" },
          name: "project",
          index: 0,
        },
      ]);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    const expectedSelectionContent = contentLines.slice(4, 10).join("\n");
    const expectedSnippet = [
      "### File: src/index.ts",
      "### Language: typescript",
      "### Range: lines 5-10 (selection)",
      "",
      "```typescript",
      expectedSelectionContent,
      "```",
    ].join("\n");

    assert.strictEqual(clipboardSpy.calledOnce, true);
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
  });

  test("Should prompt for large files and allow head/tail sampling", async () => {
    configurationValues["largeFile.promptEnabled"] = true;
    configurationValues["largeFile.lineThreshold"] = 10;

    const contentLines = Array.from({ length: 120 }, (_, i) => `line ${i + 1}`);
    const fullContent = contentLines.join("\n");

    const document = {
      uri: { fsPath: "/workspace/project/src/large.js" },
      languageId: "javascript",
      getText: () => fullContent,
      lineCount: contentLines.length,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value([
        {
          uri: { fsPath: "/workspace/project" },
          name: "project",
          index: 0,
        },
      ]);

    const showQuickPickStub = sinon.stub(vscode.window, "showQuickPick");
    // First prompt: choose head/tail mode
    showQuickPickStub
      .onFirstCall()
      .resolves(
        "Copy head & tail (select ranges...)" as unknown as vscode.QuickPickItem,
      );
    // Second prompt: choose preset head/tail counts
    showQuickPickStub.onSecondCall().resolves({
      label: "Head 20 / Tail 20",
      description: "First 20 lines + Last 20 lines",
      head: 20,
      tail: 20,
    } as any);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    const expectedContent = [
      ...contentLines.slice(0, 20),
      "... 80 lines omitted ...",
      ...contentLines.slice(-20),
    ].join("\n");
    const expectedSnippet =
      "```javascript:src/large.js\n" + expectedContent + "\n```";

    assert.strictEqual(clipboardSpy.calledOnce, true);
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);
    assert.strictEqual(showQuickPickStub.callCount, 2);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
    showQuickPickStub.restore();
  });

  test("Should allow custom head/tail counts when sampling large files", async () => {
    configurationValues["largeFile.promptEnabled"] = true;
    configurationValues["largeFile.lineThreshold"] = 5;

    const contentLines = Array.from({ length: 40 }, (_, i) => `line ${i + 1}`);
    const fullContent = contentLines.join("\n");

    const document = {
      uri: { fsPath: "/workspace/project/src/custom-large.js" },
      languageId: "javascript",
      getText: () => fullContent,
      lineCount: contentLines.length,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value([
        {
          uri: { fsPath: "/workspace/project" },
          name: "project",
          index: 0,
        },
      ]);

    const showQuickPickStub = sinon.stub(vscode.window, "showQuickPick");
    showQuickPickStub
      .onFirstCall()
      .resolves(
        "Copy head & tail (select ranges...)" as unknown as vscode.QuickPickItem,
      );
    showQuickPickStub.onSecondCall().resolves({
      label: "Custom...",
      description: "Enter the head/tail line count directly.",
      head: -1,
      tail: -1,
    } as any);

    const showInputBoxStub = sinon.stub(vscode.window, "showInputBox");
    showInputBoxStub.onFirstCall().resolves("5"); // head
    showInputBoxStub.onSecondCall().resolves("7"); // tail

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    const expectedContent = [
      ...contentLines.slice(0, 5),
      "... 28 lines omitted ...",
      ...contentLines.slice(-7),
    ].join("\n");
    const expectedSnippet =
      "```javascript:src/custom-large.js\n" + expectedContent + "\n```";

    assert.strictEqual(clipboardSpy.calledOnce, true);
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);
    assert.strictEqual(showQuickPickStub.callCount, 2);
    assert.strictEqual(showInputBoxStub.callCount, 2);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
    showQuickPickStub.restore();
    showInputBoxStub.restore();
  });
});
