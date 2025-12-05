import { ComponentGraph, ComponentGraphCache } from '../resolver';
import { createHash } from 'crypto';

export class MemoryGraphCache implements ComponentGraphCache {
    private store = new Map<string, ComponentGraph>();

    public async get(key: string): Promise<ComponentGraph | undefined> {
        return this.store.get(key);
    }

    public async set(key: string, graph: ComponentGraph): Promise<void> {
        this.store.set(key, graph);
    }

    public static keyFromContent(content: string) {
        return createHash('sha256').update(content).digest('hex');
    }
}

export async function hashFileContent(readFile: (path: string) => Promise<string>, filePath: string) {
    const content = await readFile(filePath);
    return MemoryGraphCache.keyFromContent(content);
}
