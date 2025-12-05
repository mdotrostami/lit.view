import * as vscode from 'vscode';
import { LitPreviewCoordinator, PreviewViewProvider, MockViewProvider } from './litViewProvider';

export function activate(context: vscode.ExtensionContext) {
    const coordinator = new LitPreviewCoordinator(context.extensionUri);
    const previewProvider = new PreviewViewProvider(coordinator, context.extensionUri);
    const mockProvider = new MockViewProvider(coordinator, context.extensionUri);

    context.subscriptions.push(coordinator);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(PreviewViewProvider.viewType, previewProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MockViewProvider.viewType, mockProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    const previewLitFileCommand = vscode.commands.registerCommand('lit-view.previewLitFile', async (resourceUri?: vscode.Uri) => {
        const targetUri = resourceUri ?? vscode.window.activeTextEditor?.document?.uri;

        if (!targetUri) {
            vscode.window.showInformationMessage('Select a Lit TypeScript file to preview.');
            return;
        }

        await vscode.commands.executeCommand('workbench.view.extension.litViewPreview');
        await coordinator.previewFile(targetUri);
    });

    context.subscriptions.push(previewLitFileCommand);

    const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        await coordinator.refreshForUri(document.uri);
    });

    context.subscriptions.push(saveListener);
}

export function deactivate() {}
