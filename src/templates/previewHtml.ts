import * as vscode from 'vscode';
import { PreviewState } from '../previewCoordinator';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function buildPreviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, state: PreviewState): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'preview.css'));
    const nonce = Math.random().toString(36).slice(2, 10);
    const bundleLiteral = state.bundle ? JSON.stringify(state.bundle) : '""';
    const mockLiteral = JSON.stringify(state.mockData ?? {}).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource} blob:;">
            <link href="${styleUri}" rel="stylesheet" />
        </head>
        <body>
            <div class="panel-shell">
                <header>
                    <h1>${escapeHtml(state.fileName)}</h1>
                    ${state.error ? `<p class="preview-message">Bundling error: ${escapeHtml(state.error)}</p>` : ''}
                </header>
                <main class="panel-stack">
                    <section class="stack-section">
                        <div class="stack-body preview-stage">
                            <div id="preview-root" class="preview-root ${state.bundle ? '' : 'hidden'}"></div>
                        </div>
                    </section>
                </main>
            </div>
            <script nonce="${nonce}">
                const bundle = ${bundleLiteral};
                const initialMock = ${mockLiteral};
                const container = document.getElementById('preview-root');

                window.__litPreviewDefineQueue = [];
                const originalDefine = customElements.define.bind(customElements);
                customElements.define = function(name, constructor, options) {
                    window.__litPreviewDefineQueue.push(name);
                    return originalDefine(name, constructor, options);
                };

                if (bundle) {
                    const closingTag = '</scr' + 'ipt>';
                    const safeReplacement = '<' + '\\/' + 'script>';
                    const code = bundle.split(closingTag).join(safeReplacement);
                    const blob = new Blob([code], { type: 'text/javascript' });
                    const url = URL.createObjectURL(blob);
                    const script = document.createElement('script');
                    script.type = 'module';
                    script.src = url;
                    script.addEventListener('load', () => {
                        mountComponent();
                        URL.revokeObjectURL(url);
                    });
                    script.addEventListener('error', () => {
                        document.getElementById('preview-source')?.classList.remove('hidden');
                        URL.revokeObjectURL(url);
                    });
                    document.body.appendChild(script);
                }

                function mountComponent() {
                    if (!container || !window.__litPreviewDefineQueue.length) {
                        return;
                    }
                    const tag = window.__litPreviewDefineQueue[window.__litPreviewDefineQueue.length - 1];
                    const element = document.createElement(tag);
                    container.innerHTML = '';
                    container.appendChild(element);
                    applyMock(element, initialMock);
                    window.__litPreviewElement = element;
                }

                function applyMock(element, data) {
                    if (!element || !data) {
                        return;
                    }

                    Object.entries(data).forEach(([key, value]) => {
                        try {
                            element[key] = value;
                        } catch (error) {
                            console.warn('Unable to assign property', key, error);
                        }

                        if (typeof value === 'boolean') {
                            if (value) {
                                element.setAttribute(key, '');
                            } else {
                                element.removeAttribute(key);
                            }
                        } else if (value === null || typeof value === 'undefined') {
                            element.removeAttribute(key);
                        } else if (typeof value === 'object') {
                            element.setAttribute(key, JSON.stringify(value));
                        } else {
                            element.setAttribute(key, String(value));
                        }
                    });
                }

                window.addEventListener('message', (event) => {
                    if (event.data?.type === 'mock-data' && window.__litPreviewElement) {
                        applyMock(window.__litPreviewElement, event.data.payload || {});
                    }
                });
            </script>
        </body>
        </html>`;
}

export function buildPreviewPlaceholder(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'preview.css'));

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <link href="${styleUri}" rel="stylesheet" />
        </head>
        <body>
            <div class="panel-shell">
                <header>
                    <h1>No component selected</h1>
                </header>
                <main class="panel-stack">
                    <section class="stack-section">
                        <div class="stack-body">
                            <div class="preview-placeholder">
                                <svg
                                    class="preview-placeholder__icon"
                                    viewBox="4 1 42.2994 42.2994"
                                    role="img"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="m 14.536312,29.130175 5.213763,6.951684 V 23.916411 l -5.213763,-6.951682 v 12.165446 m 5.213763,-5.213764 V 13.488886 L 24.963838,6.5372031 V 16.964729 m 0,0 -5.213763,6.951682 z m 0,0 v 12.165446 l 5.213763,-6.951684 V 10.013045 Z m 5.213763,5.213762 5.213763,-6.951684 v 13.903368 l -5.213763,6.951684 z"
                                        fill="currentColor"
                                        stroke-width="1.73792"
                                    />
                                    <circle
                                        cx="25.1497"
                                        cy="22.1497"
                                        r="18.6497"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="5"
                                    />
                                </svg>
                                <p class="preview-placeholder__hint">
                                    Run "Lit View: Preview Lit File" to render a component here.
                                </p>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </body>
        </html>`;
}
