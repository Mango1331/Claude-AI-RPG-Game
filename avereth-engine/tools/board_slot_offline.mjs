// Run against the three trusted main archives. This probe has no transport or product entry point.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual as equal } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { loadContentPack } from '../src/content.js';
import { foldChat } from '../src/host.js';
import { applyEvent } from '../src/state.js';
import { boardFor, generateBoard } from '../src/v4/runtime.js';
import { bookBoard, boardRequest, parseBoard } from '../src/v4/guild.js';
import { extractJsonObject } from '../src/v4/json.js';
import { parseServerLog } from './run_report.mjs';

const archive = process.argv[2];
assert(archive, 'Pass the path to the main checkout as the first argument');
const content = await loadContentPack(name => JSON.parse(fs.readFileSync(new URL('../content/' + name, import.meta.url))));
const cases = [
    ['User04', '20261106-072640', 'chat.jsonl.gz', 'serverlog.txt.gz', 12],
    ['User05', '20261118-011503', 'chat.jsonl', 'completions.txt', 11],
    ['User06', '20261119-010838', 'Avereth Engine Test v4 - 2026-11-19@01h08m38s866ms.jsonl', 'Chat Completion request {(20261119-032446).txt', 11],
];
const pack = listings => JSON.stringify({listings});

// A single rejection in the ordered scan can also be a conflict between TWO valid offers.
// Check the rejected raw listing by itself at the same need/state. Titles in .203 are diagnostics, not IDs.
function localSlot(raw, parsed, parse, size) {
    if (raw?.length !== size || parsed.listings?.length !== size - 1 || parsed.refused?.length !== 1 || parsed.errors.length) return null;
    const [refusal] = parsed.refused;
    const matches = raw.map((l, i) => l.title === refusal.title ? i : -1).filter(i => i >= 0);
    if (matches.length !== 1) return null;
    const index = matches[0];
    const isolated = parse(pack([raw[index]]));
    return isolated.refused?.length === 1 && isolated.refused[0].why === refusal.why ? index : null;
}

// Sampler for the three introductory-hunt cases only. Rules and local Guild knowledge come from .203.
function slotPrompt(state, need, raw, index, refusal) {
    const {system, user} = boardRequest(state, content, need);
    assert(system.includes('{"listings": [{') && user.endsWith('WRITE: 5 new listings.'));
    const retained = raw.flatMap((l, i) => i === index ? [] : [{
        slot: i+1, title: l.title, level: l.level, target: l.objectives.find(o => o.verb === 'DEFEAT'),
    }]);
    const format = system.replace('{"listings": [{', '{"slot":' + (index+1) + ',"listing":{').replace('"habitat": null}]}', '"habitat": null}}');
    const task = [
        'The quotas apply to the composed board. These four notices are fixed. Do not return or rewrite them.',
        JSON.stringify(retained),
        'Replace slot ' + (index+1) + ' (' + refusal.title + '). Validator: ' + refusal.why + '.',
        'Supply the missing introductory outdoor hunt (minor, level 1, qty 1, 1-1 habitat, compatible weak ordinary species). Use a distinct target and site. Return only the single slot object.',
    ].join('\n');
    return [{role:'system', content:format}, {role:'user', content:user.replace('WRITE: 5 new listings.', task)}];
}

function archivedPairs(file, legacy) {
    const bytes = fs.readFileSync(file);
    const source = legacy ? gunzipSync(bytes).toString('utf16le') : bytes.toString('utf8');
    const {pairs, errors} = parseServerLog(source.replace(/^\uFEFF/, '').replaceAll('\r\n','\n'));
    assert.deepEqual(errors, []);
    return pairs;
}

function sample(pair, legacy) {
    assert(!pair.repeatOf && pair.resp?.choices[0].finish_reason === 'stop');
    const {messages} = pair.req;
    const strings = [...messages.map(m => m.content), pair.resp.choices[0].message.content];
    // The UTF-16LE console represented UTF-8 message bytes as CP850 glyphs in User04 only.
    const decoded = legacy ? JSON.parse(execFileSync('python3',['-c',
        "import json,sys; print(json.dumps([s.encode('cp850').decode('utf8') for s in json.load(sys.stdin)]))"],
        {input:JSON.stringify(strings), encoding:'utf8'})) : strings;
    return {messages: messages.map((m,i) => ({role:m.role,content:decoded[i]})),
        text:decoded.at(-1), usage:pair.resp.usage, reasoning_effort:pair.req.reasoning_effort, clear_thinking:pair.req.clear_thinking};
}

