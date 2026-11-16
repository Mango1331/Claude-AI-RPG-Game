import http from 'node:http';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {RequestLedger,redact} from './ledger.mjs';import {fault} from '../../architecture201/journal.mjs';
export function approvalCheck(c,expected){
 if(c?.approved!==true||!c.userApprovalReference||!c.series||!c.model||!c.tokenizerId||!c.tokenizerModule||!c.contextWindow)throw fault('separate explicit user approval and actual provider/model/tokenizer configuration required');
 if(!/^[a-zA-Z0-9_-]+$/.test(c.series))throw fault('unsafe series id');
 if(JSON.stringify(c.hashes)!==JSON.stringify(expected))throw fault('frozen prompts/code changed; approval is stale');
 const url=new URL(c.endpoint);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw fault('provider endpoint must be HTTPS without embedded credentials');
 if(c.maxRequests!==24)throw fault('approval must preserve hard limit 24');
}
export async function gateway(config,root,hashes){
 approvalCheck(config,hashes);const secret=process.env.GM_ROLEPLAY_API_KEY;if(!secret)throw fault('approved provider credential missing; no fallback to unrelated tokens');
 const tokenizer=await import(pathToFileURL(config.tokenizerModule));
 if(tokenizer.modelId!==config.model||tokenizer.tokenizerId!==config.tokenizerId||typeof tokenizer.countRequestTokens!=='function')throw fault('model-specific tokenizer contract mismatch');
 const ledger=new RequestLedger(root,{series:config.series,model:config.model,contextWindow:config.contextWindow,maxOutput:config.maxOutput||2000,temperature:config.temperature??0.7,tokenizerId:config.tokenizerId,hashes},tokenizer.countRequestTokens);
 const state={label:'unassigned',ledger};
 const server=http.createServer(async(req,res)=>{
  // This proxy is reachable only on loopback and implements no model-list lookup or retry.
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return;}
  try{
   let text='';for await(const chunk of req){text+=chunk;if(text.length>2_000_000)throw fault('request too large');}
   const st=JSON.parse(text);if(st.model!==config.model||st.stream===true)throw fault('same model, nonstreamed comparison only');
   const body={model:st.model,messages:st.messages,temperature:st.temperature,max_tokens:st.max_tokens,stream:false};
   const response=await ledger.request(body,async payload=>{
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),120000);
    try{
     const upstream=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${secret}`},body:JSON.stringify(payload),signal:abort.signal,redirect:'error'});
     const raw=await upstream.text();let json;try{json=JSON.parse(raw);}catch{json={error:{message:'non-JSON provider response',body:redact(raw,secret)},status:upstream.status};}
     if(!upstream.ok&&!json.error)json={...json,error:{message:'HTTP provider failure'},status:upstream.status};
     return {...json,_httpStatus:upstream.status};
    }finally{clearTimeout(timer);}
   },{secret,label:state.label});
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(response));
  }catch(error){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:redact(String(error.message),secret)}}));}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5141,'127.0.0.1',resolve);});
 return {...state,setLabel:label=>{state.label=label;},close:()=>new Promise(r=>server.close(r))};
}
