// Deterministic payout projection conditional on successful encounters / completed contracts.
// The site itinerary is fixed before play; it never scales a foe to the party's level.
import {load} from './combat.mjs';
import {awardXp, defeatXp, questXp, splitPool} from '../../src/progression.js';
import {rankOf} from '../../src/derived.js';
const c = await load();
const bands = [1,3,4,7,8,11,12,14];
const styles = {
    guild: ['quest','quest','fight'],
    exploration: ['fight','fight','fight','fight','quest'],
    mixed: ['fight','fight','quest'],
};
function project(style, partySize, itinerary) {
    const ids = ['pc','companion'].slice(0,partySize);
    const sheets = Object.fromEntries(ids.map(id => [id,{level:1,xp:0,class:id==='pc'?'mage':'warrior'}]));
    const levels = [], count = {quest:0, fight:0};
    const sources = {quest:0, fight:0};
    let statPoints = 0;
    for (let i=0; sheets.pc.level<15; i++) {
        const kind = styles[style][i % styles[style].length];
        const level = itinerary === 'low' ? 1 : bands[Math.min(bands.length-1, Math.floor(i/4))];
        const pool = kind === 'quest' ? questXp(level,level<=3?'minor':'standard',c)
            : defeatXp(level,'normal',rankOf(sheets.pc.level,c),c);
        count[kind]++;
        for (const [id, share] of Object.entries(splitPool(pool, ids))) {
            const sh = sheets[id];
            if (id==='pc') sources[kind]+=share;
            for (const {t,d} of awardXp(sh, share, c, kind, id)) {
                if(t==='xp.changed') sh.xp = d.xp;
                if(t==='stat.assigned') statPoints += d.amount;
                if(t==='level.up') {
                    sh.level = d.level;
                    sh.xp = d.xp_after;
                    if(id==='pc') levels.push({level:sh.level, ...count});
                }
            }
        }
    }
    return {style, partySize,itinerary,count,sources,sheets, npcStatPoints:statPoints,levels};
}
const rows=[];
for(const style of Object.keys(styles)) for(const size of [1,2]) for(const itinerary of ['low','outward'])
    rows.push(project(style,size,itinerary));
console.log(JSON.stringify({bands,actionsPerBand:4,styles,threshold:Array.from({length:14},(_,i)=>(i+1)*c.rules.progression.xp_to_next_per_level).reduce((a,b)=>a+b), examples:bands.map(level=>({level,normal:defeatXp(level,'normal','F',c),minor:questXp(level,'minor',c),standard:questXp(level,'standard',c)})),rows},null,2));
