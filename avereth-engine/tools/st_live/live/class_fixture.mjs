// Explicit fixture for the isolated test runner only. No debug command is installed in the product.
import { loadProductContent } from '../../../tests/helpers.js';
import { classFixture } from '../../../tests/v4/patch9d_fixtures.js';
import { inject } from '../../../tests/v4/patch8_lib.js';
import { assignStat } from '../../../src/progression.js';
import { deriveCharacter } from '../../../src/derived.js';

export const CLASS_FIXTURES = ['9d-normal', '9d-rare', '9d-extreme', '9d-defense', '9d-hybrid'];
export async function makeClassFixture(id, seed, card) {
    if (!CLASS_FIXTURES.includes(id)) throw new Error(`Unknown isolated class fixture ${id}`);
    const profile = { '9d-normal':'normal','9d-rare':'experienced','9d-extreme':'extreme','9d-defense':'defense','9d-hybrid':'hybrid' }[id];
    const content = await loadProductContent();
    const g = await classFixture(content, { profile, seed });
    // Complete the synthetic old level-ups here, leaving only Level 15's real points for the live player.
    const free = g.state().entities.pc.sheet.free_points;
    const first = Math.floor(free * (profile === 'defense' ? 0.3 : profile === 'hybrid' ? 0.4 : 0.6));
    const assignments = profile === 'hybrid' ? [['INT', first], ['STR', Math.floor((free - first) / 2)], ['VIT', free - first - Math.floor((free - first) / 2)]]
        : [['STR', first], ['VIT', free - first]];
    for (const [stat, amount] of assignments) if (amount) inject(g, assignStat(g.state().entities.pc.sheet, stat, amount, content).events);
    const dv = deriveCharacter(g.state().entities.pc.sheet, content);
    inject(g, [['hp', dv.maxHp], ['mp', dv.maxMp], ['sta', dv.maxSta]].map(([resource, value]) => ({ t: 'resource.changed', d: { id: 'pc', resource, value } })));
    const messages = structuredClone(g.chat).map((m) => {
        if (!m.is_user) m.name = card;
        if (m.extra?.avereth) delete m.extra.avereth.perf; // setup timing is not a provider measurement
        return m;
    });
    messages.push({ name:card, is_user:false, is_system:true, mes:`[SYSTEM // EXPLICIT TEST FIXTURE] Level 14, one XP before E. Profile ${id}, seed ${seed}. Career history is synthetic test data; subsequent XP and choices use the normal engine.`, extra:{avereth_panel:true} });
    return messages;
}
