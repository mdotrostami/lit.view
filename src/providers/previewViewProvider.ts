import * as vscode from 'vscode';
import { LitPreviewCoordinator, PreviewPanel, PreviewState } from '../previewCoordinator';
import { buildPreviewHtml, buildPreviewPlaceholder } from '../templates/previewHtml';

export class PreviewViewProvider implements vscode.WebviewViewProvider, PreviewPanel {
    public static readonly viewType = 'litViewPreviewView';

    private view?: vscode.WebviewView;

    constructor(private readonly coordinator: LitPreviewCoordinator, private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')]
        };

        this.coordinator.registerPreviewPanel(this);
    }

    render(state: PreviewState) {
        if (!this.view) {
            return;
        }

        this.view.webview.html = buildPreviewHtml(this.view.webview, this.extensionUri, state);
    }

    renderPlaceholder() {
        if (!this.view) {
            return;
        }

        this.view.webview.html = buildPreviewPlaceholder(this.view.webview, this.extensionUri);
    }

    applyMockData(data: Record<string, unknown>) {
        this.view?.webview.postMessage({ type: 'mock-data', payload: data });
    }
}
