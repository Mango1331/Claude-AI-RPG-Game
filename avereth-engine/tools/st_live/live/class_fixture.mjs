// Explicit fixture for the isolated test runner only. No debug command is installed in the product.
import { loadProductContent } from '../../../tests/helpers.js';
import { classFixture } from '../../../tests/v4/patch9d_fixtures.js';

export const CLASS_FIXTURES = ['9d-normal', '9d-rare', '9d-extreme', '9d-defense', '9d-hybrid'];
export async function makeClassFixture(id, seed, card) {
    if (!CLASS_FIXTURES.includes(id)) throw new Error(`Unknown isolated class fixture ${id}`);
    const profile = { '9d-normal':'normal','9d-rare':'experienced','9d-extreme':'extreme','9d-defense':'defense','9d-hybrid':'hybrid' }[id];
    const g = await classFixture(await loadProductContent(), { profile, seed });
    const messages = structuredClone(g.chat).map((m) => {
        if (!m.is_user) m.name = card;
        if (m.extra?.avereth) delete m.extra.avereth.perf; // setup timing is not a provider measurement
        return m;
    });
    messages.push({ name:card, is_user:false, is_system:true, mes:`[SYSTEM // EXPLICIT TEST FIXTURE] Level 14, one XP before E. Profile ${id}, seed ${seed}. Career history is synthetic test data; subsequent XP and choices use the normal engine.`, extra:{avereth_panel:true} });
    return messages;
}
