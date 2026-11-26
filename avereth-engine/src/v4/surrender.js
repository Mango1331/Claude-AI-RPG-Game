// One material line per physical source. Equipped slots and bag copies are separate choices.
import { coinEvidence, numbersIn } from '../economy.js';
import { findQuote, speechPassages, SPEECH_TAG } from './finance_evidence.js';
import { narratedEvent } from './narration_evidence.js';
import { heldUnits, tradeObject } from './trade.js';

export const negotiators = state => state.meta?.runtime!=='v4' ? [] : Object.values(state.encounter?.combatants || {}).filter(c =>
    c.side === 'hostile' && c.fixed.sapient && state.entities[c.id]?.kind === 'npc' &&
    state.scene.present.includes(c.id) && c.current.hp > 0 && !c.current.escaped && !c.current.surrendered);

// A direct handover needs an identifiable receiver before their narrative response.
export function identifiesRecipient(state,id,text) {
    const people=negotiators(state), person=people.find(c=>c.id===id);
    if (!person) return false;
    if (people.length===1) return true;
    const tokens=c=>{
        const e=state.entities[c.id];
        return [c.label,e.known_name,e.name,...String(e.sheet?.equipment?.weapon?.name || '').split(' '),
            ...String(e.traits || '').split(',')[0].split(' ')].filter(w=>typeof w==='string' && w.length>2)
            .map(w=>w.toLowerCase()).filter(w=>!['the','and','with','man','woman','long','wood','iron','steel'].includes(w));
    };
    const others=new Set(people.filter(c=>c!==person).flatMap(tokens));
    return tokens(person).some(w=>!others.has(w) && text.toLowerCase().includes(w));
}

export function surrenderAssets(state, content) {
    const sheet = state.entities.pc.sheet;
    const assets = [{object:'coin', name:'Coin (cp)', qty:sheet.coin_cp}];
    for (const [slot,item] of Object.entries(sheet.equipment || {})) {
        if (!item) continue;
        const template = typeof item === 'string' ? item : item.object;
        if (!template) continue;
        assets.push({object:'worn.'+slot, name:item.name || content.items.get(template)?.name || template,
            ref:typeof item === 'string' ? 'item.'+item : template, slot, qty:1});
    }
    const refs = new Set([...Object.keys(sheet.inventory || {}).map(k=>state.objects[k] ? k : 'item.'+k), ...Object.keys(state.objects || {})]);
    for (const ref of refs) {
        const qty = heldUnits(state,ref), item = tradeObject(state,content,ref);
        if (qty > 0 && item) assets.push({object:ref, name:item.name, qty});
    }
    return assets;
}

const hasWords = (text,quote) => typeof quote === 'string' && !!quote.trim() && text.includes(quote);
const noCommit = /\b(?:don't|do not|won't|will not|refuse to|would|might|pretend to)\b/i;
const releaseWords = {
    give:/\b(?:hand|give(?!\s+(?:up|in|me|us)\b)|pass|gebe|übergebe)\b/i,
    drop:/\b(?:throw|toss|drop|lay|place|put|werfen|werfe|lege)\b/i,
};
const additionalPrice=quote=>/\b(?:another|additional|more|extra|weitere|zusätzlich)\b/i.test(quote);
const currencyWords = /\b(?:all|remaining|rest|whole|alles|gesamte[sn]?)\b[^.!?]{0,35}\b(?:silver|copper|gold|money|coin[s]?|silber|geld|kupfer)\b/i;

