// Combat engine: Core #10-#12 (hit, damage, range), #13 (effects), #21 (ammo), #23-#28 (gate, turns, ambush,
// XP, START/ACTIVE/END loops). Every roll comes from the seeded Dice; every step is written into the encounter
// snapshot (the FIXED+CURRENT snapshot that Testrun-v1 lost), so the next turn copies it instead of re-guessing.
import { deriveCharacter, rawPower, rawPowerText } from './derived.js';
import { defeatXp, awardXp } from './progression.js';
import { bandIndex, bandName, clamp, clone, num, roundHalfUp } from './util.js';

const PROF = (content, level) => content.rules.proficiency.levels[String(level || 1)];
const label = (e) => e.name || (e.descriptors && e.descriptors[0] ? `the ${e.descriptors[0]}` : e.id);

// ------------------------------------------------------------------------------------------ combatant snapshots
export function characterCombatant(state, id, content, side) {
    const e = state.entities[id];
    const s = e.sheet;
    const dv = deriveCharacter(s, content);
    return {
        id, name: label(e), side, model: 'character',
        fixed: {
            level: s.level, rank: dv.rank, class: s.class, stats: { ...s.stats }, max_hp: dv.maxHp, max_mp: dv.maxMp,
            max_sta: dv.maxSta, atk: dv.atk, matk: dv.matk, def: dv.def, mdef: dv.mdef, base_hit: dv.baseHit,
            crit: dv.crit, init: dv.init, type: 'normal',
            actions: Object.fromEntries(Object.entries(s.skills).filter(([sid]) => content.skills.has(sid))),
            weapon_family: (Object.values(s.equipment || {}).map((r) => (typeof r === 'string' ? content.items.get(r) : r))
                .find((it) => it && it.slot === 'weapon') || {}).family || null,
            temperament: e.card?.temperament || s.generated?.temperament || null,
            sapient: true,
        },
        current: { hp: s.hp, mp: s.mp, sta: s.sta, ammo: ammoOf(s, content), band: null, cover: 'none', effects: [], defeated: false, escaped: false, surrendered: false },
    };
}

/** Carried ammunition (from the sheet's inventory): every archer, PC or NPC, shoots only what it carries. */
function ammoOf(sheet, content) {
    const out = {};
    for (const [item, qty] of Object.entries(sheet.inventory || {})) if (content.items.get(item)?.slot === 'ammo') out[item] = qty;
    return out;
}

/** Opponents are on different sides of the hostile line (future allies/summons stay on Alaric's side). */
export function isOpponent(a, b) {
    return a.id !== b.id && (a.side === 'hostile') !== (b.side === 'hostile');
}

export function creatureCombatant(state, id) {
    const e = state.entities[id];
    const p = e.profile;
    return {
        id, name: label(e), side: 'hostile', model: 'creature',
        fixed: {
            level: p.level, rank: p.rank, type: p.type, body_plan: p.body_plan, max_hp: p.max_hp, atk: p.atk, def: p.def,
            mdef: p.mdef, hit: p.hit, init: p.init, attack: p.attack, crit: 'none', temperament: p.temperament,
            sapient: false,
        },
        current: { hp: p.hp ?? p.max_hp, band: null, cover: 'none', effects: [], defeated: false, escaped: false, surrendered: false },
    };
}

export function combatantOf(state, id, content, side) {
    const e = state.entities[id];
    if (e.sheet) return characterCombatant(state, id, content, side);
    if (e.profile) return creatureCombatant(state, id);
    throw new Error(`no combat profile for ${id}`);
}

export function activeHostiles(enc) {
    return Object.values(enc.combatants).filter((c) => c.side === 'hostile' && !c.current.defeated && !c.current.escaped && !c.current.surrendered);
}

export function alive(c) {
    return !c.current.defeated && !c.current.escaped;
}

// ------------------------------------------------------------------------------------------ encounter start
/**
 * Start an encounter (Core #26). trigger = {actor, action, target}.
 * participants: [{id, side}] (the PC is added automatically).
 */
export function initEncounter(state, content, dice, trigger, participants, encId) {
    const combatants = { pc: combatantOf(state, 'pc', content, 'pc') };
    for (const p of participants) {
        if (p.id === 'pc') continue;
        combatants[p.id] = combatantOf(state, p.id, content, p.side || 'hostile');
        const pos = state.scene.positions[p.id] || { band: 'MEDIUM', cover: 'none' };
        combatants[p.id].current.band = pos.band;
        combatants[p.id].current.cover = pos.cover || 'none';
    }
    const pcRank = combatants.pc.fixed.rank;
    for (const c of Object.values(combatants)) {
        if (c.side === 'hostile') c.fixed.defeat_xp = defeatXp(c.fixed.level, c.fixed.type, pcRank, content);
    }
    const enc = {
        id: encId, phase: 'ACTIVE', round: 0, order: [], turn_index: -1, current: null, combatants,
        pc_rank: pcRank, pending_xp: 0, defeated: [], escaped: [], trigger: clone(trigger), log: [], opening: null,
        started: { turn: state.turn, minute: state.clock.minute }, intents: {},
    };
    // Ambush (Core #24): only a genuinely unaware target grants an Opening Action. Awareness is engine state (set by a
    // stealth check or an established narration report), never a posture the narrator invents at commitment time.
    if (trigger.actor === 'pc') {
        const awareness = state.scene.awareness[trigger.target] || 'aware';
        enc.ambush = !!combatants[trigger.target] && awareness === 'unaware';
        enc.ambush_reason = `target awareness: ${awareness}${enc.ambush ? ' -> true Ambush (Opening Action, +25pp Crit)' : " -> no Ambush; the trigger action waits for Alaric's Turn"}`;
    } else {
        // an NPC/creature ambushes Alaric only if it was concealed from him when it committed
        enc.ambush = state.scene.concealed.includes(trigger.actor);
        enc.ambush_reason = enc.ambush ? `${combatants[trigger.actor].name} attacked from concealment -> true Ambush (Opening Action)` : `${combatants[trigger.actor].name} attacks openly; its trigger action waits for its Turn`;
        if (!enc.ambush) enc.intents[trigger.actor] = 'attack';
    }
    enc.order = initiativeOrder(enc, dice);
    return enc;
}

