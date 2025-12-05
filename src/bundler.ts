import { build, type Metafile } from 'esbuild';
import type { BuildOptions } from 'esbuild';
import { resolveComponentGraph, type ResolveComponentGraphOptions, type ComponentGraph } from './resolver';

const DEFAULT_LOADERS: NonNullable<BuildOptions['loader']> = {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.js': 'js',
    '.jsx': 'jsx',
    '.mjs': 'js',
    '.cjs': 'js'
};

export type BundlePreviewOptions = ResolveComponentGraphOptions & {
    minify?: boolean;
    sourcemap?: boolean;
    target?: string | string[];
    define?: Record<string, string>;
    additionalExternal?: string[];
    esbuildOverrides?: Partial<BuildOptions>;
};

export type BundlePreviewResult = {
    code: string;
    map?: string;
    graph: ComponentGraph;
    metafile?: Metafile;
    externals: string[];
};

export async function bundleComponentPreview(entry: string, options: BundlePreviewOptions = {}): Promise<BundlePreviewResult> {
    const graph = await resolveComponentGraph(entry, options);
    const external = collectExternalSpecifiers(graph, options.additionalExternal);

    const buildResult = await build({
        entryPoints: [graph.entry.filePath],
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'browser',
        treeShaking: true,
        metafile: true,
        minify: options.minify ?? false,
        sourcemap: options.sourcemap ? 'inline' : false,
        target: options.target ?? ['es2020'],
        define: options.define,
        external: Array.from(external),
        loader: {
            ...DEFAULT_LOADERS,
            ...(options.esbuildOverrides?.loader ?? {})
        },
        ...options.esbuildOverrides
    });

    const codeFile = buildResult.outputFiles?.find((file) => file.path.endsWith('.js'));
    if (!codeFile) {
        throw new Error('Lit View bundler did not emit JavaScript output.');
    }

    const mapFile = buildResult.outputFiles?.find((file) => file.path.endsWith('.js.map'));

    return {
        code: codeFile.text,
        map: mapFile?.text,
        graph,
        metafile: buildResult.metafile,
        externals: Array.from(external)
    };
}

function collectExternalSpecifiers(graph: ComponentGraph, preset: string[] = []) {
    const external = new Set<string>(preset);

    graph.externals.forEach((ref) => external.add(ref.specifier));

    Object.values(graph.nodes).forEach((node) => {
        node.imports.forEach((edge) => {
            if (!edge.resolvedPath && edge.specifier) {
                external.add(edge.specifier);
            }
        });
    });

    return external;
}
