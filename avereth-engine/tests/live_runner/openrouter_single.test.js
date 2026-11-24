import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { options, nativeCompletionBlocksContinuation, applyIsolatedHelperStartStats } from '../../tools/st_live/live/run_live.mjs';
import { OPENROUTER_URL, OPENROUTER_MODEL, OPENROUTER_PROVIDER, OPENROUTER_REASONING_EFFORT, OPENROUTER_INCLUDE_BODY, openRouterPlayerExtraBody, useOpenRouter } from '../../tools/st_live/live/openrouter.mjs';
import { routeOf } from '../../tools/st_live/live/import_profile.mjs';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { playerSystemPrompt, playerReasoning, llmPlayer } from '../../tools/st_live/live/players.mjs';
import { createInstance } from '../../tools/st_live/live/profile.mjs';
import { loadProductContent } from '../helpers.js';
import { startCampaign } from '../../src/engine.js';
import { selectClass, selectSkills } from '../../src/creation.js';
import { fold, applyEvent } from '../../src/state.js';

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
            ['llm',OPENROUTER_URL,OPENROUTER_MODEL,null,openRouterPlayerExtraBody()]);
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
        assert.equal(adjusted.connection.custom_include_body,OPENROUTER_INCLUDE_BODY);
        assert.match(adjusted.connection.custom_include_body,/reasoning_effort: low/);
        assert.match(adjusted.connection.custom_include_body,/order: \[wafer\/us\]/);
        assert.match(adjusted.connection.custom_include_body,/allow_fallbacks: false/);
        assert.equal(playerReasoning(adjusted,o.player).body.reasoning_effort,OPENROUTER_REASONING_EFFORT);
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

test('actual direct LLM-player HTTP body pins Wafer and low effort, not only the displayed preset', async () => {
    const imp=useOpenRouter({
        source:'custom',connection:{custom_url:'http://legacy.featherless.local/v1'},
        generation:{reasoning_effort:'none'},
        warnings:[],route:{profile:{source:'custom',url:'http://legacy.featherless.local/v1'}},
    },{openrouter:true,openrouterModel:OPENROUTER_MODEL});
    const opts=options(['--config','/path/to/nonexistent.json','--openrouter'],{});
    const settings=playerReasoning(imp,opts.player);
    assert.deepEqual(settings.body,{reasoning_effort:OPENROUTER_REASONING_EFFORT});
    const outgoing=[];
    const p=llmPlayer({
        guide:loadGuide('natural_helper_progression'),
        username:'Alaric',url:opts.player.url,model:opts.player.model,key:'TEST_ONLY',
        body:settings.body,extraBody:opts.player.extraBody,
        fetchImpl:async (url, request)=>{
            outgoing.push({url,request:JSON.parse(request.body)});
            return {ok:true,status:200,json:async()=>({
                choices:[{message:{content:JSON.stringify({message:'I ask if the family needs any help.',milestone:'open_run_level',intent:'Offer assistance',stop:false,stop_reason:null,observations:''})},finish_reason:'stop'}],
            })};
        },
    });
    const answer=await p.decide({messages:[{user:false,system:false,text:'A villager asks for help.'}],hud:'HP 30/30'}, {turn:1,maxTurns:150});
    assert.match(answer.message,/ask if the family/);
    assert.equal(outgoing.length,1);
    assert.equal(outgoing[0].url,OPENROUTER_URL+'/chat/completions');
    assert.equal(outgoing[0].request.model,OPENROUTER_MODEL);
    assert.equal(outgoing[0].request.reasoning_effort,'low');
    assert.deepEqual(outgoing[0].request.provider,{order:[OPENROUTER_PROVIDER],allow_fallbacks:false});
});

