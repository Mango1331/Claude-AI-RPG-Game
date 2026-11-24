import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { options } from '../../tools/st_live/live/run_live.mjs';
import { OPENROUTER_URL, OPENROUTER_MODEL, useOpenRouter } from '../../tools/st_live/live/openrouter.mjs';
import { routeOf } from '../../tools/st_live/live/import_profile.mjs';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { playerSystemPrompt } from '../../tools/st_live/live/players.mjs';

test('one OpenRouter run overrides legacy Featherless settings without touching that config or the ST profile', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-or-single-'));
    try {
        const config = path.join(dir, 'live.config.json');
        const original = JSON.stringify({
            stDir: 'C:/SillyTavern', guide: 'patch_8_4', preset: 'profile',
            keyEnv: 'FEATHERLESS_API_KEY',
            player: {type:'scripted', url:'https://legacy.featherless.test/v1', model:'old-featherless-model',
                keyEnv:'OLD_KEY', reasoning:{clear_thinking:true}, extraBody:{provider:'legacy'}},
        });
        fs.writeFileSync(config, original);
        const o = options(['--config',config,'--openrouter'], {});
        assert.equal(o.stDir,'C:/SillyTavern');
        assert.equal(o.openrouter,true);
        assert.equal(o.openrouterModel,OPENROUTER_MODEL);
        assert.equal(o.guide,'natural_helper_progression');
        assert.equal(o.preset,'repo');
        assert.equal(o.keyEnv,'AVERETH_LIVE_API_KEY');
        assert.deepEqual([o.player.type,o.player.url,o.player.model,o.player.keyEnv,o.player.extraBody],
            ['llm',OPENROUTER_URL,OPENROUTER_MODEL,null,null]);
        assert.equal(o.player.reasoning,'profile');
        assert.equal(fs.readFileSync(config,'utf8'),original);

        const former = {chat_completion_source:'custom',custom_url:'https://legacy.featherless.test/v1',
            custom_model:'old-featherless-model',custom_include_body:'clear_thinking: true',
            custom_include_headers:'X-Old: yes'};
        const profile = {source:'custom',connection:former,
            route:{profile:routeOf(former),runner:routeOf(former),same:true,differences:[]},
            warnings:[],generation:{reasoning_effort:'low'}};
        const adjusted = useOpenRouter(profile,o);
        assert.notEqual(adjusted,profile);
        assert.deepEqual(profile.connection,former);
        assert.equal(adjusted.source,'custom');
        assert.equal(adjusted.connection.custom_url,OPENROUTER_URL);
        assert.equal(adjusted.connection.custom_model,OPENROUTER_MODEL);
        assert.equal(adjusted.connection.custom_include_body,'');
        assert.equal(adjusted.connection.custom_include_headers,'');
        assert.equal(adjusted.route.runner.url,OPENROUTER_URL);
        assert.equal(adjusted.route.runner.model,OPENROUTER_MODEL);
        assert.equal(adjusted.route.profile.url,former.custom_url);
        assert.equal(adjusted.route.same,false);
        assert.match(adjusted.warnings.join(' '),/personal ST profile/);
    } finally {
        fs.rmSync(dir,{recursive:true,force:true});
    }
});

test('OpenRouter accepts a chosen model and explicit guide while keeping the single player and key', () => {
    const o=options(['--config','/path/to/nonexistent.json','--openrouter','--model','z-ai/glm-5.3-flash:free',
        '--guide','natural_helper_progression','--preset','profile','--key-env','MY_OPENROUTER_KEY'],{});
    assert.equal(o.openrouterModel,'z-ai/glm-5.3-flash:free');
    assert.equal(o.player.model,o.openrouterModel);
    assert.equal(o.guide,'natural_helper_progression');
    assert.equal(o.preset,'profile');
    assert.equal(o.keyEnv,'MY_OPENROUTER_KEY');
    assert.throws(()=>useOpenRouter({warnings:[],route:{}},{openrouter:true,openrouterModel:'https://bad.example?key=secret'}),/model ID/);
    assert.throws(()=>options(['--config','/path/to/nonexistent.json','--model','m'],{}),/requires --openrouter/);
});

test('single-run helper guide is natural, favors NPC aid and real Guild/gear/level progress without forced classes', () => {
    const g=loadGuide('natural_helper_progression');
    assert.equal(g.openRun.targetLevel,15);
    assert.equal(g.openRun.checkpointTurns,100);
    assert.equal(g.limits.maxTurns,1000);
    assert.equal(g.starterAoe,undefined);
    assert.deepEqual(g.milestones.map(x=>x.id),['creation_complete','open_run_level','class_accepted']);
    const prompt=playerSystemPrompt(g,{username:'Alaric',persona:g.personas[0]});
    for(const phrase of ['whenever someone seems to have a problem','Guild contracts','gear upgrades',
        'NPC conversations','help']) {
        assert.ok(prompt.toLowerCase().includes(phrase.toLowerCase()),phrase);
    }
    const pkg=JSON.parse(fs.readFileSync(new URL('../../package.json',import.meta.url),'utf8'));
    assert.match(pkg.scripts['live:st:openrouter'],/run_live\.mjs --openrouter$/);
});
