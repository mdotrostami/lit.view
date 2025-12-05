import * as path from 'path';
import { promises as fs } from 'fs';
import ts from 'typescript';
import { createHash } from 'crypto';

export type ResolveComponentGraphOptions = {
    repoRoot?: string;
    pathAliases?: Record<string, string>;
    extensions?: string[];
    readFile?: (filePath: string) => Promise<string>;
    cache?: ComponentGraphCache;
    remoteResolver?: RemoteResolver;
};

export type ImportEdge = {
    specifier: string;
    resolvedPath?: string;
    namespaceImport?: string;
    defaultImport?: string;
    namedImports: string[];
    isDynamic?: boolean;
};

export type ModuleNode = {
    id: string;
    filePath: string;
    source: string;
    imports: ImportEdge[];
    isEntry: boolean;
    depth: number;
    warnings: string[];
};

export type ExternalReference = {
    specifier: string;
    importedBy: string;
    reason: string;
};

export type ComponentGraph = {
    entry: ModuleNode;
    nodes: Record<string, ModuleNode>;
    order: string[];
    externals: ExternalReference[];
};

export type ComponentGraphCache = {
    get(key: string): Promise<ComponentGraph | undefined> | ComponentGraph | undefined;
    set(key: string, graph: ComponentGraph): Promise<void> | void;
};

export type RemoteResolver = (specifier: string, context: RemoteResolverContext) => Promise<string | undefined>;

export type RemoteResolverContext = {
    importer: string;
    entry: string;
    repoRoot?: string;
};

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

export async function resolveComponentGraph(entry: string, options: ResolveComponentGraphOptions = {}): Promise<ComponentGraph> {
    const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : undefined;
    const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
    const pathAliases = normalizeAliases(options.pathAliases, repoRoot);
    const readSource = options.readFile ?? defaultReadFile;
    const cache = options.cache;

    const entryPath = resolveEntryPath(entry, repoRoot);
    const cacheKey = await maybeCreateCacheKey(entryPath, readSource);
    if (cache && cacheKey) {
        const cached = await cache.get(cacheKey);
        if (cached) {
            return cached;
        }
    }

    const visited = new Map<string, ModuleNode>();
    const order: string[] = [];
    const externals: ExternalReference[] = [];

    async function visit(filePath: string, depth: number): Promise<ModuleNode> {
        if (visited.has(filePath)) {
            return visited.get(filePath)!;
        }

        const source = await readSource(filePath);
        const moduleNode: ModuleNode = {
            id: filePath,
            filePath,
            source,
            imports: [],
            isEntry: depth === 0,
            depth,
            warnings: []
        };

        visited.set(filePath, moduleNode);
        order.push(filePath);

        const parsed = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
        const importSpecs = extractImportEdges(parsed);

        for (const spec of importSpecs) {
            const resolved = await resolveImport(spec.specifier, filePath, {
                repoRoot,
                extensions,
                pathAliases,
                remoteResolver: options.remoteResolver,
                entry: entryPath,
                readFile: readSource
            });

            if (resolved) {
                moduleNode.imports.push({
                    ...spec,
                    resolvedPath: resolved
                });

                await visit(resolved, depth + 1);
            } else {
                moduleNode.imports.push(spec);
                externals.push({
                    specifier: spec.specifier,
                    importedBy: filePath,
                    reason: `Unable to resolve "${spec.specifier}" locally; marking external.`
                });
            }
        }

        return moduleNode;
    }

    const entryNode = await visit(entryPath, 0);

    const graph: ComponentGraph = {
        entry: entryNode,
        nodes: Object.fromEntries(visited.entries()),
        order,
        externals
    };

    if (cache && cacheKey) {
        await cache.set(cacheKey, graph);
    }

    return graph;
}

function normalizeAliases(aliases: Record<string, string> | undefined, repoRoot?: string) {
    if (!aliases) {
        return {};
    }

    const normalized: Record<string, string> = {};
    Object.entries(aliases).forEach(([key, target]) => {
        const resolvedTarget = repoRoot ? path.resolve(repoRoot, target) : path.resolve(target);
        normalized[key] = resolvedTarget;
        if (!key.endsWith('/')) {
            normalized[`${key}/`] = resolvedTarget;
        }
    });
    return normalized;
}

async function defaultReadFile(filePath: string) {
    return await fs.readFile(filePath, 'utf8');
}

async function maybeCreateCacheKey(entryPath: string, readFileFn: (filePath: string) => Promise<string>) {
    try {
        const source = await readFileFn(entryPath);
        return createHash('sha256').update(source).digest('hex');
    } catch {
        return undefined;
    }
}

function resolveEntryPath(entry: string, repoRoot?: string) {
    if (path.isAbsolute(entry)) {
        return entry;
    }

    if (entry.startsWith('./') || entry.startsWith('../')) {
        return path.resolve(process.cwd(), entry);
    }

    if (repoRoot) {
        return path.resolve(repoRoot, entry);
    }

    return path.resolve(entry);
}

