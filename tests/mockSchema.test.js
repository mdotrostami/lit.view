const test = require('node:test');
const assert = require('node:assert/strict');

let inferMockSchemaFromSource;
try {
    ({ inferMockSchemaFromSource } = require('../out/shared/mockSchema.js'));
} catch (error) {
    throw new Error('Run `npm run compile` before executing this test so the shared schema helper is built.');
}

test('inferMockSchemaFromSource handles Lit @property decorators with modifiers', () => {
    const source = `
        import { LitElement } from 'lit';
        import { property } from 'lit/decorators.js';
        const litProperty = property;

        class Example extends LitElement {
            @property({ type: String }) label = 'Status';
            @litProperty({ type: Number }) count = 5;
            @property({ type: Boolean }) override active = true;
            @property() protected readonly note = 'complete';
        }
    `;

    const schema = inferMockSchemaFromSource(source);
    const labelField = schema.find((field) => field.name === 'label');
    const countField = schema.find((field) => field.name === 'count');
    const activeField = schema.find((field) => field.name === 'active');
    const noteField = schema.find((field) => field.name === 'note');

    assert(labelField, 'label field should be detected');
    assert(countField, 'count field should be detected using alias decorator');
    assert.equal(labelField.type, 'string');
    assert.equal(countField.defaultValue, 5);
    assert.equal(activeField?.type, 'boolean');
    assert.equal(activeField?.defaultValue, true);
    assert.equal(noteField?.defaultValue, 'complete');
});
