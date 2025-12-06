# Lit View

Lit View adds a preview surface inside VS Code. It bundles the active Lit component plus dependencies, renders it in a pinned panel, and lets you tweak mock data without leaving the editor.

## Capabilities
- Detect a Lit file from the editor, context menu, or command palette and render it immediately.
- Inline dependent modules and static assets so the preview matches production markup.
- Keep preview and mock panels in sync: edits post messages to the running element, no rebuild required.
- Optional Context7 MCP lookups can surface related Lit docs, but the extension stays functional without them.

## Workflow
1. Trigger preview for the current file.
2. The coordinator bundles the module with esbuild, collects mock schema, and converts asset props to data URLs.
3. The preview webview mounts the custom element; the mock panel exposes inferred props for quick edits.
4. Switching files refreshes the panel; inactive editors fall back to a placeholder state.

## Constraints
- No catalog browsing or remote asset fetching beyond what the bundle already imports.
- UI copy stays in English.
- Performance beats sandbox size: cap bundle weight, drop dev-only imports, and rely on esbuild tree-shaking.

## Testing
- `npm run check` runs ESLint plus unit/smoke tests in `tests/`.
- `src/examples/` contains reference components for manual verification; see `docs/examples.md`.
