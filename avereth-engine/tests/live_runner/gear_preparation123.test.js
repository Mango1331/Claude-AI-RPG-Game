import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { scenarioGuide } from '../../tools/st_live/live/scenarios.mjs';
import { playerSystemPrompt, llmPlayer } from '../../tools/st_live/live/players.mjs';
for(const cls of ['warrior','mage','rogue'])test(`${cls} checks both gear types with reserve and no shopping loops`,()=>{
 const text=playerSystemPrompt(scenarioGuide(loadGuide('current_test'),`guild-${cls}`),{username:'Alaric'});
 assert.match(text,/required preparation/);assert.match(text,/100 copper/);assert.match(text,/20 copper/);assert.match(text,/never loop/);
 if(cls==='mage'){assert.match(text,/staffmaker|wandmaker/);assert.match(text,/light armour|light armor/);assert.match(text,/separate/);}
 if(cls==='rogue'){assert.match(text,/light weapons/);assert.match(text,/light armour|light armor/);}
 assert.ok(text.length<8500);
});
test('explore and unconstrained single-run guides keep free shopping',()=>{
 for(const g of [loadGuide('current_test'),scenarioGuide(loadGuide('current_test'),'explore-mage')])assert.doesNotMatch(playerSystemPrompt(g,{username:'Alaric'}),/required preparation/);
});

for (const cls of ['mage', 'rogue']) test(`${cls} preparation survives full, short and minimal requests without rewriting actions`, async () => {
    const requests = [];
    const message = 'I visit a merchant for equipment offers.';
    const player = llmPlayer({
        guide: scenarioGuide(loadGuide('current_test'), `guild-${cls}`), username: 'Alaric',
        url: 'https://example.test/v1', model: 'mock',
        fetchImpl: async (_url, init) => {
            requests.push(JSON.parse(init.body));
            const exhausted = requests.length < 3;
            return { ok: true, json: async () => ({ choices: [{
                message: { content: exhausted ? '' : JSON.stringify({ message, stop: false }) },
                finish_reason: exhausted ? 'length' : 'stop',
            }] }) };
        },
    });
    assert.equal((await player.decide({ messages: [], hud: 'Town; 200 cp', toasts: [] }, { turn: 10, maxTurns: 1000 })).message, message);
    assert.equal(requests.length, 3);
    for (const r of requests) {
        assert.match(r.messages[0].content, /required preparation/);
        assert.match(r.messages.at(-1).content, /GEAR PRIORITY.*20 cp/);
        assert.match(r.messages.at(-1).content, cls === 'mage' ? /focus\/staff/ : /light weapons/);
    }
});
