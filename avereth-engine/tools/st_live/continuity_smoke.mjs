import { foldChat } from '../../src/host.js';
// .158: original User02 prefixes through a real ST host; model responses are scripted, not a natural model test.
import fs from 'node:fs';
import zlib from 'node:zlib';
const chat=zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user02_157.jsonl.gz',import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
const root='loc.glimmerdeep_grotto';
const tam=Object.values(foldChat(chat,55).state.entities).find(e=>e.name==='Tam Ostler').id;
const exitGood={scene:root,expected:{1:{arrived:true,at:root,with:null}},deltas:[{seq:1,type:'arrive',at:root,with:null,forced_by:null,scene:root}]};
export const continuityTurns=[
 {key:'continuity158follow',player:'I follow Tam into the back room.',plan:{commands:[{seq:1,type:'go',to:{new:'Guild back room'},quote:'I follow Tam into the back room.'}]},reply:chat[56].mes,answer:chat[56].extra.avereth.extraction.raw},
 {key:'continuity158exit',player:chat[49].mes,plan:{commands:chat[49].extra.avereth.events.find(e=>e.t==='cmd.interpreted').d.commands},reply:chat[50].mes,answer:exitGood},
 {key:'continuity158talk',player:'Tam Ostler, what about our drink?',plan:{commands:[]},reply:'Tam Ostler nodded toward Alaric. "I remember that promise about a drink."',answer:{scene:'here',expected:{},deltas:[]}},
];
let exitReads=0;
export function continuityAnswer(t){
 if(t?.key!=='continuity158exit')return null;
 exitReads++;return exitReads===1?'':JSON.stringify(exitReads===2?chat[50].extra.avereth.extraction.raw:exitGood);
}
export async function continuitySmoke({page,send,idle,calls,driver,onReload}){
 const seed=async end=>{await page.evaluate(async prefix=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...prefix);await c.saveChat();await c.reloadCurrentChat();},structuredClone(chat.slice(0,end)));onReload();};
 const snapshot=()=>page.evaluate(async()=>{const{foldChat}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');const c=SillyTavern.getContext(),f=foldChat(c.chat),r=c.chat.at(-1)?.extra?.avereth;return{at:f.state.scene.at,present:f.state.scene.present,coin:f.state.entities.pc.sheet.coin_cp,context:r?.narration?.context,extraction:r?.extraction?.status,errors:f.errors,events:r?.events};});
 await seed(55);const start=await snapshot();await send(continuityTurns[0].player);await idle();const followed=await snapshot();
 const checks={acceptedGuide:followed.at.endsWith('.guild_back_room')&&followed.present.some(id=>id===tam)&&followed.coin===start.coin&&!followed.errors.length};
 await seed(49);const n=calls.length;await send(continuityTurns[1].player);await idle();const exited=await snapshot();
 checks.emptyExitRecovery=exited.at===root&&exited.extraction==='applied'&&calls.slice(n).filter(c=>c.purpose==='extract').length===3;
 checks.singleExitBooking=exited.events.filter(e=>e.t==='scene.moved'&&e.d.at===root).length===1;
 await seed(55);await send(continuityTurns[2].player);await idle();const talked=await snapshot();
 checks.contextRecorded=!!talked.context&&talked.context.focusNpcIds.some(id=>id===tam)&&talked.context.delivered.some(s=>s.npcIds.some(id=>id===tam));
 checks.noPromptCopy=!!talked.context&&!Object.keys(talked.context).some(k=>/prompt|text/i.test(k));
 await page.evaluate(()=>document.querySelector('#chat .last_mes .swipe_right')?.click());await page.waitForTimeout(400);await idle();const swiped=await snapshot();
 checks.contextSwipe=!!swiped.context&&swiped.context.focusNpcIds.includes(tam)&&swiped.at===talked.at&&!swiped.errors.length;
 const saved=await driver().verifySaved(await driver().chat(),{complete:true});
 await page.evaluate(async()=>{await SillyTavern.getContext().reloadCurrentChat();});onReload();const loaded=await snapshot();
 checks.contextSaveReload=!!saved&&JSON.stringify(loaded.context)===JSON.stringify(talked.context)&&!loaded.errors.length;
 return checks;
}
