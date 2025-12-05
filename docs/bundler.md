# Lit View Preview Bundler

The bundler consumes the resolver graph and produces an esbuild-powered ESM bundle suitable for the Chrome side-panel preview sandbox.

```ts
import { bundleComponentPreview } from '../src/bundler';

const result = await bundleComponentPreview('src/examples/my-element.ts', {
  repoRoot: process.cwd(),
  pathAliases: { '@/': 'src' },
  sourcemap: true,
  minify: false,
  additionalExternal: ['lit']
});

console.log(result.code); // Bundled module ready for injection
```

## Behavior

- Runs `resolveComponentGraph` first to gather the dependency graph with alias/remote support.
- Automatically marks unresolved specifiers as `external` for esbuild to keep the bundle lean and sandbox safe.
- Emits tree-shaken ESM output via esbuild with optional inline sourcemaps.
- Returns the resulting code, source map, resolver graph, detected externals, and esbuild metafile for further inspection/caching.

## Options

`bundleComponentPreview` accepts everything the resolver understands (`repoRoot`, `pathAliases`, `remoteResolver`, `cache`, etc.) plus:

- `minify`: Toggle esbuild minification (default `false` to aid debugging).
- `sourcemap`: When true, generates inline source maps for better preview error traces.
- `target`: Override esbuild output targets (default `['es2020']`).
- `define`: Pass-through replacements for feature flags.
- `additionalExternal`: Force extra specifiers to remain external (e.g., built-ins or host-provided globals).
- `esbuildOverrides`: Escape hatch to tweak esbuild build options when necessary.