/** A new combatant joins an ACTIVE encounter (e.g. a narrated attacker). Inserted into the fixed order by Initiative. */
export function addCombatant(enc, state, content, id, side, intent = 'attack') {
    const c = combatantOf(state, id, content, side);
    const pos = state.scene.positions[id] || { band: 'MEDIUM', cover: 'none' };
    c.current.band = pos.band;
    c.current.cover = pos.cover || 'none';
    if (side === 'hostile') c.fixed.defeat_xp = defeatXp(c.fixed.level, c.fixed.type, enc.pc_rank, content);
    enc.combatants[id] = c;
    // insert after all combatants with higher or equal Initiative (existing ties keep their locked order)
    let idx = enc.order.findIndex((x) => enc.combatants[x].fixed.init < c.fixed.init);
    if (idx < 0) idx = enc.order.length;
    enc.order.splice(idx, 0, id);
    if (idx <= enc.turn_index) enc.turn_index += 1;
    if (intent) enc.intents[id] = intent;
    return c;
}

export function initiativeOrder(enc, dice) {
    const list = Object.values(enc.combatants).filter(alive);
    list.sort((a, b) => b.fixed.init - a.fixed.init);
    // Core #24 ties: higher PER when both profiles possess PER; otherwise resolve the tie once without bias
    const unbiased = (group) => {
        const pool = group.map((c) => c.id);
        const out = [];
        while (pool.length > 1) {
            const pick = dice.pick(pool, 'initiative tie');
            out.push(pick);
            pool.splice(pool.indexOf(pick), 1);
        }
        return [...out, ...pool];
    };
    const runs = (arr, key) => {
        const out = [];
        for (let i = 0; i < arr.length;) {
            let j = i;
            while (j + 1 < arr.length && key(arr[j + 1]) === key(arr[i])) j += 1;
            out.push(arr.slice(i, j + 1));
            i = j + 1;
        }
        return out;
    };
    const order = [];
    for (const group of runs(list, (c) => c.fixed.init)) {
        if (group.length === 1) order.push(group[0].id);
        else if (group.every((c) => c.fixed.stats)) {
            group.sort((a, b) => b.fixed.stats.PER - a.fixed.stats.PER);
            for (const g of runs(group, (c) => c.fixed.stats.PER)) order.push(...(g.length === 1 ? [g[0].id] : unbiased(g)));
        } else order.push(...unbiased(group));
    }
    return order;
}

// ------------------------------------------------------------------------------------------ helpers
function effectsOf(c, kind) {
    return c.current.effects.filter((e) => e.kind === kind);
}

function tempDefense(c, magical) {
    let v = 0;
    for (const e of c.current.effects) {
        if (!magical && e.kind === 'temp_def') v += e.value;
        if (magical && e.kind === 'temp_mdef') v += e.value;
    }
    return v;
}

/** Range Band between two combatants. Bands are tracked relative to the PC (Core #12: only mechanically relevant
 * pairs); two NPCs are approximated by the difference of their PC-relative bands. */
function distance(enc, a, b) {
    if (a === 'pc') return enc.combatants[b].current.band;
    if (b === 'pc') return enc.combatants[a].current.band;
    return bandName(Math.abs(bandIndex(enc.combatants[a].current.band) - bandIndex(enc.combatants[b].current.band)));
}

function setDistance(enc, a, b, band) {
    if (a === 'pc') enc.combatants[b].current.band = band;
    else if (b === 'pc') enc.combatants[a].current.band = band;
    else enc.combatants[a].current.band = band;
}

function skillOf(content, id) {
    const s = content.skills.get(id);
    if (!s) throw new Error(`unknown skill ${id}`);
    return s;
}

function rangeReaches(listedBand, targetBand) {
    return bandIndex(targetBand) <= bandIndex(listedBand);
}

