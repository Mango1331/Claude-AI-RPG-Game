import { copy } from './util.js';
import { prepare, validate, foldChat, rec, content, worldContract } from './engine.js';
import { obligations, requireCoverage, authored, assertClaims, continueCandidate } from './contract.js';
import { knowledgeOf, memoriesOf, entityLabel } from '../src/knowledge.js';
import { buildCatalog } from '../src/v4/catalog.js';
import { planContext, MECH_COMMANDS, MECH_TYPES } from '../src/v4/planner.js';
import { worldVocab } from '../src/v4/extract.js';
import { readTurn } from '../src/ir.js';
import { renderHud } from '../src/hud.js';
import { showPanel } from '../src/host.js';

export const CORE = `You are Avereth's creative game master, not a text renderer. Create plausible, autonomous NPC dialogue, motives, places, conflicts and world reactions. Preserve the player's voluntary choices: never invent Alaric's consent, decisions or speech. Engine owns all mechanics, dice, damage, HP/MP, time, PULSE, XP, stats, inventory and money. Never narrate an unresolved mechanical success. NPCs use only their own knowledge; GM background is not shared NPC knowledge. Persist important new identities, facts, encounters and promises, not every gesture. Distinguish fact, belief, rumor, knowledge and memory.
Return ONE JSON object per response, no markdown fences. Operations:
resolve: {op:"resolve",commands:[{seq:1,type:"...",quote:"exact player words",...}]} submits the COMPLETE chosen player action batch, once per turn. Use needs:prior_seq only for a genuine dependency. Tool results are binding; no new turn, roll or repeated effect.
finish or world: {op:"finish",narration:"story",world:{scene:"canonical place",expected:{},deltas:[]}} validates and completes directly. No second extraction. Match requested expected keys after resolve. Add speech:[{id,speaker,text,to:[ids],promise:true}] to render and remember the SAME NPC promise. PC speech requires an exact quoted player utterance, never consent. claims:{at:"place"} is checked. Important new persons and places must be in world deltas.
world with continue:true: submit a draft and its world effects when their actual result is needed before further prose. After the result, finish with continuation:true,narration:"NEW appended prose", optional speech/threads. Never replace the prior text or repeat its mechanics. Continuation supports promise/debt/rumor threads only; other new world changes require a later player turn.
describe: {op:"describe",domain:"commands"|"world",types:["exact type"]} retrieves situational schemas. recall:{op:"recall",who:"id"} retrieves a named NPC's own memory. No tool invents authorization.
Negations, wishes and future conditions are not present player actions. Use existing mechanics; unsupported distraction/theft or vague checks stay unresolved. Ordinary conversation needs no resolve. Describe results vividly in the player's language; let NPCs initiate ordinary actions freely within existing fairness rules. A successful JSON parse does not prove prose consistency.`;
const MEMORY = ['fact','learn','believe','memory','thread','person.new','enter','leave','place.reported','attitude'];
export function recall(state, who) {
    if (!state.entities[who]) throw Error('Unknown identity');
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
        const catalog = buildCatalog(s, content), p = planContext(s, content, catalog);
        const vocab = worldVocab(content.deltaVocab, s);
        const types = [...MEMORY, ...(t.prepared ? ['arrive','object.new','object.move','hostile'] : [])];
        const lore = content.lore.filter(e => e.baseline || e.entities?.includes(s.scene.location)).map(e => ({ title: e.title, text: e.text }));
        const commandTypes = content.commandVocab.commands.map(c => c.type).concat(MECH_TYPES);
        const worldTypes = vocab.deltas.map(d => d.type);
        return [{ role: 'system', content: CORE }, { role: 'user', content: JSON.stringify({
            input: t.input, obligations: obligations(t.input, foldChat(t.base).state), scene: s.scene,
            catalog, mechanics: { skills: p.skills, opponents: p.opponents, facts: p.facts, learning: p.learning },
            npcPerspectives: s.scene.present.filter(id => s.entities[id]?.kind === 'npc').map(id => recall(s,id)),
            lore, recentDialogue: t.base.filter(m => !m.is_system).slice(-6).map(m => ({ role: m.is_user ? 'player' : 'GM', text: m.mes })),
            commandTypes, worldTypes, commandSchemas: content.commandVocab.commands.filter(c => ['go','take','use','give'].includes(c.type)).map(({type, summary, args}) => ({type, summary, args})),
            ...(p.fight ? { combatCommands: MECH_COMMANDS } : {}), worldContract: worldContract(chat, types), results: t.results,
        }) }];
    }
    async prepared(t, commands, transport, current) {
        if (t.prepared) throw Error('Player batch already resolved');
        requireCoverage(t.input, foldChat(t.base).state, commands);
        const p = await prepare(t.base, t.input, commands, (req, n) => this.scheduler.request(`${t.id}:engine:${n}:${req.purpose}`, req.messages, transport, { current }));
        if (!p.panels) requireCoverage(t.input, foldChat(t.base).state, (rec(p.chat.at(-1)).interp?.commands || []).filter(c =>
            (foldChat(p.chat).state.last.outcome?.resolutions || []).some(r => r.seq === c.seq && r.type === c.type)
            || MECH_TYPES.includes(c.type)));
        return p;
    }
    async run(id, transport, { hook = async () => {} } = {}) {
        const token = this.publication.host.token(), current = () => this.publication.host.current(token)
            && this.journal.read().turns[id]?.originChatId === token.id;
        if (!current()) throw Error('Wrong origin chat');
        for (;;) {
            const t = this.journal.read().turns[id];
            if (['committed','published'].includes(t.phase)) return this.publication.publish(id, token, hook);
            if (t.phase !== 'active') throw Error('Turn not active');
            if (t.step >= 8) throw Error('Eight GM requests exhausted; no automatic repair chain');
            const s = foldChat(t.base).state, ir = readTurn(t.input, s, content);
            // Creation and # commands remain the original deterministic control path.
            if (!t.step && (s.mode === 'creation' || ir.intent?.kind === 'command' || ir.reason === 'dead')) {
                const p = await prepare(t.base, t.input, []);
                const message = { mes: (p.panels || []).join('\n\n') || p.context?.text || 'Engine action completed.', name: 'Avereth System', is_user: false, is_system: true, extra: { avereth_panel: true } };
                showPanel(message, '', renderHud(foldChat(p.chat).state, content, 'closed'));
                p.chat.push(message);
                await this.commit(t, p.chat, current, hook);
                return this.publication.publish(id, token, hook);
            }
            const raw = await this.scheduler.request(`${id}:gm:${t.step}`, this.prompt(t), transport, { current });
            await hook('after_response'); if (!current()) throw Error('Stopped before processing answer');
            // Fences are transport decoration, not a semantic repair or a second request.
            const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
            let a = JSON.parse(text), prepared = t.prepared, result, chat;
            if (a.op === 'describe') {
                if (!Array.isArray(a.types)) throw Error('Schema types required');
                const rows = a.domain === 'commands' ? content.commandVocab.commands : worldVocab(content.deltaVocab,s).deltas;
                result = { op: 'describe', schema: rows.filter(x => a.types.includes(x.type)), ...(a.domain === 'commands' && a.types.some(x => MECH_TYPES.includes(x)) ? { mechanicalCommands: MECH_COMMANDS } : {}) };
            } else if (a.op === 'recall') result = { op: 'recall', data: recall(foldChat(t.candidate || prepared?.chat || t.base).state, a.who) };
            else if (a.op === 'resolve') {
                if (!Array.isArray(a.commands)) throw Error('Commands required');
                prepared = await this.prepared(t, a.commands, transport, current);
                result = { op: 'resolve', outcome: foldChat(prepared.chat).state.last.outcome, panels: prepared.panels };
            } else if (['world','finish'].includes(a.op)) {
                if (!prepared) prepared = await this.prepared(t, [], transport, current);
                if (prepared.panels) {
                    // Clarifications cannot acquire free-world side effects.
                    if (a.world?.deltas?.length) throw Error('Engine clarification pending; no world effects');
                    chat = copy(prepared.chat);
                    chat.push({ mes: prepared.panels.join('\n\n'), name: 'Avereth System', is_user: false, is_system: true, extra: {} });
                    a = { op: 'finish' };
                } else if (t.candidate) {
                    if (a.op !== 'finish') throw Error('World already resolved');
                    if (a.use_result) {
                        if (a.narration || a.world || a.speech || a.threads || a.claims) throw Error('Cannot alter saved result');
                        chat = t.candidate;
                    } else chat = continueCandidate(t,a);
                } else {
                    a = authored(a,t,foldChat(prepared.chat).state);
                    chat = validate(prepared.chat,a.narration,a.world); assertClaims(a,foldChat(chat).state);
                }
                if (a.op === 'world' && a.continue === true) result = { op: 'world', scene: foldChat(chat).state.scene, events: rec(chat.at(-1)).events };
            } else throw Error('Unsupported GM operation');
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
            Object.assign(db.turns[t.id], { chat, phase: 'committed' });
        });
        await hook('after_commit');
    }
}
