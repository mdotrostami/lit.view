import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { build, type PluginBuild } from 'esbuild';
import ts from 'typescript';
import { inferMockSchemaFromSource, MockField } from './shared/mockSchema';
export type PreviewState = {
    fileUri: vscode.Uri;
    fileName: string;
    source: string;
    bundle?: string;
    error?: string;
    schema: MockField[];
    mockData: Record<string, unknown>;
};

export interface PreviewPanel {
    render(state: PreviewState): void;
    renderPlaceholder(): void;
    applyMockData(data: Record<string, unknown>): void;
}

export interface MockPanel {
    render(state: PreviewState): void;
    renderPlaceholder(): void;
    syncMockData(data: Record<string, unknown>): void;
    onMockChange(handler: (data: Record<string, unknown>) => void): void;
}

export class LitPreviewCoordinator implements vscode.Disposable {
    private previewPanel?: PreviewPanel;
    private mockPanel?: MockPanel;
    private currentState?: PreviewState;

    constructor(private readonly extensionUri: vscode.Uri) {}

    registerPreviewPanel(panel: PreviewPanel) {
        this.previewPanel = panel;
        if (this.currentState) {
            panel.render(this.currentState);
        } else {
            panel.renderPlaceholder();
        }
    }

    registerMockPanel(panel: MockPanel) {
        this.mockPanel = panel;
        panel.onMockChange((data) => this.handleMockChange(data));
        if (this.currentState) {
            panel.render(this.currentState);
        } else {
            panel.renderPlaceholder();
        }
    }

    async previewFile(fileUri: vscode.Uri) {
        const state = await this.buildState(fileUri);
        this.currentState = state;
        this.previewPanel?.render(state);
        this.mockPanel?.render(state);
    }

    async refreshForUri(fileUri: vscode.Uri) {
        if (this.currentState?.fileUri.fsPath !== fileUri.fsPath) {
            return;
        }

        await this.previewFile(fileUri);
    }

    private async buildState(fileUri: vscode.Uri): Promise<PreviewState> {
        const fileName = path.basename(fileUri.fsPath);
        const source = await this.readFileContent(fileUri);
        const schema = inferMockSchemaFromSource(source);
        const mockData = this.currentState?.fileUri.fsPath === fileUri.fsPath
            ? this.currentState.mockData
            : this.createMockFromSchema(schema);

        let bundle: string | undefined;
        let bundleError: string | undefined;
        try {
            bundle = await this.bundleFile(fileUri);
        } catch (error) {
            bundleError = error instanceof Error ? error.message : String(error);
        }

        return {
            fileUri,
            fileName,
            source,
            bundle,
            error: bundleError,
            schema,
            mockData
        };
    }

    private handleMockChange(data: Record<string, unknown>) {
        if (!this.currentState) {
            return;
        }

        this.currentState.mockData = data;
        this.previewPanel?.applyMockData(data);
        this.mockPanel?.syncMockData(data);
    }

    private async bundleFile(fileUri: vscode.Uri): Promise<string> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
        const absWorkingDir = workspaceFolder?.uri.fsPath ?? path.dirname(fileUri.fsPath);

        const tsconfigAliases = await resolveTsconfigPathAliases(absWorkingDir);
        const plugins = tsconfigAliases.length ? [createTsconfigPathAliasPlugin(tsconfigAliases)] : undefined;

        const result = await build({
            entryPoints: [fileUri.fsPath],
            bundle: true,
            write: false,
            format: 'esm',
            platform: 'browser',
            target: ['es2020'],
            absWorkingDir,
            loader: {
                '.ts': 'ts',
                '.tsx': 'tsx',
                '.js': 'js',
                '.jsx': 'jsx'
            },
            plugins
        });

        const output = result.outputFiles?.[0]?.text;
        if (!output) {
            throw new Error('Bundler generated no output.');
        }

        return output;
    }

    private async readFileContent(fileUri: vscode.Uri): Promise<string> {
        try {
            const fileBytes = await vscode.workspace.fs.readFile(fileUri);
            return Buffer.from(fileBytes).toString('utf8');
        } catch {
            vscode.window.showWarningMessage('Unable to read the selected Lit file.');
            return '';
        }
    }

    private createMockFromSchema(schema: MockField[]): Record<string, unknown> {
        return schema.reduce<Record<string, unknown>>((acc, field) => {
            if (typeof field.defaultValue !== 'undefined') {
                acc[field.name] = field.defaultValue;
                return acc;
            }

            switch (field.type) {
                case 'boolean':
                    acc[field.name] = false;
                    break;
                case 'number':
                    acc[field.name] = 0;
                    break;
                case 'object':
                    acc[field.name] = {};
                    break;
                default:
                    acc[field.name] = '';
                    break;
            }

            return acc;
        }, {});
    }

    dispose() {}
}