// ------------------------------------------------------------------------------------------ attack resolution
function resolveStrike(ctx, attacker, target, attack, opts) {
    const shared = opts.shared; // area attack: one Hit roll and one Crit roll shared by all targets (Core #12)
    const { dice, content } = ctx;
    const rec = { target: target.id, rolls: [] };
    // HIT (Core #10)
    let base;
    if (attacker.model === 'character') base = attacker.fixed.base_hit;
    else base = attacker.fixed.hit;
    const mods = [];
    if (attack.hit_mod) mods.push([attack.hit_mod, 'Skill Hit Modifier']);
    if (opts.profHit) mods.push([opts.profHit, 'Proficiency']);
    if (opts.buffHit) mods.push([opts.buffHit, 'prepared attack']);
    for (const e of effectsOf(target, 'incoming_hit_penalty')) mods.push([-e.pp, e.name || 'defensive effect']);
    if (target.current.cover === 'partial') mods.push([content.rules.hit.partial_cover_pp, 'Partial Cover']);
    const chance = clamp(num(base + mods.reduce((a, m) => a + m[0], 0)), content.rules.hit.clamp_min, content.rules.hit.clamp_max);
    const hitRoll = shared ? (shared.hit ??= dice.d100(`hit ${attacker.id} (area)`)) : dice.d100(`hit ${attacker.id}->${target.id}`);
    rec.hit = { base, mods: mods.map(([v, why]) => ({ v, why })), chance, roll: hitRoll, success: hitRoll <= chance };
    if (shared) rec.shared = true;
    if (!rec.hit.success) return rec;
    // CRIT (Core #11): Character Crit model only; Ambush Opening Action +25pp
    rec.crit = { chance: 0, roll: null, success: false };
    if (attacker.model === 'character') {
        const critChance = num(attacker.fixed.crit + (opts.ambush ? content.rules.crit.ambush_bonus_pp : 0));
        const critRoll = shared ? (shared.crit ??= dice.d100(`crit ${attacker.id} (area)`)) : dice.d100(`crit ${attacker.id}->${target.id}`);
        rec.crit = { chance: critChance, roll: critRoll, success: critRoll <= critChance, ambush_bonus: opts.ambush ? content.rules.crit.ambush_bonus_pp : 0 };
    }
    // DAMAGE (Core #11 central order)
    const magical = attack.damage_type === 'magical';
    // Core #11 order: Raw -> Proficiency Power (step 3) -> other attacker buffs (step 4) -> Defense -> Variance -> Crit
    let power = opts.raw;
    const steps = [`Raw ${num(power)}`];
    if (opts.profPower && opts.profPower !== 1) { power = num(power * opts.profPower); steps.push(`×${opts.profPower} Proficiency = ${power}`); }
    if (opts.buffPowerPct) { power = num(power * (1 + opts.buffPowerPct / 100)); steps.push(`+${opts.buffPowerPct}% prepared = ${power}`); }
    const defense = (magical ? target.fixed.mdef : target.fixed.def) + tempDefense(target, magical);
    const postDef = num(Math.max(power - defense, power * content.rules.damage.defense_floor_share));
    steps.push(`${magical ? 'MDEF' : 'DEF'} ${defense}: max(${power}-${defense}, ${power}×0.10) = ${postDef}`);
    const variance = dice.variance(`variance ${attacker.id}->${target.id}`); // variance is per target
    let dmg = num(postDef * variance);
    steps.push(`×${variance} variance = ${dmg}`);
    if (rec.crit.success) { dmg = num(dmg * content.rules.crit.multiplier); steps.push(`×${content.rules.crit.multiplier} Crit = ${dmg}`); }
    const endure = effectsOf(target, 'damage_reduction_next')[0];
    if (endure && dmg > 0) {
        dmg = num(dmg * (1 - endure.pct / 100));
        steps.push(`Endure -${endure.pct}% = ${dmg}`);
        target.current.effects = target.current.effects.filter((e) => e !== endure);
    }
    let final = Math.max(1, roundHalfUp(dmg));
    steps.push(`round once = ${final}`);
    // BARRIER then HP
    let absorbed = 0;
    for (const b of effectsOf(target, 'barrier')) {
        const take = Math.min(b.hp, final - absorbed);
        b.hp -= take;
        absorbed += take;
        if (b.hp <= 0) target.current.effects = target.current.effects.filter((e) => e !== b);
        if (absorbed >= final) break;
    }
    if (absorbed) steps.push(`Barrier absorbs ${absorbed}`);
    const hpBefore = target.current.hp;
    target.current.hp = Math.max(0, hpBefore - (final - absorbed));
    Object.assign(rec, { power, defense, post_def: postDef, variance, final, absorbed, hp_before: hpBefore, hp_after: target.current.hp, steps });
    if (target.current.hp === 0) {
        target.current.defeated = true;
        rec.defeated = true;
    }
    return rec;
}

function onDefeat(ctx, target, record) {
    const enc = ctx.enc;
    if (!enc.defeated.includes(target.id)) {
        enc.defeated.push(target.id);
        if (target.side === 'hostile' && typeof target.fixed.defeat_xp === 'number') {
            enc.pending_xp += target.fixed.defeat_xp;
            record.pending_xp_added = target.fixed.defeat_xp;
        }
    }
}

