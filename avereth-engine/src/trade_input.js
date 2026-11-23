// A HUD choice is a request against the folded state. It owns no stock, prices or transactions.
import { personLabel } from './v4/catalog.js';
import { bidSale, tradeObject, heldUnits, pricePositions, offerLocationWhy, offerAvailability,
    tradeTermsWhy, purchaseQuantityLimit } from './v4/trade.js';
import { PLATE_ID } from './v4/guild.js';

export function tradePartners(s) {
    if (!s.scene || s.mode === 'creation' || s.entities.pc?.status === 'dead' || s.encounter || s.pending_combat?.length) return [];
    return s.scene.present.filter(id => {
        const e = s.entities[id];
        return e?.kind === 'npc' && e.status !== 'dead' && (!e.at || e.at === s.scene.at);
    });
}

export function localOffers(s, party) {
    return Object.values(s.offers || {}).filter(o => o.status === 'open' && !o.gate && o.seller === party && !offerLocationWhy(s, o));
}

export function saleStock(s, content) {
    const sheet = s.entities.pc.sheet;
    const refs = [...Object.keys(sheet.inventory || {}).filter(id => !id.startsWith('obj.')).map(id => 'item.' + id),
        ...Object.values(s.objects || {}).filter(o => o.holder?.entity === 'pc').map(o => o.id)];
    const worn = new Set(Object.values(sheet.equipment || {}).map(v => typeof v === 'string' ? v : v?.id));
    return refs.map(id => tradeObject(s, content, id)).filter(o => o && heldUnits(s, o.id) > 0
        && !worn.has(o.id) && o.id !== PLATE_ID && !o.for_quests?.length);
}

const fail = reason => ({ok:false, reason});
const describe = picks => picks.map(p => p.units + ' × ' + p.name).join(', ');

/** Freeze the displayed terms. Running the same function on send reconstructs them from live IDs. */
export function tradeDraft(s, content, {kind, party, offer = null, rows = []}) {
    if (!tradePartners(s).includes(party)) return fail('Die gewählte Person ist hier nicht verfügbar.');
    const who = personLabel(s, content, party);
    const o = offer && localOffers(s, party).find(o => o.id === offer);
    if (offer && !o) return fail('Dieses Angebot ist hier nicht mehr offen.');
    if (!Array.isArray(rows) || rows.some(p => !p || typeof p.id !== 'string' || !Number.isSafeInteger(p.units) || p.units < 1)
        || new Set(rows.map(p => p.id)).size !== rows.length) return fail('Ungültige Position oder Menge.');
    const positions = rows.map(({id,units}) => ({id,units}));
    const selection = {kind, party, at:s.scene.at, offer, rows:positions};
    if (kind === 'trade.ask') {
        if (offer && rows.length) return fail('Gebot oder neue Inventarauswahl wählen.');
        const stock = saleStock(s, content);
        const picks = [];
        for (const {id, units} of positions) {
            const object = stock.find(o => o.id === id);
            if (!object || units > heldUnits(s,id)) return fail('Dieser Bestand ist nicht verfügbar.');
            picks.push({name:object.name,units});
        }
        let label = 'I ask ' + who + ' what wares and prices are available.';
        if (offer) label = 'I ask ' + who + ' for better terms on ' + o.lines.map(l => l.what).join(', ') + '. I have not accepted the deal.';
        if (picks.length) label = 'I ask ' + who + ' for a bid on ' + describe(picks) + '. The goods stay mine until I accept.';
        return {ok:true, selection, label};
    }
    if (kind !== 'trade.accept' || !o || !positions.length) return fail('Zuerst Ware und Menge auswählen.');
    const why = offerAvailability(s, o) || tradeTermsWhy(o, positions.map(p => p.id));
    if (why) return fail(why);
    const picked = o.bid ? bidSale(s, o, null, positions) : pricePositions(o, positions);
    if (picked.error) return fail(picked.error);
    const stock = o.bid ? saleStock(s,content) : [];
    const details = [];
    for (const p of positions) {
        const line = o.lines.find(l => l.id === p.id);
        if (line.kind !== 'goods') return fail('Dienste und Gebühren werden im Gespräch vereinbart.');
        if (o.bid ? !stock.some(item => item.id === line.object) : p.units > purchaseQuantityLimit(s,o,line))
            return fail('Die ausgewählte Ware ist in dieser Menge nicht verfügbar.');
        const cp = o.bid ? (Number.isSafeInteger(line.price_cp) ? pricePositions(o,[p]).picks?.[0]?.cp ?? null : null)
            : picked.picks.find(x=>x.line.id === p.id).cp;
        details.push({name:line.what, units:p.units, cp, object:line.object ?? null});
    }
    if (!Number.isSafeInteger(picked.cp) || picked.cp < 0) return fail('Kein verbindlicher Gesamtpreis.');
    if (!o.bid && s.entities.pc.sheet.coin_cp < picked.cp) return fail('Gesamtpreis ' + picked.cp + ' cp übersteigt dein Guthaben.');
    selection.direction = o.bid ? 'sell' : 'buy';
    selection.total_cp = picked.cp;
    selection.terms = details;
    const label = (o.bid ? 'I sell ' : 'I buy ') + describe(details) + (o.bid ? ' to ' : ' from ') + who + ' for ' + picked.cp + ' cp in total.';
    return {ok:true, selection, label};
}

export function tradeCommands(choice) {
    if (choice.kind === 'trade.accept') return [{seq:1,type:'offer.accept',offer:choice.offer,lines:choice.rows.map(p=>p.id)}];
    if (choice.rows.length) return choice.rows.map(({id,units},i) => ({seq:i+1,type:'sell',object:id,to:choice.party,qty:units}));
    return [{seq:1,type:'other',what:'request trade terms'}];
}

/** Only the host attaches these fields, after matching the immutable selection. */
export function boundTradeCommand(choice, command, label) {
    if (choice.kind === 'trade.accept') return {...command, quote:undefined, hudTrade:choice};
    if (command.type === 'sell') return {...command, quote:undefined, inquiry:true};
    return {...command, quote:label};
}
