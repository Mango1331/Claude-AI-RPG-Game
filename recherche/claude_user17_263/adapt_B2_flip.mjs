// Chain B2: as B, but on the repair request the model flips expected.arrived to false and keeps its arrive (as in T9).
import fs from 'node:fs';
export {answer} from './adapt_B_recover_T11.mjs';
const first = JSON.parse(JSON.parse(fs.readFileSync(new URL(process.env.U17_ANSWERS || '../u17/answers.json', import.meta.url), 'utf8')).answers[22][0].content);
export const extra = (i, purpose) => (i === 22 && purpose === 'extract_repair' ? JSON.stringify({...first, expected: {1: {arrived: false}}}) : null);
