import {fixtures} from '../../architecture201/fixtures.mjs';
import {copy,digest} from '../../architecture201/journal.mjs';
import {foldChat,rec} from '../../architecture201/engine.mjs';
const source=name=>copy(fixtures().find(f=>f.name===name).base);
export function cases(){
 const wat=source('npc_promise'),forest=source('forest200'),compound=copy(forest);
 const at=foldChat(compound).state.scene.at;
 const setupEvent={t:'object.created',d:{object:{id:'obj.natural.wooden_key',name:'wooden key',kind:'item',qty:1,holder:{loc:at},marks:[]}}};
 rec(compound.findLast(m=>rec(m))).events.push(setupEvent);
 return [
 {id:'N1-first',base:wat,input:'"Wat, how have things been around the pens since we last spoke?"',source:'w191 state after #92; no synthetic promise inserted',order:['B','GM']},
 {id:'N1-recall',depends:'N1-first',base:null,input:'"Good to see you again, Wat. How are things around here now?"',source:'same mutually confirmed initial branches; original N1 dialogue withheld from model context',order:['GM','B']},
 {id:'N2',base:forest,input:fixtures().find(f=>f.name==='forest200').input,source:'original personal .200 user input/prestate #5; no recorded plan/narration/extraction used as new answer',order:['B','GM']},
 {id:'N3',base:compound,input:'I take the wooden key and, only once I have it, go to Alderwatch.',source:'same .200 prestate plus disclosed loose key setup event',setupEvents:[setupEvent],order:['GM','B']},
 {id:'N4',base:copy(wat),input:'*I quietly look over the repaired pen gate while Wat and the others continue what they were doing.*',source:'w191 state after #92, existing NPC motives and information; no instructed promise/gift/attack',order:['B','GM']},
 ];
}
export function caseManifest(){return cases().map(({base,...rest})=>({...rest,baseHash:base?digest(base):null,stateHash:base?digest(foldChat(base).state):null}));}