/** Resolve an attack action by a character (skill) or creature (natural attack). Returns a record or {illegal}. */
export function attackAction(ctx, actorId, targetId, skillId, extra = {}) {
    const { enc, content, state } = ctx;
    const actor = enc.combatants[actorId];
    const target = enc.combatants[targetId];
    const record = { round: enc.round, actor: actorId, kind: 'attack', target: targetId, opening: !!extra.opening };
    if (!target || !alive(target)) return { illegal: `target ${targetId} is not an active combatant` };
    if (target.current.cover === 'full') return { illegal: `${target.name} is behind full cover (no line of sight)` };
    // ---- character attack (Skill)
    if (actor.model === 'character') {
        const skill = skillOf(content, skillId);
        if (!actor.fixed.actions[skill.id]) return { illegal: `${actor.name} does not know ${skill.name}` };
        if (!skill.attack) return { illegal: `${skill.name} is not an attack` };
        const prof = PROF(content, actor.fixed.actions[skill.id].prof);
        // range + movement (only the declared/written movement; Core #12, #24 PC ACTION SCOPE)
        const bandBefore = distance(enc, actorId, targetId);
        let band = bandBefore;
        let moved = 0;
        // declared "close in" = the normal one-band move; EXTRA-BAND skills (Charge/Lunge/Shield Charge) add their
        // written extra band and may combine with the normal move (Content: "may combine with the normal one-band
        // Turn movement"), so declaring the skill authorises both.
        const allowed = (extra.move === 'closer' || skill.range.extra_band || extra.autoNormalMove ? 1 : 0) + (skill.range.extra_band ? 1 : 0);
        while (!rangeReaches(skill.range.band, band) && moved < allowed && bandIndex(band) > 0) {
            band = bandName(bandIndex(band) - 1);
            moved += 1;
        }
        if (skill.range.extra_band && band !== 'ENGAGED') return { illegal: `${skill.name} must end ENGAGED; ${target.name} is too far (${bandBefore})` };
        if (!rangeReaches(skill.range.band, band)) {
            return { illegal: `${target.name} is at ${bandBefore}; ${skill.name} reaches ${skill.range.band} at most and no declared movement brings it into range` };
        }
        const isArea = skill.effects.some((e) => e.kind === 'area');
        const areaTargets = isArea ? Object.values(enc.combatants).filter((c) => isOpponent(actor, c) && alive(c) && !c.current.surrendered && distance(enc, actorId, c.id) === 'ENGAGED').map((c) => c.id) : [];
        if (isArea && !areaTargets.length) return { illegal: `${skill.name} needs a valid target ENGAGED with ${actor.name}` };
        // resources (after legality of target/range, before RNG): Cost + Ammo committed together (Core #21)
        const costMult = prof.cost;
        const cost = skill.cost ? roundHalfUp(skill.cost.amount * costMult) : 0;
        if (skill.cost && actor.current[skill.cost.resource] < cost) {
            return { illegal: `${actor.name} lacks ${skill.cost.resource.toUpperCase()} for ${skill.name} (${actor.current[skill.cost.resource]} < ${cost})` };
        }
        let ammoUsed = 0;
        if (skill.ammo && actor.fixed.weapon_family === 'bow') {
            const have = actor.current.ammo?.[skill.ammo.item] || 0;
            if (have < skill.ammo.qty) return { illegal: `${actor.name} has ${have} arrow(s); ${skill.name} needs ${skill.ammo.qty}` };
            ammoUsed = skill.ammo.qty;
        }
        // commit movement + costs
        if (moved) {
            record.move = { bands: moved, from: bandBefore, to: band };
            setDistance(enc, actorId, targetId, band);
            if (actorId !== 'pc') actor.current.cover = 'none'; // leaving a position leaves its cover
        }
        if (cost) {
            record.cost = { resource: skill.cost.resource, amount: cost, before: actor.current[skill.cost.resource] };
            actor.current[skill.cost.resource] -= cost;
            record.cost.after = actor.current[skill.cost.resource];
        }
        if (ammoUsed) {
            record.ammo = { item: skill.ammo.item, used: ammoUsed };
            actor.current.ammo[skill.ammo.item] -= ammoUsed;
        }
        // prepared-attack buffs (Feint / Focus Aim) are consumed by this attack
        let buffHit = 0;
        let buffPowerPct = 0;
        const isRanged = skill.range.band !== 'ENGAGED';
        for (const b of effectsOf(actor, 'next_attack_buff')) {
            if (b.scope === 'ranged' && !isRanged) continue;
            buffHit += b.hit_pp; buffPowerPct += b.power_pct;
            actor.current.effects = actor.current.effects.filter((e) => e !== b);
            record.consumed = (record.consumed || []).concat(b.name);
        }
        record.skill = skill.id;
        record.skill_name = skill.name;
        const raw = rawPower(skill, actor.fixed.stats, { atk: actor.fixed.atk, matk: actor.fixed.matk });
        record.raw = raw;
        record.raw_text = rawPowerText(skill, actor.fixed.stats, { atk: actor.fixed.atk, matk: actor.fixed.matk });
        const opts = { raw, profHit: prof.hit_pp, profPower: prof.power, buffHit, buffPowerPct, ambush: !!extra.opening };
        record.strikes = [];
        if (isArea) {
            // area: shared Hit and Crit rolls, but the full per-target pipeline (DEF, variance, Endure, Barrier, HP)
            const shared = {};
            for (const tid of areaTargets) record.strikes.push(resolveStrike(ctx, actor, enc.combatants[tid], skill.attack, { ...opts, shared }));
        } else {
            for (let i = 0; i < (skill.strikes || 1); i++) {
                if (!alive(target)) break; // stop resolving strikes once the target is dead (Core #12)
                record.strikes.push(resolveStrike(ctx, actor, target, skill.attack, opts));
            }
        }
        for (const s of record.strikes) if (s.defeated) onDefeat(ctx, enc.combatants[s.target], record);
        // post-attack effects (Guarded Thrust)
        for (const eff of skill.effects) {
            if (eff.kind === 'post_attack_temp_def') addEffect(actor, { kind: 'temp_def', value: eff.flat, source: actorId, expires: 'start_of_source_next_turn', name: skill.name, round: enc.round });
        }
        return record;
    }
    // ---- creature natural attack
    const band = actor.current.band;
    let b = band;
    let moved = 0;
    if (!rangeReaches(actor.fixed.attack.range, b) && extra.move === 'closer' && bandIndex(b) > 0) {
        b = bandName(bandIndex(b) - 1);
        moved = 1;
    }
    if (!rangeReaches(actor.fixed.attack.range, b)) return { illegal: `${actor.name} cannot reach Alaric from ${band}` };
    if (moved) { record.move = { bands: 1, from: band, to: b }; actor.current.band = b; actor.current.cover = 'none'; }
    record.skill_name = actor.fixed.attack.name;
    record.raw = actor.fixed.atk;
    record.raw_text = `natural attack Raw = ATK ${actor.fixed.atk}`;
    const attack = { hit_mod: 0, damage_type: actor.fixed.attack.damage_type };
    record.strikes = [resolveStrike(ctx, actor, target, attack, { raw: actor.fixed.atk })];
    for (const s of record.strikes) if (s.defeated) onDefeat(ctx, enc.combatants[s.target], record);
    return record;
}

