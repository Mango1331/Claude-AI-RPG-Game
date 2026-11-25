import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { llmPlayer } from '../../tools/st_live/live/players.mjs';

const guide = loadGuide('natural_helper_progression');
const view = { messages: [], hud: '', toasts: [] };

for (const [name, fetchImpl, cause] of [
    ['HTTP 429', async () => Response.json({error:{message:'upstream rate limit'}},{status:429}), 'remote_unknown'],
    ['timeout', async () => { throw new DOMException('Aborted','AbortError'); }, 'remote_unknown'],
    ['HTTP 401', async () => Response.json({error:{message:'unauthorized'}},{status:401}), 'provider_rejected'],
]) {
    test(`LLM player stops after one ${name} request with an empty next input`, async () => {
        let requests = 0;
        const records = [];
        const player = llmPlayer({guide, username:'Alaric', url:'https://example.invalid/v1', model:'mock',
            fetchImpl: async () => { requests++; return fetchImpl(); }, record: row => records.push(row)});
        const result = await player.decide(view,{turn:1,maxTurns:3});
        assert.equal(requests,1);
        assert.equal(result.stop,true);
        assert.equal(result.harness,true);
        assert.equal(result.message,'');
        assert.match(result.stop_reason,new RegExp(name));
        assert.equal(records[0].cause,cause);
        assert.equal(player.notes.length,0);
    });
}

test('a completed malformed decision can be repaired without sending an in-game message', async () => {
    const requests = [];
    const completed = content => Response.json({choices:[{message:{content},finish_reason:'stop'}]});
    const player = llmPlayer({guide, username:'Alaric', url:'https://example.invalid/v1', model:'mock',
        fetchImpl: async (_url, {body}) => {
            requests.push(JSON.parse(body));
            return completed(requests.length === 1 ? 'bad JSON' : '{"message":"I wait.","stop":false}');
        }});
    const result = await player.decide(view,{turn:1,maxTurns:3});
    assert.equal(requests.length,2);
    assert.match(requests[1].messages.at(-1).content,/could not be used/);
    assert.equal(result.message,'I wait.');
});
