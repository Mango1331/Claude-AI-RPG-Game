import { pathToFileURL } from 'node:url';
import path from 'node:path';
const { explicitJourneyClause } = await import(pathToFileURL(path.join(process.argv[2], 'src/v4/known_routes.js')).href);
const cases = [
 "I skirt the main road and walk to the town's market to find a leatherworker.",
 "I return to the market the way I came and tell the leatherworker what I saw.",
 "I walk to the market to find a leatherworker.",
 "I head over to the market square.",
 "I make my way to the city market.",
 "Let's go to the market.",
 "I go back to the market.",
 "I return to the market.",
 "I go downstairs to the common room.",
 "I leave my room and return to the common room of The Slaked Lime.",
 "Back to the inn.",
 "I walk down to the docks.",
 "I go to the village's well.",
];
for (const c of cases) console.log(String(explicitJourneyClause(c)).padEnd(5), c);