function book(state, need, listings) {
    const after = structuredClone(state), events = [];
    const ids = bookBoard(after, content, need, listings, e => { events.push(e); applyEvent(after, e); });
    return {after, events, ids};
}

function compose(parse, raw, index, answer) {
    const envelope = extractJsonObject(answer).value;
    if (!envelope || Object.keys(envelope).sort().join(',') !== 'listing,slot' || envelope.slot !== index + 1) return null;
    const board = raw.with(index, envelope.listing);
    const checked = parse(pack(board));
    return checked.listings?.length === raw.length && !checked.errors.length && !checked.refused.length ? checked.listings : null;
}

async function fullRepair(state, need, answers) {
    let calls = 0;
    const result = await generateBoard(() => answers[calls++], state, content, need);
    assert(calls <= 2);
    return {result, calls};
}

const results = [], samples = [];
for (const [name, run, chatFile, logFile, number] of cases) {
    const folder = path.join(archive,'testrun_10b','user-'+run,'originals');
    const bytes = fs.readFileSync(path.join(folder,chatFile));
    const chat = (chatFile.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8').trim().split('\n').map(JSON.parse).slice(1);
    const record = chat[11].extra.avereth;
    const commands = JSON.parse(record.plan.raw[0]).commands;
    const {state, errors} = foldChat(chat,11);
    assert.deepEqual(errors, []);
    const need = boardFor(state,content,commands,{c:true});
    assert.equal(need.profile,'count_hunt_clear');
    assert.equal(need.missing,5);
    const pairs = archivedPairs(path.join(folder,logFile), name === 'User04');
    const [first, second] = pairs.slice(number-1,number+1).map(p => sample(p,name === 'User04'));
    assert(first.messages[0].content.startsWith('You write the official contracts'));
    assert.equal(second.messages[2].content, first.text);
    const parse = text => parseBoard(text,content,need,state);
    const raw = extractJsonObject(first.text).value.listings;
    const parsed = parse(first.text);
    const index = localSlot(raw,parsed,parse,need.missing);
    assert.notEqual(index,null); // localized without consulting the second answer
    const valid = extractJsonObject(second.text).value.listings;
    assert.deepEqual(raw.map((l,i)=>equal(l,valid[i]) ? null : i).filter(i=>i!==null), [index]);
    const approved = parse(second.text);
    assert.equal(approved.listings.length,5);
    const slot = JSON.stringify({slot:index+1,listing:valid[index]});
    const composed = compose(parse,raw,index,slot);
    assert.deepEqual(composed,approved.listings);
    const baseline = await fullRepair(state,need,[first.text,second.text]);
    assert.equal(baseline.calls,2);
    assert.deepEqual(baseline.result.listings,composed);
    const direct = await fullRepair(state,need,[second.text]);
    assert.equal(direct.calls,1);
    assert.deepEqual(direct.result.listings,composed);

    // Board generation precedes the turn; booking occurs after turn.begun and the command prelude.
    const beforeBooking = structuredClone(state);
    const start = record.events.findIndex(e=>e.t==='place.created');
    const end = record.events.findIndex(e=>e.t==='board.refreshed');
    assert(start>0 && end>start);
    record.events.slice(0,start).forEach(e=>applyEvent(beforeBooking,e));
    const booked = book(beforeBooking,need,composed);
    assert.deepEqual(booked,book(beforeBooking,need,baseline.result.listings));
    const archivalEvents = record.events.slice(start,end+1);
    const historicalEqual = equal(JSON.parse(JSON.stringify(booked.events)),archivalEvents);
    assert(historicalEqual, name + ": archived publication differs from the offline replay");
    assert.deepEqual(booked.ids,archivalEvents.at(-1).d.listings);
    const quests = booked.ids.map(id=>booked.after.quests[id]);
    assert.equal(quests.filter(q=>q.hunt).length,4);
    assert.equal(quests.filter(q=>q.clear).length,1);
    assert.equal(boardFor(booked.after,content,commands,{c:true}),null); // runtime short-circuit before the LLM
    const measures = record.board.llm.map((call,i)=>{
        const usage=[first,second][i].usage;
        assert.equal(call.prompt,usage.prompt_tokens); assert.equal(call.completion,usage.completion_tokens);
        return {ms:call.ms,input:call.prompt,output:call.completion,cache:call.cached};
    });
    const negative = {};
    function reject(label, text, target = null) {
        const raw = extractJsonObject(text).value?.listings;
        const p = parse(text);
        assert((p.listings?.length ?? 0)<5 || p.errors.length);
        const actual = localSlot(raw,p,parse,need.missing);
        assert.equal(actual,target,label);
        negative[label] = {accepted:p.listings?.length ?? null,errors:p.errors,refused:p.refused,slot:actual===null ? null : actual+1};
    }
    const other = valid.findIndex((l,i)=>i!==index && l.habitat);
    reject('unreadable','no JSON object');
    reject('fourOnly',pack(raw.filter((_,i)=>i!==index)));
    reject('twoInvalid',pack(raw.with(other,{...raw[other],rank:'Proven'})));
    const schemaError = {...raw[other]};
    delete schemaError.client;
    reject('missingField',pack(raw.with(other,schemaError)));
    reject('ambiguousTitle',pack(raw.with(other,{...raw[other],title:raw[index].title})));
    const duplicate = {...valid[other],title:'A different title for the same hunt'};
    reject('duplicateTarget',pack(valid.with(index,duplicate)));
    const clearance = valid.find(l=>!l.habitat);
    reject('secondClearance',pack(valid.with(index,{...clearance,title:'Clear the same level again'})));
    const contradictory = {...valid[index],habitat:{...valid[index].habitat,min_level:4,max_level:7}};
    reject('levelWindow',pack(valid.with(index,contradictory)),index);
    // All five listings pass individually, but the global introductory quota is missing.
    const noIntro = {...valid[index],level:2,habitat:{...valid[index].habitat,min_level:1,max_level:3}};
    reject('missingIntro',pack(valid.with(index,noIntro)));
    for (const [label,lo,hi] of [['missingMid',4,7],['missingUpper',8,14]]) {
        const changed = valid.map(l => l.habitat && l.level >= lo && l.level <= hi
            ? {...l,level:2,habitat:{...l.habitat,min_level:1,max_level:3}} : l);
        reject(label,pack(changed));
        // A local refusal can mask an unrelated quota defect among the retained four.
        const hiddenQuota = changed.with(index,raw[index]);
        assert.equal(localSlot(hiddenQuota,parse(pack(hiddenQuota)),parse,need.missing),index);
        assert.equal(compose(parse,hiddenQuota,index,slot),null);
    }
    const noClear = {...valid[other],title:'Another outdoor hunt',objectives:valid[other].objectives.map(o=>({...o,where:'Far Rill Fen'}))};
    reject('missingClearance',pack(valid.with(valid.indexOf(clearance),noClear)));
    assert.equal(compose(parse,raw,index,JSON.stringify({slot:index+2,listing:valid[index]})),null);
    assert.equal(compose(parse,raw,index,JSON.stringify({slot:index+1,listing:duplicate})),null);
    assert.equal(compose(parse,raw,index,JSON.stringify({slot:index+1,listing:noIntro})),null);
    assert.equal(compose(parse,raw,index,second.text),null);
    // Count local response deliveries for the proposed path. The same maximum applies to a bad replacement.
    // Keep this deliberately separate from the unchanged product generator tested above.
    function slotTrial(at, answer) {
        let calls = 0;
        const read = () => [first.text,answer][calls++];
        if (!boardFor(at,content,commands,{c:true})) return {calls,listings:null};
        const candidate = read();
        const listings = extractJsonObject(candidate).value.listings;
        const position = localSlot(listings,parse(candidate),parse,need.missing);
        assert.notEqual(position,null);
        const checked = compose(parse,listings,position,read());
        return {calls,listings:checked};
    }
    assert.deepEqual(slotTrial(state,slot),{calls:2,listings:composed});
    assert.deepEqual(slotTrial(state,JSON.stringify({slot:index+1,listing:duplicate})),{calls:2,listings:null});
    assert.deepEqual(slotTrial(booked.after,slot),{calls:0,listings:null});
    const failed = await fullRepair(state,need,[first.text,first.text]);
    assert.equal(failed.calls,2); assert.deepEqual(failed.result.listings,[]);
    const prototype = slotPrompt(state,need,raw,index,parsed.refused[0]);
    samples.push({name,fullMessages:second.messages,slotMessages:prototype,compact:pack(valid),slot,
        actual:second.text,reasoning_effort:second.reasoning_effort,clear_thinking:second.clear_thinking,promptTokens:measures[1].input});
    results.push({name,run,build:record.build,requestNumbers:[number,number+1],need,slot:index+1,
        rejected:parsed.refused[0],replacement:valid[index].title,counts:[parsed.listings.length,approved.listings.length,composed.length],
        ids:booked.ids,levels:quests.map(q=>q.level),eventTypes:booked.events.map(e=>e.t),historicalEqual,
        measures,negative});
}
console.log(JSON.stringify(process.argv.includes('--token-samples') ? samples : results,null,2));
