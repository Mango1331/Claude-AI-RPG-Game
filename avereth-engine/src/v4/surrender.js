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
