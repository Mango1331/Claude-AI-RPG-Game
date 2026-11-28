// Each arm uses its own actual pack. All modifications below are transient test inputs.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
for(const engine of process.argv.slice(2)){
    const imp = f=>import(pathToFileURL(path.resolve(engine,f)));
    const {loadContentPack}=await imp('src/content.js');
    const c = await loadContentPack(async name=>{
        const d=JSON.parse(fs.readFileSync(path.resolve(engine,'content',name)));
        if(name==='monsters.json'){
            d.outdoor??={F:{windows:d.encounter_windows,danger:'synthetic'}};
            d.outdoor.E={windows:[[22,23]],danger:'synthetic test'};
        }
        if(name==='gear.json'){
            d.instances.market_rank='E';
            d.instances.weapon_prices={E:{common:123}};
        }
        return d;
    });
    const {validEncounterLevels}=await imp('src/v4/domain.js');
    const {extractorSystem}=await imp('src/v4/extract.js');
    const {gearOfferProfile,gearRetailPrice}=await imp('src/v4/items.js');
    const staff=gearOfferProfile(c,{base:'staff',quality:'common'});
    const x=extractorSystem(c.deltaVocab);
    console.log(JSON.stringify({engine:(await imp('src/util.js')).ENGINE_VERSION,validArea:validEncounterLevels(c,[22,23]),
        max:c.deltaVocab.deltas.find(d=>d.type==='area').fields.max_level.max,
        reportableWindow:x.includes('12-14,22-23'),extractorMarket:x.includes('Regular E gear offers'),
        itemRank:staff.rank,retail:gearRetailPrice(c,staff)}));
}
