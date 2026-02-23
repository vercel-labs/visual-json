import * as vscode from "vscode";
import { VisualJsonEditorProvider } from "./custom-editor-provider";
import { VisualJsonPanelProvider } from "./panel-provider";

export function activate(context: vscode.ExtensionContext) {
  const editorProvider = new VisualJsonEditorProvider(context);
  const panelProvider = new VisualJsonPanelProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      VisualJsonEditorProvider.viewType,
      editorProvider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      },
    ),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      VisualJsonPanelProvider.viewType,
      panelProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("visualJson.openWithVisualJson", () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (
        activeEditor &&
        (activeEditor.document.languageId === "json" ||
          activeEditor.document.languageId === "jsonc")
      ) {
        vscode.commands.executeCommand(
          "vscode.openWith",
          activeEditor.document.uri,
          VisualJsonEditorProvider.viewType,
        );
      } else {
        vscode.window.showInformationMessage(
          "Open a JSON file first to use visual-json.",
        );
      }
    }),
  );
}

export function deactivate() {}
