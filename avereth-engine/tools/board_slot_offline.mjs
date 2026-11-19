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
import { boardFor, generateBoard, prepareGenerationAsync } from '../src/v4/runtime.js';
import { bookBoard, boardSlotRepair, parseBoardSlot, parseBoard } from '../src/v4/guild.js';
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

async function generate(state, need, answers) {
    let calls = 0;
    const requests = [];
    const result = await generateBoard(req => { requests.push(req.messages); return answers[calls++]; }, state, content, need);
    assert(calls <= 2);
    return {result, calls, requests};
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
    const actual = await generate(state,need,[first.text,slot]);
    assert.match(actual.requests[1][0].content, /"slot":\d+,"listing"/);
    assert.equal(actual.calls,2);
    assert.deepEqual(actual.result.listings,composed);
    const direct = await generate(state,need,[second.text]);
    assert.equal(direct.calls,1);
    assert.deepEqual(direct.result.listings,composed);

    // Board generation precedes the turn; booking occurs after turn.begun and the command prelude.
    const beforeBooking = structuredClone(state);
    const start = record.events.findIndex(e=>e.t==='place.created');
    const end = record.events.findIndex(e=>e.t==='board.refreshed');
    assert(start>0 && end>start);
    record.events.slice(0,start).forEach(e=>applyEvent(beforeBooking,e));
    const booked = book(beforeBooking,need,composed);
    assert.deepEqual(booked,book(beforeBooking,need,actual.result.listings));
    assert.deepEqual(booked,book(beforeBooking,need,approved.listings));
    const short = listings => pack(listings.map(listing => {
        if (!listing.habitat) return listing;
        const {task,desired_end_state,...rest} = listing;
        return rest;
    }));
    const shortValid = await generate(state,need,[short(valid)]);
    assert.equal(shortValid.calls,1);
    assert.match(shortValid.requests[0][0].content,/omit task and desired_end_state/);
    assert.deepEqual(book(beforeBooking,need,shortValid.result.listings),booked);
    const shortRepair = await generate(state,need,[short(raw),slot]);
    assert.equal(shortRepair.calls,2);
    assert.match(shortRepair.requests[1][0].content,/"slot":\d+,"listing"/);
    assert.deepEqual(book(beforeBooking,need,shortRepair.result.listings),booked);
    const unclear = JSON.parse(short(valid));
    const outdoor = unclear.listings.find(l=>l.habitat);
    outdoor.objectives.push({...outdoor.objectives[0],verb:'FIND'});
    const failure = await generate(state,need,[JSON.stringify(unclear),short(valid)]);
    assert.equal(failure.result.failed !== undefined,true);
    assert.deepEqual(failure.result.listings,[]);
    const oldProfile = {...need,profile:'hunt_clear',progression:false};
    const legacy = await generate(state,oldProfile,[short(valid),short(valid)]);
    assert.deepEqual(legacy.result.listings,[]);
    assert.doesNotMatch(legacy.requests[0][0].content,/omit task and desired_end_state/);
    const archivalEvents = record.events.slice(start,end+1);
    const historicalEqual = equal(JSON.parse(JSON.stringify(booked.events)),archivalEvents);
    assert(historicalEqual, name + ": archived publication differs from the offline replay");
    assert.deepEqual(booked.ids,archivalEvents.at(-1).d.listings);
    const quests = booked.ids.map(id=>booked.after.quests[id]);
    assert.equal(quests.filter(q=>q.hunt).length,4);
    assert.equal(quests.filter(q=>q.clear).length,1);
    assert.equal(boardFor(booked.after,content,commands,{c:true}),null); // runtime short-circuit before the LLM
    const again = structuredClone(chat.slice(0,13));
    const text = 'I read the Guild board again.';
    const previous = foldChat(again).state.guild.boards;
    again.push({is_user:true,mes:text,extra:{}});
    const purposes = [];
    await prepareGenerationAsync(again,content,{type:'normal',settings:{},llm:async request=>{
        purposes.push(request.purpose);
        return JSON.stringify({commands:[{seq:1,type:'board.read',rank:null,quote:text}]});
    }});
    assert.deepEqual(purposes,['plan']);
    assert.deepEqual(foldChat(again).state.guild.boards,previous);
    assert(again.at(-1).extra.avereth.events.some(e=>e.t==='board.shown'));
    const measures = record.board.llm.map((call,i)=>{
        const usage=[first,second][i].usage;
        assert.equal(call.prompt,usage.prompt_tokens); assert.equal(call.completion,usage.completion_tokens);
        return {ms:call.ms,input:call.prompt,output:call.completion,cache:call.cached};
    });
    const negative = {};
    async function reject(label, text, target = null) {
        const raw = extractJsonObject(text).value?.listings;
        const p = parse(text);
        assert((p.listings?.length ?? 0)<5 || p.errors.length);
        const actual = localSlot(raw,p,parse,need.missing);
        assert.equal(actual,target,label);
        const trial = await generate(state,need,[text,target === null ? second.text : slot]);
        assert.equal(trial.calls,2);
        assert.equal(trial.requests[1].length,target === null ? 4 : 2);
        assert.deepEqual(trial.result.listings,approved.listings);
        negative[label] = {accepted:p.listings?.length ?? null,errors:p.errors,refused:p.refused,slot:actual===null ? null : actual+1};
    }
    const other = valid.findIndex((l,i)=>i!==index && l.habitat);
    await reject('unreadable','no JSON object');
    await reject('fourOnly',pack(raw.filter((_,i)=>i!==index)));
    await reject('twoInvalid',pack(raw.with(other,{...raw[other],rank:'Proven'})));
    const schemaError = {...raw[other]};
    delete schemaError.client;
    await reject('missingField',pack(raw.with(other,schemaError)));
    await reject('ambiguousTitle',pack(raw.with(other,{...raw[other],title:raw[index].title})));
    const duplicate = {...valid[other],title:'A different title for the same hunt'};
    await reject('duplicateTarget',pack(valid.with(index,duplicate)));
    const clearance = valid.find(l=>!l.habitat);
    await reject('secondClearance',pack(valid.with(index,{...clearance,title:'Clear the same level again'})));
    const contradictory = {...valid[index],habitat:{...valid[index].habitat,min_level:4,max_level:7}};
    await reject('levelWindow',pack(valid.with(index,contradictory)),index);
    // All five listings pass individually, but the global introductory quota is missing.
    const noIntro = {...valid[index],level:2,habitat:{...valid[index].habitat,min_level:1,max_level:3}};
    await reject('missingIntro',pack(valid.with(index,noIntro)));
    for (const [label,lo,hi] of [['missingMid',4,7],['missingUpper',8,14]]) {
        const changed = valid.map(l => l.habitat && l.level >= lo && l.level <= hi
            ? {...l,level:2,habitat:{...l.habitat,min_level:1,max_level:3}} : l);
        await reject(label,pack(changed));
        // A local refusal can mask an unrelated quota defect among the retained four.
        const hiddenQuota = changed.with(index,raw[index]);
        assert.equal(localSlot(hiddenQuota,parse(pack(hiddenQuota)),parse,need.missing),index);
        assert.equal(compose(parse,hiddenQuota,index,slot),null);
        const global = await generate(state,need,[pack(hiddenQuota),second.text]);
        assert.equal(global.requests[1].length,4);
        assert.deepEqual(global.result.listings,approved.listings);
    }
    const noClear = {...valid[other],title:'Another outdoor hunt',objectives:valid[other].objectives.map(o=>({...o,where:'Far Rill Fen'}))};
    await reject('missingClearance',pack(valid.with(valid.indexOf(clearance),noClear)));
    assert.equal(compose(parse,raw,index,JSON.stringify({slot:index+2,listing:valid[index]})),null);
    assert.equal(compose(parse,raw,index,JSON.stringify({slot:index+1,listing:duplicate})),null);
    assert.equal(compose(parse,raw,index,JSON.stringify({slot:index+1,listing:noIntro})),null);
    assert.equal(compose(parse,raw,index,second.text),null);
    const repair = boardSlotRepair(first.text,parsed,state,content,need);
    const original = structuredClone(repair.original);
    for (const answer of [slot, slot.slice(0,-1), '{}', second.text, JSON.stringify({slot:index+2,listing:valid[index]}),
        ...[duplicate,noIntro,contradictory].map(listing=>JSON.stringify({slot:index+1,listing}))]) {
        parseBoardSlot(answer,repair,content,need,state);
        assert.deepEqual(repair.original,original);
        const trial = await generate(state,need,[first.text,answer]);
        assert.equal(trial.calls,2);
        assert.deepEqual(trial.result.listings,answer === slot ? approved.listings : []);
    }
    const failed = await generate(state,need,[first.text,first.text]);
    assert.equal(failed.calls,2); assert.deepEqual(failed.result.listings,[]);
    const prototype = actual.requests[1];
    samples.push({name,fullMessages:second.messages,slotMessages:prototype,compact:pack(valid),slot,
        actual:second.text,reasoning_effort:second.reasoning_effort,clear_thinking:second.clear_thinking,promptTokens:measures[1].input});
    results.push({name,run,build:record.build,requestNumbers:[number,number+1],need,slot:index+1,
        rejected:parsed.refused[0],replacement:valid[index].title,counts:[parsed.listings.length,approved.listings.length,composed.length],
        ids:booked.ids,levels:quests.map(q=>q.level),eventTypes:booked.events.map(e=>e.t),historicalEqual,
        measures,negative});
}
console.log(JSON.stringify(process.argv.includes('--token-samples') ? samples : results,null,2));
