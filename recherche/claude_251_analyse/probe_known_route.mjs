// Isolated probe of .251 chosenKnownRoute (src/v4/known_routes.js) on a minimal controlled state: Alaric is in the
// rented room above The Slaked Lime; the inn and the market square are previously visited places of the same town.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const { chosenKnownRoute, knownRoutes } = await import(pathToFileURL(path.join(process.argv[2], 'src/v4/known_routes.js')).href);
const s = {
  places: {
    'realm.v': { id: 'realm.v', name: 'Valedorn Crown', kind: 'realm', parent: null },
    'loc.town': { id: 'loc.town', name: 'Alderwatch', kind: 'settlement', parent: 'realm.v' },
    'loc.inn': { id: 'loc.inn', name: 'The Slaked Lime', kind: 'site', parent: 'loc.town' },
    'loc.room': { id: 'loc.room', name: 'Upstairs room at The Slaked Lime', kind: 'interior', parent: 'loc.inn' },
    'loc.market': { id: 'loc.market', name: 'market square', kind: 'site', parent: 'loc.town' },
  },
  entities: { pc: { id: 'pc', kind: 'pc', name: 'Alaric Red' }, 'npc.ossen': { id: 'npc.ossen', kind: 'npc', name: 'Ossen', status: 'alive' } },
  scene: { at: 'loc.room', present: ['pc', 'npc.ossen'], history: ['loc.market', 'loc.inn'] },
  dungeons: {},
};
console.log('known routes:', knownRoutes(s));
for (const t of [
  'I go back to The Slaked Lime.',
  'I return to the common room of The Slaked Lime to see Madge.',
  'I head downstairs to The Slaked Lime.',
  'Back down to The Slaked Lime.',
  'Ossen and I head back to the market square.',
  'Ossen, let us go back to the market square.',
  'Let\'s go to the market square.',
  'I make my way back to the market square.',
  'I walk over to the market square.',
  'I leave the room and go down to the common room.',
  'Time to go to the market square, I think.',
]) console.log(String(chosenKnownRoute(s, t)).padEnd(12), t);
