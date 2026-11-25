// One material line per physical source. Equipped slots and bag copies are separate choices.
import { coinEvidence, numbersIn } from '../economy.js';
import { heldUnits, tradeObject } from './trade.js';

export const negotiators = state => Object.values(state.encounter?.combatants || {}).filter(c =>
    c.side === 'hostile' && c.fixed.sapient && state.entities[c.id]?.kind === 'npc' &&
    state.scene.present.includes(c.id) && c.current.hp > 0 && !c.current.escaped && !c.current.surrendered);

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
const releaseWords = /\b(?:throw|toss|drop|lay|place|put|hand|give|pass|release|werfen|werfe|gebe|übergebe|lege)\b/i;
const currencyWords = /\b(?:all|remaining|rest|whole|alles|gesamte[sn]?)\b[^.!?]{0,35}\b(?:silver|copper|gold|money|coin[s]?|silber|geld|kupfer)\b/i;

export function checkTerms(state,content,lines,{text=null,credit=[],counter=false}={}) {
    if (!Array.isArray(lines)) return 'Select explicit terms or an empty offer.';
    const assets = surrenderAssets(state,content);
    const seen = new Set();
    for (const line of lines) {
        const asset = assets.find(a=>a.object===line?.object);
        const prior = credit.find(a=>a.object===line?.object);
        if ((!asset && !prior) || seen.has(line.object) || !Number.isSafeInteger(line.qty) || line.qty<1 ||
            line.qty>(asset?.qty || 0)+(prior?.qty || 0) || !['offer','give','drop'].includes(line.mode) ||
            counter && line.mode!=='offer') return 'Invalid or unavailable amount, item or handover.';
        seen.add(line.object);
        if (text === null) continue;
        if (!hasWords(text,line.quote)) return 'Each material term needs its own literal evidence.';
        const q=line.quote;
        if (!counter && (noCommit.test(q) || line.mode!=='offer' && (!releaseWords.test(q) || /\b(?:if|offer|promise|would)\b/i.test(q)))) return 'An offer or condition cannot release property.';
        if (line.object==='coin') {
            const money=coinEvidence(q,content);
            if (!(money.complete && money.cp===line.qty) && !(currencyWords.test(q) && line.qty===(asset.qty+(prior?.qty || 0)))) return 'Coin amount is not established.';
        } else {
            const words=(asset?.name || prior.name).toLowerCase().match(/[\p{L}\d]+/gu) || [];
            const named=words.some(w=>w.length>2 && !['starter','simple','small','light','fine','basic','the','and'].includes(w) &&
                q.toLowerCase().includes(w));
            if (!named || line.qty>1 && !numbersIn(q).has(line.qty) && !(/\ball\b/i.test(q) && line.qty===(asset?.qty || 0)+(prior?.qty || 0)))
                return 'Item or quantity is not established by the quoted words.';
        }
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
        '. Already released: '+describeTerms(n.released)+'. From motives, the danger, prior harm and their interests, show a definite acceptance, refusal, or ONE concrete final counteroffer. Identify the speaker and which opponents visibly assent or expressly authorize them. Others remain hostile. Allow their dialogue now. No extra PC decision, condition after acceptance, attack, damage, automatic safety or unbooked transfer.';
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
        {role:'system',content:'You read one reply of a text RPG narrator. Extract ONLY the response to the specific open surrender offer. No attacks, damage, ordinary deltas or new player choices. Return JSON {offer,choice:"accept"|"refuse"|"counter",speaker,members:[{id,evidence}],evidence,terms:[{object,qty,mode:"offer",quote}]}. Quote exact words from the REPLY. Members are only the speaker and eligible opponents who explicitly join, visibly assent or have established the speaker represents them. One person cannot bind independent foes. Distinct evidence for each independently assenting NPC. A counteroffer is a definite final demand. Put ALL material terms in terms, total including delivered units that count towards it. Additional prices are additional. Use exact asset IDs. A demand for the contents of a pouch is coin; the physical pouch only if explicitly demanded. For accept/refuse terms is []. If the response is missing or uncertain say {"choice":"unclear"}. Do not invent assent.'},
        {role:'user',content:JSON.stringify({offer:n.id,addressed:n.target,offerTerms:n.terms,released:n.released,eligible:negotiators(state).map(c=>({id:c.id,label:c.label,description:state.entities[c.id].traits,weapon:state.entities[c.id].sheet?.equipment?.weapon?.name})),assets:surrenderAssets(state,content),reply:prose})},
    ];
}

export function reactionError(state,content,r,prose) {
    const n=state.encounter?.negotiation;
    if (n?.stage!=='offered' || r?.offer!==n.id || !['accept','refuse','counter'].includes(r?.choice)) return 'No definite response to this current offer.';
    const eligible=negotiators(state);
    if (!eligible.some(c=>c.id===r.speaker) || n.target && n.target!==r.speaker || !hasWords(prose,r.evidence)) return 'Identify the addressed speaker and their exact decision.';
    if (!Array.isArray(r.members) || !r.members.some(m=>m?.id===r.speaker) || new Set(r.members.map(m=>m?.id)).size!==r.members.length) return 'List distinct consenting participants including the speaker.';
    const group=state.entities[r.speaker]?.group;
    for (const m of r.members) {
        if (!eligible.some(c=>c.id===m?.id) || !hasWords(prose,m.evidence)) return 'Unknown participant or missing literal assent.';
        if (m.id===r.speaker) continue;
        if (group && state.entities[m.id]?.group===group) continue;
        if (r.members.some(other=>other.id!==m.id && other.evidence===m.evidence)) return 'Separate parties require individual evidence of assent.';
        const npc=state.entities[m.id], fighter=state.encounter.combatants[m.id];
        const words=[npc.name,fighter.label,...String(npc.sheet?.equipment?.weapon?.name || '').split(/\s+/)].filter(Boolean);
        if (!words.some(w=>w.length>2 && m.evidence.toLowerCase().includes(w.toLowerCase()))) return 'The quoted action must identify this independent participant.';
    }
    if (!Array.isArray(r.terms) || r.choice!=='counter' && r.terms.length) return 'Only a counteroffer can change the terms.';
    return checkTerms(state,content,r.terms,{text:prose,credit:n.released,counter:true});
}
