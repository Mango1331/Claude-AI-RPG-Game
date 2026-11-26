import { selectableLine, tradePartners, localOffers, saleStock, tradeDraft } from './trade_input.js';
import { offerLocationWhy, purchaseQuantityLimit, heldUnits } from './v4/trade.js';
import { offerCard } from './v4/items.js';
import { personLabel } from './v4/catalog.js';

function element(tag, text) {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    return el;
}
function numberField(parent, id, title, maximum, step = 1) {
    const label = element('label', title);
    const input = element('input');
    input.type = 'number'; input.min = '0'; input.max = String(maximum); input.step = String(step);
    input.value = '0'; input.dataset.row = id; input.disabled = maximum <= 0;
    label.append(input); parent.append(label);
}
function quantities(parent) {
    return [...parent.querySelectorAll('input[data-row]')].filter(el => !el.disabled && el.value !== '0' && el.value !== '')
        .map(el => ({id:el.dataset.row, units:el.valueAsNumber}));
}
function button(text, click) {
    const b = element('button', text); b.type = 'button'; b.addEventListener('click', click); return b;
}

/** Current composer only. Reading, selecting and composing text have no game side effects. */
export function installTradePanel(parent, { revision, live, submit, draftText, notice }) {
    const trade = element('details'), title = element('summary','Handel');
    trade.id = 'avereth-trade'; trade.className = 'avereth-shop';
    const party = element('select'), source = element('select'), purse = element('span');
    party.setAttribute('aria-label','Gegenpartei'); source.setAttribute('aria-label','Waren und Gebote');
    const rows = element('div'), output = element('output'), buttons = element('div');
    rows.className = 'avereth-quantity-list'; buttons.className = 'avereth-trade-buttons';
    const confirm = button('Bestätigen', () => send(false));
    const ask = button('Verhandeln', () => send(true));
    const free = button('Als freien Text vorbereiten', () => {
        const result = currentChoice(false);
        if (result.ok) draftText(result.label);
        else notice(result.reason);
    });
    const companionLabel = element('label','Zusatztext ist nur Rollenspiel ');
    const companion = element('input'); companion.type = 'checkbox'; companionLabel.append(companion);
    buttons.append(confirm,ask,free,companionLabel); trade.append(title,party,source,purse,rows,output,buttons); parent.append(trade);

    const stats = element('details'), statsTitle = element('summary','Attributpunkte'), points = element('div');
    stats.id = 'avereth-assign'; stats.className = 'avereth-shop'; points.className = 'avereth-quantity-list';
    const allocation = element('output');
    const assign = button('Verteilung vorbereiten', () => {
        if (stamp !== revision()) return notice('Die Welt hat sich geändert. Verteilung erneut wählen.');
        updatePoints(); if (assign.disabled) return;
        const args = quantities(points).map(p => p.id + ' ' + p.units).join(' ');
        draftText('#assign ' + args, true);
    });
    stats.append(statsTitle,points,allocation,assign); parent.append(stats);

    let s, content, stamp, offers = [], selectedLot = false;
    const offer = () => offers.find(o => o.id === source.value);
    function choice(renegotiate) {
        const o = offer();
        if (renegotiate || source.value === 'catalog') return {kind:'trade.ask',party:party.value,offer:o?.id ?? null};
        if (!o) return {kind:'trade.ask',party:party.value,rows:quantities(rows)};
        const selected = selectedLot ? o.lines.map(l => ({id:l.id,units:l.qty})) : quantities(rows);
        return {kind:'trade.accept',party:party.value,offer:o.id,rows:selected};
    }
    function currentChoice(renegotiate) {
        if (stamp !== revision()) return {ok:false,reason:'Die Welt hat sich geändert. Bitte neu auswählen.'};
        return tradeDraft(live(),content,choice(renegotiate));
    }
    function send(renegotiate) {
        const result = currentChoice(renegotiate);
        if (!result.ok) return notice(result.reason);
        submit(result,stamp,!renegotiate && companion.checked);
        companion.checked = false;
    }
    function updatePrice() {
        const c = choice(false), result = tradeDraft(s,content,c);
        const empty = source.value === 'inventory' && !c.rows.length;
        confirm.disabled = !result.ok || empty;
        free.hidden = c.kind !== 'trade.accept';
        free.disabled = confirm.disabled;
        output.textContent = empty ? 'Mengen zum Anbieten auswählen.' : result.ok ? result.label : result.reason;
        if (!offer()) confirm.textContent = source.value === 'catalog' ? 'Sortiment erfragen' : 'Gebot erfragen';
        else {
            const verb = offer().bid ? 'Verkaufen' : 'Kaufen';
            confirm.textContent = result.ok ? verb + ' · ' + result.selection.total_cp + ' cp' : verb;
        }
        ask.hidden = !offer();
        companionLabel.hidden = !offer();
    }
    function drawRows() {
        rows.replaceChildren(); companion.checked = false;
        const o = offer();
        selectedLot = !!o?.bid && !o.lines.every(l=>Number.isSafeInteger(l.price_cp));
        if (source.value === 'inventory') {
            for (const item of saleStock(s,content)) {
                const qty = heldUnits(s,item.id);
                numberField(rows,item.id,item.name + ' · Bestand ' + qty,qty);
            }
        } else if (o) {
            const cards = !o.bid && offerCard(s,content,o);
            for (const [i,l] of o.lines.entries()) {
                const label = o.bid ? l.what + ' ×' + l.qty + (Number.isInteger(l.price_cp) ? ' · ' + l.price_cp + ' cp' : '') : cards[i];
                if (selectedLot || !selectableLine(o, l)) rows.append(element('div', label));
                else {
                    const max = o.bid ? Math.min(l.qty,heldUnits(s,l.object)) : purchaseQuantityLimit(s,o,l);
                    numberField(rows,l.id,label,max,l.price_cp % (l.qty ?? 1) === 0 ? 1 : l.qty);
                }
            }
            if (selectedLot) rows.append(element('div','Paketgebot · gilt für das gesamte Los.'));
            if (o.bid && (o.terms ?? 'firm') !== 'firm') rows.append(element('div',o.condition || 'Kein verbindliches Gebot.'));
        }
        updatePrice();
    }
    function drawSources() {
        offers = localOffers(s,party.value);
        source.replaceChildren();
        for (const o of offers) {
            const label = (o.bid ? 'Gebot' : 'Kaufen') + ' · ' + o.lines.map(l=>l.what).join(', ');
            source.add(new Option(label,o.id));
        }
        source.add(new Option('Verkaufen · eigenes Inventar','inventory'));
        source.add(new Option('Sortiment erfragen','catalog'));
        source.value = offers.find(o=>o.bid)?.id || offers[0]?.id || 'inventory';
        drawRows();
    }
    function updatePoints() {
        const entries = quantities(points), total = entries.reduce((n,p)=>n+p.units,0), budget = s.entities.pc.sheet.free_points;
        const valid = entries.every(p=>Number.isSafeInteger(p.units) && p.units>0) && total<=budget;
        allocation.textContent = valid ? (budget-total) + ' Punkte übrig' : 'Ungültige Verteilung';
        assign.disabled = !valid || !entries.length;
    }
    function draw(trading = trade.open, allocating = stats.open) {
        const now = revision();
        if (now !== stamp) { trading = trade.open; allocating = stats.open; }
        stamp = now; s = live();
        if (trading) {
            const prev = party.value;
            party.replaceChildren();
            for (const id of tradePartners(s)) party.add(new Option(personLabel(s,content,id),id));
            if ([...party.options].some(o=>o.value===prev)) party.value = prev;
            purse.textContent = 'Guthaben ' + s.entities.pc.sheet.coin_cp + ' cp';
            drawSources();
        }
        if (allocating) {
            points.replaceChildren();
            for (const stat of content.rules.stats) numberField(points,stat,stat,s.entities.pc.sheet.free_points);
            updatePoints();
        }
    }
    trade.ontoggle = () => { if (trade.open && !trade.hidden) draw(true,false); };
    stats.ontoggle = () => { if (stats.open && !stats.hidden) draw(false,true); };
    party.onchange = drawSources; source.onchange = drawRows; rows.oninput = updatePrice; points.oninput = updatePoints;
    return function refresh(state, data) {
        content = data; s = state;
        const partners = tradePartners(s);
        trade.hidden = !partners.length;
        const freePoints = s.entities.pc?.sheet?.free_points || 0;
        stats.hidden = !freePoints || s.mode === 'creation' || s.entities.pc.status === 'dead';
        if (trade.hidden) trade.open = false;
        if (stats.hidden) stats.open = false;
        const count = Object.values(s.offers || {}).filter(o=>partners.includes(o.seller) && o.status==='open' && !o.gate && !offerLocationWhy(s,o)).length;
        title.textContent = count ? 'Handel · ' + count + (count === 1 ? ' Angebot' : ' Angebote') : 'Handel';
        statsTitle.textContent = 'Attributpunkte · ' + freePoints + ' frei';
        if ((trade.open || stats.open) && stamp !== revision()) draw();
    };
}
