# Lit View

Lit View is a VS Code extension that bundles the active Lit component, resolves its dependencies, and renders the result in a pinned side panel with optional mock-data controls.


## Demo
![animated demo](screenshots/demo.GIF)


## Features
- Preview Lit components from the explorer, editor, or command palette.
- Use a dedicated mock panel to edit inferred props and see live updates.
- Side-by-side preview stays pinned to the right and reloads when the active file changes.
- Bundled output runs in a sandboxed iframe with CSP controls; imported images are read from disk, converted to data URLs, and passed to the component automatically.


## Setup
1. `npm install`
2. `npm run compile`
3. Launch the extension host in VS Code (F5 or `Run Extension`).

Development tips:
- `npm run watch` keeps `out/` in sync while editing `src/`.
- `npm run check` runs ESLint plus the smoke tests under `tests/`.

## Usage
1. Open a Lit `.ts` file, select the component, and run `Preview Lit File` (context menu or command palette).
2. The preview panel renders the component with bundled dependencies; the mock panel exposes props/attributes for editing.
3. Switching editors refreshes the preview when the active file changes. A placeholder appears if the file is not a Lit component.
4. When Context7 is configured, documentation snippets appear below the preview; otherwise the panel skips that step.

## Releases
- `npm run package` builds a `.vsix` with `vsce`.
- `npm run release` runs checks, packages the extension, and tags the repo.
- `npm run bump:patch|minor|major` updates the version with a matching commit.

## Scripts
- `npm run compile` – TypeScript build
- `npm run watch` – incremental build
- `npm run lint` – ESLint over `src/`
- `npm run test:unit` – `node --test tests/**/*.test.js`

## Contributing
Issues and PRs are welcome at [github.com/mdotrostami/lit.view](https://github.com/mdotrostami/lit.view). Keep UI strings and documentation in English.
