// Physical delivery evidence is generated only alongside a player-authorised inventory transfer.
// No extractor delta can create these receipts. Existing event logs keep their original meaning.
import { normText, clone } from '../util.js';
import { rulesetOf } from '../content.js';
import { truth } from '../knowledge.js';

const OMIT = new Set(['the','a','an','of','to','at','in','on','and','for','from','with','intact','delivered','deliver','left','leave']);
const words = t => normText(String(t || '')).replace(/'s\b/g,'').split(/[^a-z0-9]+/).map(w=>w.replace(/s$/,'')).filter(w=>w.length>2&&!OMIT.has(w));
const contains = (text, name) => { const a=new Set(words(text)), b=words(name);return b.length>0&&b.every(w=>a.has(w)); };
const CONFIRMS = /\b(?:confirm\w*|sign(?:s|ed|ing|ature|atures|-?off)?|countersign\w*|verif\w*|vouch\w*|witness(?:ed|ing)?\b(?!es)(?=\s+(?:the|it|his|that|their|its)\b|\s*$|[.,;])|witnessed|inspect\w*|attest\w*|receipt)\b/i;
const INQUIRY = /\b(?:about|where|which|whether|who|how|when|ask\w*|learn\w*|find\s+out|rumou?rs?|sightings?|tracks?|trail|lairs?|dens?|nests?)\b/i;
export const confirmsOnly = (o) => ['TALK', 'GET', 'GIVE'].includes(o.verb) && CONFIRMS.test(o.what || '') && !INQUIRY.test(o.what || '');
export const deliveryObjectives = q => (q.objectives||[]).filter(o=>['DELIVER','GIVE'].includes(o.verb)&&o.what&&!confirmsOnly(o));
const cargoMatches = (o,x) => !x.id?.startsWith('obj.slip.') && !(words(x.name).length === 1 && words(o.what).length > 1) && (contains(o.what,x.name)||contains(x.name,o.what));
const under = (s,at,target) => {const seen=new Set();while(at&&!seen.has(at)){if(at===target)return true;seen.add(at);at=s.places[at]?.parent;}return false;};

// Choose the most specific established place named by the objective. Ties are not guessed.
function destination(s,o) {
 if(s.places[o.where])return o.where;
 const choices=Object.values(s.places).map(p=>({p,n:words(p.name).length})).filter(({p,n})=>n&&contains(o.where,p.name));
 const best=Math.max(0,...choices.map(x=>x.n));const top=choices.filter(x=>x.n===best);
 const here=top.filter(x=>under(s,s.scene.at,x.p.id));
 return top.length===1?top[0].p.id:here.length===1?here[0].p.id:null;
}
export function deliveryTarget(s,q,o,to,at=s.scene.at,{drop=false}={}) {
 const dest=destination(s,o);if(!dest||!under(s,at,dest))return false;
 if(drop)return !!to.loc&&under(s,to.loc,dest)&&/\b(?:left|deposited|placed|stacked|leave|deposit|place|stack)\b/i.test(q.desired_end_state||'');
 if(!to.entity||to.entity==='pc'||!s.scene.present.includes(to.entity))return false;
 const target=s.entities[to.entity];if(!target||target.status==='dead')return false;
 const terms=`${o.where||''} ${q.desired_end_state||''}`;
 const named=Object.values(s.entities).filter(e=>e.kind==='npc'&&e.name&&contains(terms,e.name));
 if(named.length)return named.length===1&&named[0].id===target.id;
 const roles=[truth(s,target.id,'occupation')[0]?.o,target.descriptors?.[0]].filter(Boolean);
 return roles.some(role=>contains(terms,role));
}

export function deliveryStatus(q) {
 const missing=deliveryObjectives(q).filter(o=>(q.deliveries||[]).filter(r=>r.objective===(o.id||o.what)).reduce((n,r)=>n+r.qty,0)<(o.qty??1));
 return missing.length?{ok:false,mode:'not_delivered',reason:`delivery not recorded at the agreed recipient/place: ${missing.map(o=>`${o.what} → ${o.where||'the agreed destination'}`).join('; ')}. The original contract is unchanged; no container return is required unless it was part of that contract`,consume:[]}:null;
}

export function deliveryHandover(s,id,to) {
 const x=s?.objects?.[id];if(!x)return false;
 return Object.values(s.quests||{}).some(q=>q.kind==='guild_contract'&&q.status==='active'
  &&(!x.for_quests?.length||x.for_quests.includes(q.id))
  &&deliveryObjectives(q).some(o=>cargoMatches(o,x)&&deliveryTarget(s,q,o,{entity:to})));
}

// Active pre-patch saves may already hold the goods at their recipient, without a receipt event.
// Explicit confirmation there records current physical custody, never an invented historical transfer.
export function confirmDelivery(s,q,emit,quote,seq) {
 if((q.deliveries||[]).length||! /\b(?:confirm|verify|check)\b/i.test(quote||'')
  ||! /\b(?:delivery|delivered|receipt)\b/i.test(quote||'')
  || /\b(?:not|never|tomorrow|later|would|could)\b/i.test(quote||''))return false;
 const allocated=new Map(), pending=[];
 for(const o of deliveryObjectives(q)) {
  let left=o.qty??1;
  for(const x of Object.values(s.objects||{})) {
   if(!left||!x.had_pc||!cargoMatches(o,x)||(x.for_quests?.length&&!x.for_quests.includes(q.id))
    ||!deliveryTarget(s,q,o,x.holder))continue;
   const qty=Math.min(left,(x.qty||1)-(allocated.get(x.id)||0));if(qty<=0)continue;
   pending.push({t:'quest.delivered',d:{id:q.id,receipt:{key:`confirm:${s.turn}:${seq}:${o.id||o.what}:${x.id}`,objective:o.id||o.what,object:x.id,origin:x.delivery_origin||x.id,qty,to:clone(x.holder),at:s.scene.at,turn:s.turn,seq,confirmation:true}}});
   left-=qty;allocated.set(x.id,(allocated.get(x.id)||0)+qty);
  }
  if(left)return false;
 }
 pending.forEach(emit);
 return !deliveryStatus(q);
}

export function cargoProvenance(s,before) {
 const root=before.delivery_origin||before.id;
 const capacity=Math.max(before.delivery_capacity||before.qty||1,...Object.values(s.quests||{}).flatMap(q=>(q.deliveries||[]).filter(r=>r.origin===root).map(r=>r.capacity||0)));
 return {delivery_origin:root,delivery_capacity:capacity};
}

// Called by GIVE/DROP and the authorised conditional GIVE only, never generic object.move.
export function transferCargo(s,content,emit,object,to,qty,seq,{drop=false}={}) {
 const before=clone(object), n=Math.min(qty||before.qty||1,before.qty||1);
 if(rulesetOf(s)<2) { emit({t:'object.moved',d:{id:before.id,to,...(n<(before.qty||1)?{qty:n,split:`${before.id}_${s.turn}`}:{})}});return; }
 const {delivery_origin:root,delivery_capacity:capacity}=cargoProvenance(s,before);
 const partial=n<(before.qty||1);let split=`${before.id}_t${s.turn}_${seq}`;
 for(let i=2;s.objects[split];i++)split=`${before.id}_t${s.turn}_${seq}_${i}`;
 emit({t:'object.moved',d:{id:before.id,to,...(partial?{qty:n,split}:{}),delivery_origin:root,delivery_capacity:capacity}});
 bookDelivery(s, emit, before, to, n, seq, { drop, objectId: partial ? split : before.id });
}

// Also used after a template item has been materialised at its recipient by the existing GIVE handler.
export function bookDelivery(s,emit,before,to,n,seq,{drop=false,objectId=before.id}={}) {
 if(rulesetOf(s)<2)return;
 const {delivery_origin:root,delivery_capacity:capacity}=cargoProvenance(s,before);
 let remaining=n;
 for(const q of Object.values(s.quests||{})) {
  if(q.kind!=='guild_contract'||q.status!=='active'||(before.for_quests?.length&&!before.for_quests.includes(q.id)))continue;
  const used=(q.deliveries||[]).filter(r=>r.origin===root).reduce((sum,r)=>sum+r.qty,0);
  let available=Math.min(remaining,Math.max(0,capacity-used));
  for(const o of deliveryObjectives(q)) {
   if(!cargoMatches(o,before)||!deliveryTarget(s,q,o,to,s.scene.at,{drop}))continue;
   const done=(q.deliveries||[]).filter(r=>r.objective===(o.id||o.what)).reduce((sum,r)=>sum+r.qty,0);
   const count=Math.min(available,Math.max(0,(o.qty??1)-done));if(!count)continue;
   const receipt={key:`${s.turn}:${seq}:${objectId}:${o.id||o.what}`,objective:o.id||o.what,object:objectId,origin:root,capacity,qty:count,to:clone(to),at:s.scene.at,turn:s.turn,seq};
   emit({t:'quest.delivered',d:{id:q.id,receipt}});available-=count;remaining-=count;
  }
  if(remaining<n)break; // an ambiguous cargo is never credited to several contracts
 }
}