export function checkTerms(state,content,lines,{text=null,credit=[],counter=false}={}) {
    if (!Array.isArray(lines)) return 'Select explicit terms or an empty offer.';
    const assets = surrenderAssets(state,content);
    const seen = new Set();
    for (const line of lines) {
        const asset = assets.find(a=>a.object===line?.object);
        const prior = credit.find(a=>a.object===line?.object);
        if ((!asset && !prior) || seen.has(line.object) || !Number.isSafeInteger(line.qty) || line.qty<1 ||
            !counter && line.qty>(asset?.qty || 0)+(prior?.qty || 0) || !['offer','give','drop'].includes(line.mode) ||
            counter && line.mode!=='offer') return 'Invalid or unavailable amount, item or handover.';
        seen.add(line.object);
        if (text === null) continue;
        if (!hasWords(text,line.quote)) return 'Each material term needs its own literal evidence.';
        const q=line.quote;
        const before=text.slice(0,text.indexOf(q));
        if (!counter && (noCommit.test(q) || /\b(?:not|never|might|would|won't|don't|wouldn't)\s*$/i.test(before) || line.mode!=='offer' && (!releaseWords[line.mode].test(q) || /\b(?:if|offer|promise|would)\b/i.test(q)))) return 'An offer or condition cannot release property.';
        if (line.object==='coin') {
            const money=coinEvidence(q,content);
            const agreed=counter && additionalPrice(q) ? line.qty-(prior?.qty || 0) : line.qty;
            if (!(money.complete && money.cp===agreed) && !(currencyWords.test(q) && line.qty===(asset.qty+(prior?.qty || 0)))) return 'Coin amount is not established.';
        } else {
            const words=(asset?.name || prior.name).toLowerCase().match(/[\p{L}\d]+/gu) || [];
            // A source container in “silver out of my pouch” is never the object delivered.
            const itemWords=q.toLowerCase().split(/\b(?:out of|from|inside|contents of|aus|inhalt (?:der|des))\b/i)[0];
            const named=words.some(w=>w.length>2 && !['starter','simple','small','light','fine','basic','the','and'].includes(w) &&
                itemWords.includes(w));
            if (!named || line.qty>1 && !numbersIn(q).has(line.qty) && !(/\ball\b/i.test(q) && line.qty===(asset?.qty || 0)+(prior?.qty || 0)))
                return 'Item or quantity is not established by the quoted words.';
        }
    }
    if (text && !counter) {
        const clauses=text.split(/[.;!*?\n]/);
        for (const clause of clauses) {
            if (noCommit.test(clause) || /\b(?:if|unless)\b/i.test(clause)) continue;
            const mode=releaseWords.drop.test(clause) ? 'drop' : releaseWords.give.test(clause) ? 'give' : null;
            if (!mode || !coinEvidence(clause,content).complete || !/\b(?:silver|copper|gold|silber|kupfer|coins?)\b/i.test(clause)) continue;
            if (!lines.some(l=>l.object==='coin' && l.mode===mode && clause.includes(l.quote)))
                return 'The explicit coin release is missing from this offer.';
        }
    }
    return null;
}

// Binding evidence is a completed decision, expressed in speech or by the actor's own action.
// Read the predicate of the whole statement; a matching verb inside a thought or question is insufficient.
const cleanStatement=text=>text.trim().toLowerCase().replace(/^[“"«]+|[.!,”"»]+$/g,'').trim();
function decisionOf(statement) {
    const words=cleanStatement(statement).replace(/^(?:i|we) /,'');
    const decision=/^(?:(do not|don't|cannot|can't|won't|will not) )?(accept(?:s|ed)?|agree(?:s|d)?|assent(?:s|ed)?|consent(?:s|ed)?|refuse[sd]?|reject(?:s|ed)?|decline[sd]?)(?: (?:to )?(?:(?:the|these|your|his|their|those) )?(?:offer|counteroffer|terms|surrender|deal|it))?$/.exec(words);
    if (decision) {
        const refusal=/^(?:refus|reject|declin)/.test(decision[2]);
        if (decision[1]) return refusal ? null : 'refuse';
        return refusal ? 'refuse' : 'accept';
    }
    if (/^(?:no|no deal|(?:shakes?|shook) (?:his|her|their) heads?(?: in refusal)?)$/.test(words)) return 'refuse';
    if (/^(?:yes|deal|nod(?:s|ded)? (?:in |his |her |their )(?:assent|agreement)|lets? (?:him|you|alaric) (?:go|pass)|lowers? (?:his|her|their) (?:weapon|blade))$/.test(words)) return 'accept';
    return null;
}

// An unqualified yes covers the displayed demand. When the player names what they
// actually hand over, a missing physical article (especially the pouch) stays theirs.
export function counterConsentError(state,content,text,{selected=false}={}) {
    if (/\b(?:except|only|unless|instead|not the|without the)\b/i.test(text))
        return 'Die Gegenforderung wurde nicht vollständig angenommen.';
    const offer=state.encounter?.negotiation;
    if (!offer?.reply) return 'Keine offene Gegenforderung.';
    const demands=offer.reply.terms, price=demands.find(l=>l.object==='coin');
    const money=coinEvidence(text,content);
    if (money.sums.some(sum=>sum.cp!==price?.qty))
        return 'Der genannte Betrag weicht von der Gegenforderung ab.';
    const clauses=text.split(/[.!*;\n]/).map(s=>s.trim()).filter(Boolean);
    const decisions=clauses.map(decisionOf);
    const handover=/^(?:i )?(?:(?:say|accept|agree) and (?:i )?)?(?:give|hand|pass|gebe|übergebe)\b(.*)$/i;
    const handing=clauses.filter(c=>!c.includes('?')).map(c=>handover.exec(c)).find(Boolean);
    if (decisions.includes('refuse') || noCommit.test(text) || /\b(?:if|counteroffer|i (?:offer|propose))\b/i.test(text)
        || !selected && !decisions.includes('accept') && !(handing && demands.length))
        return 'Die Gegenforderung wurde nicht verbindlich angenommen.';
    if (!handing) return null;
    const specified=handing[1].toLowerCase().split(/\b(?:out of|from|inside)\b/)[0], assets=surrenderAssets(state,content);
    if (/^\s*(?:it|them|that|what they ask(?:ed)? for|everything (?:they asked for|agreed))[ .!*]*$/.test(specified)) return null;
    for (const line of demands) {
        if (offer.released.some(r=>r.object===line.object && r.qty>=line.qty)) continue;
        const asset=assets.find(a=>a.object===line.object);
        const names=String(asset?.name || '').toLowerCase().match(/[\p{L}]+/gu) || [];
        const named=line.object==='coin' ? /\b(?:coin|coins|silver|copper|gold|geld|silber|kupfer)\b/.test(specified)
            : names.some(n=>n.length>2 && !['small','simple','starter','fine','light','basic','the','and'].includes(n) && specified.includes(n));
        if (named && line.object!=='coin') {
            const itemClause=specified.split(/,|\b(?:and|und)\b/).find(part=>names.some(n=>n.length>2 && part.includes(n)));
            const quantities=numbersIn(itemClause || '');
            if (quantities.size && !quantities.has(line.qty)) return 'Die Stückzahl weicht von der Gegenforderung ab.';
        }
        if (!named) return 'Die genannte Herausgabe deckt die Gegenforderung nicht. Es wurde nichts übergeben.';
    }
    return null;
}

export function describeTerms(lines) {
    return lines?.length ? lines.map(l=>l.object==='coin' ? l.qty+' cp' : l.qty+' × '+(l.name || l.object)).join(' + ') : 'no material consideration';
}

export function negotiationPrompt(state) {
    const n=state.encounter?.negotiation;
    if (!n) return '';
    const actors=negotiators(state).map(c=>c.label || c.name).join(', ');
    if (n.stage==='counter') return 'BINDING COUNTEROFFER: '+n.reply.evidence+' Terms: '+describeTerms(n.reply.terms)+'. Alaric chooses now. No additional condition or attack.';
    return 'SURRENDER — his Major Action is spent. Offer to '+(n.target ? state.encounter.combatants[n.target].label : actors)+': '+describeTerms(n.terms)+
        (n.group ? '. Group request for '+Object.keys(state.encounter.participation).join(', ')+'. Each partner decides for themselves. Explicitly identify both the protected party and each decision.' : '')+'. Already released: '+describeTerms(n.released)+'. From motives, the danger, prior harm and their interests, show a definite acceptance, refusal, or ONE concrete final counteroffer. Give the speaker and each consenting party a short, explicit decision in their own clause (e.g. “Bandit B accepts the offer.”). Use their combat label or unmistakable visible identity. Name who refuses or makes a demand. Others remain hostile. Allow their dialogue now. No extra PC decision, condition after acceptance, attack, damage, automatic safety or unbooked transfer.';
}

export const surrenderWords=/\b(?:surrender|yield|give up|mercy|spare (?:me|my life)|let me (?:live|go)|lay down (?:my |our )?arms|ergebe|gnade|kapitulier\w*)\b/i;

export function negotiationPlanText(state,content) {
    const n=state.encounter?.negotiation, people=negotiators(state);
    if (!people.length && !n) return '';
    const assets=surrenderAssets(state,content).map(a=>a.object+'='+a.name+' ×'+a.qty).join(', ');
    return (n ? 'OPEN NEGOTIATION '+n.stage+' '+n.id+': '+(n.reply?.evidence || '')+'. Answer a definite counteroffer with negotiation_answer {accept:true|false,quote}. True only for unconditional agreement to its complete terms NOW. Any new price, refusal or incompatible action declines. If still awaiting a decision he can explicitly withdraw. ' : '')+
        'SURRENDER is a Major: surrender {target:eligible id or null for the group,terms:[{object,qty,mode,quote}],quote}. Asking mercy or offering things to end combat qualifies. Eligible: '+people.map(c=>c.id).join(', ')+'. Assets: '+assets+
        '. Coin qty is total copper. Each quote is literal words for that item or amount; include the verb for give/drop. offer keeps it, give hands it directly to target now, drop throws or lays it at the current place now. Empty terms for mercy alone. Coins in a pouch are not the pouch object. No unspecified inventory. Encode a selected HUD minor as its own bound command even when his words only supply the compatible Major. Negation or replacement is a conflict.';
}

export function negotiationExtraction(state,content,prose) {
    const n=state.encounter.negotiation;
    return [
        {role:'system',content:'You read one reply of a text RPG narrator. Extract ONLY the response to the specific open surrender offer. No attacks, damage, ordinary deltas or new player choices. Return JSON {offer,choice:"accept"|"refuse"|"counter",speaker,members:[{id,evidence}],evidence,terms:[{object,qty,mode:"offer",quote}]}. Quote a complete, attributable decision including the speaker or speech tag. Consideration and refusal are never assent. For refusal use members:[]; no consenting participant is needed. For agreement or counteroffer, members are only the speaker and eligible opponents who explicitly join, visibly assent or have established the speaker represents them. One person cannot bind independent foes. Distinct evidence for each independently assenting NPC. A counteroffer is a definite final demand. Put ALL material terms in terms, total including delivered units that count towards it. Additional prices are additional. Use exact asset IDs. A demand for the contents of a pouch is coin; the physical pouch only if explicitly demanded. For accept/refuse terms is []. If the response is missing or uncertain say {"choice":"unclear"}. Do not invent assent.'+(n.group?' Include allies:[{id,evidence}] for each named ally explicitly accepting this same group settlement. Both sides must explicitly agree to protecting the group. Optional ally.pledges:[{object,qty,quote}] only for explicit personal handovers by that ally to the negotiating recipient. Quote their complete first-person line and the precise asset name and quantity.':'')},
        {role:'user',content:JSON.stringify({offer:n.id,...n.group?{group:Object.keys(state.encounter.participation),allyAssets:Object.fromEntries(Object.keys(state.encounter.participation).filter(id=>id!=='pc').map(id=>[id,allyAssets(state,content,id).map(({object,name,qty})=>({object,name,qty}))]))}:{},addressed:n.target,offerTerms:n.terms,released:n.released,eligible:negotiators(state).map(c=>({id:c.id,label:c.label,description:state.entities[c.id].traits,weapon:state.entities[c.id].sheet?.equipment?.weapon?.name})),assets:surrenderAssets(state,content),reply:prose})},
    ];
}

// Associate only the nominal subject with an encounter identity. Ground appearance and weapon
// descriptions in the actual sheet; another actor mentioned elsewhere cannot lend their answer.
function decisionSubject(state,subject) {
    const noun=cleanStatement(subject).replace(/^the /,'');
    if(state.encounter?.line) {
        const ally=Object.keys(state.encounter.participation).filter(id=>id!=='pc' && [state.entities[id]?.name,state.encounter.combatants[id]?.label].some(x=>x && cleanStatement(x)===noun));
        if(ally.length===1) return ally[0];
    }
    const people=negotiators(state);
    const group=noun.match(/^(all \w+|both)(?: (.+))?$/);
    if (/^(?:everyone|all of them)$/.test(noun) || group &&
        (group[1]==='both' ? people.length===2 : numbersIn(group[1]).has(people.length)) &&
        (!group[2] || group[2]==='of them' || people.every(c=>state.entities[c.id]?.descriptors?.includes(group[2].replace(/s$/,''))))) return 'party';
    const ids=people.filter(c=>{
        const npc=state.entities[c.id];
        const names=[c.label,npc.name,npc.known_name].filter(Boolean).map(cleanStatement);
        if (names.includes(noun)) return true;
        const weapon=String(npc.sheet?.equipment?.weapon?.name || '').toLowerCase().split(/\s+/);
        const words=new Set([...String(npc.traits || '').toLowerCase().split(',')[0].split(/[^\p{L}]+/u),
            ...weapon,...weapon.map(w=>w+'man'),...weapon.map(w=>w+'woman'),...(npc.descriptors || []).slice(0,1),
            'man','woman','wielder','bearer','with','a','the']);
        return noun.length>0 && noun.split(/\s+/).every(w=>words.has(w)) && identifiesRecipient(state,c.id,noun);
    });
    return ids.length===1 ? ids[0].id : null;
}

const beforeTag=new RegExp('^(.+?)(?::|\\s+'+SPEECH_TAG+'[, :]*)$','i');
const afterTag=new RegExp('^[, ]*(?:'+SPEECH_TAG+'\\s+(.+?)|(.+?)\\s+'+SPEECH_TAG+')$','i');

// Collect the source ranges once. Every binding decision stays with the subject of its own
// sentence or speech tag, even when an extractor crops the quote or omits a dissenting party.
function decisionRecords(state,prose) {
    const passages=speechPassages(prose);
    const records=passages.map(p=>{
        const before=p.before.split(/[.!?;]/).at(-1).trim();
        const leading=beforeTag.exec(before), trailing=afterTag.exec(p.after.trim());
        const owner=leading?.[1] || trailing?.[1] || trailing?.[2];
        const words=prose.slice(p.start,p.end);
        return {...p,actor:owner ? decisionSubject(state,owner) : null,attributed:!!owner,
            predicate:words,choice:decisionOf(words),collective:/^we\b/i.test(words.trim()),spoken:true};
    });
    let start=0;
    for (const boundary of prose.matchAll(/[.!?;\n]+|,?\s+but\s+|$/gi)) {
        const end=boundary.index, begin=start;
        start=end+boundary[0].length;
        const clause=prose.slice(begin,end).trim();
        if (!clause || boundary[0].includes('?')) continue;
        const parts=clause.split(/\s+/);
        for (let split=1;split<parts.length;split++) {
            const predicate=parts.slice(split).join(' ');
            const choice=decisionOf(predicate) || (/^demands?\s/i.test(predicate) ? 'counter' : null);
            if (!choice) continue;
            const actor=decisionSubject(state,parts.slice(0,split).join(' '));
            if (actor && narratedEvent(prose,clause,{minWords:2}).ok)
                records.push({actor,choice,predicate,start:begin,end});
            break;
        }
    }
    return records;
}

function citedDecision(records,prose,evidence) {
    const at=findQuote(prose,evidence);
    if (at.state!=='found') return {};
    const matches=records.filter(p=>p.start<at.end && at.start<p.end);
    if (matches.length!==1) return {};
    const record=matches[0];
    if (['accept','refuse'].includes(record.choice) && findQuote(evidence,record.predicate).state!=='found') return {};
    return record;
}

export function reactionError(state,content,r,prose) {
    const n=state.encounter?.negotiation;
    if (n?.stage!=='offered' || r?.offer!==n.id || !['accept','refuse','counter'].includes(r?.choice)) return 'No definite response to this current offer.';
    const eligible=negotiators(state);
    if (!eligible.some(c=>c.id===r.speaker) || n.target && n.target!==r.speaker || !hasWords(prose,r.evidence)) return 'Identify the addressed speaker and their exact decision.';
    const records=decisionRecords(state,prose);
    const decision=citedDecision(records,prose,r.evidence);
    const members=r.members;
    if(r.allies != null) {
        if(!Array.isArray(r.allies) || (!n.group || r.choice==='refuse') && r.allies.length) return 'Only the requested group may consent.';
        if(new Set(r.allies.map(a=>a?.id)).size!==r.allies.length) return 'Duplicate ally.';
        for(const ally of r.allies) {
            const a=state.encounter?.combatants[ally?.id];
            const assent=citedDecision(records,prose,ally?.evidence);
            if(!a || a.id==='pc' || !state.encounter.participation?.[a.id] || a.current.defeated || a.current.escaped ||
                assent.actor!==a.id || assent.choice!=='accept' || records.some(x=>x.actor===a.id && x.choice==='refuse'))
                return 'Quote the living ally personally accepting the same group agreement.';
            const pledges=ally.pledges ?? [];
            if(!Array.isArray(pledges) || new Set(pledges.map(p=>p?.object)).size!==pledges.length) return 'Duplicate or malformed ally pledge.';
            for(const p of pledges) {
                const item=allyAssets(state,content,ally.id).find(a=>a.object===p?.object);
                const quote=findQuote(prose,p?.quote);
                const spoken=records.find(v=>v.spoken && v.actor===ally.id && quote.state==='found' && quote.start>=v.start && quote.end<=v.end);
                if(!item || !spoken || !Number.isSafeInteger(p.qty) || p.qty<=0 || p.qty>item.qty ||
                    !/^I (?:give|hand over|offer) (?:my |the )?/i.test(spoken.predicate) || noCommit.test(spoken.predicate) ||
                    !spoken.predicate.toLowerCase().includes(p.quote.toLowerCase()) || /\b(?:if|unless|but)\b|\?/i.test(spoken.predicate))
                    return 'Missing voluntary handover by the owner of the pledged property.';
                if(item.object==='coin' ? coinEvidence(p.quote,content).cp!==p.qty :
                   !p.quote.toLowerCase().includes(item.name.toLowerCase()) || p.qty!==1 && !numbersIn(p.quote).has(p.qty))
                    return 'The source or quantity of the ally pledge differs from their words.';
            }
        }
    }
    if (r.choice==='refuse') {
        if (members!=null && (!Array.isArray(members) || members.length)) return 'A refusal has no consenting members.';
    } else if (!Array.isArray(members) || !members.some(m=>m?.id===r.speaker) || new Set(members.map(m=>m?.id)).size!==members.length) {
        return 'List the distinct participants including the speaker.';
    }
    if (r.choice!=='counter' && (decision.choice!==r.choice || decision.actor!==r.speaker))
        return 'Quote the identified speaker actually accepting or refusing this offer.';
    if (!Array.isArray(r.terms) || r.choice!=='counter' && r.terms.length) return 'Only a counteroffer can change the terms.';
    if (r.choice==='counter') {
        if (decision.choice && decision.choice!=='counter' || (decision.actor || decision.attributed) && decision.actor!==r.speaker)
            return 'Quote the actual demand of this speaker.';
        const words=decision.spoken ? prose.slice(decision.start,decision.end) : '';
        // Spoken demands can be imperatives or a list of the goods themselves, as in the archived ultimatum.
        // Inspect the whole first sentence, independent of how the extractor crops the evidence.
        const first=cleanStatement(words.split(/[.!?]/)[0]);
        const item=first.replace(/^(?:the |your )?(?:whole )?/,'');
        const goods=surrenderAssets(state,content).filter(a=>a.object!=='coin');
        const namedGood=r.terms.some(t=>goods.some(a=>a.object===t?.object &&
            a.name.toLowerCase().split(/\s+/).at(-1)===item));
        const quotedDemand=words && !/^[^.!?]*\?/.test(words) &&
            (/^(?:give|hand|leave|pay|bring|promise|drop|surrender)\b/.test(first) || namedGood);
        if (decision.choice!=='counter' && !quotedDemand) return 'Quote a concrete demand.';
        const source=words || prose.slice(decision.start,decision.end);
        const error=checkTerms(state,content,r.terms,{text:source,credit:n.released,counter:true});
        if (error) return error;
        const demand=source.toLowerCase().split(/\b(?:out of|from|contents of)\b/)[0];
        const price=coinEvidence(demand,content);
        if (price.complete && price.cp>0 && !r.terms.some(t=>t.object==='coin' && t.qty===price.cp+(additionalPrice(demand)?n.released.find(l=>l.object==='coin')?.qty || 0:0)))
            return 'Include the exact demanded coin amount.';
        for (const good of goods) {
            const noun=good.name.toLowerCase().trim().split(/\s+/).at(-1);
            if (noun.length<3 || !demand.match(/[\p{L}]+/gu)?.includes(noun)) continue;
            if (!r.terms.some(t=>goods.some(g=>g.object===t.object && g.name.toLowerCase().split(/\s+/).at(-1)===noun)))
                return 'Include the specifically demanded '+good.name+'.';
        }
    }
    const claimed=new Set([r.speaker,...(members || []).map(m=>m?.id)]);
    const contrary=r.choice==='refuse'?'accept':'refuse';
    if (records.some(record=>record.choice===contrary && (claimed.has(record.actor) || record.actor==='party')))
        return 'A claimed participant gives a conflicting decision in the reply.';
    for (const m of members || []) {
        if (!eligible.some(c=>c.id===m?.id) || !hasWords(prose,m.evidence)) return 'Unknown participant or missing literal evidence.';
        const joined=citedDecision(records,prose,m.evidence);
        if (m.id===r.speaker && joined===decision) continue;
        const entireParty=joined.actor==='party' && !n.target && members.length===eligible.length;
        const represented=joined.collective && joined.actor===r.speaker && state.entities[m.id].group &&
            state.entities[m.id].group===state.entities[r.speaker].group;
        if (joined.choice!=='accept' || joined.actor!==m.id && !entireParty && !represented)
            return 'Quote this participant’s own assent or an explicit collective assent.';
    }
    return null;
}

/** Concrete property an ally can personally pledge in the reply to a group offer. */
export function allyAssets(s,content,who) {
    const sh=s.entities[who]?.sheet;
    if(!sh) return [];
    const list=[{object:'coin',name:'coin',qty:sh.coin_cp}];
    for(const [slot,item] of Object.entries(sh.equipment || {})) {
        const obj=s.objects[item?.object];
        const gear=typeof item==='string'?content.items.get(item):item;
        if(gear) list.push({object:'worn.'+slot,name:gear.name,qty:1,slot,gear,ref:obj?.id,wornTemplate:typeof item==='string'?item:null});
    }
    for(const [id,qty] of Object.entries(sh.inventory || {})) if(!s.objects[id] && qty>0)
        list.push({object:'item.'+id,template:id,name:content.items.get(id)?.name || id,qty});
    for(const o of Object.values(s.objects)) if(o.holder?.entity===who && !list.some(a=>a.ref===o.id))
        list.push({object:o.id,name:o.name,qty:o.qty ?? 1,ref:o.id});
    return list;
}

export function allyReceiptEvents(s,content,reply) {
    const events=[], receipts=[];
    for(const m of reply.allies || []) for(const p of m.pledges || []) {
        const a=allyAssets(s,content,m.id).find(a=>a.object===p.object);
        if(!a || a.qty<p.qty || !Number.isSafeInteger(p.qty) || p.qty<1) throw Error('Pledged property is no longer available.');
        const recipient={entity:reply.speaker};
        if(a.object==='coin') {
            events.push({t:'coin.changed',d:{id:m.id,value:s.entities[m.id].sheet.coin_cp-p.qty,delta:-p.qty,why:'agreed surrender'}});
            events.push({t:'object.created',d:{object:{id:'obj.'+s.encounter.negotiation.id+'.'+m.id+'.coin',name:'Loose coin',kind:'item',qty:p.qty,unit:'cp',holder:recipient,source:{surrender_cp:1}}}});
            events.push({t:'transaction.completed',d:{from:m.id,to:reply.speaker,cp:p.qty,for:'combat surrender'}});
        } else {
            if(a.slot) events.push({t:'item.equipped',d:{id:m.id,slot:a.slot,item:null}});
            if(a.ref) events.push({t:'object.moved',d:{id:a.ref,to:recipient,...p.qty<a.qty?{qty:p.qty,split:a.ref+'.'+s.encounter.negotiation.id}:{}}});
            else {
                if(a.template) events.push({t:'item.changed',d:{id:m.id,item:a.template,qty:-p.qty}});
                const id='obj.'+s.encounter.negotiation.id+'.'+m.id+'.'+p.object;
                events.push({t:'object.created',d:{object:{id,kind:'item',name:a.name,qty:p.qty,holder:recipient,...a.gear?{profile:{...a.gear,kind:'gear'}}:{},source:{how:'given',from:m.id,template:a.template || a.wornTemplate || a.gear?.id}}}});
            }
        }
        receipts.push({owner:m.id,object:p.object,qty:p.qty,to:reply.speaker,at:s.scene.at});
    }
    return {events,receipts};
}
