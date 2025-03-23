import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as sinon from "sinon";
import { activate } from "../extension";

suite("Copy Code as Snippet Extension Test Suite", () => {
  let context: vscode.ExtensionContext;
  let clipboardSpy: sinon.SinonStub;
  let showInfoMessageSpy: sinon.SinonStub;
  let originalClipboard: typeof vscode.env.clipboard;

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

    // activate 확장을 한 번만 호출
    activate(context);
  });

  teardown(() => {
    // 원래 clipboard 복원
    Object.defineProperty(vscode.env, "clipboard", {
      configurable: true,
      writable: true,
      value: originalClipboard,
    });
    showInfoMessageSpy.restore();
  });

  test("Extension should be activated", async () => {
    assert.strictEqual(context.subscriptions.length, 1);
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
    };
    const editor = { document };

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
    };
    const editor = { document };

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
    };
    const editor = { document };

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
});
