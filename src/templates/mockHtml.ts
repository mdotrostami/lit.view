import * as vscode from 'vscode';
import { PreviewState } from '../previewCoordinator';

const SAMPLE_LABELS = ['Launch prototype', 'Polish mock panel', 'Validate contract', 'Share update'];
const SAMPLE_PARAGRAPHS = [
    'Toggle props in the mock editor to explore different states.',
    'Use the randomize button when you need inspiration for copy.',
    'Preset saves capture the JSON blob exactly as rendered.'
];
const SAMPLE_NAMES = ['River Chen', 'Nova Ortega', 'Atlas Patel', 'Indigo Vale'];
const SAMPLE_COLORS = ['#22d3ee', '#a855f7', '#f472b6', '#fbbf24', '#34d399'];
const SAMPLE_STATUS = ['active', 'paused', 'review', 'done'];

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function buildMockHtml(webview: vscode.Webview, extensionUri: vscode.Uri, state: PreviewState): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'preview.css'));
    const nonce = Math.random().toString(36).slice(2, 10);
    const schemaLiteral = JSON.stringify(state.schema ?? []).replace(/</g, '\\u003c');
    const mockLiteral = JSON.stringify(state.mockData ?? {}).replace(/</g, '\\u003c');
    const samplesLiteral = JSON.stringify({ SAMPLE_LABELS, SAMPLE_PARAGRAPHS, SAMPLE_NAMES, SAMPLE_COLORS, SAMPLE_STATUS }).replace(/</g, '\\u003c');

   return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta
        http-equiv="Content-Security-Policy"
        content="
            default-src 'none';
            img-src ${webview.cspSource} https:;
            style-src ${webview.cspSource};
            script-src 'nonce-${nonce}';
        "
    >
    <link href="${styleUri}" rel="stylesheet" />
