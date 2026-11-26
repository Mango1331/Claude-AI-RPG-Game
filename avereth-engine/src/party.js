import { allyAssets } from './v4/surrender.js';
import { profileOf, restoreOf, restoreEffect, rankRefusal, freeObjectId } from './v4/items.js';
import { claim, payClaim, vestQuest } from './party_rewards.js';
import { deriveCharacter } from './derived.js';
import { hash32 } from './util.js';
import { findQuote, moneyLiteral } from './v4/finance_evidence.js';

export const membersOf = s => Object.values(s.party?.members || {});
export const following = s => membersOf(s).filter(m => m.mode === 'follow' && s.scene.present.includes(m.who) && s.entities[m.who]?.status !== 'dead');
export const fighters = s => following(s).filter(m => m.combat && s.entities[m.who].sheet);
export const agreementsOf = s => Object.values(s.party?.agreements || {});
export const claimsOf = s => Object.values(s.party?.claims || {});
const yes = /\b(?:yes|sure|agreed|deal|all right|okay|i accept|i agree|count me in|i(?:'ll| will) (?:come|join|help|go with))\b/i;
const no = /\b(?:no deal|no thanks|i (?:refuse|decline|won't|will not|cannot|can't)|not (?:coming|going|joining)|instead|but only|on condition)\b/i;
const together = /\b(?:together|join|team up|come with|go with|travel with|fight with|help (?:me|you)|two of us|with (?:me|you)|half each|split|share|partner|companion)\b/i;
const escapedName = name => String(name || '').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// A quote belongs to one paragraph of dialogue. A named tag or the speaker's
// own introduction establishes identity, never a name addressed in the speech.
function evidenceOf(s, who, source, words, actor) {
    const at = findQuote(source, words);
    if (at.state !== 'found') return null;
    if (actor === 'pc') return source;
    const previous = source.lastIndexOf('\n\n', at.start);
    const next = source.indexOf('\n\n', at.end);
    const paragraph = source.slice(previous < 0 ? 0 : previous + 2, next < 0 ? undefined : next);
    const outside = paragraph.replace(/"[^"]*"|“[^”]*”/g,' ');
    const names = s.scene.present.filter(id => {
        const n = escapedName(s.entities[id]?.name);
        return n && (new RegExp('\\b'+n+"(?:'s|’s|\\b)",'i').test(outside)
            || new RegExp("\\b(?:I am|I'm|I’m|name is) "+n+'\\b','i').test(paragraph));
    });
    // Prefer an explicit speech tag to a name merely mentioned in narration.
    const tagged = names.filter(id => new RegExp('\\b'+escapedName(s.entities[id].name)+'\\s+(?:said|says|offers?|offered|replied|asks?|agrees?|accepts?|declines?|refuses?|answers?|calls?|tells?)\\b','i').test(outside));
    const introduced = names.filter(id => new RegExp("\\b(?:I am|I'm|I’m|name is) "+escapedName(s.entities[id].name)+'\\b','i').test(paragraph));
    const owners = tagged.length ? tagged : introduced.length ? introduced : names;
    if (owners.length !== 1 || owners[0] !== who) return null;
    const speech = [...paragraph.matchAll(/["“]([^"”]+)["”]/g)].find(m => m[1].includes(words));
    return speech ? speech[1] : paragraph;
}

function termsFrom(s, content, c, words, actor) {
    if (c.quest && s.quests[c.quest]?.status !== 'active') return null;
    const terms = { quest:c.quest || null, combat:c.combat === true, text:c.quote };
    if (terms.combat && !together.test(words) && !/\b(?:fight|battle|guard|protect|defend)\b/i.test(words)) return null;
    const half = /\b(?:half each|halves|half (?:of|the)|fifty.fifty|split (?:it |the (?:pay|reward|money) )?(?:evenly|equally)|equal shares)\b/i.test(words);
    if (c.share === 'half' && (!half || !terms.quest)) return null;
    if (half && c.share !== 'half' && c.quest && !c.loot) return null;
    if (c.share === 'half') terms.half = true;
    if (c.amount != null) {
        const m = moneyLiteral(words, c.money || '', { content });
        if (!c.quest || m.cp !== c.amount || !Number.isSafeInteger(c.amount) || c.amount <= 0 || terms.half) return null;
        terms.cp = c.amount;
    }
    if (c.loot != null) {
        if (!['item','proceeds'].includes(c.loot) || !c.goods?.trim() ||
            !words.toLowerCase().includes(c.goods.toLowerCase())) return null;
        if (c.loot === 'proceeds' && (!half || !/\b(?:sale|sell|proceeds)\b/i.test(words))) return null;
        if (c.loot === 'item' && !/\b(?:keep|take|get|receive|yours|mine|give)\b/i.test(words)) return null;
        const ownWords = actor === 'pc' ? /\b(?:you (?:may |can |will |shall )?(?:keep|take|get|receive|have)|yours|give you|your (?:half|share))\b/i :
            /\b(?:I (?:may |can |will |shall )?(?:keep|take|get|receive|have)|mine|give me|my (?:half|share))\b/i;
        if (!ownWords.test(words) && !(c.loot==='proceeds' && half && /\b(?:split|share|half each)\b/i.test(words))) return null;
        terms.loot = {kind:c.loot, goods:c.goods.trim().toLowerCase()};
    }
    if (c.due != null) {
        if (!terms.cp || !['advance','partial'].includes(c.due) ||
            !(c.due === 'advance' ? /\b(?:advance|up front|upfront)\b/i : /\b(?:partial|even if|part of the work)\b/i).test(words)) return null;
        terms.due = c.due;
    }
    return terms;
}

// Name the already worn individual instance once. Its original stats and training stay on the sheet.
export function bindPartyEquipment(s,who,emit) {
    const sheet=s.entities[who]?.sheet;
    for(const [slot,gear] of Object.entries(sheet?.equipment || {})) {
        if (!gear || typeof gear!=='object' || gear.object) continue;
        const id=freeObjectId(s,'obj.'+who+'.'+slot);
        emit({t:'object.created',d:{object:{id,kind:'item',name:gear.name,qty:1,holder:{entity:who},
            profile:{...gear,kind:'gear'},source:{how:'equipped',from:who}}}});
        emit({t:'item.equipped',d:{id:who,slot,item:{...gear,object:id}}});
    }
}

export function partyDecision(s, content, command, source, actor, emit, contractReady) {
    const c = command, who = c.who, person = s.entities[who];
    const failure = reason => ({status:'clarify',reason,line:'PARTY — '+reason});
    if (person?.kind !== 'npc' || person.status === 'dead' || !s.scene.present.includes(who)) return failure('The named living partner must be present.');
    const words = evidenceOf(s, who, source, c.quote, actor);
    if (!words) return failure('The decision needs words from the identified speaker.');
    const member = s.party?.members?.[who];
    const open = agreementsOf(s).filter(a => a.who === who && a.phase === 'open');
    let agreement = c.agreement ? s.party?.agreements?.[c.agreement] : open.length === 1 ? open[0] : null;
    const sourceRef = { actor, quote:c.quote, turn:s.turn, at:s.scene.at };
    const memberEvent = (mode, extras={}) => emit({t:'party.member',d:{...member,who,mode,at:s.scene.at,source:sourceRef,previous:member?.revision || 0, ...extras}});
    if (c.act === 'offer') {
        if ((!together.test(c.quote) && !member) || no.test(c.quote)) return failure('Quote the specific voluntary offer.');
        const terms = termsFrom(s, content, c, c.quote, actor);
        if (!terms) return failure('The work and compensation must match the quoted terms.');
        const id = 'party.'+who+'.'+s.turn+'.'+hash32(JSON.stringify([actor,c.seq,c.quote]));
        if (s.party?.agreements?.[id]) return failure('Offer already recorded.');
        emit({t:'party.agreement',d:{id,who,phase:'open',terms,proposer:actor,source:sourceRef,previous:0}});
    } else if (['accept','decline'].includes(c.act)) {
        if (!agreement || agreement.who !== who || agreement.phase !== 'open' || agreement.proposer === actor) return failure('Identify one current offer from the other party.');
        if (c.act === 'accept' ? (!yes.test(c.quote) || no.test(words) || /\b(?:if|unless|except|but only|provided that|instead)\b/i.test(words) || /\b(?:instead|only (?:pay|give)|on condition)\b/i.test(words)) : !no.test(c.quote)) return failure('Quote a definite response to the unchanged terms.');
        const accepts = c.act === 'accept';
        if (accepts && agreement.terms.quest) {
            const q = s.quests[agreement.terms.quest];
            if (!q || q.status !== 'active') return failure('Quest is no longer active.');
            const cost = a => a.terms.half ? Math.floor(q.payout_cp/2) : a.terms.cp || 0;
            const others = membersOf(s).filter(m => m.who !== who).map(m=>s.party.agreements[m.agreement]).filter(a=>a?.terms.quest === q.id);
            const owed = claimsOf(s).filter(r => r.source === q.id && !others.some(a=>a.id === r.agreement));
            if (owed.reduce((n,r)=>n+r.amount,0) + others.reduce((sum,a)=>sum+cost(a),cost(agreement)) > q.payout_cp) return failure('The promised shares exceed this reward.');
        }
        if (accepts && agreement.terms.loot && membersOf(s).some(m => m.who !== who && m.mode !== 'left' &&
            s.party.agreements[m.agreement]?.terms.loot?.goods === agreement.terms.loot.goods))
            return failure('This loot has already been promised.');
        emit({t:'party.agreement',d:{...agreement,phase:accepts?'accepted':'declined',answer:sourceRef,previous:agreement.revision}});
        if (accepts) {
            memberEvent('follow',{agreement:agreement.id,combat:agreement.terms.combat});
            if (agreement.terms.combat) bindPartyEquipment(s,who,emit);
            if (agreement.terms.due === 'advance') {
                const row = claim(s,emit,agreement,agreement.terms.quest,agreement.terms.cp);
                payClaim(s,emit,row,row.amount);
            }
        }
    } else if (['equip','use','give'].includes(c.act)) {
        if (actor !== who || !member || member.mode==='left' || s.encounter || !person.sheet)
            return failure('Personal equipment decisions require the present owner outside combat.');
        const asset=allyAssets(s,content,who).find(a=>a.object===c.object);
        const qty=c.qty ?? 1;
        if (!asset || asset.object==='coin' || !Number.isSafeInteger(qty) || qty<=0 || asset.qty<qty ||
            !words.toLowerCase().includes(asset.name.toLowerCase()) || no.test(words) ||
            /\b(?:if|unless|might|would|could)\b|\?/i.test(words)) return failure('Quote the actual use of a held item.');
        const bag=asset.ref ? s.objects[asset.ref] : content.items.get(asset.template);
        if (c.act==='equip') {
            const p=bag && (profileOf(content,bag) || bag);
            if (!/\b(?:equip|wear|wield|put on|ready)\b/i.test(words) || !['armor','weapon'].includes(p?.slot) ||
                rankRefusal(content,person.sheet.level,p) || qty!==1) return failure('No usable equipment choice.');
            const old=person.sheet.equipment[p.slot];
            if (asset.slot || asset.ref && old?.object===asset.ref) return failure('Already equipped.');
            if (asset.template) emit({t:'item.changed',d:{id:who,item:asset.template,qty:-1,why:'equipped'}});
            if (typeof old==='string') emit({t:'item.changed',d:{id:who,item:old,qty:1,why:'unequipped'}});
            else if (old && !old.object) {
                const gear=old;
                if (gear) emit({t:'object.created',d:{object:{id:freeObjectId(s,'obj.'+who+'.'+p.slot),kind:'item',name:gear.name,
                    qty:1,holder:{entity:who},profile:{...gear,kind:'gear'},source:{how:'unequipped',from:who}}}});
            }
            let equippedRef=asset.ref;
            if (asset.ref && asset.qty>1) {
                equippedRef=freeObjectId(s,asset.ref+'.equipped');
                emit({t:'object.moved',d:{id:asset.ref,qty:1,split:equippedRef,to:{entity:who}}});
            }
            emit({t:'item.equipped',d:{id:who,slot:p.slot,item:equippedRef ? {...p,id:equippedRef,object:equippedRef,name:bag.name}:asset.template}});
        } else if (c.act==='use') {
            if (!/\b(?:drink|consume|use|take|swallow)\b/i.test(words) || qty!==1 || asset.slot) return failure('Quote one actual use.');
            const sh=person.sheet,d=deriveCharacter(sh,content),effect=restoreOf(content,bag);
            if (!effect) return failure('This item has no recovery effect.');
            const r=restoreEffect(content,effect,{level:sh.level,current:sh,max:{hp:d.maxHp,mp:d.maxMp,sta:d.maxSta}});
            if (r.refused) return failure(r.refused);
            emit(asset.ref ? {t:'object.consumed',d:{id:asset.ref,qty:1,by:who}} : {t:'item.changed',d:{id:who,item:asset.template,qty:-1,why:'used'}});
            emit({t:'resource.changed',d:{id:who,resource:r.resource,value:r.after,why:asset.name}});
        } else {
            const recipient=c.target;
            const other=recipient==='pc'?s.entities.pc:s.scene.present.includes(recipient)?s.entities[recipient]:null;
            if (!other || other.status==='dead' || recipient===who || !/\b(?:give|hand|pass)\b/i.test(words) ||
                !(words.toLowerCase().includes(other.name.toLowerCase()) || recipient==='pc' && /\byou\b/i.test(words)) ||
                qty!==1 && !words.includes(String(qty))) return failure('Identify the actual recipient and quantity.');
            if (asset.slot) emit({t:'item.equipped',d:{id:who,slot:asset.slot,item:null}});
            if (asset.ref) emit({t:'object.moved',d:{id:asset.ref,to:{entity:recipient},...(qty<asset.qty?{qty,split:freeObjectId(s,asset.ref+'.part')}:{})}});
            else if ((asset.template || asset.wornTemplate) && other.sheet) {
                if (asset.template) emit({t:'item.changed',d:{id:who,item:asset.template,qty:-qty}});
                emit({t:'item.changed',d:{id:recipient,item:asset.template || asset.wornTemplate,qty}});
            } else {
                if (asset.template) emit({t:'item.changed',d:{id:who,item:asset.template,qty:-qty}});
                emit({t:'object.created',d:{object:{id:freeObjectId(s,'obj.'+who+'.given'),kind:'item',name:asset.name,qty,
                    holder:{entity:recipient},...(asset.gear?{profile:{...asset.gear,kind:'gear'}}:{}),source:{how:'given',from:who}}}});
            }
        }
    } else if (c.act === 'pay') {
        const row = s.party?.claims?.[c.claim];
        if (actor !== 'pc' || !row || who !== row.who || !/\b(?:pay|give|settle|hand)\b/i.test(words) ||
            moneyLiteral(words,c.money,{content}).cp !== c.amount ||
            !payClaim(s,emit,row,c.amount)) return failure('Identify the due claim, recipient and actual amount to pay.');
    } else if (c.act==='coordinate') {
        if (!member || (!member.combat && !['watch','rest'].includes(c.priority)) || member.mode!=='follow') return failure('Only a present combat partner can coordinate.');
        const kinds={target:/\b(?:target|attack|shoot|take on|focus)\b/i,protect:/\b(?:guard|cover|protect|shield|keep.+off|defend)\b/i,independent:/\b(?:independent|own|your call|freely)\b/i,front:/\b(?:front|point|ahead|lead)\b/i,rear:/\b(?:rear|behind|back)\b/i,watch:/\b(?:watch|lookout|sentry)\b/i,rest:/\b(?:rest|sleep|stand down)\b/i};
        const vocative = /^([^,!?".]{1,50}),/.exec(c.quote);
        if (actor==='pc' && vocative && s.scene.present.some(id=>id!==who && s.entities[id]?.name?.toLowerCase()===vocative[1].trim().toLowerCase()))
            return failure('The addressed person differs from the requested actor.');
        if (!kinds[c.priority]?.test(c.quote) || no.test(words)) return failure('Quote the tactical request or decision.');
        if (['target','protect'].includes(c.priority) && (c.target!=='pc' && !s.scene.present.includes(c.target))) return failure('Identify the present target.');
        if (c.priority==='target' || c.priority==='protect') {
            const labels=[s.entities[c.target]?.name,s.encounter?.combatants[c.target]?.label,c.target==='pc'?'me':null].filter(Boolean);
            if (!labels.some(name=>new RegExp('(^|[^a-z])'+escapedName(name)+'(?=$|[^a-z])','i').test(c.quote)))
                return failure('Quote the identified target of the request.');
        }
        const changes=['watch','rest'].includes(c.priority) ? {watch:c.priority==='watch'} : ['front','rear'].includes(c.priority) ? {formation:c.priority} : {priority:{kind:c.priority,target:c.target || null}};
        memberEvent(member.mode,changes);
    } else {
        if (!member || member.mode==='left') return failure('No active membership.');
        const actions = {wait:/\b(?:wait|stay|hold here)\b/i,follow:/\b(?:follow|come|rejoin|together)\b/i,leave:/\b(?:leave|quit|part ways|go alone|split up|dismiss|on my own)\b/i};
        if (!actions[c.act]?.test(c.quote)) return failure('Quote the change of travel arrangement.');
        const q=s.quests[s.party.agreements[member.agreement]?.terms.quest];
        if (q?.status==='active' && q.party_work && contractReady(s,content,q,{c:true}).ok) vestQuest(s,emit,q);
        memberEvent({wait:'wait',follow:'follow',leave:'left'}[c.act]);
    }
    return {status:'resolved',done:true,line:'PARTY — '+person.name+' · '+c.act+' · '+c.quote};
}

export function reduceParty(s,t,d) {
    const p = s.party ||= {members:{},agreements:{},claims:{}};
    const store = t==='party.member' ? p.members : t==='party.agreement' ? p.agreements : p.claims;
    const key = t==='party.member' ? d.who : d.id;
    if (!key || (store[key]?.revision || 0)!==d.previous) throw Error('Party decision no longer matches its source revision.');
    store[key] = {...structuredClone(d),revision:d.previous+1};
}

export function partySummary(s) {
    const lines = membersOf(s).filter(m=>m.mode!=='left').map(m => {
        const e = s.entities[m.who];
        return [m.who,e?.name,m.mode,m.combat?'combat ready':'traveller',m.agreement].join(' · ');
    });
    for (const a of agreementsOf(s).filter(a=>a.phase==='open' || (s.party.members[a.who]?.mode!=='left' && s.party.members[a.who]?.agreement===a.id)))
        lines.push(a.id+' · '+a.phase+' · '+a.proposer+' / '+a.who+' · '+a.terms.text);
    for (const r of claimsOf(s).filter(r=>r.amount>r.paid)) lines.push(r.id+' · '+(r.amount-r.paid)+' cp owed to '+r.who);
    return lines;
}

/** A separated companion discloses only the observed snapshot at separation. */
export function rememberMember(s,id,at) {
    const m=s.party?.members[id], e=s.entities[id];
    if (!m || !e?.sheet) return;
    m.lastSeen={turn:s.turn,minute:s.clock.minute,at,sheet:structuredClone(e.sheet),status:e.status};
}

export function partyView(s,content,compact=false) {
    const lines=[];
    for (const m of membersOf(s)) {
        const e=s.entities[m.who];
        const here=s.scene.present.includes(m.who);
        const sheet=here ? e?.sheet : m.lastSeen?.sheet;
        if (compact && (m.mode==='left' || !here)) continue;
        const known = here ? s.scene.at : m.lastSeen?.at || m.at;
        const mode = (here?e?.status:m.lastSeen?.status)==='dead' ? 'dead' : m.mode;
        lines.push([e?.name || m.who,mode,here ? '' : 'last seen '+known+' · minute '+(m.lastSeen?.minute ?? '?'),
            sheet ? 'L'+sheet.level+' '+(sheet.class || sheet.training) : 'profile pending'].filter(Boolean).join(' · '));
        if (sheet) {
            const d=deriveCharacter(sheet,content);
            lines.push(`HP ${sheet.hp}/${d.maxHp} · MP ${sheet.mp}/${d.maxMp} · STA ${sheet.sta}/${d.maxSta}`+
                (m.watch?' · on watch':''));
            if (!compact) {
                lines.push('XP '+sheet.xp+' · '+Object.entries(sheet.skills || {}).map(([id,k])=>(content.skills.get(id)?.name || id)+' P'+k.prof).join(', '));
                lines.push(Object.values(sheet.equipment || {}).filter(Boolean).map(g=>g.name || g.id || g).join(', '));
                const pack=Object.entries(sheet.inventory || {}).filter(([,q])=>q>0).map(([id,q])=>(content.items.get(id)?.name || id)+' ×'+q);
                if (here) pack.push(...Object.values(s.objects || {}).filter(o=>o.holder?.entity===m.who).map(o=>o.name+' ×'+(o.qty || 1)));
                lines.push([sheet.coin_cp+' cp',...pack].join(' · '));
                if(m.priority) lines.push([m.priority.kind,m.priority.target].filter(Boolean).join(' '));
            }
        }
    }
    if (!compact) {
        for (const a of agreementsOf(s)) lines.push(a.phase+' · '+(s.entities[a.who]?.name || a.who)+' · '+a.terms.text);
        for (const r of claimsOf(s)) lines.push(r.id+' · '+r.paid+'/'+r.amount+' cp paid'+
            (s.entities[r.who]?.status==='dead'?' · payment blocked':''));
    }
    return lines.filter(Boolean);
}
