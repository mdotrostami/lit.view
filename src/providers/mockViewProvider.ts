import * as vscode from 'vscode';
import { LitPreviewCoordinator, MockPanel, PreviewState } from '../previewCoordinator';
import { buildMockHtml, buildMockPlaceholder } from '../templates/mockHtml';

export class MockViewProvider implements vscode.WebviewViewProvider, MockPanel {
    public static readonly viewType = 'litViewMockView';

    private view?: vscode.WebviewView;
    private changeHandler?: (data: Record<string, unknown>) => void;

    constructor(private readonly coordinator: LitPreviewCoordinator, private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')]
        };

        webviewView.webview.onDidReceiveMessage((event) => {
            if (event?.type === 'mock-change') {
                this.changeHandler?.(event.payload ?? {});
            }
        });

        this.coordinator.registerMockPanel(this);
    }

    onMockChange(handler: (data: Record<string, unknown>) => void) {
        this.changeHandler = handler;
    }

    render(state: PreviewState) {
        if (!this.view) {
            return;
        }

        this.view.webview.html = buildMockHtml(this.view.webview, this.extensionUri, state);
    }

    renderPlaceholder() {
        if (!this.view) {
            return;
        }

        this.view.webview.html = buildMockPlaceholder(this.view.webview, this.extensionUri);
    }

    syncMockData(data: Record<string, unknown>) {
        this.view?.webview.postMessage({ type: 'mock-data', payload: data });
    }
}