function addEffect(c, eff) {
    // same named effect does not stack magnitude (Core #13): replace, keep the stronger value
    const same = c.current.effects.find((e) => e.kind === eff.kind && e.name === eff.name);
    if (same) {
        Object.assign(same, eff, { value: Math.max(same.value || 0, eff.value || 0) });
        return;
    }
    c.current.effects.push(eff);
}

/** Defensive/utility Skills (Guard, Deflect, Wards, Brace, Bulwark, Endure, Evasive Step, Quickstep, Blink, Feint, Focus Aim). */
export function skillAction(ctx, actorId, skillId, extra = {}) {
    const { enc, content } = ctx;
    const actor = enc.combatants[actorId];
    const skill = skillOf(content, skillId);
    if (actor.model !== 'character' || !actor.fixed.actions[skill.id]) return { illegal: `${actor.name} does not know ${skill.name}` };
    const prof = PROF(content, actor.fixed.actions[skill.id].prof);
    const cost = skill.cost ? roundHalfUp(skill.cost.amount * prof.cost) : 0;
    if (skill.cost && actor.current[skill.cost.resource] < cost) return { illegal: `${actor.name} lacks ${skill.cost.resource.toUpperCase()} for ${skill.name}` };
    const record = { round: enc.round, actor: actorId, kind: 'skill', skill: skill.id, skill_name: skill.name, effects: [] };
    if (cost) {
        record.cost = { resource: skill.cost.resource, amount: cost, before: actor.current[skill.cost.resource] };
        actor.current[skill.cost.resource] -= cost;
        record.cost.after = actor.current[skill.cost.resource];
    }
    const st = actor.fixed.stats;
    for (const eff of skill.effects) {
        const val = (base, stat, coef, floor) => (floor ? base + Math.floor(st[stat] * coef) : num(base + st[stat] * coef));
        if (eff.kind === 'temp_def' || eff.kind === 'temp_mdef') {
            const v = val(eff.base, eff.stat, eff.coef, eff.floor);
            addEffect(actor, { kind: eff.kind, value: v, source: actorId, expires: 'start_of_source_next_turn', name: skill.name, round: enc.round });
            record.effects.push(`${eff.kind === 'temp_def' ? 'DEF' : 'MDEF'} +${v} until the start of ${actor.name}'s next turn`);
        } else if (eff.kind === 'incoming_hit_penalty') {
            addEffect(actor, { kind: 'incoming_hit_penalty', pp: eff.pp, source: actorId, expires: 'start_of_source_next_turn', name: skill.name, round: enc.round });
            record.effects.push(`incoming attacks -${eff.pp}pp Hit until the start of ${actor.name}'s next turn`);
        } else if (eff.kind === 'barrier') {
            const v = val(eff.base, eff.stat, eff.coef, eff.floor);
            addEffect(actor, { kind: 'barrier', hp: v, value: v, source: actorId, expires: 'start_of_source_next_turn', name: skill.name, round: enc.round });
            record.effects.push(`Barrier ${v} HP (until destroyed or the start of ${actor.name}'s next turn)`);
        } else if (eff.kind === 'damage_reduction_next') {
            addEffect(actor, { kind: 'damage_reduction_next', pct: eff.pct, source: actorId, expires: 'start_of_source_next_turn', name: skill.name, round: enc.round });
            record.effects.push(`next positive damage taken -${eff.pct}%`);
        } else if (eff.kind === 'next_attack_buff') {
            addEffect(actor, { kind: 'next_attack_buff', hit_pp: eff.hit_pp, power_pct: eff.power_pct, scope: eff.scope, source: actorId, expires: 'end_of_source_next_turn', name: skill.name, round: enc.round });
            record.effects.push(`next ${eff.scope === 'ranged' ? 'ranged ' : ''}attack +${eff.hit_pp}pp Hit and +${eff.power_pct}% Modified Power`);
        } else if (eff.kind === 'reposition') {
            const dir = extra.dir === 'closer' ? -1 : 1;
            record.reposition = repositionPc(enc, actorId, dir, extra.target);
            record.effects.push(`repositions ${record.reposition}`);
        }
    }
    return record;
}

