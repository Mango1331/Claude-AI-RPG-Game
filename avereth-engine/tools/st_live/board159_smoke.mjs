// Original User03 Board failure through a real ST host; scripted provider, no natural-model claim.
import fs from 'node:fs';import zlib from 'node:zlib';
const f=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user03_board158.json.gz',import.meta.url))));
const success='I read the official board and study the notices.';
const failure='I try reading the official quest board again.';
export const board159Turns=[
 {key:'board159success',player:success,plan:{commands:[{seq:1,type:'board.read',rank:null,quote:success}]},reply:'Alaric read the five official contracts and considered his options.',answer:{scene:'here',expected:{},deltas:[]}},
 {key:'board159failure',player:failure,plan:{commands:[{seq:1,type:'board.read',rank:null,quote:failure}]},reply:f.reply,answer:f.extraction},
];
let mode=null,n=0;
export function board159Response(){
 n++;const pair=f.attempts[mode==='success'?0:1];
 if(mode!=='success'||n===1)return pair[(n-1)%2];
 const raw=JSON.parse(pair[1]),l=raw.listings.find(l=>l.level===1);
 for(const k of ['title','task','desired_end_state'])if(l[k])l[k]=l[k].replace(/boars?/gi,'giant rat');
 l.objectives[0].what='giant rat';l.objectives[0].qty=1;l.habitat={...l.habitat,species:'giant rat',anchor:'rat',min_level:1,max_level:1};return JSON.stringify(raw);
}
export async function board159Smoke({page,send,idle,calls,driver,onReload}){
 const seed=async()=>{await page.evaluate(async prefix=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...prefix);await c.saveChat();await c.reloadCurrentChat();},structuredClone(f.prefix));onReload();};
 const snapshot=()=>page.evaluate(async()=>{const{foldChat}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');const c=SillyTavern.getContext(),r=foldChat(c.chat),s=r.state;return{errors:r.errors,quests:Object.values(s.quests).filter(q=>q.kind==='guild_contract').length,coin:s.entities.pc.sheet.coin_cp,facts:Object.values(s.facts),rejected:c.chat.at(-1)?.extra?.avereth?.rejected,status:c.chat.at(-1)?.extra?.avereth?.extraction?.status};});
 mode='success';n=0;await seed();const start=calls.length;await send(success);await idle();const good=await snapshot();
 const boardCalls=calls.slice(start).filter(c=>c.purpose==='board'),repair=boardCalls[1]?.lastUser || '';
 const checks={originalRepairBooksFive:good.quests===5&&n===2&&good.coin===30&&!good.errors.length,repairShowsConstraints:/rat/.test(repair)&&/HP.*35/.test(repair)&&/41/.test(repair)&&/11/.test(repair)};
 mode='failure';n=0;await seed();await send(failure);await idle();const bad=await snapshot();
 checks.invalidBoardRemainsUnbooked=bad.quests===0&&n===2&&bad.coin===30&&!bad.errors.length;
 checks.noInventedSchedule=!bad.facts.some(f=>f.p==='post_schedule')&&bad.rejected?.some(x=>x.rule==='board_availability');
 checks.extractionCompleted=bad.status==='applied';
 checks.saved=await driver().verifySaved(await driver().chat(),{complete:true});
 mode=null;return checks;
}
