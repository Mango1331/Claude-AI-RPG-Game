// Build .144 (finance simplification S1, patch_plans_10b/PATCH_FINANCE_SIMPLIFICATION.md §6, §10.1): the only way a
// free payment (tip, gift, debt, compensation) is paid. His story words make a payment card (src/v4/commands.js
// paymentProposal); his own message "#pay <id>", sent on its own, pays exactly that card. No model is asked, no story
// turn runs: the engine checks the card against the state and books coin, transaction and the card's close together.
//
// The card is valid until his next acting message or a change of place (resolveCommands closes it then); a status panel
// keeps it. The close carries the card it saw (expect: route, payee, amount, place, purpose and its source – message,
// the hash of its words, the step), checked before the coin: an edited or deleted card message stops the fold
// (src/v4/domain.js, src/host.js foldBlock) instead of booking the old coin again.
import { entityLabel } from '../knowledge.js';
import { formatCoin } from '../economy.js';
import { cardSnapshot } from './domain.js';

const ALONE = /^\s*#\s*pay\s+(\S+)\s*$/i;
const cpText = (cp, content) => `${cp} cp${cp >= 10 ? ` (${formatCoin(cp, content)})` : ''}`;
const present = (s, id) => typeof id === 'string' && (s.scene?.present || []).includes(id) && s.entities[id]?.status !== 'dead';

/** The card id of a message that is exactly "#pay <id>", else null. */
export function payCommandId(text) {
    const m = String(text ?? '').match(ALONE);
    return m ? m[1] : null;
}

/**
 * "#pay <id>": the events that pay the card, or the reason nothing was paid.
 * @returns {{events: object[], line: string, paid: boolean}}
 */
export function nativePay(s, content, text) {
    const no = (why) => ({ events: [], paid: false, line: `NOT PAID — ${why} Nothing changed hands.` });
    const id = payCommandId(text);
    if (!id) return no('#pay must be sent as a message of its own with exactly one payment card id: #pay <id>.');
    if (s.meta?.runtime !== 'v4') return no('there are no payment cards in this campaign.');
    const d = (s.decisions || []).find((x) => x.id === id);
    if (!d) return no(`there is no open payment card ${id} (it was paid, replaced, or lapsed with his next action or a change of place).`);
    if (d.kind !== 'payment' || d.route !== 'free' || d.state !== 'needs_confirmation' || !Number.isInteger(d.amount_cp) || d.amount_cp <= 0)
        return no(`${id} is no payment card #pay can pay (a fee, an offer or a payment without a known amount is settled by its own way).`);
    if (d.turn !== s.turn) return no(`the payment card ${id} lapsed with his next action.`);
    if (d.at !== s.scene.at) return no(`the payment card ${id} lapsed: he is no longer where it was made.`);
    if (!present(s, d.seller)) return no(`${entityLabel(s, d.seller)} is not here any more.`);
    const coin = s.entities.pc.sheet.coin_cp;
    if (coin < d.amount_cp) return no(`${cpText(d.amount_cp, content)} needed, he has ${coin} cp.`);
    const what = d.what && d.what !== 'a payment' ? d.what : null;
    const name = entityLabel(s, d.seller);
    const events = [
        { t: 'decision.closed', d: { id, status: 'accepted', expect: cardSnapshot(d) } },
        { t: 'coin.changed', d: { id: 'pc', value: coin - d.amount_cp, delta: -d.amount_cp, why: `paid ${name}${what ? ` for ${what}` : ''}` } },
        { t: 'transaction.completed', d: { to: d.seller, cp: d.amount_cp, for: what, decision: id, native: true } },
    ];
    return { events, paid: true, line: `PAID — ${cpText(d.amount_cp, content)} to ${name}${what ? ` for ${what}` : ''} (card ${id}). Wallet ${coin} cp → ${coin - d.amount_cp} cp.` };
}

/** The story's fact about a card paid between two story messages: the next reply tells it as done (host turnBlock). */
export function paidCardFacts(s, events) {
    return (events || []).filter((e) => e?.t === 'transaction.completed' && e.d?.native).map((e) =>
        `PAID BEFORE THIS INPUT (#pay ${e.d.decision}): Alaric handed ${entityLabel(s, e.d.to)} ${e.d.cp} cp${e.d.for ? ` for ${e.d.for}` : ''}. It is done: narrate it as given, ask for no further confirmation and do not pay it again.`);
}