function repositionPc(enc, actorId, dir, focusId) {
    // PC reposition shifts every hostile's band relative to the PC one step (away = +1, closer = -1)
    if (actorId !== 'pc') {
        const c = enc.combatants[actorId];
        const before = c.current.band;
        c.current.band = bandName(bandIndex(before) + dir);
        return `${before} -> ${c.current.band}`;
    }
    const moved = [];
    for (const c of Object.values(enc.combatants)) {
        if (c.id === 'pc' || !alive(c) || (focusId && c.id !== focusId)) continue;
        const before = c.current.band;
        c.current.band = bandName(bandIndex(before) + dir); // Alaric moved: the others keep their own cover
        moved.push(`${c.name} ${before} -> ${c.current.band}`);
    }
    return moved.join('; ');
}

export function moveAction(ctx, actorId, dir, focusId) {
    const { enc } = ctx;
    const record = { round: enc.round, actor: actorId, kind: 'move', dir };
    if (actorId === 'pc') {
        record.change = repositionPc(enc, 'pc', dir === 'closer' ? -1 : 1, focusId);
        return record;
    }
    const c = enc.combatants[actorId];
    const before = c.current.band;
    if (dir === 'away' && before === 'LONG') {
        c.current.escaped = true;
        enc.escaped.push(c.id);
        record.escaped = true;
        record.change = `${before} -> out of range (escaped)`;
        return record;
    }
    c.current.band = bandName(bandIndex(before) + (dir === 'closer' ? -1 : 1));
    c.current.cover = 'none'; // leaving a position leaves its cover
    record.change = `${before} -> ${c.current.band}`;
    return record;
}

// ------------------------------------------------------------------------------------------ NPC policy
const PASSIVE_INTENTS = new Set(['hold', 'parley', 'take_cover']);

/** Deterministic NPC decision (Core #27 NPC DECISION LOCK: decided from the NPC's own state/temperament first). */
export function npcDecide(ctx, npcId) {
    const { enc } = ctx;
    const me = enc.combatants[npcId];
    const pc = enc.combatants.pc;
    const hpPct = me.current.hp / me.fixed.max_hp;
    const band = me.current.band;
    const temper = me.fixed.temperament || (me.fixed.sapient ? 'cautious' : 'aggressive');
    let intent = enc.intents[npcId];
    const reach = me.model === 'creature' ? me.fixed.attack.range : npcReach(ctx, me);
    const inRange = bandIndex(band) <= bandIndex(reach);
    const wasHit = enc.log.some((r) => r.actor !== npcId && (r.strikes || []).some((s) => s.target === npcId && s.hit && s.hit.success));
    const attackOn = (r) => r.actor !== npcId && r.kind === 'attack' && (r.target === npcId || (r.strikes || []).some((s) => s.target === npcId));
    if (!alive(pc) || pc.current.hp <= 0) return { kind: 'hold', why: 'no living opponent' };
    // Core #27: the NPC decides from its own state. Being attacked since its last Turn outweighs a narrated passive
    // intent (hold / parley / take cover): Testrun 2 froze a trapper for three rounds under fire because the narrator
    // kept echoing the engine's "holds" as his next intent.
    const ownLast = enc.log.map((r) => r.actor).lastIndexOf(npcId);
    if (PASSIVE_INTENTS.has(intent) && enc.log.slice(ownLast + 1).some(attackOn)) {
        delete enc.intents[npcId];
        intent = undefined;
    }
    // PROPOSED NPC policy: a sapient NPC that is not hostile toward Alaric and has been neither hurt nor attacked does
    // not open with violence unless it is aggressive by temperament (it seeks cover or stays put instead).
    const attitude = ctx.state?.relations?.[`rel.${npcId}.attitude.pc`]?.value ?? 0;
    const harmed = me.current.hp < me.fixed.max_hp || wasHit || enc.log.some(attackOn);
    if (!intent && me.fixed.sapient && attitude > -20 && !harmed && temper !== 'aggressive') {
        if (temper === 'skittish') return { kind: 'flee', why: 'not hostile, frightened' };
        return me.current.cover === 'none' && band !== 'ENGAGED' ? { kind: 'cover', why: 'not hostile, not yet harmed: seeks cover' } : { kind: 'hold', why: 'not hostile, not yet harmed' };
    }
    if (intent) {
        delete enc.intents[npcId];
        if (intent === 'surrender') return { kind: 'surrender', why: 'narrated intent' };
        if (intent === 'flee') return { kind: 'flee', why: 'narrated intent' };
        if (intent === 'take_cover') return { kind: 'cover', why: 'narrated intent' };
        if (intent === 'hold' || intent === 'parley') return { kind: 'hold', why: `narrated intent (${intent})` };
        if (intent === 'attack') return inRange ? { kind: 'attack' } : { kind: 'close_and_attack' };
    }
    if (temper === 'skittish') {
        if (wasHit || band === 'ENGAGED') return band === 'ENGAGED' && !wasHit ? { kind: 'attack', why: 'cornered' } : { kind: 'flee', why: 'skittish, threatened' };
        return { kind: 'flee', why: 'skittish' };
    }
    if (temper === 'aggressive') {
        if (me.fixed.sapient && hpPct <= 0.15) return { kind: 'flee', why: 'badly wounded (<=15% HP)' };
        return inRange ? { kind: 'attack' } : { kind: 'close_and_attack' };
    }
    if (temper === 'defensive') {
        if (band === 'ENGAGED') return { kind: 'attack' };
        return me.current.cover === 'none' ? { kind: 'cover', why: 'defensive' } : { kind: 'hold', why: 'defensive, in cover' };
    }
    // cautious
    if (hpPct <= 0.35) return { kind: 'flee', why: 'wounded (<=35% HP)' };
    if (inRange) return { kind: 'attack' };
    const lastPc = [...enc.log].reverse().find((r) => r.actor === 'pc' && r.kind === 'attack');
    const shotFromRange = lastPc && (lastPc.strikes || []).some((s) => s.target === npcId) && band !== 'ENGAGED';
    if (shotFromRange && me.current.cover === 'none') return { kind: 'cover', why: 'melee-only, shot from range' };
    return { kind: 'close_and_attack' };
}

