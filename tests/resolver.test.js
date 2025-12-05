const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { resolveComponentGraph } = require('../out/resolver.js');

test('resolveComponentGraph builds graph for example component', async () => {
  const entry = path.resolve(__dirname, '../src/examples/my-element.ts');
  const graph = await resolveComponentGraph(entry, { repoRoot: path.resolve(__dirname, '..') });

  assert.ok(graph.entry.filePath.endsWith('src/examples/my-element.ts'));
  assert.ok(graph.order.length >= 1);
  assert.equal(graph.order[0], graph.entry.filePath);
  assert.ok(Object.keys(graph.nodes).includes(graph.entry.filePath));
});
