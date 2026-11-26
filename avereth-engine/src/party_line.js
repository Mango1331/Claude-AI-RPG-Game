const bands = ['ENGAGED','SHORT','MEDIUM','LONG'];
export const lineBand = (line,a,b) => bands[Math.min(3,Math.abs(line.x[a]-line.x[b]))];
const bandSteps = b => bands.includes(b) ? bands.indexOf(b) : 2;

export function startLine(s,enc,members) {
    const line = {lo:-3,hi:3,x:{pc:0}};
    for (const id of new Set([...s.scene.present,...Object.keys(enc.combatants)])) {
        if (id==='pc') continue;
        const band = s.scene.positions[id]?.band;
        const back = members.find(m=>m.who===id)?.formation==='rear';
        line.x[id] = (back ? -1 : 1)*bandSteps(band);
    }
    return line;
}

const samePair = ([x,y],a,b) => (x===a && y===b) || (x===b && y===a);
export function protectedPair(enc,a,b) {
    return (enc.agreements || []).some(g=>g.pairs?.some(pair=>samePair(pair,a,b)) && !g.breaches?.some(pair=>samePair(pair,a,b)));
}
export function canFight(enc,a,b,{renew=false}={}) {
    const left=enc.combatants[a], right=enc.combatants[b];
    return [left,right].every(c=>c && !c.current.defeated && !c.current.escaped && !c.current.surrendered && c.side!=='neutral')
        && (left.side==='hostile') !== (right.side==='hostile') && (renew || !protectedPair(enc,a,b));
}

export function projectedStep(enc,actor,dir,target=null) {
    const line=enc.line, from=line.x[actor];
    let sign;
    if (target && Number.isFinite(line.x[target])) sign=Math.sign(line.x[target]-from);
    else {
        const directions=new Set(Object.keys(enc.combatants).filter(id=>canFight(enc,actor,id)).map(id=>Math.sign(line.x[id]-from)).filter(Boolean));
        if (directions.size>1) return {illegal:'Choose which side or opponent to move towards or away from.'};
        sign=[...directions][0] || 0;
    }
    if (!sign && dir==='closer') return {from,to:from};
    if (!sign) sign=enc.combatants[actor].side==='hostile' ? -1 : 1;
    const to=from+(dir==='closer'?sign:-sign);
    if(to<line.lo || to>line.hi) return {illegal:'The edge of the encounter is reached. Flee to leave it.'};
    return {from,to};
}

// Old HUD/formatter fields are projections of the single persisted geometry.
export function projectBands(enc) {
    for(const c of Object.values(enc.combatants)) c.current.band=lineBand(enc.line,'pc',c.id);
}
export function stepLine(enc,actor,dir,target) {
    const step=projectedStep(enc,actor,dir,target);
    if(step.illegal) return step;
    enc.line.x[actor]=step.to;
    if(step.from!==step.to) enc.combatants[actor].current.cover='none';
    projectBands(enc);
    return {...step,change:step.from+' → '+step.to};
}
export function lineTarget(enc,actor) {
    const c=enc.combatants[actor], p=c.current.priority;
    const targets=enc.order.filter(id=>canFight(enc,actor,id) && enc.combatants[id].current.cover!=='full');
    const harm=who=>enc.log?.findLast(r=>targets.includes(r.actor) && r.strikes?.some(k=>k.target===who))?.actor;
    if(p?.kind==='target' && targets.includes(p.target)) return p.target;
    if(p?.kind==='protect' && harm(p.target)) return harm(p.target);
    if(harm(actor)) return harm(actor);
    const ref=p?.kind==='protect' && enc.combatants[p.target] ? p.target : actor;
    return targets.sort((a,b)=>Math.abs(enc.line.x[a]-enc.line.x[ref])-Math.abs(enc.line.x[b]-enc.line.x[ref]))[0];
}

export function renewedTerms(enc,a,b) {
    return (enc.agreements || []).map(g=>g.pairs?.some(pair=>samePair(pair,a,b)) &&
        !g.breaches?.some(pair=>samePair(pair,a,b)) ? {...g,breaches:[...(g.breaches || []),[a,b]]} : g);
}