</head>
<body>
    <div class="panel-shell">
        <header>
            <h1>${escapeHtml(state.fileName)}</h1>
        </header>
        <main class="panel-stack">
            <section class="stack-section">
                <div class="stack-body">
                    <div id="mock-form" class="mock-form"></div>
                    <div class="mock-actions">
                        <button id="insert-sample" class="ghost-button" type="button">Refresh samples</button>
                    </div>
                    <p id="mock-status" class="mock-status">Use the controls here to adjust props instantly.</p>
                </div>
            </section>
        </main>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const schema = ${schemaLiteral};
        const samples = ${samplesLiteral};
        let mockData = ${mockLiteral};


        const formRoot = document.getElementById('mock-form');
        const statusEl = document.getElementById('mock-status');

        function renderForm() {
            if (!formRoot) {
                return;
            }
            formRoot.innerHTML = '';

            if (!schema.length) {
                const empty = document.createElement('p');
                empty.className = 'mock-panel__hint';
                empty.textContent = 'No @property decorators found—add one and save to refresh the form.';
                formRoot.appendChild(empty);
                return;
            }

            schema.forEach((field, index) => {
                const wrapper = document.createElement('label');
                wrapper.className = 'mock-field';

                const head = document.createElement('div');
                head.className = 'mock-field__head';

                const name = document.createElement('span');
                name.className = 'mock-field__name';
                name.textContent = field.name;

                const chip = document.createElement('span');
                chip.className = 'mock-field__chip';
                chip.textContent = field.type;

                head.appendChild(name);
                head.appendChild(chip);

                const control = createControl(field, mockData[field.name], index);
                wrapper.appendChild(head);
                wrapper.appendChild(control);

                if (typeof field.defaultValue !== 'undefined') {
                    const hint = document.createElement('p');
                    hint.className = 'mock-field__hint';
                    const displayDefault =
                        typeof field.defaultValue === 'object'
                            ? JSON.stringify(field.defaultValue)
                            : String(field.defaultValue);
                    hint.textContent = 'Default: ' + displayDefault;
                    wrapper.appendChild(hint);
                }

                formRoot.appendChild(wrapper);
            });
        }

        function createControl(field, value, index) {
            const controlType = resolveControlType(field, value);
            const eventType = controlType === 'checkbox' ? 'change' : 'input';

            if (controlType === 'textarea' || controlType === 'json') {
                const textarea = document.createElement('textarea');
                textarea.className = 'mock-field__input';
                textarea.rows = controlType === 'json' ? 4 : 3;
                textarea.value =
                    controlType === 'json'
                        ? JSON.stringify(value ?? field.defaultValue ?? {}, null, 2)
                        : typeof value === 'string'
                        ? value
                        : field.defaultValue ?? '';

                textarea.addEventListener(eventType, (event) => {
                    const raw = event.target?.value ?? '';
                    if (controlType === 'json') {
                        const next = safeJson(raw, field.name);
                        updateField(field.name, next);
                    } else {
                        updateField(field.name, raw);
                    }
                });

                return textarea;
            }

            if (controlType === 'checkbox') {
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.className = 'mock-field__input';
                input.checked = Boolean(value ?? field.defaultValue ?? true);
                input.addEventListener(eventType, (event) => {
                    updateField(field.name, event.target?.checked ?? false);
                });
                return input;
            }

            const input = document.createElement('input');
            input.className = 'mock-field__input';

            if (controlType === 'number') {
                input.type = 'number';
                input.value = typeof value === 'number'
                    ? String(value)
                    : String(field.defaultValue ?? '');
                input.addEventListener(eventType, (event) => {
                    const val = event.target?.value ?? '';
                    const next = val === '' ? 0 : Number(val);
                    updateField(field.name, next);
                });
                return input;
            }

            if (controlType === 'color') {
                input.type = 'color';
                input.value = typeof value === 'string' && value ? value : '#22d3ee';
                input.addEventListener(eventType, (event) => {
                    updateField(field.name, event.target?.value ?? '#22d3ee');
                });
                return input;
            }

            if (controlType === 'email') {
                input.type = 'email';
                input.value = typeof value === 'string' ? value : '';
                input.placeholder = 'user@example.com';
                input.addEventListener(eventType, (event) => {
                    updateField(field.name, event.target?.value ?? '');
                });
                return input;
            }

            if (controlType === 'url') {
                input.type = 'url';
                input.value = typeof value === 'string' ? value : '';
                input.placeholder = 'https://lit.dev';
                input.addEventListener(eventType, (event) => {
                    updateField(field.name, event.target?.value ?? '');
                });
                return input;
            }

            // default: text input
            input.type = 'text';
            input.value =
                typeof value === 'string'
                    ? value
                    : typeof field.defaultValue === 'string'
                    ? field.defaultValue
                    : 'Sample value ' + (index + 1);

            input.addEventListener(eventType, (event) => {
                updateField(field.name, event.target?.value ?? '');
            });

            return input;
        }

        function resolveControlType(field, value) {
            const lower = (field.name || '').toLowerCase();

            if (field.type === 'boolean') {
                return 'checkbox';
            }
            if (field.type === 'number') {
                return 'number';
            }
            if (field.type === 'object') {
                return 'json';
            }
            if (lower.includes('color')) {
                return 'color';
            }
            if (lower.includes('email')) {
                return 'email';
            }
            if (lower.includes('url') || lower.includes('href') || lower.includes('link')) {
                return 'url';
            }
            if (
                lower.includes('message') ||
                lower.includes('description') ||
                lower.includes('details') ||
                looksLikeParagraph(value)
            ) {
                return 'textarea';
            }
            return 'text';
        }

        function looksLikeParagraph(val) {
            return typeof val === 'string' && (val.length > 80 || val.includes('\\n'));
        }

        function safeJson(text, fieldName) {
            try {
                return JSON.parse(text || '{}');
            } catch {
                statusEl.textContent = 'Invalid JSON in field; keeping previous value.';
                statusEl.dataset.variant = 'error';
                return mockData[fieldName];
            }
        }

        function updateField(name, value) {
            mockData = { ...mockData, [name]: value };
            vscode.postMessage({ type: 'mock-change', payload: mockData });
            statusEl.textContent = 'Prop updated.';
            statusEl.dataset.variant = 'success';
        }

        document.getElementById('insert-sample')?.addEventListener('click', () => {
            mockData = rollRandomMock(schema);
            renderForm();
            vscode.postMessage({ type: 'mock-change', payload: mockData });
            statusEl.textContent = 'Refreshed sample props.';
            statusEl.dataset.variant = 'info';
        });

        function rollRandomMock(schema) {
            const next = {};
            schema.forEach((field, index) => {
                next[field.name] = createSampleValue(field, index);
            });
            return next;
        }

        function createSampleValue(field, index) {
            const lower = (field.name || '').toLowerCase();
            const base = field.defaultValue;

            if (field.type === 'boolean') {
                return Math.random() > 0.5;
            }
            if (field.type === 'number') {
                if (typeof base === 'number' && !Number.isNaN(base)) {
                    return base;
                }
                return Math.floor(Math.random() * 10) + index + 1;
            }
            if (field.type === 'object') {
                if (Array.isArray(base)) {
                    const length = Math.max(2, base.length);
                    return Array.from({ length }, () => pick(samples.SAMPLE_LABELS));
                }
                if (base && typeof base === 'object') {
                    return JSON.parse(JSON.stringify(base));
                }
                return {
                    note: pick(samples.SAMPLE_PARAGRAPHS),
                    updated: new Date().toISOString()
                };
            }
            if (lower.includes('color')) {
                return pick(samples.SAMPLE_COLORS);
            }
            if (lower.includes('status') || lower.includes('state')) {
                return pick(samples.SAMPLE_STATUS);
            }
            if (lower.includes('name')) {
                return pick(samples.SAMPLE_NAMES);
            }
            if (lower.includes('email')) {
                return 'team+' + Math.floor(Math.random() * 50) + '@litview.dev';
            }
            if (lower.includes('message') || lower.includes('description') || lower.includes('details')) {
                return pick(samples.SAMPLE_PARAGRAPHS);
            }
            if (lower.includes('url') || lower.includes('href') || lower.includes('link')) {
                return 'https://lit.dev/examples/' + Math.floor(Math.random() * 50);
            }
            if (lower.includes('title') || lower.includes('label') || lower.includes('heading')) {
                return pick(samples.SAMPLE_LABELS);
            }
            return pick(samples.SAMPLE_LABELS) + ' #' + (Math.floor(Math.random() * 90) + 10);
        }

        function pick(list) {
            if (!Array.isArray(list) || list.length === 0) {
                return '';
            }
            return list[Math.floor(Math.random() * list.length)];
        }


        renderForm();
    </script>
</body>
</html>`;
}

export function buildMockPlaceholder(webview: vscode.Webview, extensionUri: vscode.Uri): string {
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
                            <p class="mock-panel__hint">Preview a Lit file to see inferred props.</p>
                        </div>
                    </section>
                </main>
            </div>
        </body>
        </html>`;
}
