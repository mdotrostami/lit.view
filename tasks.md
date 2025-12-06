# Lit View Task Board

Guideline: work one task at a time. When you start a task, mark it `[inprogress]`; when done, ask for review and mark it `[x]` after approval. Pick tasks by priority below—do not ask which to do next.


## How we work (AI agents)
[]


## Tasks
[x] revert the resolver/bundler asset aliasing and restore the previous focus on TypeScript/JavaScript imports so static files are resolved by the host again.
[x] extend `LitPreviewCoordinator.bundleFile` to collect the image assets used by the entry component, turn them into webview-safe URIs (or inline data), and expose them on the preview state for the runtime to consume.
[x] document the new host-driven asset pipeline (task board + overview) so the architecture section explains that the coordinator now supplies resolved assets to the preview runtime instead of relying on esbuild loaders.
