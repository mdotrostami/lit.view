# Lit View Component Resolver

The resolver assembles a dependency graph for a Lit component entry point by reading the filesystem locally (preferring workspace paths) and following import statements. It powers the bundler by listing every module that needs to enter the preview sandbox.

## Usage

```ts
import { resolveComponentGraph } from '../src/resolver';

const graph = await resolveComponentGraph('src/examples/my-element.ts', {
  repoRoot: process.cwd(),
  pathAliases: {
    '@/': 'src'
  },
  cache: inMemoryGraphCache,
  remoteResolver: async (specifier) => {
    if (specifier.startsWith('https://cdn.example.com/')) {
      return specifier;
    }
    return undefined;
  }
});

console.log(graph.order); // Ordered list of files in the graph
```

## Options

- `repoRoot`: Absolute or relative directory used as the default root when resolving bare specifiers. Entries are resolved relative to this path when they are not already absolute.
- `pathAliases`: Map of alias prefixes (e.g., `@/` or `@components/`) to directories within the repo root. Specifiers that start with an alias are resolved to the associated directory before walking.
- `extensions`: Optional list of extensions to consider when specifiers omit one. Defaults to `['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']`.
- `readFile`: Inject a custom async file reader. Useful for plugging into virtual file systems or caching layers.
- `cache`: Optional object implementing `{ get(key), set(key, graph) }` to reuse previously parsed graphs keyed by entry hash.
- `remoteResolver`: Optional async hook called when local resolution fails (URLs, bare specifiers); return a path/URL to include in the graph or `undefined` to leave it external.

## Outputs

`resolveComponentGraph` returns:

- `entry`: The normalized entry module node.
- `nodes`: Map of `filePath -> ModuleNode` with parsed source and import edges.
- `order`: The visitation order (depth-first) which can seed bundler entry queues.
- `externals`: Bare specifiers that could not be resolved locally. These become external dependencies marked for CDN/skip.

Each `ModuleNode` includes basic metadata (depth, inline warnings, and the import edges describing default/named/namespace bindings). The resolver is intentionally stateless aside from per-call caching, so higher layers can persist results keyed by file hashes per the roadmap.

## Verifying Changes

Run `npm run check` after editing the resolver so ESLint and the resolver unit test (`tests/resolver.test.js`) execute. The test loads `src/examples/my-element.ts` to ensure real files are parsed correctly; add new fixtures under `src/examples/` when you need broader coverage.
