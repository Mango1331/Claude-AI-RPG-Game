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
    return owners.length === 1 && owners[0] === who ? words : null;
}

function termsFrom(s, content, c, words) {
    if (c.quest && s.quests[c.quest]?.status !== 'active') return null;
    const terms = { quest:c.quest || null, combat:c.combat === true, text:c.quote };
    if (terms.combat && !together.test(words) && !/\b(?:fight|battle|guard|protect|defend)\b/i.test(words)) return null;
    const half = /\b(?:half each|halves|half (?:of|the)|fifty.fifty|split (?:it |the (?:pay|reward|money) )?(?:evenly|equally)|equal shares)\b/i.test(words);
    if (c.share === 'half' && (!half || !terms.quest)) return null;
    if (half && c.share !== 'half' && c.quest) return null;
    if (c.share === 'half') terms.half = true;
    if (c.amount != null) {
        const m = moneyLiteral(words, c.money || '', { content });
        if (!c.quest || m.cp !== c.amount || !Number.isSafeInteger(c.amount) || c.amount <= 0 || terms.half) return null;
        terms.cp = c.amount;
    }
    return terms;
}

export function partyDecision(s, content, command, source, actor, emit) {
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
        if (!together.test(c.quote) || no.test(c.quote)) return failure('Quote the specific voluntary offer.');
        const terms = termsFrom(s, content, c, c.quote);
        if (!terms) return failure('The work and compensation must match the quoted terms.');
        const id = 'party.'+who+'.'+s.turn+'.'+hash32(JSON.stringify([actor,c.seq,c.quote]));
        if (s.party?.agreements?.[id]) return failure('Offer already recorded.');
        emit({t:'party.agreement',d:{id,who,phase:'open',terms,proposer:actor,source:sourceRef,previous:0}});
    } else if (['accept','decline'].includes(c.act)) {
        if (!agreement || agreement.who !== who || agreement.phase !== 'open' || agreement.proposer === actor) return failure('Identify one current offer from the other party.');
        if (c.act === 'accept' ? (!yes.test(c.quote) || no.test(words) || /\b(?:instead|only (?:pay|give)|on condition)\b/i.test(words)) : !no.test(c.quote)) return failure('Quote a definite response to the unchanged terms.');
        const accepts = c.act === 'accept';
        if (accepts && agreement.terms.quest) {
            const q = s.quests[agreement.terms.quest];
            if (!q || q.status !== 'active') return failure('Quest is no longer active.');
            const cost = a => a.terms.half ? Math.floor(q.payout_cp/2) : a.terms.cp || 0;
            const others = membersOf(s).filter(m => m.who !== who).map(m=>s.party.agreements[m.agreement]).filter(a=>a?.terms.quest === q.id);
            if (others.reduce((sum,a)=>sum+cost(a),cost(agreement)) > q.payout_cp) return failure('The promised shares exceed this reward.');
        }
        emit({t:'party.agreement',d:{...agreement,phase:accepts?'accepted':'declined',answer:sourceRef,previous:agreement.revision}});
        if (accepts) memberEvent('follow',{agreement:agreement.id,combat:agreement.terms.combat});
    } else if (c.act==='coordinate') {
        if (!member?.combat || member.mode!=='follow') return failure('Only a present combat partner can coordinate.');
        const kinds={target:/\b(?:target|attack|shoot|take on|focus)\b/i,protect:/\b(?:guard|cover|protect|shield|keep.+off|defend)\b/i,independent:/\b(?:independent|own|your call|freely)\b/i,front:/\b(?:front|point|ahead|lead)\b/i,rear:/\b(?:rear|behind|back)\b/i};
        if (!kinds[c.priority]?.test(c.quote) || no.test(words)) return failure('Quote the tactical request or decision.');
        if (['target','protect'].includes(c.priority) && (c.target!=='pc' && !s.scene.present.includes(c.target))) return failure('Identify the present target.');
        const changes=['front','rear'].includes(c.priority) ? {formation:c.priority} : {priority:{kind:c.priority,target:c.target || null}};
        memberEvent(member.mode,changes);
    } else {
        if (!member || member.mode==='left') return failure('No active membership.');
        const actions = {wait:/\b(?:wait|stay|hold here)\b/i,follow:/\b(?:follow|come|rejoin|together)\b/i,leave:/\b(?:leave|quit|part ways|go alone|split up|dismiss|on my own)\b/i};
        if (!actions[c.act]?.test(c.quote)) return failure('Quote the change of travel arrangement.');
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
    const lines = membersOf(s).map(m => {
        const e = s.entities[m.who];
        return [m.who,e?.name,m.mode,m.combat?'combat ready':'traveller',m.agreement].join(' · ');
    });
    for (const a of agreementsOf(s).filter(a=>a.phase==='open')) lines.push(a.id+' · '+a.proposer+' offers '+a.who+': '+a.terms.text);
    return lines;
}
