# Lit View Architecture

This extension is built around three layers that keep the preview experience responsive and easy to maintain.

## 1. Coordinator

`src/previewCoordinator.ts` owns all state related to the currently previewed component. It knows how to:

- bundle a target file with esbuild and capture the output/error.
- read the source file so we can show raw code when bundling fails.
- infer a property schema from `@property` decorators and produce starter mock data.
- broadcast state changes to the UI panels and sync mock edits between them.

The coordinator does **not** render UI. Instead it exposes registries for the preview and mock panels so they can subscribe/unsubscribe cleanly.

## 2. View Providers

Two WebviewView providers render the UI in separate tree-like sections (similar to VS Code’s Explorer):

- `src/providers/previewViewProvider.ts` renders the component iframe/source snippet. It forwards mock updates into the running preview.
- `src/providers/mockViewProvider.ts` renders the props form, handles user edits, and raises `mock-change` messages back to the coordinator.

The extension entry point (`src/extension.ts`) instantiates the coordinator, registers both providers, and wires the `Lit View: Preview Lit File` command to call `coordinator.previewFile(uri)` after focusing the Lit View activity bar container.

## 3. Templates & Styling

HTML/JS payloads for the webviews live under `src/templates/` with their own ESLint config so large template strings aren’t flagged by the regular rules. Each template receives the VS Code webview instance and the computed state, then returns a self-contained document that:

- loads `media/preview.css` for shared styling.
- bootstraps the preview iframe or the mock form with minimal inline script.

`media/preview.css` now mirrors VS Code’s default view styling (single header, subtle cards, and pill buttons). The preview and mock forms sit in separate tree sections instead of nested cards.

## Data Flow Summary

1. User runs **Lit View: Preview Lit File**.
2. Coordinator bundles the file, infers props, and emits a `PreviewState`.
3. Preview view renders the iframe/source; mock view renders the schema-driven form.
4. Editing the form posts a `mock-change` message -> coordinator -> preview view, updating the running Lit component instantly.
5. Randomize button uses shared sample vocab to keep mock data playful but predictable.

## Auto Refresh on Save

The extension listens for `onDidSaveTextDocument` events and asks the coordinator to rebuild the currently previewed file when the saved URI matches the last bundled target. That way saving any file that Lit View has already bundled automatically recomputes the bundle and resyncs both panels without rerunning the command manually.
