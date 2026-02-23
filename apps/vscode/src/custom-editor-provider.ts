import * as vscode from "vscode";
import { resolveSchema } from "@visual-json/core";
import { parse as parseJsonc } from "jsonc-parser";
import {
  getWebviewHtml,
  type HostToWebviewMessage,
  type WebviewToHostMessage,
} from "./webview-utils";

export class VisualJsonEditorProvider
  implements vscode.CustomTextEditorProvider
{
  static readonly viewType = "visualJson.editor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
      ],
    };

    webviewPanel.webview.html = getWebviewHtml(
      webviewPanel.webview,
      this.context.extensionUri,
    );

    let suppressNextEdit = false;

    const sendContent = () => {
      const filename = document.uri.path.split("/").pop() ?? "file.json";
      const msg: HostToWebviewMessage = {
        type: "setContent",
        json: document.getText(),
        filename,
      };
      webviewPanel.webview.postMessage(msg);
    };

    webviewPanel.webview.onDidReceiveMessage(
      async (msg: WebviewToHostMessage) => {
        switch (msg.type) {
          case "ready": {
            const modeMsg: HostToWebviewMessage = {
              type: "setMode",
              mode: "editor",
            };
            webviewPanel.webview.postMessage(modeMsg);
            sendContent();
            break;
          }
          case "edit": {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(
              document.uri,
              new vscode.Range(0, 0, document.lineCount, 0),
              msg.json,
            );
            suppressNextEdit = true;
            await vscode.workspace.applyEdit(edit);
            break;
          }
          case "requestSchema": {
            try {
              const parsed = parseJsonc(msg.json);
              const schema = await resolveSchema(parsed, msg.filename);
              const result: HostToWebviewMessage = {
                type: "schemaResult",
                schema,
              };
              webviewPanel.webview.postMessage(result);
            } catch {
              const result: HostToWebviewMessage = {
                type: "schemaResult",
                schema: null,
              };
              webviewPanel.webview.postMessage(result);
            }
            break;
          }
        }
      },
      undefined,
      this.context.subscriptions,
    );

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() !== document.uri.toString()) return;
        if (suppressNextEdit) {
          suppressNextEdit = false;
          return;
        }
        sendContent();
      },
    );

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }
}
