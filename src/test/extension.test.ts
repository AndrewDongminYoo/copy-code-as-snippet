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

  test("Should contribute the approved editor command surfaces and settings", () => {
    const contributes = extension.packageJSON.contributes;
    const configuration = contributes.configuration.properties;

    assert.deepStrictEqual(contributes.menus["editor/context"], [
      {
        command: "copy-code-as-snippet.copy",
        when: "editorTextFocus",
      },
    ]);
    assert.deepStrictEqual(contributes.keybindings, [
      {
        command: "copy-code-as-snippet.copy",
        key: "ctrl+alt+c",
        mac: "cmd+alt+c",
        when: "editorTextFocus",
      },
    ]);
    assert.deepStrictEqual(
      configuration["copy-code-as-snippet.markdown.pathPlacement"].enum,
      ["legacy", "header"],
    );
    assert.strictEqual(
      configuration["copy-code-as-snippet.markdown.pathPlacement"].default,
      "legacy",
    );
    assert.deepStrictEqual(
      configuration["copy-code-as-snippet.outsideWorkspacePath"].enum,
      ["absolute", "basename"],
    );
    assert.strictEqual(
      configuration["copy-code-as-snippet.outsideWorkspacePath"].default,
      "absolute",
    );
    assert.strictEqual(
      configuration["copy-code-as-snippet.largeFile.lineThreshold"].type,
      "integer",
    );
    assert.strictEqual(
      configuration["copy-code-as-snippet.largeFile.lineThreshold"].minimum,
      1,
    );
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

  for (const [configuredPolicy, expectedPath] of [
    ["basename", "test.js"],
    ["invalid", "/some/private/path/test.js"],
  ] as const) {
    test(`Should resolve outside-workspace paths for ${configuredPolicy} policy`, async () => {
      configurationValues["outsideWorkspacePath"] = configuredPolicy;
      const document = {
        uri: { fsPath: "/some/private/path/test.js" },
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

      await vscode.commands.executeCommand("copy-code-as-snippet.copy");

      assert.strictEqual(
        clipboardSpy.firstCall.args[0],
        `\`\`\`javascript:${expectedPath}\nconst test = "Hello World";\n\`\`\``,
      );

      activeTextEditorStub.restore();
    });
  }

  for (const [configuredPlacement, expectedSnippet] of [
    [
      "header",
      "### File: src/test.js\n\n```javascript\nconst test = true;\n```",
    ],
    ["invalid", "```javascript:src/test.js\nconst test = true;\n```"],
  ] as const) {
    test(`Should resolve Markdown paths for ${configuredPlacement} placement`, async () => {
      configurationValues["markdown.pathPlacement"] = configuredPlacement;
      const document = {
        uri: { fsPath: "/workspace/project/src/test.js" },
        languageId: "javascript",
        getText: () => "const test = true;",
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

      await vscode.commands.executeCommand("copy-code-as-snippet.copy");

      assert.strictEqual(clipboardSpy.firstCall.args[0], expectedSnippet);

      activeTextEditorStub.restore();
    });
  }

  test("Should use compatibility defaults for invalid boolean settings", async () => {
    configurationValues["includeFilePath"] = 0;
    configurationValues["aiMode.enabled"] = "true";
    configurationValues["largeFile.promptEnabled"] = "true";

    const document = {
      uri: { fsPath: "/workspace/project/src/test.ts" },
      languageId: "typescript",
      getText: () => "const value = 1;",
      lineCount: 1200,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);
    const showQuickPickStub = sinon
      .stub(vscode.window, "showQuickPick")
      .resolves(undefined);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(showQuickPickStub.called, false);
    assert.strictEqual(
      clipboardSpy.firstCall.args[0],
      "```typescript:src/test.ts\nconst value = 1;\n```",
    );

    activeTextEditorStub.restore();
    showQuickPickStub.restore();
  });

  test("Should use compatibility defaults for invalid format settings", async () => {
    configurationValues["format"] = "xml";
    configurationValues["markdown.fenceStrategy"] = 4;

    const document = {
      uri: { fsPath: "/workspace/project/src/test.ts" },
      languageId: "typescript",
      getText: () => "const value = 1;",
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

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(
      clipboardSpy.firstCall.args[0],
      "```typescript:src/test.ts\nconst value = 1;\n```",
    );

    activeTextEditorStub.restore();
  });

  for (const invalidThreshold of [0, 1.5]) {
    test(`Should use the default threshold for invalid value ${invalidThreshold}`, async () => {
      configurationValues["largeFile.promptEnabled"] = true;
      configurationValues["largeFile.lineThreshold"] = invalidThreshold;

      const document = {
        uri: { fsPath: "/workspace/project/src/test.ts" },
        languageId: "typescript",
        getText: () => "line 1\nline 2",
        lineCount: 2,
      };
      const selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, 0),
      );
      const editor = { document, selection };

      const activeTextEditorStub = sinon
        .stub(vscode.window, "activeTextEditor")
        .value(editor);
      const showQuickPickStub = sinon
        .stub(vscode.window, "showQuickPick")
        .resolves(undefined);

      await vscode.commands.executeCommand("copy-code-as-snippet.copy");

      assert.strictEqual(showQuickPickStub.called, false);
      assert.strictEqual(
        clipboardSpy.firstCall.args[0],
        "```typescript:src/test.ts\nline 1\nline 2\n```",
      );

      activeTextEditorStub.restore();
      showQuickPickStub.restore();
    });
  }

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

  test("Should copy exact escaped HTML content", async () => {
    configurationValues["format"] = "html";
    const content = '  const value = "<&";\n';
    const document = {
      uri: { fsPath: "/workspace/project/src/example.ts" },
      languageId: "typescript",
      getText: () => content,
      lineCount: 2,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(
      clipboardSpy.firstCall.args[0],
      '<pre><code class="language-typescript" data-filename="src/example.ts">  const value = &quot;&lt;&amp;&quot;;\n</code></pre>',
    );

    activeTextEditorStub.restore();
  });

  test("Should copy selected plain text exactly", async () => {
    configurationValues["format"] = "plain";
    const content = "  unchanged\n";
    const selection = new vscode.Selection(
      new vscode.Position(2, 0),
      new vscode.Position(3, 0),
    );
    const getTextStub = sinon.stub().callsFake((range?: vscode.Range) => {
      assert.deepStrictEqual(range, selection);
      return content;
    });
    const document = {
      uri: { fsPath: "/workspace/project/src/example.txt" },
      languageId: "plaintext",
      getText: getTextStub,
      lineCount: 20,
    };
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(getTextStub.calledOnce, true);
    assert.strictEqual(clipboardSpy.firstCall.args[0], content);

    activeTextEditorStub.restore();
  });

  test("Should omit the file path when configured", async () => {
    configurationValues["includeFilePath"] = false;
    const document = {
      uri: { fsPath: "/workspace/project/src/example.ts" },
      languageId: "typescript",
      getText: () => "const value = 1;",
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

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(
      clipboardSpy.firstCall.args[0],
      "```typescript\nconst value = 1;\n```",
    );

    activeTextEditorStub.restore();
  });

  for (const [fileName, languageId, expectedLanguage] of [
    ["Dockerfile", "plaintext", "dockerfile"],
    ["docker-compose.yml", "yaml", "docker-compose"],
  ] as const) {
    test(`Should detect ${fileName} snippet language`, async () => {
      const document = {
        uri: { fsPath: `/workspace/project/${fileName}` },
        languageId,
        getText: () => "content",
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

      await vscode.commands.executeCommand("copy-code-as-snippet.copy");

      assert.strictEqual(
        clipboardSpy.firstCall.args[0],
        `\`\`\`${expectedLanguage}:${fileName}\ncontent\n\`\`\``,
      );

      activeTextEditorStub.restore();
    });
  }

  test("Should report clipboard write failures", async () => {
    clipboardSpy.rejects(new Error("denied"));
    const showErrorMessageSpy = sinon.stub(vscode.window, "showErrorMessage");
    const document = {
      uri: { fsPath: "/workspace/project/src/example.ts" },
      languageId: "typescript",
      getText: () => "const value = 1;",
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

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(showInfoMessageSpy.called, false);
    assert.strictEqual(showErrorMessageSpy.calledOnce, true);
    assert.strictEqual(
      showErrorMessageSpy.firstCall.args[0],
      "Error copying to clipboard: denied",
    );

    activeTextEditorStub.restore();
    showErrorMessageSpy.restore();
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
            .slice(range.start.line, range.end.line)
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

    const expectedSelectionContent = contentLines.slice(4, 9).join("\n");
    const expectedSnippet = [
      "### File: src/index.ts",
      "### Language: typescript",
      "### Range: lines 5-9 (selection)",
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

  test("Should read only the selected document range", async () => {
    const selectedContent = "const selected = true;";
    const selection = new vscode.Selection(
      new vscode.Position(3, 0),
      new vscode.Position(3, selectedContent.length),
    );
    const getTextSpy = sinon.spy((range?: vscode.Range) => {
      assert.ok(range, "Selection copies should not read the full document");
      assert.deepStrictEqual(range, selection);
      return selectedContent;
    });
    const document = {
      uri: { fsPath: "/workspace/project/src/selection.ts" },
      languageId: "typescript",
      getText: getTextSpy,
      lineCount: 100,
    };
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(getTextSpy.calledOnce, true);
    assert.strictEqual(
      clipboardSpy.firstCall.args[0],
      "```typescript:src/selection.ts\nconst selected = true;\n```",
    );

    activeTextEditorStub.restore();
  });

  test("Should cancel a large-file copy before reading document text", async () => {
    configurationValues["largeFile.promptEnabled"] = true;
    configurationValues["largeFile.lineThreshold"] = 10;

    const document = {
      uri: { fsPath: "/workspace/project/src/large.js" },
      languageId: "javascript",
      getText: sinon.stub().throws(new Error("Document text was read")),
      lineCount: 120,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);
    const showQuickPickStub = sinon
      .stub(vscode.window, "showQuickPick")
      .resolves(undefined);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(document.getText.called, false);
    assert.strictEqual(clipboardSpy.called, false);
    assert.strictEqual(showQuickPickStub.calledOnce, true);

    activeTextEditorStub.restore();
    showQuickPickStub.restore();
  });

  test("Should read a large full-file choice exactly once", async () => {
    configurationValues["largeFile.promptEnabled"] = true;
    configurationValues["largeFile.lineThreshold"] = 10;
    const content = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join(
      "\n",
    );
    const getTextStub = sinon.stub().callsFake((range?: vscode.Range) => {
      assert.strictEqual(range, undefined);
      return content;
    });
    const document = {
      uri: { fsPath: "/workspace/project/src/large-full.js" },
      languageId: "javascript",
      getText: getTextStub,
      lineCount: 20,
    };
    const selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );
    const editor = { document, selection };

    const activeTextEditorStub = sinon
      .stub(vscode.window, "activeTextEditor")
      .value(editor);
    const showQuickPickStub = sinon
      .stub(vscode.window, "showQuickPick")
      .resolves("Copy full file" as unknown as vscode.QuickPickItem);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(getTextStub.calledOnce, true);
    assert.strictEqual(
      clipboardSpy.firstCall.args[0],
      `\`\`\`javascript:src/large-full.js\n${content}\n\`\`\``,
    );

    activeTextEditorStub.restore();
    showQuickPickStub.restore();
  });

  test("Should prompt for large files and allow head/tail sampling", async () => {
    configurationValues["largeFile.promptEnabled"] = true;
    configurationValues["largeFile.lineThreshold"] = 10;

    const contentLines = Array.from({ length: 120 }, (_, i) => `line ${i + 1}`);
    const fullContent = contentLines.join("\n");
    const getTextStub = sinon.stub().callsFake((range?: vscode.Range) => {
      if (!range) {
        return fullContent;
      }
      return contentLines
        .slice(range.start.line, range.end.line + 1)
        .join("\n");
    });

    const document = {
      uri: { fsPath: "/workspace/project/src/large.js" },
      languageId: "javascript",
      getText: getTextStub,
      lineAt: (line: number) => ({
        range: new vscode.Range(
          new vscode.Position(line, 0),
          new vscode.Position(line, contentLines[line].length),
        ),
      }),
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
    assert.strictEqual(getTextStub.callCount, 2);
    assert.strictEqual(getTextStub.firstCall.args[0].start.line, 0);
    assert.strictEqual(getTextStub.firstCall.args[0].end.line, 19);
    assert.strictEqual(getTextStub.secondCall.args[0].start.line, 100);
    assert.strictEqual(getTextStub.secondCall.args[0].end.line, 119);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
    showQuickPickStub.restore();
  });

  test("Should allow custom head/tail counts when sampling large files", async () => {
    configurationValues["largeFile.promptEnabled"] = true;
    configurationValues["largeFile.lineThreshold"] = 5;

    const contentLines = Array.from({ length: 40 }, (_, i) => `line ${i + 1}`);
    const fullContent = contentLines.join("\n");
    const getTextStub = sinon.stub().callsFake((range?: vscode.Range) => {
      if (!range) {
        return fullContent;
      }
      return contentLines
        .slice(range.start.line, range.end.line + 1)
        .join("\n");
    });

    const document = {
      uri: { fsPath: "/workspace/project/src/custom-large.js" },
      languageId: "javascript",
      getText: getTextStub,
      lineAt: (line: number) => ({
        range: new vscode.Range(
          new vscode.Position(line, 0),
          new vscode.Position(line, contentLines[line].length),
        ),
      }),
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
    assert.strictEqual(getTextStub.callCount, 2);
    assert.strictEqual(getTextStub.firstCall.args[0].start.line, 0);
    assert.strictEqual(getTextStub.firstCall.args[0].end.line, 4);
    assert.strictEqual(getTextStub.secondCall.args[0].start.line, 33);
    assert.strictEqual(getTextStub.secondCall.args[0].end.line, 39);

    activeTextEditorStub.restore();
    workspaceFoldersStub.restore();
    showQuickPickStub.restore();
    showInputBoxStub.restore();
  });

  test("Should read the full document when head and tail cover it", async () => {
    configurationValues["largeFile.promptEnabled"] = true;
    configurationValues["largeFile.lineThreshold"] = 5;

    const contentLines = Array.from({ length: 15 }, (_, i) => `line ${i + 1}`);
    const fullContent = contentLines.join("\n");
    const getTextStub = sinon.stub().callsFake((range?: vscode.Range) => {
      assert.strictEqual(range, undefined);
      return fullContent;
    });
    const document = {
      uri: { fsPath: "/workspace/project/src/covered.js" },
      languageId: "javascript",
      getText: getTextStub,
      lineAt: sinon.stub().throws(new Error("Line ranges should not be read")),
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
    const showQuickPickStub = sinon.stub(vscode.window, "showQuickPick");
    showQuickPickStub
      .onFirstCall()
      .resolves(
        "Copy head & tail (select ranges...)" as unknown as vscode.QuickPickItem,
      );
    showQuickPickStub.onSecondCall().resolves({
      label: "Head 10 / Tail 10",
      description: "First 10 lines + Last 10 lines",
      head: 10,
      tail: 10,
    } as any);

    await vscode.commands.executeCommand("copy-code-as-snippet.copy");

    assert.strictEqual(getTextStub.calledOnce, true);
    assert.strictEqual(document.lineAt.called, false);
    assert.strictEqual(
      clipboardSpy.firstCall.args[0],
      `\`\`\`javascript:src/covered.js\n${fullContent}\n\`\`\``,
    );

    activeTextEditorStub.restore();
    showQuickPickStub.restore();
  });
});
