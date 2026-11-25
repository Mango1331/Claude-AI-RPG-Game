// Host-owned typed choices. These are inputs to the existing Engine, never events or model authority.
import { hash32, clone, BANDS } from './util.js';
import { actionsOf, deriveCharacter } from './derived.js';
import { rulesetOf, skillOf, itemEffectOf } from './content.js';
import { attackAction, skillAction, itemAction, orderedPhase, combatSlot, initEncounter, addCombatant, alive } from './combat.js';
import { attackTargetHere, tacticalHere, sideOf, sceneHandle } from './v4/scene_handles.js';
import { tradeObject } from './v4/trade.js';
import { restoreOf, restoreEffect, useOf, profileOf, namedSource } from './v4/items.js';
import { stoneActivation } from './v4/growth.js';
import { returnStone } from './v4/living.js';
import { materialise } from './engine.js';
import { Dice } from './rng.js';
import { applyEvent } from './state.js';
import { isGroupCreature } from './delta.js';
import { tradeDraft, tradeCommands, boundTradeCommand } from './trade_input.js';
import { previewQuestAcceptance } from './v4/commands.js';

const canonical = x => JSON.stringify(x,(_k,v)=>v && typeof v==='object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])) : v);
export const actionInputHash = input => input ? hash32(canonical(input)) : null;
export const actionPrefix = (chat,end=chat.length) => hash32(canonical(chat.slice(0,end).filter(m=>!m.avereth_inactive && !m.avereth_unplayed).map(m=>({
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
    if(s.kind==='sidestep' || s.kind==='flee')return {route:'v3',intent:{kind:s.kind}};
    if(s.kind==='quest.accept')return {route:'v4',commands:[{seq:1,type:'quest.accept',quest:s.quest}]};
    if(s.kind==='attack')return {route:'v3',intent:{kind:'attack',skill:s.skill,target:s.target,target_how:'hud',move:s.approach?'closer':null,move_target:s.approach?s.target:null}};
    if(s.kind==='skill')return {route:'v3',intent:{kind:'skill',skill:s.skill,target:s.target || null,dir:s.dir || 'away'}};
    if(s.kind==='move')return {route:'v3',intent:{kind:'move',dir:s.dir,target:s.target}};
    const o=tradeObject(state,content,s.object),fx=o && itemEffectOf(content,o);
    if(fx?.attack)return {route:'v3',intent:{kind:'attack',skill:fx.id,item:o.id,target:s.target,target_how:'hud',move:null,move_target:null}};
    if(state.encounter && restoreOf(content,o))return {route:'v3',intent:{kind:'item',item:o.id}};
    return {route:'v4',commands:[{seq:1,type:'use',object:o.id,qty:1}]};
}
function validatePhase(selection,state,content) {
    if (!selection.id || typeof selection.id !== 'string' || Object.keys(selection).some(k => !['id','kind','steps'].includes(k)) ||
        !Array.isArray(selection.steps) || selection.steps.length !== 2 ||
        selection.steps.some(s => !s || !['attack','skill','move','use','sidestep','flee'].includes(s.kind) || s.approach))
        return refusal('Unerlaubte Kombination');
    const target = selection.steps.find(a => a.kind === 'attack' || a.kind === 'use' && a.target)?.target;
    const enc = target ? previewEncounter(state,content,target) : state.encounter;
    if (!state.encounter && enc?.ambush) return refusal('Hinterhalt: Der erste Zug erlaubt eine einzelne Eröffnungsaktion. Wähle nur den Angriff.');
    if (!enc || !state.encounter && !target) return refusal('Eine Kombination braucht einen regulären Kampfzug oder offenen Erstschlag');
    const projected = {...state, encounter:enc};
    const phase = [];
    for (const step of selection.steps) {
        const checked = validateActionSelection(step, projected, content, {ordered:true});
        if (!checked.ok) return checked;
        if (checked.mapped.route !== 'v3') return refusal('Diese Handlung ist kein Kampfakt');
        phase.push(checked.mapped.intent);
    }
    const checked = orderedPhase({enc,content,state:projected,c:true},phase,{preview:true});
    if (checked.illegal) return refusal(checked.illegal);
    const lead = phase.find(a => a.kind === 'attack') || phase.find(a => combatSlot(a,content,state) === 'major') || phase[0];
    const attack = checked.records.find(r => r.kind === 'attack');
    const aimed = selection.steps.findIndex(step=>step.kind==='attack' && step.band);
    if (aimed>=0 && attack?.area_band) phase[aimed].expected_band=attack.area_band;
    return {ok:true,mapped:{route:'v3',intent:{...lead,phase}},preview:{targets:attack && [...new Set(attack.strikes.map(s => s.target))], band:attack?.area_band, costs:checked.records.filter(r=>r.cost).map(r=>r.cost)}};
}

export function validateActionSelection(selection,state,content,{ordered = false} = {}) {
    if (selection?.kind === 'phase') return validatePhase(selection,state,content);
    const s=selection, fields={sidestep:[],flee:[],attack:['skill','target','approach','band'],skill:['skill','target','dir'],move:['dir','target'],use:['object','target'],'quest.accept':['quest']};
    if (s?.kind === 'trade.accept' || s?.kind === 'trade.ask') {
        if (typeof s.id !== 'string' || !s.id) return refusal('Auswahl-ID fehlt');
        const {id, ...choice} = s;
        const draft = tradeDraft(state, content, choice);
        if (!draft.ok) return draft;
        if (canonical(choice) !== canonical(draft.selection)) return refusal('Position, Preis oder Ort hat sich geändert.');
        const commands = tradeCommands(choice).map(c => boundTradeCommand(choice, c, draft.label));
        return {ok:true, mapped:{route:'v4',commands}, preview:{label:draft.label}};
    }
    if(!s || !Object.hasOwn(fields,s.kind) || Object.keys(s).some(k=>!['id','kind',...fields[s.kind]].includes(k)))return refusal('Unbekannte Aktionsfelder');
    if(typeof s.id!=='string' || !s.id)return refusal('Auswahl-ID fehlt');
    if(state.mode==='creation' || state.entities.pc?.status==='dead')return refusal('Der Charakter kann jetzt keine HUD-Aktion ausführen');
    if(s.approach!==undefined && typeof s.approach!=='boolean')return refusal('Ungültige Annäherung');
    if(s.kind==='quest.accept') {
        const q=state.quests[s.quest];
        if(state.encounter || state.pending_combat?.length || !q || q.kind!=='guild_contract' || q.status!=='listed')return refusal('Dieser Vertrag ist hier nicht mehr annehmbar');
        // Use the authoritative handler on a private copy: membership, branch, current board and duplicate hunts.
        const result=previewQuestAcceptance(state,content,s.quest);
        return result.status==='resolved'?{ok:true,mapped:lowerActionSelection(s,state,content),preview:{legal:true}}:refusal(result.reason || 'Vertrag nicht verfügbar');
    }
    const known=actionsOf(state.entities.pc.sheet,content,rulesetOf(state),state);
    let enc=state.encounter, object;
    if(['attack','skill'].includes(s.kind)) {
        const skill=skillOf(content,s.skill,state);
        if(!known[s.skill] || !skill)return refusal('Diese Fähigkeit ist nicht verfügbar');
        if(!!skill.attack !== (s.kind==='attack'))return refusal('Falscher Fähigkeitstyp');
        if(s.kind==='skill' && !enc)return refusal('Diese Kampffähigkeit benötigt einen laufenden Kampf');
    }
    const itemAttack=s.kind==='use' && itemEffectOf(content,tradeObject(state,content,s.object))?.attack;
    if(s.kind==='attack' || (s.kind==='move' && !(s.target==null && (ordered || s.dir==='away'))) || itemAttack) {
        if(typeof s.target!=='string' || !attackTargetHere(state,s.target))return refusal('Das gewählte Ziel ist nicht aktiv anwesend');
        enc=previewEncounter(state,content,s.target);
        if(!enc)return refusal('Für dieses Ziel fehlt noch ein Kampfprofil; Freitext verwenden');
        if(!alive(enc.combatants[s.target]))return refusal('Das Ziel ist nicht mehr kampffähig');
    }
    if (['sidestep','flee'].includes(s.kind) && !state.encounter) return refusal('Diese Aktion benötigt einen Kampf');
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
    if(enc && mapped.route==='v3' && !ordered) {
        // Virtual inventory objects are resolved through the same catalog resolver used by .200.
        const at=object && !state.objects[object.id] ? {...state,objects:{...state.objects,[object.id]:object}} : state;
        const ctx={enc,content,state:at,c:true};
        if(mapped.intent.kind==='attack')preview=attackAction(ctx,'pc',s.target,mapped.intent.skill,{...mapped.intent,moveTarget:mapped.intent.move_target,validateOnly:true});
        if(mapped.intent.kind==='skill')preview=skillAction(ctx,'pc',s.skill,{validateOnly:true});
        if(mapped.intent.kind==='item')preview=itemAction(ctx,'pc',mapped.intent,{validateOnly:true});
    }
    if(s.band!==undefined) {
        const sk=skillOf(content,s.skill,state),band=enc?.combatants?.[s.target]?.current?.band;
        const after=s.approach?BANDS[Math.max(0,BANDS.indexOf(band)-1)]:band;
        if(!sk?.effects?.some(e=>e.kind==='area' && e.shape==='target_band') || !BANDS.includes(s.band) || after!==s.band)return refusal('Das gewählte Flächenband hat sich geändert; erneut wählen');
    }
    return preview.illegal ? refusal(preview.illegal) : {ok:true,mapped,preview};
}
export const actionLabel = (state,content,id) => state.encounter?.combatants?.[id]?.label || sceneHandle(state,content,id);
export function availableActions(state,content) {
    if(!state?.entities?.pc?.sheet || state.mode==='creation')return {actions:[],targets:[],tactical:false};
    const ids=[...new Set([...tacticalHere(state),...Object.keys(state.encounter?.combatants || {})])];
    const targets=ids.filter(id=>id!=='pc' && attackTargetHere(state,id)).map(id=>({id,label:actionLabel(state,content,id),band:state.encounter?.combatants?.[id]?.current?.band || state.scene.positions?.[id]?.band,hostile:sideOf(state,id)==='hostile'}));
    const tactical=!!state.encounter || !!state.pending_combat?.length || targets.some(t=>t.hostile),actions=[];
    for(const id of Object.keys(actionsOf(state.entities.pc.sheet,content,rulesetOf(state),state))) {
        const skill=skillOf(content,id,state);
        if(skill.attack || state.encounter || tactical && combatSlot({kind:'skill',skill:id},content,state)==='minor')actions.push({key:`skill:${id}`,label:skill.name,kind:skill.attack?'attack':'skill',skill:id,needsTarget:!!skill.attack,area:skill.effects?.some(e=>e.kind==='area' && e.shape==='target_band')});
    }
    if (tactical) actions.push({key:'sidestep',kind:'sidestep',label:'Ausweichen (−25 % Distanzschaden bis zum nächsten Zug)'});
    if (state.encounter) actions.push({key:'flee',kind:'flee',label:'Flucht (ganzer Zug)'});
    if(tactical) for(const dir of ['closer','away'])actions.push({key:`move:${dir}`,kind:'move',dir,label:dir==='closer'?'Näher gehen':'Zurückweichen',needsTarget:dir==='closer'});
    const refs=[...Object.keys(state.objects || {}),...Object.keys(state.entities.pc.sheet.inventory || {}).map(id=>`item.${id}`)],seen=new Set();
    for(const ref of refs){
        const o=tradeObject(state,content,ref);
        if(!o || o.holder?.entity!=='pc' || o.qty===0 || seen.has(o.id))continue;
        seen.add(o.id);
        const attack=itemEffectOf(content,o)?.attack,restore=restoreOf(content,o);
        // Generic USE accepts narrative tools/resources too; it is not an actionable item menu.
        if(!attack && !restore && (state.encounter || !returnStone(state,content,o) && !stoneActivation(state,content,o)))continue;
        actions.push({key:`use:${o.id}`,kind:'use',object:o.id,label:o.name,needsTarget:!!attack});
    }
    return {actions,targets,tactical};
}

/** Band choice is only a view of the existing target-band attack, never a new AoE rule. */
export function actionBands(selection,state,content) {
    const a=availableActions(state,content),out=[];
    for(const t of a.targets.filter(t=>t.hostile)) {
        const band=selection.approach?BANDS[Math.max(0,BANDS.indexOf(t.band)-1)]:t.band;
        if(out.some(x=>x.band===band))continue;
        const check=validateActionSelection({...selection,target:t.id,band},state,content);
        if(check.ok)out.push({band,target:t.id,targets:check.preview?.targets || [t.id]});
    }
    return out.sort((a,b)=>BANDS.indexOf(a.band)-BANDS.indexOf(b.band));
}

/** Accept one unambiguous misplaced binding, without inventing any part of the player's plan. */
export function normalizeHudBinding(value) {
    const nested=value?.commands?.filter(c=>c && Object.hasOwn(c,'hud_binding')) || [];
    if(Object.hasOwn(value || {},'hud_binding') || nested.length!==1)return {value,normalized:false};
    const binding=nested[0].hud_binding;
    if(!binding || !Array.isArray(binding.seqs) || !binding.seqs.includes(nested[0].seq))return {value,normalized:false};
    const copy=clone(value);copy.hud_binding=copy.commands.find(c=>Object.hasOwn(c,'hud_binding')).hud_binding;
    for(const c of copy.commands)delete c.hud_binding;
    return {value:copy,normalized:true};
}

export function hudCommands(selection) {
    const s=selection;
    if (s.kind === 'phase') return s.steps.flatMap(hudCommands).map((c,i)=>({...c,seq:i+1}));
    if (s.kind === 'sidestep' || s.kind === 'flee') return [{seq:1,type:s.kind}];
    if (s.kind === 'trade.ask' || s.kind === 'trade.accept') return tradeCommands(s);
    const main=s.kind==='quest.accept'?{type:'quest.accept',quest:s.quest}:s.kind==='use'?{type:'use',object:s.object,qty:1,...(s.target?{target:s.target}:{})}:s.kind==='move'?{type:'move',dir:s.dir,target:s.target}:{type:'use_skill',skill:s.skill,target:s.target || null};
    return s.approach?[{seq:1,type:'move',dir:'closer',target:s.target},{seq:2,...main}]:[{seq:1,...main}];
}
export function reconcileHudPlan(input,commands,binding) {
    if(!Array.isArray(commands) || commands.some(c=>!c || typeof c!=='object' || !Number.isInteger(c.seq) || c.seq<1)
        || new Set(commands.map(c=>c.seq)).size!==commands.length)return refusal('Unvollständige Kommandobindung');
    if (binding?.decision === 'conflict' && binding.id === input.selection.id && Array.isArray(binding.seqs) && !binding.seqs.length &&
        input.selection.kind === 'attack' && !input.selection.approach && commands.length === 1) {
        const c = commands[0], words = String(input.text || '').trim().replace(/^\*|\*$/g,'').trim();
        const after = /^after (?:the|my) (?:spell|attack|shot|strike)\s*,?\s*i (?:jump|step|move|hop) (?:back|backward|backwards)(?: to (?:create|make) (?:some )?(?:space|distance))?[.!]?$/i;
        const before = /^before (?:the|my) (?:spell|attack|shot|strike)\s*,?\s*i (?:jump|step|move|hop) (?:back|backward|backwards)[.!]?$/i;
        if (c.type==='move' && c.dir==='away' && c.target==null && c.needs==null && c.quote?.trim()===input.text.trim() &&
            Object.keys(c).every(k=>['seq','type','dir','target','quote'].includes(k)) && (after.test(words) || before.test(words))) {
            const minor={kind:'move',id:input.selection.id+'-move',dir:'away',target:null};
            return {ok:true,bound:[],commands,phase:{kind:'phase',id:input.selection.id,steps:after.test(words)?[input.selection,minor]:[minor,input.selection]}};
        }
    }
    if(binding?.id!==input.selection.id || binding.decision!=='use' || !Array.isArray(binding.seqs))return refusal('HUD und Freitext sind noch nicht eindeutig verbunden');
    const expected=hudCommands(input.selection),bound=commands.filter(c=>binding.seqs.includes(c.seq));
    if(bound.length!==expected.length || binding.seqs.length!==expected.length || new Set(binding.seqs).size!==expected.length)return refusal('Auswahlbindung fehlt oder ist doppelt');
    for(let i=0;i<expected.length;i++) {
        const {seq,...fields}=expected[i],c=bound[i];
        if(Object.keys(c).some(k=>!['seq','quote','needs',...Object.keys(fields)].includes(k)))return refusal('Unbekannte Felder in der Auswahlbindung');
        if(c.needs!=null && (!Number.isInteger(c.needs) || c.needs>=c.seq || !commands.some(p=>p.seq===c.needs)))return refusal('Ungültige Bedingung');
        if(Object.entries(fields).some(([k,v])=>canonical(c[k]??null)!==canonical(v??null)) || c.targets?.length || c.item || c.area)
            return refusal('Der Plan hat Ziel, Fähigkeit oder Gegenstand der Auswahl verändert');
    }
    // One trade per structured input. Extra speech and travel can accompany a price enquiry;
    // an extra economic command would grant authority independent of the displayed choice.
    if (input.selection.kind.startsWith('trade.') && commands.some(c => !bound.includes(c)
        && ['buy','sell','pay','give','drop','take','offer.accept','guild.register'].includes(c.type)))
        return refusal('Zusätzlichen Handel als eigene freie Eingabe klären.');
    if(commands.some(c=>!bound.includes(c) && expected.some(e=>c.type===e.type && (c.skill===e.skill && c.skill || c.object===e.object && c.object || c.type==='move'))))return refusal('Die ausgewählte Aktion steht nochmals im Plan');
    if (input.selection.kind === 'phase' && commands.some(c=>!bound.includes(c) || c.needs!=null))
        return refusal('Zusatzhandlung und gewählte Kampffolge getrennt klären');
    if (input.selection.kind === 'attack' && !input.selection.approach && bound.length === 1 && commands.length === 2) {
        const c = commands.find(x=>x!==bound[0]);
        if (c.type === 'move' && c.needs==null && bound[0].needs==null && typeof c.quote==='string' && c.quote.trim() && input.text.includes(c.quote) && ['closer','away'].includes(c.dir)) {
            const move={id:input.selection.id+'-move',kind:'move',dir:c.dir,target:c.target ?? null};
            return {ok:true,bound:[bound[0].seq],commands,phase:{id:input.selection.id,kind:'phase',steps:c.seq<bound[0].seq?[move,input.selection]:[input.selection,move]}};
        }
    }
    return {ok:true,bound:bound.map(c=>c.seq),commands:clone(commands)};
}
