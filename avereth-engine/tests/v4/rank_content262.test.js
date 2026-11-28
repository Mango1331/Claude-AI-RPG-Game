import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadContentPack } from '../../src/content.js';
import { validEncounterLevels, validPopulationLevels } from '../../src/v4/domain.js';
import { boardRequest, listingSchema } from '../../src/v4/guild.js';
import { gearMarketText, gearOfferProfile, gearRetailPrice } from '../../src/v4/items.js';
import { extractorSystem } from '../../src/v4/extract.js';
import { passiveDefErrors } from '../../src/passives.js';
import { composeSkill } from '../../src/skill_composer.js';
import { loadProductContent } from '../helpers.js';

// Artificial pack only. Deliberately unrelated outdoor, guild, market, acquisition and passive settings.
const synthetic = await loadContentPack(async filename => {
    const data = JSON.parse(await readFile(new URL('../../content/' + filename, import.meta.url)));
    if (filename === 'monsters.json') data.outdoor.E = {windows:[[22,23]], danger:'Synthetic test terrain.'};
    if (filename === 'rules.json') {
        data.guild.outdoor_boards.Proven = {introduction:'synthetic intro', open:'test board', payout:'test payout', legacy:'test legacy', legacy_required_levels:[]};
        data.composer.entry_complexity = 2;
        data.passive_design.rank = 'E';
    }
    if (filename === 'gear.json') {
        data.instances.market_rank = 'E';
        data.instances.weapon_prices.E = {common:123};
    }
    return data;
});
const current = await loadProductContent();
test('outdoor windows and subranges, area schema, board bounds and extractor words read only enabled content', () => {
    for (const c of [current, synthetic]) {
        const enabled = c === synthetic;
        assert.equal(validEncounterLevels(c,[22,23]), enabled);
        assert.equal(validPopulationLevels(c,[22,22]), enabled);
        assert.equal(validPopulationLevels(c,[13,22]), false);
        assert.equal(validEncounterLevels(c,[2,6]), false);
        assert.equal(validPopulationLevels(c,[2,6]), true);
        assert.equal(c.deltaVocab.deltas.find(d=>d.type==='area').fields.max_level.max, enabled?23:14);
        assert.equal(JSON.stringify(listingSchema(c)).includes('"maximum":23'), enabled);
        assert.equal(extractorSystem(c.deltaVocab).includes('12-14,22-23'), enabled);
    }
});
test('a synthetic board requires its own guild profile and the configured power-rank windows', () => {
    const need = {rank:'Proven', branch:'town', missing:5, have:[], c:true, progression:true};
    const s = {places:{town:{id:'town',name:'Town'}}, entities:{}, quests:{}, meta:{}, guild:{}, scene:{at:'town'}};
    const messages = JSON.stringify(boardRequest(s, synthetic, need).messages);
    assert.match(messages,/test payout/);
    assert.match(messages,/Allowed fixed population windows: 22-23/);
    assert.doesNotMatch(JSON.stringify(boardRequest(s,current,need).messages),/Allowed fixed population windows/);
});
test('market, crafted skills and passive bounds use separate parameters', () => {
    const offer = {base:'staff',quality:'common'};
    const staff = gearOfferProfile(synthetic,offer);
    assert.equal(staff.rank,'E');
    assert.equal(gearRetailPrice(synthetic,staff),123);
    assert.equal(gearOfferProfile(current,offer).rank,'F');
    assert.match(gearMarketText(synthetic,true),/Regular E retail/);
    const input = {fn:'bolt',tags:null,origin:{kind:'engine'}};
    const s = {entities:{pc:{sheet:{skills:{}}}}, skill_defs:{}};
    const result = composeSkill(s,synthetic,input);
    assert.equal(result.def.complexity,2);
    assert.equal(result.def.rank,'F');
    const passive = {rank:'E',effects:[]};
    assert.ok(passiveDefErrors(passive,current).some(x=>x.startsWith('rank ')));
    assert.ok(!passiveDefErrors(passive,synthetic).some(x=>x.startsWith('rank ')));
});
