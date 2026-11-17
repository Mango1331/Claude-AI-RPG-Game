// Host-owned typed choices. These are inputs to the existing Engine, never events or model authority.
import { hash32, clone } from './util.js';
import { actionsOf, deriveCharacter } from './derived.js';
import { rulesetOf, skillOf, itemEffectOf } from './content.js';
import { attackAction, skillAction, itemAction, initEncounter, addCombatant, alive } from './combat.js';
import { attackTargetHere, tacticalHere, sideOf } from './v4/scene_handles.js';
import { tradeObject } from './v4/trade.js';
import { restoreOf, restoreEffect, useOf, profileOf, namedSource } from './v4/items.js';
import { stoneActivation } from './v4/growth.js';
import { returnStone } from './v4/living.js';
import { materialise } from './engine.js';
import { Dice } from './rng.js';
import { applyEvent } from './state.js';
import { isGroupCreature } from './delta.js';

const canonical = x => JSON.stringify(x,(_k,v)=>v && typeof v==='object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])) : v);
export const actionInputHash = input => input ? hash32(canonical(input)) : null;
export const actionPrefix = (chat,end=chat.length) => hash32(canonical(chat.slice(0,end).map(m=>({
    user:!!m.is_user,system:!!m.is_system,text:m.mes,swipe:m.swipe_id ?? 0,record:m.extra?.avereth,
}))));
export const actionInputOf = msg => msg?.extra?.avereth_action_input || null;
export const sameActionInput = (a,b) => actionInputHash(a)===actionInputHash(b);
const refusal = reason => ({ok:false,reason});
function previewEncounter(state,content,target) {
    // A known person's delayed profile uses the existing resolver on a private copy. No authoritative
    // event/RNG counter changes, no initiative roll or combat simulation. Names never create an entity.
    const at=clone(state),dice=new Dice(state.rng.seed,state.rng.n);
    const ids = [...new Set([...tacticalHere(state),...Object.keys(state.encounter?.combatants || {})])].filter(id=>id!=='pc' && !isGroupCreature(content,state.entities[id]));
    if (!ids.includes(target)) return null;
    for(const id of ids)if(!at.entities[id].profile && !at.entities[id].sheet)materialise(at,content,dice,e=>applyEvent(at,e),id);
    if(at.encounter) {
        for(const id of ids)if(!at.encounter.combatants[id])addCombatant(at.encounter,at,content,id,sideOf(at,id),null,{c:true});
        return at.encounter;
    }
    return initEncounter(at,content,null,{actor:'pc',target},ids.map(id=>({id,side:sideOf(at,id)})),'preview',{c:true,preview:true});
}
export function lowerActionSelection(selection,state,content) {
    const s=selection;
    if(s.kind==='attack')return {route:'v3',intent:{kind:'attack',skill:s.skill,target:s.target,target_how:'hud',move:s.approach?'closer':null,move_target:s.approach?s.target:null}};
    if(s.kind==='skill')return {route:'v3',intent:{kind:'skill',skill:s.skill,target:s.target || null,dir:s.dir || 'away'}};
    if(s.kind==='move')return {route:'v3',intent:{kind:'move',dir:s.dir,target:s.target}};
    const o=tradeObject(state,content,s.object),fx=o && itemEffectOf(content,o);
    if(fx?.attack)return {route:'v3',intent:{kind:'attack',skill:fx.id,item:o.id,target:s.target,target_how:'hud',move:null,move_target:null}};
    if(state.encounter && restoreOf(content,o))return {route:'v3',intent:{kind:'item',item:o.id}};
    return {route:'v4',commands:[{seq:1,type:'use',object:o.id,qty:1}]};
}
export function validateActionSelection(selection,state,content) {
    const s=selection, fields={attack:['skill','target','approach'],skill:['skill','target','dir'],move:['dir','target'],use:['object','target']};
    if(!s || !fields[s.kind] || Object.keys(s).some(k=>!['id','kind',...fields[s.kind]].includes(k)))return refusal('Unbekannte Aktionsfelder');
    if(typeof s.id!=='string' || !s.id)return refusal('Auswahl-ID fehlt');
    if(state.mode==='creation' || state.entities.pc?.status==='dead')return refusal('Der Charakter kann jetzt keine HUD-Aktion ausführen');
    if(s.approach!==undefined && typeof s.approach!=='boolean')return refusal('Ungültige Annäherung');
    const known=actionsOf(state.entities.pc.sheet,content,rulesetOf(state),state);
    let enc=state.encounter, object;
    if(['attack','skill'].includes(s.kind)) {
        const skill=skillOf(content,s.skill,state);
        if(!known[s.skill] || !skill)return refusal('Diese Fähigkeit ist nicht verfügbar');
        if(!!skill.attack !== (s.kind==='attack'))return refusal('Falscher Fähigkeitstyp');
        if(s.kind==='skill' && !enc)return refusal('Diese Kampffähigkeit benötigt einen laufenden Kampf');
    }
    const itemAttack=s.kind==='use' && itemEffectOf(content,tradeObject(state,content,s.object))?.attack;
    if(s.kind==='attack' || s.kind==='move' || itemAttack) {
        if(typeof s.target!=='string' || !attackTargetHere(state,s.target))return refusal('Das gewählte Ziel ist nicht aktiv anwesend');
        enc=previewEncounter(state,content,s.target);
        if(!enc)return refusal('Für dieses Ziel fehlt noch ein Kampfprofil; Freitext verwenden');
        if(!alive(enc.combatants[s.target]))return refusal('Das Ziel ist nicht mehr kampffähig');
    }
    if(s.kind==='move') {
        if(!state.encounter || !['closer','away'].includes(s.dir))return refusal('Bewegung braucht einen Kampf und eine gültige Richtung');
    }
    if(s.kind==='skill' && s.dir && !['closer','away'].includes(s.dir))return refusal('Ungültige Richtung');
    if(s.kind==='skill' && s.target && !attackTargetHere(state,s.target))return refusal('Ziel der Fähigkeit ist nicht aktiv anwesend');
    if(s.kind==='use') {
        object=tradeObject(state,content,s.object);
        if(!object || object.holder?.entity!=='pc' || object.qty===0)return refusal('Der Gegenstand wird nicht getragen');
        if(!enc && (state.pending_combat || []).length)return refusal('Die beginnende Begegnung zuerst auflösen; Freitext verwenden');
        if(s.target && !itemAttack)return refusal('Diese Nutzung hat kein Angriffsziel');
        const back=returnStone(state,content,object),stone=stoneActivation(state,content,object);
        if(back?.refuse || stone?.refuse)return refusal(back?.refuse || stone.refuse);
        if(!back && !stone && ['stone','passive_stone'].includes(namedSource(content,object)))return refusal('Keine gültige Lernquelle');
        const restore=restoreOf(content,object);
        if(restore && !enc) {
            const sh=state.entities.pc.sheet,d=deriveCharacter(sh,content);
            const r=restoreEffect(content,restore,{level:sh.level,current:{hp:sh.hp,mp:sh.mp,sta:sh.sta},max:{hp:d.maxHp,mp:d.maxMp,sta:d.maxSta}});
            if(r.refused)return refusal(r.refused);
        }
        if(enc && !restore && !itemAttack)return refusal('Diese Nutzung ist während des Kampfes keine verfügbare Kampfaktion');
        if(!restore && !itemAttack && !back && !stone && !['tool','equipment','food','consumable'].includes(useOf(content,object)) && profileOf(content,object)?.kind!=='skill_source')
            return refusal('Diese Anwendung braucht eine Beschreibung im Freitext');
    }
    const mapped=lowerActionSelection(s,state,content);
    let preview={legal:true};
    if(enc && mapped.route==='v3') {
        // Virtual inventory objects are resolved through the same catalog resolver used by .200.
        const at=object && !state.objects[object.id] ? {...state,objects:{...state.objects,[object.id]:object}} : state;
        const ctx={enc,content,state:at,c:true};
        if(mapped.intent.kind==='attack')preview=attackAction(ctx,'pc',s.target,mapped.intent.skill,{...mapped.intent,moveTarget:mapped.intent.move_target,validateOnly:true});
        if(mapped.intent.kind==='skill')preview=skillAction(ctx,'pc',s.skill,{validateOnly:true});
        if(mapped.intent.kind==='item')preview=itemAction(ctx,'pc',mapped.intent,{validateOnly:true});
    }
    return preview.illegal ? refusal(preview.illegal) : {ok:true,mapped,preview};
}
export function availableActions(state,content) {
    if(!state?.entities?.pc?.sheet || state.mode==='creation')return {actions:[],targets:[]};
    const actions=[],targets=tacticalHere(state).filter(id=>id!=='pc' && attackTargetHere(state,id)).map(id=>({id,label:state.encounter?.combatants?.[id]?.label || state.entities[id].name || id}));
    for(const id of Object.keys(actionsOf(state.entities.pc.sheet,content,rulesetOf(state),state))) {
        const skill=skillOf(content,id,state);
        if(skill.attack || state.encounter)actions.push({key:`skill:${id}`,label:skill.name,kind:skill.attack?'attack':'skill',skill:id,needsTarget:!!skill.attack});
    }
    if(state.encounter) for(const dir of ['closer','away'])actions.push({key:`move:${dir}`,kind:'move',dir,label:dir==='closer'?'Näher gehen':'Zurückweichen',needsTarget:true});
    const refs=[...Object.keys(state.objects || {}),...Object.keys(state.entities.pc.sheet.inventory || {}).map(id=>`item.${id}`)];
    for(const ref of refs){const o=tradeObject(state,content,ref);if(o?.holder?.entity==='pc' && o.qty!==0)actions.push({key:`use:${ref}`,kind:'use',object:ref,label:o.name,needsTarget:!!itemEffectOf(content,o)?.attack});}
    return {actions,targets};
}

export function hudCommands(selection) {
    const s=selection;
    const main=s.kind==='use'?{type:'use',object:s.object,qty:1,...(s.target?{target:s.target}:{})}:s.kind==='move'?{type:'move',dir:s.dir,target:s.target}:{type:'use_skill',skill:s.skill,target:s.target || null};
    return s.approach?[{seq:1,type:'move',dir:'closer',target:s.target},{seq:2,...main}]:[{seq:1,...main}];
}
export function reconcileHudPlan(input,commands,binding) {
    if(!Array.isArray(commands) || commands.some(c=>!c || typeof c!=='object' || !Number.isInteger(c.seq) || c.seq<1)
        || new Set(commands.map(c=>c.seq)).size!==commands.length)return refusal('Unvollständige Kommandobindung');
    if(binding?.id!==input.selection.id || binding.decision!=='use' || !Array.isArray(binding.seqs))return refusal('HUD und Freitext sind noch nicht eindeutig verbunden');
    const expected=hudCommands(input.selection),bound=commands.filter(c=>binding.seqs.includes(c.seq));
    if(bound.length!==expected.length || new Set(binding.seqs).size!==expected.length)return refusal('Auswahlbindung fehlt oder ist doppelt');
    for(let i=0;i<expected.length;i++) {
        const {seq,...fields}=expected[i],c=bound[i];
        if(Object.keys(c).some(k=>!['seq','quote','needs',...Object.keys(fields)].includes(k)))return refusal('Unbekannte Felder in der Auswahlbindung');
        if(c.needs!=null && (!Number.isInteger(c.needs) || c.needs>=c.seq || !commands.some(p=>p.seq===c.needs)))return refusal('Ungültige Bedingung');
        if(Object.entries(fields).some(([k,v])=>canonical(c[k]??null)!==canonical(v??null)) || c.targets?.length || c.item || c.area)
            return refusal('Der Plan hat Ziel, Fähigkeit oder Gegenstand der Auswahl verändert');
    }
    if(commands.some(c=>!bound.includes(c) && expected.some(e=>c.type===e.type && (c.skill===e.skill && c.skill || c.object===e.object && c.object || c.type==='move'))))return refusal('Die ausgewählte Aktion steht nochmals im Plan');
    return {ok:true,bound:bound.map(c=>c.seq),commands:clone(commands)};
}
