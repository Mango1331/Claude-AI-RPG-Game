import { allyAssets, decisionOf } from './v4/surrender.js';
import { profileOf, restoreOf, restoreEffect, rankRefusal, freeObjectId } from './v4/items.js';
import { claim, payClaim, vestQuest, questEntitlement, questFee } from './party_rewards.js';
import { deriveCharacter, fullMana } from './derived.js';
import { hash32 } from './util.js';
import { coinEvidence, numberRuns } from './economy.js';
import { narratedEvent } from './v4/narration_evidence.js';
import { findQuote, moneyLiteral, sentenceOf, speechPassages, SPEECH_TAG } from './v4/finance_evidence.js';

export const membersOf = s => Object.values(s.party?.members || {});
export const following = s => membersOf(s).filter(m => m.mode === 'follow' && s.scene.present.includes(m.who) && s.entities[m.who]?.status !== 'dead');
export const fighters = s => following(s).filter(m => m.combat && s.entities[m.who].sheet);
export const agreementsOf = s => Object.values(s.party?.agreements || {});
export const claimsOf = s => Object.values(s.party?.claims || {});
const yes = /^(?:and\s+)?(?:yes|sure|agreed|deal|all right|okay|i accept|i agree|count me in|i(?:'ll| will) (?:come|join|help|go with))\b/i;
const no = /\b(?:no deal|no thanks|i (?:refuse|decline|won't|will not|cannot|can't)|not (?:coming|going|joining)|instead|but only|on condition)\b/i;
const qualified = /\b(?:unless|if|except|provided that|instead|on condition|only if)\b/i;
const negated = /\b(?:not|never|no deal|cannot|\w+n['’]t|refuse|decline|reject)\b/i;
const halfShare = /\b(?:half each|halves|half (?:of|the)|fifty.fifty|split (?:it |the (?:pay|reward|money) )?(?:evenly|equally)|equal shares)\b/i;
const together = /\b(?:together|join|team up|come with|go with|travel with|fight with|help (?:me|you)|two of us|with (?:me|you)|half each|split|share|partner|companion)\b/i;
const escapedName = name => String(name || '').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// A quote belongs to one paragraph of dialogue. A named tag or the speaker's
// own introduction establishes identity, never a name addressed in the speech.
function evidenceOf(s, who, source, words, actor, listener) {
    const at = findQuote(source, words);
    if (at.state !== 'found') return null;
    if (actor === 'pc') return source;
    const passage = speechPassages(source).find(p => p.start <= at.start && p.end >= at.end);
    if (passage) {
        // The dialogue tag can identify the addressee independently of "you".
        if (s.scene.present.some(id=>id!==listener && id!==who && s.entities[id]?.name &&
            new RegExp('\\b(?:tells?|asks?|says? to|repl(?:y|ies) to|turns? to)\\s+'+escapedName(s.entities[id].name)+'\\s*[,.:]?\\s*$','i').test(passage.before))) return null;
        const speakers = s.scene.present.filter(id => {
            const name = escapedName(s.entities[id]?.name);
            return name && (new RegExp('\\b'+name+'\\s+(?:'+SPEECH_TAG+'\\b[^.!?]*|:)\\s*$','i').test(passage.before)
                || new RegExp('^\\s*,?\\s*(?:'+name+'\\s+'+SPEECH_TAG+'|'+SPEECH_TAG+'\\s+'+name+')\\b','i').test(passage.after));
        });
        if (speakers.length) return speakers.length === 1 && speakers[0] === who ? source.slice(passage.start,passage.end) : null;
    }
    if (!passage) {
        const scope=sentenceOf(source,at.start,at.end);
        const statement=source.slice(scope.start,scope.end);
        if (new RegExp('^\\s*'+escapedName(s.entities[who].name)+'\\b','i').test(statement) && narratedEvent(source,words).ok)
            return statement;
    }
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
    return passage ? source.slice(passage.start,passage.end) : paragraph;
}

function statementOf(words,quote) {
    const at=findQuote(words,quote);
    if (at.state!=='found') return '';
    const {start,end}=sentenceOf(words,at.start,at.end);
    return words.slice(start,end+(words[end]==='?'?1:0)).trim();
}

function addressedTo(s,words,expected) {
    return !s.scene.present.some(id => id!==expected && s.entities[id]?.name &&
        new RegExp('(?:^|[.!?]\\s*)'+escapedName(s.entities[id].name)+'\\s*[:,]','i').test(words.trim()));
}

function targetsPerson(s,words,target,actor) {
    const name=s.entities[target]?.name;
    if (name && new RegExp('\\b'+escapedName(name)+'\\b','i').test(words)) return true;
    if (actor==='pc' && target!=='pc') return /\byou\b/i.test(words) && s.scene.present.filter(id=>id!=='pc' && s.entities[id]?.kind==='npc').length===1;
    return target==='pc' && (actor==='pc' ? /\bme\b/i : /\byou\b/i).test(words);
}

function withoutAddress(s,words) {
    const comma=words.indexOf(',');
    if (comma<0) return words;
    const label=words.slice(0,comma).trim().toLowerCase();
    return s.scene.present.some(id=>s.entities[id]?.name?.toLowerCase()===label) ? words.slice(comma+1).trim() : words;
}

function recipientOf(s,words,target,actor) {
    const names=[s.entities[target]?.name];
    if (target==='pc' && actor!=='pc' || target!=='pc' && actor==='pc' && targetsPerson(s,'you',target,actor)) names.push('you');
    const receiver=names.filter(Boolean).map(escapedName).join('|');
    return !!receiver && new RegExp('\\b(?:giv(?:e|es)|gave|hand(?:s|ed)?|pass(?:es|ed)?|pay(?:s)?|paid|to)\\s+(?:over\\s+)?(?:'+receiver+')\\b','i').test(words);
}

// A named fee is owed by the contractor to the partner. A reversed
// payment or an explicit third beneficiary cannot be encoded by these terms.
function wrongFeeRecipient(s,words,who,actor) {
    const excluded=[actor==='pc'?'me':'you',escapedName(s.entities.pc.name),
        ...s.scene.present.filter(id=>id!=='pc' && id!==who).map(id=>escapedName(s.entities[id]?.name))];
    const recipient='(?:'+excluded.filter(Boolean).join('|')+')';
    return new RegExp('\\b(?:pay|owe|for|to)\\s+'+recipient+'\\b','i').test(words);
}

function unchangedAnswer(s,content,agreement,words,statement,actor) {
    const terms=agreement.terms;
    statement=withoutAddress(s,statement);
    if (!(yes.test(statement) || decisionOf(statement)==='accept') || statement.includes('?') ||
        words.split(/[.!?;\n]/).some(part=>decisionOf(part)==='refuse') || no.test(words) || negated.test(words) || qualified.test(words)) return false;
    const fee=terms.installment ?? (s.quests[terms.quest] ? questFee(s.quests[terms.quest],terms) : null);
    const money=coinEvidence(words,content);
    if (!money.complete || money.sums.some(sum=>sum.cp!==fee)) return false;
    if (/\bhalf\b/i.test(words) && !terms.half && terms.loot?.kind!=='proceeds') return false;
    // A changed fraction, an extra asset or a new obligation is a fresh offer.
    if (/\b(?:third|quarter|percent|thirds|quarters|instead|extra|additional|also give|only)\b|\d\s*[%/]/i.test(words)) return false;
    if (!terms.half && money.sums.length && wrongFeeRecipient(s,words,agreement.who,actor)) return false;
    const names=s.scene.present.filter(id=>id!=='pc' && id!==agreement.who).map(id=>escapedName(s.entities[id]?.name)).filter(Boolean);
    if (money.sums.length && names.some(name=>new RegExp('\\b'+name+'\\b','i').test(words))) return false;
    const goods=terms.loot?.goods;
    for (const clause of words.split(/[.!?;\n]/)) {
        if (!/\b(?:give|keep|owe|hand over|throw in|include|want)\b/i.test(clause)) continue;
        if (goods && clause.toLowerCase().includes(goods)) continue;
        if (fee && coinEvidence(clause,content).sums.length && targetsPerson(s,clause,agreement.who,actor)) continue;
        return false;
    }
    return true;
}

// Require the owner's present-tense deed, or a completed deed in narration.
// Read the entire source sentence even when X supplies only the verb or object.
function performed(s,source,c,actor,words) {
    const action={
        give:'giv(?:e|es)|gave|hand(?:s|ed)?|pass(?:es|ed)?',
        equip:'equip(?:s|ped)?|wear(?:s)?|wield(?:s|ed)?|put(?:s)? on|read(?:y|ies|ied)',
        use:'drink(?:s)?|drank|consume[sd]?|use[sd]?|take[sn]?|took|swallow(?:s|ed)?',
        pay:'pay(?:s)?|paid|give|hand|settle'
    }[c.act];
    const statement=withoutAddress(s,statementOf(words,c.quote));
    if (!statement || /[?]|\b(?:tomorrow|later|afterwards|when|once)\b/i.test(statement) ||
        qualified.test(statement) || negated.test(statement)) return '';
    const name=escapedName(s.entities[actor]?.name);
    if (actor!=='pc' && new RegExp('\\b'+name+'\\s+(?:'+action+')\\b','i').test(statement) &&
        narratedEvent(source,c.quote).ok) return statement;
    const subject=actor==='pc' ? '(?:I\\s+(?:now\\s+)?)?' : 'I\\s+(?:now\\s+)?';
    const present={give:'give|hand|pass',equip:'equip|wear|wield|put on|ready',use:'drink|consume|use|take|swallow',pay:'pay|give|hand|settle'};
    const own=new RegExp('^[*"]?'+subject+'(?:'+present[c.act]+')\\b','i');
    return own.test(statement) && narratedEvent(statement,statement,{minWords:2}).ok ? statement : '';
}

// In an equal division the explicitly named pot can be the whole quest reward.
function splitPot(text, sum, payout) {
    if (sum.cp !== payout) return false;
    const before = text.slice(0,sum.raw_start), after = text.slice(sum.raw_end);
    return /\b(?:split|divide|share)\s+(?:(?:the|our)\s+)?(?:guild['’]s\s+)?$/i.test(before)
        && /^\s+(?:evenly|equally|in half|half each)\b/i.test(after);
}
function termsFrom(s, content, c, words, actor) {
    if (c.quest && s.quests[c.quest]?.status !== 'active') return null;
    const terms = { quest:c.quest || null, combat:c.combat === true, text:c.quote };
    if (terms.combat && !together.test(words) && !/\b(?:fight|battle|guard|protect|defend)\b/i.test(words)) return null;
    const amounts=coinEvidence(words,content);
    const payout=s.quests[c.quest]?.payout_cp;
    const pot=amounts.sums.find(sum=>splitPot(words,sum,payout));
    const quotedHalf=halfShare.test(c.quote) || coinEvidence(c.quote,content).sums.some(sum=>splitPot(c.quote,sum,payout));
    const half = halfShare.test(words) || !!pot;
    if (c.share === 'half' && (!half || !terms.quest)) return null;
    if (half && c.share !== 'half' && !c.loot || c.share==='half' && !quotedHalf) return null;
    const fee=c.share==='half' ? Math.floor(s.quests[c.quest].payout_cp/2) : c.amount;
    if (!amounts.complete || amounts.sums.some(sum=>sum.cp!==fee && !(sum===pot && c.share==='half')) || (c.amount && wrongFeeRecipient(s,words,c.who,actor))) return null;
    if (fee && /\b(?:additional|extra|on top of)\b/i.test(words)) return null;
    if (terms.combat && (actor==='pc' ? /\b(?:follow my (?:lead|orders)|I (?:choose|call) (?:our|the) targets)\b/i :
        /\b(?:follow your (?:lead|orders)|you (?:choose|call) (?:our|the) targets)\b/i).test(words)) terms.tactics=true;
    if (c.share === 'half') terms.half = true;
    if (c.amount != null) {
        const m = moneyLiteral(words, c.money || '', { content, within:findQuote(words,c.quote) });
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
    const failure = reason => ({status:'clarify',reason,line:'CLARIFY — '+reason});
    if (person?.kind !== 'npc' || person.status === 'dead' || !s.scene.present.includes(who)) return failure('The named living partner must be present.');
    const listener = actor==='pc' ? who : (c.act==='give' ? c.target : 'pc');
    const words = evidenceOf(s, who, source, c.quote, actor, listener);
    if (!words) return failure('The decision needs words from the identified speaker.');
    const statement = statementOf(words,c.quote);
    if (!statement || !addressedTo(s,statement,listener)) return failure('Quote the decision addressed to this person.');
    const member = s.party?.members?.[who];
    const open = agreementsOf(s).filter(a => a.who === who && a.phase === 'open');
    let agreement = c.agreement ? s.party?.agreements?.[c.agreement] : open.length === 1 ? open[0] : null;
    const sourceRef = { actor, quote:['accept','decline'].includes(c.act) ? statement : c.quote, turn:s.turn, at:s.scene.at };
    const memberEvent = (mode, extras={}) => emit({t:'party.member',d:{...member,who,mode,at:s.scene.at,source:sourceRef,previous:member?.revision || 0, ...extras}});
    if (c.act === 'offer') {
        if ((!together.test(c.quote) && !member) || no.test(statement) || negated.test(statement)) return failure('Quote the specific voluntary offer.');
        let terms = termsFrom(s, content, c, words, actor);
        if (!terms) return failure('The work and compensation must match the quoted terms.');
        const id = 'party.'+who+'.'+s.turn+'.'+hash32(JSON.stringify([actor,c.seq,c.quote]));
        if (s.party?.agreements?.[id]) return failure('Offer already recorded.');
        const priorAgreement=s.party?.agreements?.[member?.agreement];
        const amends=c.agreement && c.agreement===priorAgreement?.id && terms.quest &&
            terms.quest===priorAgreement.terms.quest && (terms.half || terms.cp) && /\b(?:revise|amend|change|replace)\b/i.test(statement);
        if ((c.agreement || priorAgreement && /\b(?:amend|revise|replace)\b/i.test(statement)) && !amends && agreement?.phase!=='open') return failure('Identify the current agreement being changed.');
        let installmentOn=null;
        if (terms.due && !amends && priorAgreement?.terms.quest===terms.quest &&
            (priorAgreement.terms.half || priorAgreement.terms.cp && (!priorAgreement.terms.due || priorAgreement.terms.installment))) {
            if (terms.cp>questFee(s.quests[terms.quest],priorAgreement.terms)) return failure('An installment exceeds the agreed fee.');
            installmentOn=priorAgreement.id;
            terms={...priorAgreement.terms,installment:terms.cp,due:terms.due,text:terms.text};
        }
        for (const prior of open.filter(a=>a.terms.quest===terms.quest))
            emit({t:'party.agreement',d:{...prior,phase:'superseded',previous:prior.revision}});
        emit({t:'party.agreement',d:{id,who,phase:'open',terms,...(amends?{amends:c.agreement}:{}),...(installmentOn?{installmentOn}:{}),proposer:actor,source:sourceRef,previous:0}});
    } else if (['accept','decline'].includes(c.act)) {
        if (!agreement || agreement.who !== who || agreement.phase !== 'open' || agreement.proposer === actor) return failure('Identify one current offer from the other party.');
        const answer=withoutAddress(s,statement);
        if (c.act === 'accept' ? !unchangedAnswer(s,content,agreement,words,statement,actor) :
            answer.includes('?') || qualified.test(answer) || !(decisionOf(answer)==='refuse' || /^(?:no thanks|I (?:decline|refuse|won't|will not))\b/i.test(answer)))
            return failure('Quote a definite response to the unchanged terms.');
        const accepts = c.act === 'accept';
        const parent=agreement.amends || agreement.installmentOn;
        if (accepts && parent && member?.agreement!==parent) return failure('The agreement being amended has changed.');
        if (accepts && agreement.terms.quest) {
            const q = s.quests[agreement.terms.quest];
            if (!q || q.status !== 'active') return failure('Quest is no longer active.');
            const cost = a => questFee(q,a.terms);
            const reserved=new Map();
            const reserve=(id,amount)=>reserved.set(id,Math.max(reserved.get(id) || 0,amount));
            const vested=claimsOf(s).filter(r=>r.source===q.id);
            for (const id of new Set(vested.map(r=>r.who))) reserve(id,questEntitlement(vested.filter(r=>r.who===id)));
            for (const m of membersOf(s).filter(m=>m.who!==who && m.mode!=='left')) {
                const other=s.party.agreements[m.agreement];
                if (other?.terms.quest===q.id) reserve(m.who,cost(other));
            }
            if (agreement.amends) reserved.set(who,vested.filter(r=>r.who===who).reduce((n,r)=>n+r.paid,0));
            reserve(who,cost(agreement));
            if ([...reserved.values()].reduce((n,cp)=>n+cp,0) > q.payout_cp) return failure('The promised shares exceed this reward.');
        }
        if (accepts && agreement.terms.loot && membersOf(s).some(m => m.who !== who && m.mode !== 'left' &&
            s.party.agreements[m.agreement]?.terms.loot?.goods === agreement.terms.loot.goods))
            return failure('This loot has already been promised.');
        emit({t:'party.agreement',d:{...agreement,phase:accepts?'accepted':'declined',answer:sourceRef,previous:agreement.revision}});
        if (accepts) {
            memberEvent(member?.mode==='wait'?'wait':'follow',{agreement:agreement.id,combat:agreement.terms.combat});
            if (agreement.terms.combat) bindPartyEquipment(s,who,emit);
            if (agreement.amends && claimsOf(s).some(r=>r.who===who && r.source===agreement.terms.quest)) {
                const amount=questFee(s.quests[agreement.terms.quest],agreement.terms);
                if (amount!=null) claim(s,emit,agreement,agreement.terms.quest,amount,{amend:true});
            }
            if (agreement.terms.due === 'advance') {
                const advance=agreement.terms.installment ?? agreement.terms.cp;
                const row=claim(s,emit,agreement,agreement.terms.quest,advance);
                payClaim(s,emit,row,Math.min(advance,row.amount)-row.paid);
            }
        }
    } else if (['equip','use','give'].includes(c.act)) {
        if (actor !== who || !member || member.mode==='left' || s.encounter || !person.sheet)
            return failure('Personal equipment decisions require the present owner outside combat.');
        const asset=allyAssets(s,content,who).find(a=>a.object===c.object);
        const deed=performed(s,source,c,actor,words);
        const qty=c.qty ?? 1;
        if (!asset || asset.object==='coin' || !Number.isSafeInteger(qty) || qty<=0 || asset.qty<qty ||
            !deed.toLowerCase().includes(asset.name.toLowerCase())) return failure('Quote the actual use of a held item.');
        const bag=asset.ref ? s.objects[asset.ref] : content.items.get(asset.template);
        if (c.act==='equip') {
            const p=bag && (profileOf(content,bag) || bag);
            if (!['armor','weapon'].includes(p?.slot) ||
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
            if (qty!==1 || asset.slot) return failure('Quote one actual use.');
            const sh=person.sheet,d=deriveCharacter(sh,content),effect=restoreOf(content,bag);
            if (!effect) return failure('This item has no recovery effect.');
            const r=restoreEffect(content,effect,{level:sh.level,current:sh,max:{hp:d.maxHp,mp:d.maxMp,sta:d.maxSta}});
            if (r.refused) return failure(r.refused);
            emit(asset.ref ? {t:'object.consumed',d:{id:asset.ref,qty:1,by:who}} : {t:'item.changed',d:{id:who,item:asset.template,qty:-1,why:'used'}});
            emit({t:'resource.changed',d:{id:who,resource:r.resource,value:r.after,...fullMana(sh,r.resource,r.after,r.max),why:asset.name}});
        } else {
            const recipient=c.target;
            const other=recipient==='pc'?s.entities.pc:s.scene.present.includes(recipient)?s.entities[recipient]:null;
            if (!other || other.status==='dead' || recipient===who ||
                !recipientOf(s,deed,recipient,actor) ||
                (numberRuns(deed).length ? numberRuns(deed).some(n=>n!==qty) : qty!==1)) return failure('Identify the actual recipient and quantity.');
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
        const deed=performed(s,source,c,actor,words);
        if (actor !== 'pc' || !row || who !== row.who || !recipientOf(s,deed,who,actor) ||
            moneyLiteral(deed,c.money,{content}).cp !== c.amount ||
            !payClaim(s,emit,row,c.amount)) return failure('Identify the due claim, recipient and actual amount to pay.');
    } else if (c.act==='coordinate') {
        if (!member || (!member.combat && !['watch','rest'].includes(c.priority)) || member.mode!=='follow') return failure('Only a present combat partner can coordinate.');
        const kinds={target:/\b(?:target|attack|shoot|take on|focus)\b/i,protect:/\b(?:guard|cover|protect|shield|(?:keep|hold)\b[^.!?]*?\b(?:off|away from)|defend)\b/i,independent:/\b(?:independent|own|your call|freely)\b/i,front:/\b(?:front|point|ahead|lead)\b/i,rear:/\b(?:rear|behind|back)\b/i,watch:/\b(?:watch|lookout|sentry)\b/i,rest:/\b(?:rest|sleep|stand down)\b/i};
        const matchesRequest=actor===who && member.request?.kind===c.priority && member.request?.target===(c.target || null);
        if (matchesRequest && !qualified.test(statement) && !statement.includes('?') &&
            (decisionOf(statement)==='refuse' || /^(?:no thanks|I (?:refuse|decline|will not|won't))\b/i.test(statement))) {
            memberEvent(member.mode,{request:null});
            return {status:'resolved',done:true,line:person.name+' declined the request.'};
        }
        const simpleAnswer=matchesRequest && /^(?:yes|sure|agreed|okay|all right|I agree|I accept)[.!]?$/i.test(words.trim());
        if ((!simpleAnswer && !kinds[c.priority]?.test(statement)) || no.test(words) || negated.test(statement)) return failure('Quote the tactical request or decision.');
        if (['target','protect'].includes(c.priority) && (c.target!=='pc' && !s.scene.present.includes(c.target))) return failure('Identify the present target.');
        if (c.priority==='target' || c.priority==='protect') {
            const labels=[s.entities[c.target]?.name,s.encounter?.combatants[c.target]?.label,c.target==='pc'?(actor==='pc'?'me':'you'):null].filter(Boolean);
            if (!simpleAnswer && !labels.some(name=>new RegExp('(^|[^a-z])'+escapedName(name)+'(?=$|[^a-z])','i').test(statement)))
                return failure('Quote the identified target of the request.');
        }
        const changes=['watch','rest'].includes(c.priority) ? {watch:c.priority==='watch'} : ['front','rear'].includes(c.priority) ? {formation:c.priority} : {priority:{kind:c.priority,target:c.target || null}};
        const delegated=s.party.agreements[member.agreement]?.terms.tactics;
        if (actor==='pc' && !delegated) {
            memberEvent(member.mode,{request:{kind:c.priority,target:c.target || null,quote:c.quote}});
        } else {
            if (actor!==who && !delegated || actor===who && !simpleAnswer && (statement.includes('?') || qualified.test(statement) || !/\b(?:I will|I'll|I’ll|I shall|I am|let me|agreed|yes)\b/i.test(statement)))
                return failure('The partner must decide for themselves.');
            memberEvent(member.mode,{...changes,request:null});
        }
    } else {
        if (!member || member.mode==='left') return failure('No active membership.');
        const travel={wait:'wait|stay|hold here',follow:'follow|come|rejoin|travel together',leave:'leave|quit|part ways|go alone|split up|dismiss|go on my own'};
        const decision=withoutAddress(s,statement);
        const own=actor===who ? "(?:I|we)(?:['’]ll| will)?\\s+" : "(?:please\\s+|(?:let['’]s|we)\\s+|(?:I\\s+(?=dismiss|go alone|go on my own)))?";
        const committed=travel[c.act] && new RegExp('^'+own+'(?:'+travel[c.act]+')\\b','i').test(decision);
        if (!committed || decision.includes('?') || negated.test(decision) || qualified.test(decision) || /\b(?:tomorrow|later)\b/i.test(decision))
            return failure('Quote the change of travel arrangement.');
        const q=s.quests[s.party.agreements[member.agreement]?.terms.quest];
        if (q?.status==='active' && q.party_work && contractReady(s,content,q,{c:true}).ok) vestQuest(s,emit,q);
        memberEvent({wait:'wait',follow:'follow',leave:'left'}[c.act],member.request ? {request:null}:{});
    }
    const response = c.act === 'offer' && actor === 'pc'
        ? ' The proposal is open. Show the named partner’s own reply here, attributing their words clearly. No journey or other player action has been chosen by making this offer.'
        : '';
    return {status:'resolved',done:true,line:'PARTY — '+person.name+' · '+c.act+' · '+c.quote+response};
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
        return [m.who,e?.name,m.mode,m.combat?'combat ready':'traveller',m.agreement,
            m.request?'asked, awaiting reply: '+m.request.quote:null].filter(Boolean).join(' · ');
    });
    for (const a of agreementsOf(s).filter(a=>a.phase==='open' || (s.party.members[a.who]?.mode!=='left' && s.party.members[a.who]?.agreement===a.id)))
        lines.push(a.id+' · '+a.phase+' · '+a.proposer+' / '+a.who+' · '+a.terms.text+
            (a.installmentOn?' · '+a.terms.installment+' cp on account of '+questFee(s.quests[a.terms.quest],a.terms)+' cp total':''));
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
            if(m.request) lines.push('Asked · '+m.request.quote);
            if(m.priority) lines.push('Agreed · '+[m.priority.kind,m.priority.target && (s.entities[m.priority.target]?.name || m.priority.target)].filter(Boolean).join(' '));
            if (!compact) {
                lines.push('XP '+sheet.xp+' · '+Object.entries(sheet.skills || {}).map(([id,k])=>(content.skills.get(id)?.name || id)+' P'+k.prof).join(', '));
                lines.push(Object.values(sheet.equipment || {}).filter(Boolean).map(g=>g.name || g.id || g).join(', '));
                const pack=Object.entries(sheet.inventory || {}).filter(([,q])=>q>0).map(([id,q])=>(content.items.get(id)?.name || id)+' ×'+q);
                if (here) {
                    const worn=new Set(Object.values(sheet.equipment || {}).map(g=>g?.object).filter(Boolean));
                    pack.push(...Object.values(s.objects || {}).filter(o=>o.holder?.entity===m.who && !worn.has(o.id)).map(o=>o.name+' ×'+(o.qty || 1)));
                }
                lines.push([sheet.coin_cp+' cp',...pack].join(' · '));
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
