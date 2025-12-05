# Lit View Overview

Lit View is a Chrome extension that previews Lit components in-place so developers can see real renderings without leaving the page they are reading. It resolves component dependencies, bundles them, and mounts a live preview in a right-side panel with optional mock data editing, similar to Storybook.

## Goals
- Detect Lit components from selected text, context-menu actions, or whole-file selections and render them instantly.
- Resolve and inline dependent Lit components so previews match production composition.
- Offer a right-aligned preview surface with live updates when switching targets.
- Provide a mock data editor beneath the preview to tweak inputs/properties and see changes immediately.
- Keep everything in English for UI, docs, and prompts.
- If available, integrate the Context7 MCP server to surface relevant Lit documentation or code references; extension must remain functional without it.

## Core User Flows
1. Select text that references a Lit component, right-click, and choose "Preview Lit Component" to open the preview panel.
2. From the command palette (or a shortcut), pick a Lit component file to preview; the extension loads the file and its dependencies.
3. Inspect the dependency tree in the preview header and drill into nested components.
4. Use the mock data editor below the preview to adjust properties/slots/events and watch the component update.
5. Swap between components without closing the panel; the panel stays pinned to the right.

## Architecture
- Extension shell (Manifest V3): background service worker registers context-menu entries, command palette actions, and routes messages between content scripts and the preview panel.
- Content scripts: detect selected text or current file context, gather file URLs/paths, and request previews from the background worker.
- Component resolver: parses TypeScript/JavaScript Lit components, walks imports to collect dependencies, and uses esbuild to bundle an isolated preview-ready module.
- Preview UI (side panel): hosts the rendered component in an iframe/sandbox, shows dependency breadcrumbs, and provides a mock data editor with live re-rendering.
- Branding/Iconography: the “Lit Eye” SVG (triangle + eye + shards) is used for the extension header, doc tiles, and empty states so the experience feels cohesive.
- Mock data layer: infers properties/attributes/events from LitElement metadata (decorators, static properties) and seeds editable JSON; changes patch the running component instance.
- Documentation helper: queries the Context7 MCP server for Lit docs/snippets relevant to the active component and surfaces links or inline tips in the panel.
- Storage/config: saves recent components, mock data presets, and user preferences (e.g., keeping the panel pinned) in extension storage.

## Data Flow
1. User triggers preview (context menu or command).
2. Content script sends selection/file metadata to the background worker.
3. Worker resolves the component entry, fetches source (and dependencies), and bundles with esbuild.
4. Preview panel loads the bundle in a sandboxed iframe and renders the Lit component.
5. The webview opens beside the active editor (on the right) so you can tweak source and preview in parallel without juggling tabs.
6. When the VS Code window regains focus, the panel reloads the currently active Lit file; if the window is inactive (or the active editor isn’t a Lit file) the panel shows a “No component selected” state.
7. Mock data editor updates component props/attributes; changes are diffed and applied live.
8. If present, Context7 MCP lookups run asynchronously to show related Lit documentation or patterns; otherwise the preview skips this step without blocking rendering.

## Non-Goals (initially)
- Full design-system cataloging; focus on single-component previews first.
- Cross-origin network fetches for assets beyond what the bundled code requires.
- Automated visual regression testing (can be added later).

## Decisions
- Resolve sources locally first (workspace path mapping with an optional repo-root setting); fall back to remote/CDN only if explicitly configured and cache parsed graphs by file hash.
- Sandbox size is secondary to performance: cap bundle size, strip dev-only dependencies, and let esbuild treeshake/mark externals for heavy libs.
- Persist mock data per component (module path + export) with optional page/session overrides for quick tweaks without overwriting the saved baseline.

## Testing & Examples
- Run `npm run check` to execute ESLint plus the Node-based unit/smoke tests (`tests/`), which cover the resolver, mock helpers, and panel markup.
- Use the sample components under `src/examples/` (`my-element`, `status-card`, `profile-inspector`) to manually verify preview, breadcrumbs, docs, and mock editing flows. See `docs/examples.md` for usage notes.
