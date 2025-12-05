const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('panel HTML includes docs and mock sections', () => {
  const htmlPath = path.resolve(__dirname, '../extension/panel/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('panel-docs'), 'docs section missing');
  assert.ok(html.includes('panel-mock'), 'mock editor section missing');
  assert.ok(html.includes('panel-recents'), 'recents section missing');
});
