import { copy, proposalError } from './util.js';
import { prepare, validate, foldChat, rec, content, worldContract } from './engine.js';
import { authored, assertClaims, continueCandidate } from './contract.js';
import { obligations, requireCoverage } from './player.js';
import { knowledgeOf, memoriesOf, entityLabel } from '../src/knowledge.js';
import { buildCatalog } from '../src/v4/catalog.js';
import { planContext, MECH_COMMANDS, MECH_TYPES } from '../src/v4/planner.js';
import { worldVocab } from '../src/v4/extract.js';
import { readTurn } from '../src/ir.js';
import { renderHud } from '../src/hud.js';
import { showPanel } from '../src/host.js';
import { buildContext, V4_OUTPUT_LINE } from '../src/context.js';
import { commandContract, COMMON_WORLD, normalizeReferences } from './interface.js';

export const STYLE = `Narrative style: In narration and speech, write in the player's language; use third person and past tense for narration. Begin with the world's response rather than repeating the input. Use concrete actions and a few relevant sensory details; let length and pace follow the moment. Give NPCs distinct, natural voices shaped by their established personality, interests and own knowledge, without reciting their dossiers. Let them initiate plausible ordinary reactions and conversations. Avoid repeating recent gestures or images, stock dramatic phrasing and unsolicited menus or meta-commentary. These style rules apply inside narrative fields, not JSON field names or engine operations. Preserve the required operation and report consequential new facts and promises.`;
export const CORE = `You are Avereth's creative game master, not a text renderer. Create plausible, autonomous NPC dialogue, motives, places, conflicts and world reactions. Preserve the player's voluntary choices: never invent Alaric's consent, decisions or speech. Engine owns all mechanics, dice, damage, HP/MP, time, PULSE, XP, stats, inventory and money. Never narrate an unresolved mechanical success. NPCs use only their own knowledge; GM background is not shared NPC knowledge. Persist important new identities, facts, encounters and promises, not every gesture. Distinguish fact, belief, rumor, knowledge and memory.
Return ONE JSON object per response, no markdown fences. Operations:
resolve: {op:"resolve",commands:[{seq:1,type:"...",quote:"exact player words",...}]} submits the COMPLETE chosen player action batch, once per turn. Use needs:prior_seq only for a genuine dependency. Tool results are binding; no new turn, roll or repeated effect.
finish or world: {op:"finish",narration:"story",world:{scene:"canonical place",expected:{},deltas:[]}} validates and completes directly. No second extraction. Match requested expected keys after resolve. Add speech:[{id,speaker,text,to:[ids],promise:true}] to render and remember the SAME NPC promise. PC speech requires an exact quoted player utterance, never consent. claims:{at:"place"} is checked. Important new persons and places must be in world deltas.
world with continue:true: submit a draft and its world effects when their actual result is needed before further prose. After the result, finish with continuation:true,narration:"NEW appended prose", optional speech/threads. Never replace the prior text or repeat its mechanics. Continuation supports promise/debt/rumor threads only; other new world changes require a later player turn.
describe: {op:"describe",domain:"commands"|"world",types:["exact type"]} retrieves situational schemas. recall:{op:"recall",who:"id"} retrieves a named NPC's own memory. No tool invents authorization.
A received response is only a proposal. On correction, fix the stated error; prepared mechanics and world results stay binding. If playerBatchResolved is true never resolve again. Unlisted tools remain available through describe; do not guess their shapes. Known reference values are ID strings, not internal {ref:"type"} descriptions.
Negations, wishes and future conditions are not present player actions. Use existing mechanics. Ordinary chosen deeds can use other; ordinary nonmechanical uncertainty may follow plausible fiction without invented rolls. Unsupported rule-bound theft/distraction/checks do not gain a new mechanic. Ordinary conversation needs no resolve. Describe results vividly in the player's language; let NPCs initiate ordinary actions freely within existing fairness rules. A successful JSON parse does not prove prose consistency.
${STYLE}`;
const worldTypesFor=(t,s)=>[...new Set([...COMMON_WORLD,'arrive','object.new','object.move',
    ...(s.encounter||s.pending_combat?.length?['hostile','intent','aware','position']:[]),
    ...(Object.values(s.quests).some(q=>q.status==='active')?['quest.progress','quest.ready','quest.close']:[]),...(t.requestedWorld||[])])];
