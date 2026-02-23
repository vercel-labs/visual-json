import * as vscode from "vscode";
import { resolveSchema } from "@visual-json/core";
import { parse as parseJsonc } from "jsonc-parser";
import {
  getWebviewHtml,
  type HostToWebviewMessage,
  type WebviewToHostMessage,
} from "./webview-utils";

export class VisualJsonPanelProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "visualJson.panel";

  private view?: vscode.WebviewView;
  private currentDocumentUri?: string;
  private ready = false;
  private suppressNextEdit = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
      ],
    };

    webviewView.webview.html = getWebviewHtml(
      webviewView.webview,
      this.context.extensionUri,
    );

    webviewView.webview.onDidReceiveMessage(
      async (msg: WebviewToHostMessage) => {
        switch (msg.type) {
          case "ready": {
            this.ready = true;
            const modeMsg: HostToWebviewMessage = {
              type: "setMode",
              mode: "panel",
            };
            webviewView.webview.postMessage(modeMsg);
            this.syncWithActiveEditor();
            break;
          }
          case "edit": {
            await this.applyEditToDocument(msg.json);
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
              webviewView.webview.postMessage(result);
            } catch {
              const result: HostToWebviewMessage = {
                type: "schemaResult",
                schema: null,
              };
              webviewView.webview.postMessage(result);
            }
            break;
          }
        }
      },
    );

    const editorChangeSubscription = vscode.window.onDidChangeActiveTextEditor(
      () => {
        this.syncWithActiveEditor();
      },
    );

    const documentChangeSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (
          this.currentDocumentUri &&
          e.document.uri.toString() === this.currentDocumentUri
        ) {
          if (this.suppressNextEdit) {
            this.suppressNextEdit = false;
            return;
          }
          this.sendDocumentContent(e.document);
        }
      },
    );

    webviewView.onDidDispose(() => {
      editorChangeSubscription.dispose();
      documentChangeSubscription.dispose();
      this.view = undefined;
      this.ready = false;
    });
  }

  private syncWithActiveEditor() {
    const editor = vscode.window.activeTextEditor;
    if (
      !editor ||
      (editor.document.languageId !== "json" &&
        editor.document.languageId !== "jsonc")
    ) {
      this.currentDocumentUri = undefined;
      return;
    }
    this.currentDocumentUri = editor.document.uri.toString();
    this.sendDocumentContent(editor.document);
  }

  private sendDocumentContent(document: vscode.TextDocument) {
    if (!this.view || !this.ready) return;
    const filename = document.uri.path.split("/").pop() ?? "file.json";
    const msg: HostToWebviewMessage = {
      type: "setContent",
      json: document.getText(),
      filename,
    };
    this.view.webview.postMessage(msg);
  }

  private async applyEditToDocument(json: string) {
    if (!this.currentDocumentUri) return;
    const uri = vscode.Uri.parse(this.currentDocumentUri);
    const document = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() === uri.toString(),
    );
    if (!document) return;

    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      json,
    );
    this.suppressNextEdit = true;
    await vscode.workspace.applyEdit(edit);
  }
}
