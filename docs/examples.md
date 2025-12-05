# Built-in Examples

Lit View ships with a few demo components under `src/examples/` that exercise resolver, bundler, and mock-data features.

| Component | Description | Preview tip |
|-----------|-------------|-------------|
| `my-element.ts` | Minimal component that just renders text. | Great sanity check for the preview bootstrapper. |
| `status-card.ts` | Uses properties for label/status/details and has CSS variants. | Tweak `status`, `label`, or `details` via the mock editor and watch the pill style change. |
| `profile-inspector.ts` | Demonstrates multiple props (string, number) and slot content. | Edit the JSON to swap the avatar URL, role, and commit count; try adding custom slot HTML in the mock editor. |

## How to Preview

1. Open the VS Code command palette (⇧⌘P / Ctrl+Shift+P).
2. Run `Lit View: Preview Lit File`.
3. Select any file from `src/examples/`. The bundler runs and the panel displays the component along with breadcrumb, docs, and mock-data controls.

You can also right-click a file in the Explorer and choose **Preview Lit Component**.

## How to Run Checks

To make sure the resolver, mock-data helpers, and smoke tests stay healthy, run:

```bash
npm run check
```

This executes ESLint plus the Node test suite located in `tests/`. Add new sample components or behaviors? Update both this document and the tests so the automated checks cover the new surface area.
