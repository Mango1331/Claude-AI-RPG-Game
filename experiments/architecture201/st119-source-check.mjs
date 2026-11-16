// Read-only check against a real ST checkout; no server, browser, provider or user data modification.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=process.argv[2];if(!root)throw Error('Pass the isolated SillyTavern 1.19 source directory');
const file=path.join(root,'public/script.js'),script=fs.readFileSync(file,'utf8'),extensions=fs.readFileSync(path.join(root,'public/scripts/extensions.js'),'utf8');
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));
const raw=between(script,'export async function generateRawData(','export async function generateRaw(');
const start=between(script,'async onStartStreaming(text)','async onProgressStreaming(');
const save=between(script,'export async function saveChat(','export async function renameChat(');
const checks={
 streamingCreatesMessageBeforeReceived:start.includes('await saveReply(')&&start.includes('fromStreaming: true'),
 streamingRendersProgress:script.includes('async onProgressStreaming(')&&script.includes('class StreamingProcessor'),
 rawDoesNotAppendChat:!raw.includes('chat.push(')&&!raw.includes('addOneMessage(')&&raw.includes('GENERATION_STOPPED'),
 explicitOffscreenSave:save.includes('Array.isArray(chatData)')&&save.includes('/api/chats/save'),
 interceptorCanAbort:extensions.includes('export async function runGenerationInterceptors')&&extensions.includes('return aborted;'),
 displayRequiresChatInsertion:script.includes('Callers push the new message to chat before calling addOneMessage'),
};for(const [k,v]of Object.entries(checks))assert.ok(v,k);
console.log(JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scriptSHA256:createHash('sha256').update(script).digest('hex'),checks,scope:'source-contract verification, NOT browser integration or provider validation'},null,2));
