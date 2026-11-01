// Build .144 (finance simplification S1): test helpers for payment cards. A free payment is a card; only the player's
// own "#pay <id>" message pays it (src/v4/native_pay.js). These helpers run exactly that native action on a state.
import { nativePay } from '../../src/v4/native_pay.js';
import { applyEvent } from '../../src/state.js';

/** The open payment cards (free payments waiting for "#pay"). */
export const openCards = (s) => (s.decisions || []).filter((d) => d.kind === 'payment' && d.state === 'needs_confirmation');
/** "#pay <id>" on a state (as the native command does): the result with its events, applied to s. */
export function payCard(s, content, id) {
    const r = nativePay(s, content, `#pay ${id}`);
    for (const e of r.events) applyEvent(s, e);
    return r;
}
/** Pay every open card (a test of a clear payment's booking: the card, then his #pay). */
export function payAllCards(s, content) {
    return openCards(s).map((d) => payCard(s, content, d.id));
}
