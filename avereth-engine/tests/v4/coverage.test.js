// The vocabularies and the code agree in both directions: every command the interpreter may write
// (content/commands.json) has a handler and every handler a command; every delta the extractor may write
// (content/deltas.json) has a world handler and every handler a delta; every answer a command handler expects from the
// extractor (expectedKeys) has its shape in the vocabulary, the extractor's prompt and its schema, and the world
// applier reads it (a sell once fell back to {done} and could never be booked: delta-0.3).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { COMMAND_TYPES } from '../../src/v4/commands.js';
import { deltaSchema, expectedText } from '../../src/v4/extract.js';

const content = await loadContent();
const source = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('every command of the vocabulary has a handler, and every handler a command', () => {
    assert.deepEqual([...COMMAND_TYPES].sort(), content.commandVocab.commands.map((c) => c.type).sort());
});

test('every delta of the vocabulary has a world handler, and every handler a delta', () => {
    const src = source('src/v4/world.js');
    const body = src.slice(src.indexOf('switch (d.type)'));
    const cases = [...new Set([...body.slice(0, body.indexOf('default:')).matchAll(/case '([a-z_.]+)'/g)].map((m) => m[1]))].sort();
    assert.deepEqual(cases, content.deltaVocab.deltas.map((d) => d.type).sort());
});

test('every answer a command handler expects has its shape in the vocabulary, the extractor prompt and schema, and the world reads it', () => {
    const types = [...new Set([...source('src/v4/commands.js').matchAll(/expectedKeys\[[^\]]+\] = '([a-z_.]+)'/g)].map((m) => m[1]))].sort();
    assert.deepEqual(types, Object.keys(content.deltaVocab.expected).sort(), 'no expectation without a shape, no shape nobody asks for');
    const world = source('src/v4/world.js');
    for (const t of types) {
        const shape = Object.keys(content.deltaVocab.expected[t].shape).sort();
        const schema = deltaSchema(content.deltaVocab, {}, { 1: t }).properties.expected.properties['1'];
        assert.deepEqual(Object.keys(schema.properties).sort(), shape, `${t}: the schema asks what the vocabulary names`);
        assert.ok(!expectedText(content.deltaVocab, { 1: t }).includes('did it happen'), `${t}: the prompt names its shape, not the fallback`);
        assert.ok(world.includes(`type === '${t}'`), `${t}: the world applier reads the answer`);
    }
});