type TsconfigPathAlias = {
    alias: string;
    target: string;
    wildcard: boolean;
};

type TsConfigFile = {
    compilerOptions?: {
        paths?: Record<string, string | string[]>;
    };
    extends?: string;
};

const TS_CONFIG_FILENAMES = ['tsconfig.json', 'tsconfig.base.json', 'jsconfig.json'];

async function resolveTsconfigPathAliases(startDir: string): Promise<TsconfigPathAlias[]> {
    const collected: TsconfigPathAlias[] = [];
    const visitedConfigs = new Set<string>();
    let currentDir = startDir;

    while (currentDir) {
        for (const fileName of TS_CONFIG_FILENAMES) {
            const candidate = path.join(currentDir, fileName);
            if (await fileExists(candidate)) {
                await collectTsconfigPaths(candidate, collected, visitedConfigs);
            }
        }

        const parentDir = path.dirname(currentDir);
        if (!parentDir || parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }

    if (collected.length === 0) {
        return [];
    }

    const unique = new Map<string, TsconfigPathAlias>();
    collected.forEach((entry) => {
        const key = `${entry.alias}|${entry.wildcard ? 'w' : 'e'}|${path.resolve(entry.target)}`;
        if (!unique.has(key)) {
            unique.set(key, entry);
        }
    });

    const aliases = Array.from(unique.values());
    aliases.sort((a, b) => {
        if (a.alias.length !== b.alias.length) {
            return b.alias.length - a.alias.length;
        }
        if (a.wildcard !== b.wildcard) {
            return a.wildcard ? 1 : -1;
        }
        return 0;
    });

    return aliases;
}

async function collectTsconfigPaths(
    configPath: string,
    collected: TsconfigPathAlias[],
    visited: Set<string>
): Promise<void> {
    const resolvedConfigPath = path.resolve(configPath);
    if (visited.has(resolvedConfigPath)) {
        return;
    }
    visited.add(resolvedConfigPath);

    const config = readTsconfigFile(resolvedConfigPath);
    if (!config) {
        return;
    }

    const configDir = path.dirname(resolvedConfigPath);
    const paths = config.compilerOptions?.paths ?? {};
    for (const [aliasKey, targetValue] of Object.entries(paths)) {
        const targets = Array.isArray(targetValue) ? targetValue : [targetValue];
        const target = targets.find((value): value is string => typeof value === 'string');
        if (!target) {
            continue;
        }

        const wildcardAlias = aliasKey.endsWith('/*');
        const aliasBase = wildcardAlias ? aliasKey.slice(0, -2) : aliasKey;
        const targetBase = target.endsWith('/*') ? target.slice(0, -2) : target;
        const resolvedTarget = path.resolve(configDir, targetBase);

        collected.push({
            alias: aliasBase,
            target: resolvedTarget,
            wildcard: wildcardAlias
        });
    }

    if (typeof config.extends === 'string') {
        const extendsPath = await resolveExtendsPath(config.extends, configDir);
        if (extendsPath) {
            await collectTsconfigPaths(extendsPath, collected, visited);
        }
    }
}

function readTsconfigFile(configPath: string): TsConfigFile | undefined {
    const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
    if (error) {
        return undefined;
    }

    return config as TsConfigFile;
}

async function resolveExtendsPath(extendsValue: string, baseDir: string): Promise<string | undefined> {
    const candidates: string[] = [];
    const normalized = path.isAbsolute(extendsValue) ? extendsValue : path.resolve(baseDir, extendsValue);
    candidates.push(normalized);
    if (!normalized.endsWith('.json')) {
        candidates.push(`${normalized}.json`);
    }

    for (const candidate of candidates) {
        if (await fileExists(candidate)) {
            return candidate;
        }
    }

    return undefined;
}

async function fileExists(target: string): Promise<boolean> {
    try {
        await fs.stat(target);
        return true;
    } catch {
        return false;
    }
}

function createTsconfigPathAliasPlugin(aliases: TsconfigPathAlias[]) {
    return {
        name: 'tsconfig-path-aliases',
        setup(build: PluginBuild) {
            if (aliases.length === 0) {
                return;
            }

            const exactEntries = aliases.filter((entry) => !entry.wildcard);
            const wildcardEntries = aliases.filter((entry) => entry.wildcard);

            build.onResolve({ filter: /.*/ }, (args) => {
                const specifier = args.path;

                for (const entry of exactEntries) {
                    if (specifier === entry.alias) {
                        return { path: entry.target };
                    }
                }

                for (const entry of wildcardEntries) {
                    if (specifier === entry.alias) {
                        return { path: entry.target };
                    }

                    if (specifier.startsWith(`${entry.alias}/`)) {
                        const remainder = specifier.slice(entry.alias.length + 1);
                        const candidate = path.join(entry.target, remainder);
                        return { path: candidate };
                    }
                }

                return undefined;
            });
        }
    };
}