const hasAmmo = (me, s) => (me.current.ammo?.[s.ammo.item] || 0) >= s.ammo.qty;

function npcReach(ctx, me) {
    if (me.model !== 'character') return 'ENGAGED';
    let best = 'ENGAGED';
    for (const sid of Object.keys(me.fixed.actions)) {
        const s = ctx.content.skills.get(sid);
        if (s && s.attack && s.range && !s.range.extra_band && bandIndex(s.range.band) > bandIndex(best)) {
            if (s.ammo && (me.fixed.weapon_family !== 'bow' || !hasAmmo(me, s))) continue;
            best = s.range.band;
        }
    }
    return best;
}

function npcAttackSkill(ctx, me) {
    // the NPC's best legal attack: prefer the known attack with highest raw that reaches
    const band = me.current.band;
    let best = null;
    for (const sid of Object.keys(me.fixed.actions)) {
        const s = ctx.content.skills.get(sid);
        if (!s || !s.attack) continue;
        if (s.ammo && (me.fixed.weapon_family !== 'bow' || !hasAmmo(me, s))) continue;
        const cost = s.cost ? s.cost.amount : 0;
        if (s.cost && me.current[s.cost.resource] < cost) continue;
        const reach = s.range.extra_band ? 'SHORT' : s.range.band;
        if (bandIndex(band) > bandIndex(reach) + 1) continue;
        const raw = rawPower(s, me.fixed.stats, { atk: me.fixed.atk, matk: me.fixed.matk });
        if (!best || raw > best.raw) best = { id: s.id, raw };
    }
    return best ? best.id : null;
}

function npcTurn(ctx, npcId) {
    const { enc } = ctx;
    const me = enc.combatants[npcId];
    const decision = npcDecide(ctx, npcId);
    if (decision.kind === 'surrender') {
        me.current.surrendered = true;
        if (!enc.defeated.includes(npcId)) {
            enc.defeated.push(npcId);
            if (typeof me.fixed.defeat_xp === 'number') enc.pending_xp += me.fixed.defeat_xp;
        }
        return { round: enc.round, actor: npcId, kind: 'surrender', why: decision.why, pending_xp_added: me.fixed.defeat_xp };
    }
    if (decision.kind === 'flee') return { ...moveAction(ctx, npcId, 'away'), why: decision.why };
    if (decision.kind === 'cover') {
        const before = me.current.cover;
        let change = '';
        if (me.current.band !== 'LONG' && before === 'none') change = `${moveAction(ctx, npcId, 'away').change}, `;
        me.current.cover = 'partial';
        return { round: enc.round, actor: npcId, kind: 'cover', why: decision.why, change: `${change}cover ${before} -> partial` };
    }
    if (decision.kind === 'hold') return { round: enc.round, actor: npcId, kind: 'hold', why: decision.why };
    // attack (optionally after one band of movement)
    const move = decision.kind === 'close_and_attack' ? 'closer' : null;
    if (me.model === 'creature') {
        const r = attackAction(ctx, npcId, 'pc', null, { move });
        if (r.illegal) {
            if (move) return { ...moveAction(ctx, npcId, 'closer'), why: 'closing distance' };
            return { round: enc.round, actor: npcId, kind: 'hold', why: r.illegal };
        }
        return r;
    }
    let sid = npcAttackSkill(ctx, me);
    if (!sid) return move ? { ...moveAction(ctx, npcId, 'closer'), why: 'closing distance (no attack reaches)' } : { round: enc.round, actor: npcId, kind: 'hold', why: 'no usable attack' };
    const r = attackAction(ctx, npcId, 'pc', sid, { move, autoNormalMove: true });
    if (r.illegal) {
        if (move) return { ...moveAction(ctx, npcId, 'closer'), why: 'closing distance' };
        return { round: enc.round, actor: npcId, kind: 'hold', why: r.illegal };
    }
    return r;
}

// ------------------------------------------------------------------------------------------ turn loop
function startTurn(enc, actorId) {
    // effects anchored to the start of their source's next Turn expire now (Core #13)
    for (const c of Object.values(enc.combatants)) {
        c.current.effects = c.current.effects.filter((e) => !(e.source === actorId && e.expires === 'start_of_source_next_turn' && e.round < enc.round_marker));
    }
}

function endTurn(enc, actorId) {
    for (const c of Object.values(enc.combatants)) {
        c.current.effects = c.current.effects.filter((e) => !(e.source === actorId && e.expires === 'end_of_source_next_turn' && e.round < enc.round_marker - 0.5));
    }
}

function terminal(enc) {
    const pc = enc.combatants.pc;
    return activeHostiles(enc).length === 0 || pc.current.defeated || pc.current.escaped;
}

