// Chain B: original wrong T9/T10 state; at T11 the planner targets the known dungeon id. Archived X for T11.
export const answer = (i, purpose, raw) => {
    if (i === 21 && purpose === 'plan') return JSON.stringify({commands: [{seq: 1, type: 'go', to: 'loc.old_crown_catacombs', quote: 'i enter the dungeon', within: null}]});
    return raw;
};
// the model repeats its (correct) report on the repair request: the archived first T11 answer
import fs from 'node:fs';
const first = JSON.parse(fs.readFileSync(new URL(process.env.U17_ANSWERS || '../u17/answers.json', import.meta.url), 'utf8')).answers[22][0].content;
export const extra = (i, purpose) => (i === 22 && purpose === 'extract_repair' ? first : null);
