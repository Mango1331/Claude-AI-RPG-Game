import fs from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const base=resolve(process.argv[2]);
const {knownRoutes,chosenKnownRoute}=await import(pathToFileURL(resolve(base,'src/v4/known_routes.js')));
const read=(arm,file)=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../../testrun_10b/openrouter-20261127-'+arm+'/'+file+'.json.gz',import.meta.url))));
const room=read('willow-247','world-0'), inn='loc.alderwatch.the_slaked_lime';
assert.ok(knownRoutes(room).includes(inn));
for(const words of ["I walk to the window.","I walk to the counter.","I might go to The Slaked Lime.","Should I go to The Slaked Lime?","I go to The Slaked Lime only if she opens the door.","I look downstairs towards The Slaked Lime."]){
    assert.equal(chosenKnownRoute(room,words),null,words);
}
const busy=structuredClone(room);
busy.pending_combat=['unresolved threat'];
assert.deepEqual(knownRoutes(busy),[]);
busy.pending_combat=[];busy.encounter={phase:'ACTIVE'};
assert.deepEqual(knownRoutes(busy),[]);
const omitted=structuredClone(room);omitted.scene.history=omitted.scene.history.filter(id=>id!==inn);
assert.ok(!knownRoutes(omitted).includes(inn));
const field=read('cypress-250','last-verified-world');
assert.ok(!knownRoutes(field).some(id=>id.startsWith('loc.old_crown_catacombs')));
console.log('Known inn accessible. Six non-authorising choices, live/pending combat, unvisited parent and remote Dungeon excluded.');