function advance(enc) {
    const order = enc.order.filter((id) => alive(enc.combatants[id]) && !enc.combatants[id].current.surrendered);
    if (!order.length) return;
    let idx = enc.turn_index;
    for (let k = 0; k < enc.order.length + 1; k++) {
        idx += 1;
        if (idx >= enc.order.length) { idx = 0; enc.round += 1; }
        const id = enc.order[idx];
        const c = enc.combatants[id];
        if (alive(c) && !c.current.surrendered) break;
    }
    enc.turn_index = idx;
    enc.current = enc.order[idx];
    enc.round_marker = enc.round + idx / 100; // monotonic turn marker for effect expiry
}

/**
 * Run the combat loop for one player message.
 * pcAction: {kind:'attack', skill, target, move} | {kind:'skill', skill, dir, target} | {kind:'move', dir, target}
 *           | {kind:'flee'} | {kind:'hold'} | null (no mechanical action declared)
 * Returns {enc, records, stopped: 'pc_turn'|'terminal'|'illegal', illegal?}
 */
export function runCombat(ctx, pcAction) {
    const { enc } = ctx;
    const records = [];
    const push = (r) => { enc.log.push(r); records.push(r); };
    // snapshots saved before carried ammunition was tracked per combatant: take it from the sheet once
    for (const c of Object.values(enc.combatants)) if (c.model === 'character' && !c.current.ammo) c.current.ammo = ammoOf(ctx.state?.entities[c.id]?.sheet || {}, ctx.content);
    let pcActed = false;
    // Opening Action (true Ambush) before Round 1
    if (enc.round === 0 && enc.ambush && !enc.opening) {
        const t = enc.trigger;
        let r;
        if (t.actor === 'pc') {
            r = attackAction(ctx, 'pc', t.target, t.skill, { opening: true, move: t.move });
            if (r.illegal) return { enc, records, stopped: 'illegal', illegal: r.illegal };
            pcActed = true;
        } else {
            const me = enc.combatants[t.actor];
            const sid = me.model === 'creature' ? null : npcAttackSkill(ctx, me);
            r = attackAction(ctx, t.actor, 'pc', sid, { opening: true, move: 'closer', autoNormalMove: true });
            if (r.illegal) r = { round: 0, actor: t.actor, kind: 'hold', why: `ambush attack impossible: ${r.illegal}` };
        }
        r.note = 'Opening Action (true Ambush: +25pp Crit for Characters, no Hit/Damage bonus)';
        enc.opening = true;
        enc.trigger_done = true;
        push(r);
    }
    if (enc.round === 0) { enc.round = 1; enc.turn_index = -1; advance(enc); if (enc.round > 1) enc.round = 1; }
    let guard = 0;
    while (!terminal(enc) && guard++ < 200) {
        const actorId = enc.current;
        startTurn(enc, actorId);
        if (actorId === 'pc') {
            if (pcActed) return { enc, records, stopped: 'pc_turn' };
            const act = pcAction || (enc.trigger && enc.trigger.actor === 'pc' && !enc.trigger_done ? { kind: 'attack', skill: enc.trigger.skill, target: enc.trigger.target, move: enc.trigger.move } : null);
            if (enc.trigger && enc.trigger.actor === 'pc') enc.trigger_done = true;
            if (!act) return { enc, records, stopped: 'pc_turn' };
            let r;
            if (act.kind === 'attack') r = attackAction(ctx, 'pc', act.target, act.skill, { move: act.move });
            else if (act.kind === 'skill') r = skillAction(ctx, 'pc', act.skill, { dir: act.dir, target: act.target });
            else if (act.kind === 'move') r = moveAction(ctx, 'pc', act.dir, act.target);
            else if (act.kind === 'flee') {
                const far = Object.values(enc.combatants).filter((c) => c.side === 'hostile' && alive(c)).every((c) => c.current.band === 'LONG');
                if (far) { enc.combatants.pc.current.escaped = true; r = { round: enc.round, actor: 'pc', kind: 'flee', escaped: true }; }
                else r = { ...moveAction(ctx, 'pc', 'away'), kind: 'flee' };
            } else r = { round: enc.round, actor: 'pc', kind: 'hold', why: 'no combat action declared' };
            if (r.illegal) return { enc, records, stopped: 'illegal', illegal: r.illegal };
            push(r);
            pcActed = true;
            endTurn(enc, 'pc');
            advance(enc);
            continue;
        }
        const r = npcTurn(ctx, actorId);
        push(r);
        endTurn(enc, actorId);
        advance(enc);
    }
    return { enc, records, stopped: terminal(enc) ? 'terminal' : 'pc_turn' };
}

/** Terminal Combat End (Core #28): award locked Pending XP once, Level-up loop, persist. */
export function endEncounterEvents(state, content, enc) {
    const events = [];
    const pc = enc.combatants.pc;
    const xp = pc.current.defeated ? 0 : enc.pending_xp;
    const summary = {
        defeated: enc.defeated.filter((id) => id !== 'pc'), escaped: enc.escaped.slice(), xp_awarded: xp,
        pc_dead: pc.current.defeated, pc_escaped: !!pc.current.escaped,
    };
    if (xp > 0) {
        const sheet = { ...state.entities.pc.sheet };
        events.push(...awardXp(sheet, xp, content, `Combat XP (${enc.defeated.map((id) => `${enc.combatants[id].name} ${enc.combatants[id].fixed.defeat_xp}`).join(', ')})`));
    }
    events.push({ t: 'encounter.ended', d: { id: enc.id, summary } });
    return { events, summary };
}

export { terminal };
