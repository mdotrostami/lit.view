# Lit View

Lit View bundles Lit components in-place so you can preview a TypeScript file, hit the mock data editor, and watch the rendered output update instantly inside VS Code. The activity pane exposes the preview and mock panels the extension ships.

## Setup

1. Install dependencies: `npm install`.
2. Compile the project: `npm run compile`.
3. Launch the extension host from VS Code (F5 or `Run Extension` launch configuration).

Repeat `npm run watch` while developing to keep `out/` in sync with `src/`.

## Tasks

- `npm run lint` enforces the existing ESLint rules in `src/`.
- `npm run test:unit` runs the unit tests under `tests/`.
- `npm run package` creates a `.vsix` bundle via `vsce package`.
