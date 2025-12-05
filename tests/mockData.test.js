const test = require('node:test');
const assert = require('node:assert/strict');
const { createMockData, inferTypeFromLiteral, createSampleMock } = require('../extension/shared/mockData.js');

test('createMockData infers schema from selection text', () => {
  const selection = '<my-element title="Hello" count="2" featured="true"></my-element>';
  const result = createMockData(selection, ['/src/examples/my-element.ts']);

  assert.equal(result.schema.length >= 1, true);
  assert.equal(result.schema[0].name, 'title');
  assert.equal(result.data.title, 'Hello');
  assert.equal(result.data.component, undefined);
});

test('inferTypeFromLiteral handles booleans and numbers', () => {
  assert.equal(inferTypeFromLiteral('true'), 'boolean');
  assert.equal(inferTypeFromLiteral('42'), 'number');
  assert.equal(inferTypeFromLiteral('{"foo":"bar"}'), 'object');
  assert.equal(inferTypeFromLiteral('Hello'), 'string');
});

test('createSampleMock returns friendly heuristic values', () => {
  const schema = [
    { name: 'title', type: 'string' },
    { name: 'count', type: 'number' },
    { name: 'active', type: 'boolean' }
  ];

  const sample = createSampleMock(schema);

  assert.equal(typeof sample.title, 'string');
  assert.equal(typeof sample.count, 'number');
  assert.equal(typeof sample.active, 'boolean');
});