test('fixed OpenRouter routing YAML is valid for ST Custom Chat Completion include-body',()=>{
    assert.deepEqual(OPENROUTER_INCLUDE_BODY.split('\\n'),[
        'reasoning_effort: low','provider:','  order: [wafer/us]','  allow_fallbacks: false'
    ]);
    const reference=openRouterPlayerExtraBody();
    assert.deepEqual(reference.provider.order,[OPENROUTER_PROVIDER]);
    assert.equal(reference.provider.allow_fallbacks,false);
});

test('a terminal Extractor failure is not soft-continuable while ST still blocks the next input', () => {
    const replies=[
        {extra:{avereth:{extraction:{status:'failed'}}}},
        {extra:{avereth:{extraction:{status:'pending'}}}},
        {extra:{avereth:{extraction:{status:'applied'}}}},
    ];
    assert.equal(nativeCompletionBlocksContinuation({kind:'extractor_failed',at:0},replies),true);
    assert.equal(nativeCompletionBlocksContinuation({kind:'extractor_failed',at:1},replies),true);
    assert.equal(nativeCompletionBlocksContinuation({kind:'extractor_failed',at:2},replies),false);
    assert.equal(nativeCompletionBlocksContinuation({kind:'planner_failed',at:0},replies),false);
    assert.equal(nativeCompletionBlocksContinuation(null,replies),false);
});

test('the helper runner alone doubles all six Level-1 baseline stats in its isolated content and records the bonus', async () => {
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'avereth-helper-stats-'));
    const inst=createInstance({runId:'helper-stats-test',runDir:dir});
    const isolated=path.join(inst.user,'extensions','avereth-engine','content','campaign_start.json');
    const productFile=new URL('../../content/campaign_start.json',import.meta.url);
    const productText=fs.readFileSync(productFile,'utf8');
    try {
        inst.guard.mkdir(path.dirname(isolated));
        inst.guard.write(isolated,productText);
        assert.equal(applyIsolatedHelperStartStats(inst,false),null);
        assert.equal(fs.readFileSync(isolated,'utf8'),productText);
        const receipt=applyIsolatedHelperStartStats(inst,true);
        assert.equal(receipt.kind,'isolated_runner_start_stats');
        assert.equal(receipt.multiplier,2);
        const normal=JSON.parse(productText);
        const doubled=JSON.parse(fs.readFileSync(isolated,'utf8'));
        for(const stat of ['STR','VIT','AGI','INT','PER','WIL']) {
            assert.equal(normal.pc.stats[stat],5);
            assert.equal(doubled.pc.stats[stat],10);
            assert.equal(receipt.before[stat],5);
            assert.equal(receipt.after[stat],10);
        }
        assert.equal(fs.readFileSync(productFile,'utf8'),productText,'product content is unchanged');
        // The same real creation procedures must apply the existing favored +1 and
        // derive HP/MP consistently; no NPC stats, XP or level thresholds are modified.
        const content=await loadProductContent();
        content.start=doubled;
        const events=startCampaign(content,{seed:7,runtime:'v4'});
        let state=fold(events);
        const advance=(newEvents)=>{
            for(const event of newEvents) { events.push(event); applyEvent(state,event); }
        };
        assert.deepEqual(state.entities.pc.sheet.stats,Object.fromEntries(content.rules.stats.map(k=>[k,10])));
        advance(selectClass(state,content,'mage').events);
        advance(selectSkills(state,content,['mage.flame_lance','mage.arcane_bolt']).events);
        const pc=state.entities.pc.sheet;
        assert.equal(pc.stats.INT,11);
        assert.equal(pc.stats.WIL,11);
        assert.equal(pc.stats.VIT,10);
        assert.equal(pc.hp,105);
        assert.equal(pc.mp,132);
        assert.equal(pc.level,1);
        assert.equal(pc.free_points,0);
        assert.equal(pc.xp,0);
        assert.equal(fold(JSON.parse(JSON.stringify(events))).entities.pc.sheet.hp,105);
    } finally {
        fs.rmSync(inst.root,{recursive:true,force:true});
        fs.rmSync(dir,{recursive:true,force:true});
    }
});
