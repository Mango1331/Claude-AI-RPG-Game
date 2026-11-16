import { copy, digest, fault } from './journal.mjs';
import { prepare, draft, validate, validateJoint, foldChat } from './engine.mjs';
import { promptNarrator } from './fixtures.mjs';
export class Prototype {
    constructor(journal, scheduler, publication) { this.journal=journal; this.scheduler=scheduler; this.publication=publication; }
    begin(id, f, variant) {
        if (!['B','C1'].includes(variant)) throw fault('unknown architecture');
        const old = this.journal.read().turns[id];
        const identity = digest({input:f.input,variant});
        if (old) { if (old.identity !== identity) throw fault('turn ID reused with another input/revision'); return; }
        this.journal.update(db => { db.turns[id] = {id,identity,variant,input:f.input,baseRevision:db.world.revision,base:copy(db.world.chat),phase:'input',trace:['input']}; });
    }
    checkpoint(id, phase, fields) { this.journal.update(db => { Object.assign(db.turns[id], fields, {phase}); db.turns[id].trace.push(phase); }); }
    async run(id, f, transport, {fast=true, hook=()=>{}, token=this.publication.host.token()} = {}) {
        const current = () => this.publication.host.current(token);
        const ask = async (key, messages, phase) => {
            const response = await this.scheduler.request(`${id}:${key}`,messages,transport,{phase,current});
            await hook('after_response');
            if (!current()) throw fault('stale turn');
            return response;
        };
        try {
            let t=this.journal.read().turns[id];
            if (['committed','published'].includes(t.phase)) { await this.publication.publish(id,token,hook); return; }
            if (t.phase==='input') {
                let n=0;
                const prepared=await prepare(t.base,t.input,req=>ask(`prepare:${n++}`,req.messages,req.purpose),{fast});
                await hook('after_prepare');
                this.checkpoint(id,'prepared',{prepared});
            }
            t=this.journal.read().turns[id];
            if (t.phase==='prepared') {
                const messages=promptNarrator(f,t.prepared);
                if(t.variant==='B') {
                    const narration=await ask('narrator',messages,'narrator');
                    this.checkpoint(id,'drafted',{narration});
                } else {
                    const req=draft(t.prepared.chat,'[UNPUBLISHED PROPOSED SCENE]').req;
                    const jointMessages=[...messages,...req.messages,{role:'system',content:'Prototype C1: generate narration AND nested world {scene,expected,deltas}. The extractor schema above applies to world; do not interpret the placeholder as an actual event. Return {narration,world,links:[{target:"scene|expected:<key>|delta:<index>",start,end,quote}]}. Each world field has one exact evidence span in narration. Proposals are not authority; player choices, engine outcomes, PULSE and knowledge limits remain binding. No Markdown.'}];
                    const raw=await ask('joint',jointMessages,'joint');
                    this.checkpoint(id,'drafted',{envelope:typeof raw==='string'?JSON.parse(raw):raw,jointMessages});
                }
            }
            t=this.journal.read().turns[id];
            if(t.phase==='drafted') {
                let chat;
                if(t.variant==='B') {
                    const req=draft(t.prepared.chat,t.narration).req;
                    const raw=await ask('extract',req.messages,'extract');
                    chat=validate(t.prepared.chat,t.narration,typeof raw==='string'?JSON.parse(raw):raw);
                } else {
                    try { chat=validateJoint(t.prepared.chat,t.envelope); }
                    catch(error) {
                        // Exactly one downstream correction/render attempt, its full request and cost are measured.
                        const raw=await ask('joint_correction',[...t.jointMessages,{role:'assistant',content:JSON.stringify(t.envelope)},
                            {role:'user',content:`Candidate rejected: ${error.message}. Return a complete corrected narration/world/links envelope; do not preserve rejected claims.`}],'joint_correction');
                        const repaired=typeof raw==='string'?JSON.parse(raw):raw;
                        chat=validateJoint(t.prepared.chat,repaired);
                    }
                }
                this.checkpoint(id,'validated',{chat,stateHash:digest(foldChat(chat).state)});
            }
            t=this.journal.read().turns[id];
            if(t.phase==='validated') {
                if(!current())throw fault('stale turn');
                await hook('before_commit');
                this.journal.update(db=>{if(db.world.revision!==t.baseRevision)throw fault('world revision conflict');
                    db.world={revision:t.baseRevision+1,chat:copy(t.chat)};db.turns[id].phase='committed';db.turns[id].trace.push('committed');});
                await hook('after_commit');
            }
            await this.publication.publish(id,token,hook);
        } catch(error) {
            this.journal.update(db=>{db.turns[id].lastError=error.message;});
            throw error;
        }
    }
}
