import { fixtures } from '../../architecture201/fixtures.mjs';
// Inputs are historical; ALL GM answers in this arc except the two malformed
// GO proposals are controlled synthetic responses. This does not test language ability.
export const guildInput='*i walk into the city ahead of me and make my way over to the adventurers guild*';
export const guildResponse={op:'resolve',commands:[{seq:1,type:'go',quote:guildInput.slice(1,-1),to:{ref:'loc.alderwatch.guild_hall'}}]};
export const guild='loc.alderwatch.guild_hall';
export function courseBase({injured=true}={}) {
 const chat=structuredClone(fixtures().find(f=>f.name==='forest200').base);
 // Explicit synthetic precondition, on a COPY. No original fixture is edited.
 if(injured)chat.findLast(m=>m.extra?.avereth?.events).extra.avereth.events.push({t:'resource.changed',d:{id:'pc',resource:'hp',value:1,why:'Synthetic potion-use control'}});
 return chat;
}
const finish=(at,narration,deltas=[],expected={})=>({op:'finish',narration,world:{scene:at,expected,deltas}});
const go=(input,to)=>({op:'resolve',commands:[{seq:1,type:'go',quote:input.replaceAll('*',''),to}]});
const arrive=(at,narration)=>finish(at,narration,[{seq:1,type:'arrive',at,forced_by:null,with:null}],{1:{arrived:true,at,with:null,met:null}});
export function courseSteps() {return [
 {name:'guild',input:guildInput,origin:'Alpha-2 failed personal run: original input and first GO response (SHA256 88473ff644d59a292042d412a93f64dd746ca39f56d9642f3e4e9f699872ba3c)',answers:()=>[
  structuredClone(guildResponse),{...arrive(guild,'Alaric entered Alderwatch and arrived inside the Adventurers Guild hall. Tam stood behind the counter, sorting papers. "I am Tam, the clerk," he said.'),world:{...arrive(guild,'').world,deltas:[...arrive(guild,'').world.deltas,
   {seq:2,type:'person.new',ref:'tam',name:'Tam',role:'Guild clerk',desc:['ink-stained fingers'],armed:null,present:true,relevant:true,threat:false,at:guild,band:'SHORT',distinct_from:null}]}}]},
 {name:'promise',input:'no worries the drink is on me. ill only expect a few good tips and tricks from a veteran guild worker. haha *i say laughing*',origin:'User 02, 05.11.2026 original user row 56; adapted preceding scene, no invented completed purchase',answers:s=>[
  {...finish(guild,'Tam tapped a battered map with one ink-stained finger.'),speech:[{id:'path',speaker:tam(s),to:['pc'],text:'Next time you return, I will show you the safer path to the forest.',promise:true}]}]},
 {name:'gift',input:'Do you have a healing potion you could spare?',origin:'Synthetic NPC initiative / existing consumable control',answers:s=>[
  finish(guild,'Tam took a healing potion from a drawer and handed it to Alaric as a gift.',[
   {seq:1,type:'object.new',name:'healing potion',kind:'item',qty:1,holder:tam(s),effect:'heal',unit:null,for_quest:null,in:null,teaches:null},
   {seq:2,type:'object.move',object:{new:'healing potion'},qty:1,to:'pc'}])]},
 {name:'use',input:'I drink the healing potion.',origin:'Synthetic supported mechanical action, including canonical-reference alias',answers:s=>[
  {op:'resolve',commands:[{seq:1,type:'use',quote:'I drink the healing potion.',object:{ref:potion(s).id},qty:1}]},
  finish(guild,'Alaric drank the healing potion. Its warmth eased his wounds; the empty vial held no further dose.')]},
 {name:'leave',input:'I go outside into Alderwatch.',origin:'Synthetic known movement',answers:()=>[go('I go outside into Alderwatch.','loc.alderwatch'),arrive('loc.alderwatch','Alaric left the Guild and arrived in Alderwatch. Tam stayed behind his counter.')]},
 {name:'streets',input:'I look at the streets.',origin:'Synthetic ordinary observation; no mechanical success',answers:()=>[finish('loc.alderwatch','Sunlight lay across the cobbles. Voices drifted from the open market.')]},
 {name:'return',input:'I return to the Guild hall.',origin:'Synthetic return to an established place and person',answers:s=>{
  const a=arrive(guild,'Alaric arrived inside the Guild hall again. Tam stood behind the counter, looking up from his papers.');
  a.world.deltas.push({seq:2,type:'enter',who:tam(s),evidence:'Tam stood behind the counter, looking up from his papers.'});return[go('I return to the Guild hall.',guild),a];}},
 {name:'recall',input:'What did you want to show me?',origin:'Synthetic recall probe; original promise prose has fallen outside the last six messages',answers:s=>{
  const th=Object.values(s.threads).find(t=>t.text.includes('safer path'));
  return[finish(guild,'Tam unfolded his map. "The safer path to the forest, as promised," he said, pointing out the marked route.',[
   {seq:1,type:'thread',id:th.id,text:th.text,kind:'promise',status:'resolved',resolution:'Tam showed Alaric the safer forest path on his map.',who:th.who}])];}},
 ];}
export function tam(s){return Object.values(s.entities).find(n=>n.name==='Tam')?.id;}
export function potion(s){return Object.values(s.objects).find(o=>o.name==='healing potion'&&o.holder?.entity==='pc');}