type ResolveImportOptions = {
    repoRoot?: string;
    extensions: string[];
    pathAliases: Record<string, string>;
    remoteResolver?: RemoteResolver;
    entry: string;
    readFile: (filePath: string) => Promise<string>;
};

async function resolveImport(specifier: string, importerPath: string, options: ResolveImportOptions): Promise<string | undefined> {
    const importerDir = path.dirname(importerPath);
    const normalizedSpecifier = applyAlias(specifier, options.pathAliases);

    if (isRemoteSpecifier(normalizedSpecifier) || isPackageSpecifier(normalizedSpecifier, options.repoRoot)) {
        return resolveRemote(specifier, importerPath, options);
    }

    const candidatePaths = createCandidatePaths(normalizedSpecifier, importerDir, options.repoRoot);

    for (const candidate of candidatePaths) {
        const filePath = await findExistingFile(candidate, options.extensions);
        if (filePath) {
            return filePath;
        }
    }

    return undefined;
}

async function resolveRemote(specifier: string, importerPath: string, options: ResolveImportOptions) {
    if (!options.remoteResolver) {
        return undefined;
    }

    const remotePath = await options.remoteResolver(specifier, {
        importer: importerPath,
        entry: options.entry,
        repoRoot: options.repoRoot
    });

    if (!remotePath) {
        return undefined;
    }

    if (isRemoteSpecifier(remotePath)) {
        return remotePath;
    }

    const resolved = normalizeCandidate(remotePath, options.repoRoot);

    try {
        await options.readFile(resolved);
        return resolved;
    } catch {
        return undefined;
    }
}

function normalizeCandidate(candidate: string, repoRoot?: string) {
    if (path.isAbsolute(candidate)) {
        return candidate;
    }

    if (repoRoot) {
        return path.resolve(repoRoot, candidate);
    }

    return path.resolve(candidate);
}

function applyAlias(specifier: string, aliases: Record<string, string>): string {
    for (const [alias, target] of Object.entries(aliases)) {
        const isPrefixAlias = alias.endsWith('/');

        if (!isPrefixAlias && specifier === alias) {
            return target;
        }

        if (isPrefixAlias && specifier.startsWith(alias)) {
            const remainder = specifier.slice(alias.length).replace(/^[/\\]/, '');
            return remainder ? path.join(target, remainder) : target;
        }
    }

    return specifier;
}

function isRemoteSpecifier(specifier: string) {
    return /^https?:\/\//i.test(specifier);
}

function isPackageSpecifier(specifier: string, repoRoot?: string) {
    if (path.isAbsolute(specifier)) {
        return false;
    }

    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        return false;
    }

    if (repoRoot && specifier.startsWith(repoRoot)) {
        return false;
    }

    return true;
}

function createCandidatePaths(specifier: string, importerDir: string, repoRoot?: string) {
    if (path.isAbsolute(specifier)) {
        return [specifier];
    }

    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        return [path.resolve(importerDir, specifier)];
    }

    if (repoRoot) {
        return [path.resolve(repoRoot, specifier)];
    }

    return [path.resolve(importerDir, specifier)];
}

async function findExistingFile(candidate: string, extensions: string[]) {
    const withExtension = path.extname(candidate) ? [candidate] : extensions.map((ext) => `${candidate}${ext}`);
    const directoryIndexes = extensions.map((ext) => path.join(candidate, `index${ext}`));
    const attempts = [...withExtension, ...directoryIndexes];

    for (const attempt of attempts) {
        if (await fileExists(attempt)) {
            return attempt;
        }
    }

    return undefined;
}

async function fileExists(targetPath: string) {
    try {
        const stat = await fs.stat(targetPath);
        return stat.isFile();
    } catch {
        return false;
    }
}

type RawImport = {
    specifier: string;
    defaultImport?: string;
    namespaceImport?: string;
    namedImports: string[];
    isDynamic?: boolean;
};

function extractImportEdges(sourceFile: ts.SourceFile): RawImport[] {
    const imports: RawImport[] = [];

    const visit = (node: ts.Node) => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const specifier = node.moduleSpecifier.text;
            const namedImports: string[] = [];
            let defaultImport: string | undefined;
            let namespaceImport: string | undefined;

            if (node.importClause) {
                if (node.importClause.name) {
                    defaultImport = node.importClause.name.getText(sourceFile);
                }

                if (node.importClause.namedBindings) {
                    if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                        namespaceImport = node.importClause.namedBindings.name.getText(sourceFile);
                    } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                        node.importClause.namedBindings.elements.forEach((element) => {
                            namedImports.push(element.name.getText(sourceFile));
                        });
                    }
                }
            }

            imports.push({
                specifier,
                defaultImport,
                namespaceImport,
                namedImports
            });
        } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            imports.push({
                specifier: node.moduleSpecifier.text,
                namedImports: [],
                isDynamic: false
            });
        } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            const [arg] = node.arguments;
            if (arg && ts.isStringLiteral(arg)) {
                imports.push({
                    specifier: arg.text,
                    namedImports: [],
                    isDynamic: true
                });
            }
        }

        ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return imports;
}
