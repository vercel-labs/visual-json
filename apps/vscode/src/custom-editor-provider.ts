import * as vscode from "vscode";
import { resolveSchema } from "@visual-json/core";
import { parse as parseJsonc } from "jsonc-parser";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  getWebviewHtml,
  type HostToWebviewMessage,
  type WebviewToHostMessage,
} from "./webview-utils";

function isYamlFile(filename: string): boolean {
  return filename.endsWith(".yaml") || filename.endsWith(".yml");
}

function parseContent(text: string, filename: string): unknown {
  if (isYamlFile(filename)) {
    return parseYaml(text);
  }
  return parseJsonc(text);
}

function serializeContent(value: unknown, filename: string): string {
  if (isYamlFile(filename)) {
    return stringifyYaml(value, { lineWidth: 0 });
  }
  return JSON.stringify(value, null, 2);
}

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
    const filename = document.uri.path.split("/").pop() ?? "file.json";

    const sendContent = () => {
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
              const parsed = parseContent(msg.json, msg.filename);
              const schema = await resolveSchema(
                parsed as Parameters<typeof resolveSchema>[0],
                msg.filename,
              );
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
