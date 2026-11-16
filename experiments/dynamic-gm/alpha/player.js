import { obligations as detected } from './contract.js';
import { declarative, deedsOf } from '../src/intent.js';
import { guardCommands } from '../src/v4/agency.js';
import { proposalError } from './util.js';

// The prototype's broad authorization hints are NOT a proof of an action.
// Reuse .200's language guard to remove explicit negative/future/question hints.
// This remains a bounded omission detector, not a complete language interpreter.
export function obligations(input,state) {
    const parts=declarative(deedsOf(input)).split(/(?<=[.!?;])\s+|\n+/).filter(Boolean);
    return detected(input,state).filter(o=> {
        const type={travel:'go',finance:'pay',activity:'activity',use:'use',unclear_use:'use'}[o.kind];
        if(!type)return true;
        const relevant=parts.filter(p=>detected(p,state).some(x=>x.kind===o.kind));
        return !relevant.length || relevant.some(quote=> {
            // Classify each sentence separately: an explicit negative in another
            // sentence must not erase a positive obligation. This never grants
            // authority; real commands still undergo the full-message guard.
            const r=guardCommands(quote,[{seq:1,type,quote}],{}, {language:true,state:false});
            return !r.dropped.some(x=>['negation','question','plan','retrospective'].includes(x.rule));
        });
    });
}
export function requireCoverage(input,state,commands) {
    if(commands.length===1 && commands[0].type==='clarify')return;
    for(const o of obligations(input,state)) {
        const covered=o.kind==='use'?commands.some(c=>c.type==='use'&&c.object===o.object)
            :o.kind==='travel'?commands.some(c=>['go','journey.continue'].includes(c.type))
            :o.kind==='finance'?commands.some(c=>['pay','buy','sell','give','offer.accept'].includes(c.type))
            :o.kind==='activity'?commands.some(c=>['activity','use'].includes(c.type))
            :o.kind==='mechanical'?commands.length>0:false;
        if(!covered)throw proposalError(`unresolved player action: ${JSON.stringify(o)}; resolve it or ask a single clarify, never invent its success`);
    }
}