const narrativeContext=c=>c.text.replace(V4_OUTPUT_LINE,'').trim();
const panelChat=p=>[...copy(p.chat),{mes:p.panels.join('\n\n'),name:'Avereth System',is_user:false,is_system:true,extra:{}}];
export function recall(state, who) {
    if (!state.entities[who]) throw proposalError('Unknown identity; use a canonical NPC ID from the catalog');
    return { id: who, name: entityLabel(state, who), knowledge: knowledgeOf(state, who), memories: memoriesOf(state, who),
        promises: Object.values(state.threads).filter(t => t.who?.includes(who)),
        traits: Object.values(state.facts).filter(f => f.s === who && !f.until && ['voice','manner','interest'].includes(f.p)) };
}
export class DynamicGM {
    constructor(journal, scheduler, publication) { Object.assign(this, { journal, scheduler, publication }); }
    async begin(id, input) {
        const db = this.journal.read(), origin = this.publication.host.id();
        if (db.originChatId !== origin) throw Error('Journal belongs to another chat');
        if (Object.values(db.turns).some(t => !['published','cancelled'].includes(t.phase))) throw Error('Resume or discard the unfinished turn first');
        await this.journal.update(d => {
            // Completed history is already in the authoritative chat. Keep only the active
            // turn snapshots, preventing quadratic journal growth over a campaign.
            d.turns = { [id]: { id, input, originChatId: origin, baseRevision: d.world.revision,
                base: copy(d.world.chat), phase: 'active', step: 0, results: [] } };
        });
    }
    prompt(t) {
        const chat = t.candidate || t.prepared?.chat || t.base, s = foldChat(chat).state;
        if(t.prepared?.systemQuery) return [
            {role:'system',content:'Answer the player\'s private System query from the authoritative supplied state/rules. No story, NPC actions, world changes or invented hidden facts. Return only {"op":"answer","text":"your answer"}.'},
            {role:'user',content:JSON.stringify({input:t.input,engineContext:t.prepared.context.text,correction:t.correction})},
        ];
        const catalog = buildCatalog(s, content,{known:true,c:true}), p = planContext(s, content, catalog);
        const vocab = worldVocab(content.deltaVocab, s);
        const types = worldTypesFor(t,s);
        const lastReply=t.base.findLast(m=>!m.is_user&&!m.is_system)?.mes||'';
        const ctx=t.candidate?buildContext(s,content,{input:t.input,lastReply,outcome:s.last?.outcome})
            :t.prepared?.context || buildContext(s,content,{input:t.input,lastReply});
        const commandTypes = content.commandVocab.commands.map(c => c.type).concat(MECH_TYPES);
        const worldTypes = vocab.deltas.map(d => d.type);
        const offered=['go','journey.continue','take','use','give','activity','other','clarify',...(t.requestedCommands||[]),
            ...(catalog.offers.length?['offer.accept','buy','sell']:[]),...(p.fight?MECH_TYPES:[])];
        return [{ role: 'system', content: CORE }, { role: 'user', content: JSON.stringify({
            input: t.input, obligations: obligations(t.input, foldChat(t.base).state), scene: s.scene,
            catalog, mechanics: { skills:p.skills,opponents:p.opponents,facts:p.facts,learning:p.learning,route:p.route,habitat:p.habitat },
            engineContext:narrativeContext(ctx),contextDiagnostics:ctx.diagnostics,
            recentDialogue: t.base.filter(m => !m.is_system).slice(-6).map(m => ({ role: m.is_user ? 'player' : 'GM', text: m.mes })),
            playerBatchResolved:!!t.prepared,commandTypes,worldTypes,
            commandSchemas:t.prepared?undefined:commandContract(content,catalog,offered),
            worldContract: worldContract(chat, types), results: t.results, correction:t.correction,
        }) }];
    }
    async prepared(t, commands, transport, current) {
        if (t.prepared) throw proposalError('Player batch already resolved; use its saved results');
        const before=foldChat(t.base).state;
        const normalized=normalizeReferences(commands,content,buildCatalog(before,content,{known:true,c:true}));
        // A genuine clarification executes no player action. The engine still
        // validates this sole command; mixed clarify/action batches get no waiver.
        requireCoverage(t.input, before, normalized.commands);
        const p = await prepare(t.base, t.input, commands, (req, n) => this.scheduler.request(`${t.id}:step:${t.step}:engine:${n}:${req.purpose}`, req.messages, transport, { current }));
        if (!p.panels) requireCoverage(t.input, foldChat(t.base).state, (rec(p.chat.at(-1)).interp?.commands || []).filter(c =>
            (foldChat(p.chat).state.last.outcome?.resolutions || []).some(r => r.seq === c.seq && r.type === c.type)
            || MECH_TYPES.includes(c.type)));
        return p;
    }
    async checkpointPrepared(id,p,current,hook) {
        if(!current())throw Error('Stopped before engine checkpoint');
        await this.journal.update(d=>{d.turns[id].prepared=p;d.turns[id].preparedStep=d.turns[id].step;});
        await hook('after_prepared');
        if(!current())throw Error('Stopped after engine checkpoint');
    }
    async run(id, transport, { hook = async () => {} } = {}) {
        const token = this.publication.host.token(), current = () => this.publication.host.current(token)
            && this.journal.read().turns[id]?.originChatId === token.id;
        if (!current()) throw Error('Wrong origin chat');
        for (;;) {
            let t = this.journal.read().turns[id];
            if (['committed','published'].includes(t.phase)) return this.publication.publish(id, token, hook);
            if (t.phase !== 'active') throw Error('Turn not active');
            if(t.repairExhausted)throw Error(t.repairExhausted);
            if (t.step >= 8) throw Error('Eight GM requests exhausted; no automatic repair chain');
            const s = foldChat(t.base).state, ir = readTurn(t.input, s, content);
            // Creation and # commands remain the original deterministic control path.
            if (!t.step && !t.prepared && (s.mode === 'creation' || ir.intent?.kind === 'command' || ir.reason === 'dead')) {
                const p = await prepare(t.base, t.input, []);
                if(p.systemQuery) { await this.checkpointPrepared(id,p,current,hook);t=this.journal.read().turns[id]; }
                else {
                    const message = { mes: (p.panels || []).join('\n\n') || 'Engine action completed.', name: 'Avereth System', is_user: false, is_system: true, extra: { avereth_panel: true } };
                    showPanel(message, '', renderHud(foldChat(p.chat).state, content, 'closed'));
                    p.chat.push(message);
                    await this.commit(t, p.chat, current, hook);
                    return this.publication.publish(id, token, hook);
                }
            }
            const raw = t.pending?.raw ?? await this.scheduler.request(`${id}:gm:${t.step}`, this.prompt(t), transport, { current });
            await hook('after_response'); if (!current()) throw Error('Stopped before processing answer');
            // Keep the exact response while checkpoints can change the next prompt.
            // Reload after prepared must reuse it, not resend under a changed identity.
            if(!t.pending) await this.journal.update(d=>{d.turns[id].pending={step:t.step,raw};});
            // Fences are transport decoration, not a semantic repair or a second request.
            const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
            let a, prepared = t.prepared, result, chat;
            try {
            try {a=JSON.parse(text);} catch {throw proposalError('Return one complete JSON operation object');}
            if(!a || typeof a!=='object' || Array.isArray(a))throw proposalError('Operation must be an object');
            if(prepared?.systemQuery) {
                if(a.op!=='answer'||typeof a.text!=='string'||!a.text.trim()||Object.keys(a).some(k=>!['op','text'].includes(k)))throw proposalError('System query requires only {op:"answer",text:"..."}; no world operations');
                chat=copy(prepared.chat);chat.push({mes:a.text,name:'Avereth System',is_user:false,is_system:true,extra:{avereth_panel:true}});
                a={op:'finish'};
            }
            else if (a.op === 'describe') {
                const now=foldChat(t.candidate||prepared?.chat||t.base).state;
                const allowed=a.domain==='commands'?content.commandVocab.commands.map(c=>c.type).concat(MECH_TYPES):a.domain==='world'?worldVocab(content.deltaVocab,now).deltas.map(d=>d.type):[];
                if (!Array.isArray(a.types)||!a.types.length||a.types.some(type=>!allowed.includes(type))) throw proposalError('describe requires known types and domain commands|world');
                result = { op: 'describe', schema: a.domain==='commands'?commandContract(content,buildCatalog(now,content,{known:true,c:true}),a.types):worldContract(t.candidate||prepared?.chat||t.base,a.types) };
            } else if (a.op === 'recall') result = { op: 'recall', data: recall(foldChat(t.candidate || prepared?.chat || t.base).state, a.who) };
            else if (a.op === 'resolve') {
                if (!Array.isArray(a.commands)) throw proposalError('Commands required');
                // A persisted response may already have its prepared effects after a
                // reload/stop between checkpoints. Reuse that result exactly once.
                if(t.prepared && t.preparedStep===t.step)prepared=t.prepared;
                else {prepared = await this.prepared(t, a.commands, transport, current);await this.checkpointPrepared(id,prepared,current,hook);}
                result = { op: 'resolve', outcome: foldChat(prepared.chat).state.last.outcome, panels: prepared.panels, normalizations:prepared.normalizations };
                if(prepared.panels){chat=panelChat(prepared);a={op:'finish'};}
            } else if (['world','finish'].includes(a.op)) {
                if (!prepared) {prepared = await this.prepared(t, [], transport, current);await this.checkpointPrepared(id,prepared,current,hook);}
                if (prepared.panels) {
                    // Clarifications cannot acquire free-world side effects.
                    if (a.world?.deltas?.length) throw proposalError('Engine clarification pending; no world effects');
                    chat = panelChat(prepared);
                    a = { op: 'finish' };
                } else if (t.candidate) {
                    if (a.op !== 'finish') throw proposalError('World already resolved');
                    if (a.use_result) {
                        if (a.narration || a.world || a.speech || a.threads || a.claims) throw proposalError('Cannot alter saved result');
                        chat = t.candidate;
                    } else chat = continueCandidate(t,a);
                } else {
                    a = authored(a,t,foldChat(prepared.chat).state);
                    chat = validate(prepared.chat,a.narration,a.world); assertClaims(a,foldChat(chat).state);
                }
                if (a.op === 'world' && a.continue === true) result = { op: 'world', scene: foldChat(chat).state.scene, events: rec(chat.at(-1)).events };
            } else throw proposalError('Unsupported GM operation');
            } catch(error) {
                // Domain proposal correction only. Transport, stop, storage and fold
                // failures never trigger another model request here.
                if(error.code!=='GM_PROPOSAL')throw error;
                if(!current())throw Error('Stopped before proposal rejection');
                let exhausted;
                await this.journal.update(d=>{
                    const turn=d.turns[id];turn.proposals||=[];
                    turn.proposals.push({step:t.step,status:'rejected',raw,error:error.message});
                    const attempts=turn.corrections||0;
                    turn.correction={error:error.message,previousProposal:text,playerBatchResolved:!!turn.prepared,worldResolved:!!turn.candidate,
                        instruction:turn.prepared?'Correct the proposal using saved results; never resolve or repeat mechanics.':'Correct only the rejected proposal; no effects were accepted.'};
                    delete turn.pending;turn.step=t.step+1;
                    if(attempts>=1){exhausted=`GM correction exhausted: ${error.message}. No story published. Inspect the error and discard the uncommitted turn to change the input; Resume does not retry this rejected proposal.`;turn.repairExhausted=exhausted;}
                    else turn.corrections=attempts+1;
                });
                await hook('after_rejection');
                if(exhausted)throw Error(exhausted);
                continue;
            }
            if (a.op === 'finish' || (a.op === 'world' && a.continue !== true)) {
                // Rebuild the display cache after append-only creative continuation.
                const m = chat.at(-1), r = rec(m);
                delete m.extra.display_text;
                showPanel(m,r?.panel || '',renderHud(foldChat(chat).state,content,'closed'),{playerFacing:true});
                if (m.swipes) { m.swipes = [m.mes]; m.swipe_id = 0; }
                await this.commit(t,chat,current,hook);
                return this.publication.publish(id,token,hook);
            }
            if (!current()) throw Error('Stopped before checkpoint');
            await this.journal.update(db => {
                Object.assign(db.turns[id], { prepared, step: t.step + 1, ...(a.op === 'world' ? { candidate: chat } : {}) });
                const turn=db.turns[id];delete turn.pending;delete turn.correction;
                if(a.op==='describe')turn[a.domain==='commands'?'requestedCommands':'requestedWorld']=[...new Set([...(turn[a.domain==='commands'?'requestedCommands':'requestedWorld']||[]),...a.types])];
                turn.proposals||=[];turn.proposals.push({step:t.step,status:'accepted',raw,normalizations:prepared?.normalizations||[]});
                db.turns[id].results.push(result);
            });
            await hook('after_tool');
        }
    }
    async commit(t, chat, current, hook) {
        await hook('before_commit'); if (!current()) throw Error('Stopped before commit');
        // Atomic server journal save. Once dispatched, a stop cannot retract that write;
        // it can only prevent publication. The committed turn remains recoverable.
        await this.journal.update(db => {
            if (!current() || db.world.revision !== t.baseRevision) throw Error('Stale commit');
            db.world = { revision: t.baseRevision + 1, chat: copy(chat) };
            const turn=db.turns[t.id];
            if(turn.pending){turn.proposals||=[];turn.proposals.push({step:turn.pending.step,status:'accepted',raw:turn.pending.raw,normalizations:turn.prepared?.normalizations||[]});}
            delete db.turns[t.id].pending;delete db.turns[t.id].correction;
            Object.assign(db.turns[t.id], { chat, phase: 'committed' });
        });
        await hook('after_commit');
    }
}
