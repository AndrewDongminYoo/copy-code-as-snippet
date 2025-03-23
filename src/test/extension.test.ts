import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as sinon from "sinon";
import { activate } from "../extension";

suite("Copy Code as Snippet Extension Test Suite", () => {
  let context: vscode.ExtensionContext;
  let clipboardSpy: sinon.SinonStub;
  let showInfoMessageSpy: sinon.SinonStub;

  setup(() => {
    // Create a mock extension context
    context = {
      subscriptions: [],
      workspaceState: {
        get: (key: string) => undefined,
        update: (key: string, value: any) => Promise.resolve(),
        keys: () => [],
      },
      globalState: {
        get: (key: string) => undefined,
        update: (key: string, value: any) => Promise.resolve(),
        setKeysForSync: (keys: string[]) => {},
        keys: () => [],
      },
      extensionUri: vscode.Uri.file(""),
      extensionPath: "",
      asAbsolutePath: (relativePath: string) => relativePath,
      storageUri: vscode.Uri.file(""),
      globalStorageUri: vscode.Uri.file(""),
      logUri: vscode.Uri.file(""),
      extensionMode: vscode.ExtensionMode.Development,
      // 누락된 속성들을 더미 객체로 추가
      environmentVariableCollection: {
        [Symbol.iterator]: function* () {},
        replace: (_: string, __: string) => {},
        append: (_: string, __: string) => {},
        prepend: (_: string, __: string) => {},
        getScoped: (_: vscode.EnvironmentVariableScope) => {
          return {
            [Symbol.iterator]: function* () {},
            get: (_: string) => undefined,
            forEach: (
              callback: (
                variable: string,
                mutator: vscode.EnvironmentVariableMutator,
                collection: vscode.EnvironmentVariableCollection,
              ) => any,
            ) => {},
            delete: (_: string) => {},
            clear: () => {},
            persistent: false,
            description: "",
            replace: (_: string, __: string) => {},
            append: (_: string, __: string) => {},
            prepend: (_: string, __: string) => {},
          };
        },
        get: (_: string) => undefined,
        forEach: (
          callback: (
            variable: string,
            mutator: vscode.EnvironmentVariableMutator,
            collection: vscode.EnvironmentVariableCollection,
          ) => any,
        ) => {},
        delete: (_: string) => {},
        clear: () => {},
        persistent: false,
        description: "",
      },
      storagePath: "",
      globalStoragePath: "",
      extension: {} as any,
      languageModelAccessInformation: {} as any,
      logPath: "",
      secrets: {
        get: (key: string) => Promise.resolve(undefined),
        store: (key: string, value: string) => Promise.resolve(),
        delete: (key: string) => Promise.resolve(),
        onDidChange: () => ({ dispose: () => {} }),
      },
    };

    // Spy on clipboard writeText
    clipboardSpy = sinon.stub(vscode.env.clipboard, "writeText").resolves();

    // Spy on showInformationMessage
    showInfoMessageSpy = sinon.stub(vscode.window, "showInformationMessage");
  });

  teardown(() => {
    clipboardSpy.restore();
    showInfoMessageSpy.restore();
  });

  test("Extension should be activated", async () => {
    activate(context);
    assert.strictEqual(context.subscriptions.length, 1);
  });

  test("Should show message when no editor is active", async () => {
    // Mock window.activeTextEditor to return undefined
    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(undefined);

    activate(context);

    // Execute the command
    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    // Verify that the information message was shown
    assert.strictEqual(showInfoMessageSpy.calledOnce, true);
    assert.strictEqual(
      showInfoMessageSpy.firstCall.args[0],
      "No editors are activated.",
    );

    activeTextEditorStub.restore();
  });

  test("Should copy code snippet to clipboard", async () => {
    // Create a mock document and editor
    const document = {
      uri: {
        fsPath: "/workspace/project/src/test.js",
      },
      languageId: "javascript",
      getText: () => 'const test = "Hello World";',
    };

    const editor = {
      document: document,
    };

    // Mock window.activeTextEditor
    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    // Mock workspace.workspaceFolders
    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value([
        {
          uri: {
            fsPath: "/workspace/project",
          },
          name: "project",
          index: 0,
        },
      ]);

    activate(context);

    // Execute the command
    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    // Verify that clipboard.writeText was called with the correct snippet
    assert.strictEqual(clipboardSpy.calledOnce, true);
    const expectedSnippet =
      '```javascript:src/test.js\nconst test = "Hello World";\n```';
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);

    // Verify that the success message was shown
    assert.strictEqual(showInfoMessageSpy.calledOnce, true);
    assert.strictEqual(
      showInfoMessageSpy.firstCall.args[0],
      "The code snippet was copied to Clipboard.",
    );

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
  });

  test("Should handle Android build.gradle files correctly", async () => {
    // Create a mock document and editor for an Android build.gradle file
    const document = {
      uri: {
        fsPath: "/workspace/project/android/build.gradle",
      },
      languageId: "gradle",
      getText: () =>
        'android {\n  defaultConfig {\n    applicationId "com.example.app"\n  }\n}',
    };

    const editor = {
      document: document,
    };

    // Mock window.activeTextEditor
    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    // Mock workspace.workspaceFolders
    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value([
        {
          uri: {
            fsPath: "/workspace/project",
          },
          name: "project",
          index: 0,
        },
      ]);

    activate(context);

    // Execute the command
    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    // Verify that clipboard.writeText was called with the correct snippet
    // and language is set to 'groovy' for Android build.gradle files
    assert.strictEqual(clipboardSpy.calledOnce, true);
    const expectedSnippet =
      '```groovy:android/build.gradle\nandroid {\n  defaultConfig {\n    applicationId "com.example.app"\n  }\n}\n```';
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
  });

  test("Should use absolute path when no workspace folder is available", async () => {
    // Create a mock document and editor
    const document = {
      uri: {
        fsPath: "/some/path/outside/workspace/test.js",
      },
      languageId: "javascript",
      getText: () => 'const test = "Hello World";',
    };

    const editor = {
      document: document,
    };

    // Mock window.activeTextEditor
    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    // Mock workspace.workspaceFolders to return empty array
    const workspaceFoldersStub = sinon
      .stub(vscode.workspace, "workspaceFolders")
      .value(undefined);

    activate(context);

    // Execute the command
    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    // Verify that clipboard.writeText was called with the correct snippet
    assert.strictEqual(clipboardSpy.calledOnce, true);
    const expectedSnippet =
      '```javascript:/some/path/outside/workspace/test.js\nconst test = "Hello World";\n```';
    assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
  });
});
