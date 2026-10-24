// Explicit harness data only. Imported by Node tests and the opt-in isolated ST fixture runner, never the extension.
import { campaign, inject } from './patch8_lib.js';
import { awardXp } from '../../src/progression.js';
import { deriveCharacter } from '../../src/derived.js';
import { hash32 } from '../../src/util.js';

export const FIXTURE_SEEDS = [7, 19, 41];
export function careerFixture(profile = 'normal', seed = 7) {
    const context = (i) => `fixture:${profile}:${seed}:${i}`;
    const feat = (kind, i, more = {}) => ({ key: `${kind}:${context(i)}`, kind, title: { giant: 'Giant Slayer', survival: 'Extraordinary Survival', odds: 'Against the Odds', development: 'Remarkable Development' }[kind], context: context(i), source: `fixture:${seed}:${i}`, turn: 1, minute: 0, facts: { fixture: true, gap: 3, ...more } });
    const feats = profile === 'experienced' ? [feat('survival', 1), feat('odds', 2), feat('development', 2)]
        : profile === 'extreme' ? [feat('giant', 1, { level: 1, gap: 14, extreme: true })] : [];
    const n = 5 + parseInt(hash32(String(seed)), 16) % 6;
    const style = profile === 'defense' ? { Defense: n * 3, defense: n * 3, Martial: 1 }
        : profile === 'hybrid' ? { Martial: n * 2, Arcane: n * 2, offense: n * 2 }
            : { Martial: n * 2, offense: n * 2 };
    return { t: 'career.recorded', d: { source: `fixture:${profile}:${seed}`, stats: { fights_won: profile === 'farming' ? 500 : 10 + n, foes_defeated: profile === 'farming' ? 500 : 12 + n }, feats, style } };
}

export async function classFixture(content, { profile = 'normal', seed = 7, legacy = false } = {}) {
    const g = await campaign(content, { cls: legacy ? 'Mage' : 'Warrior', skills: legacy ? 'Flame Lance + Blink' : 'Heavy Slash + Guard' });
    const amount = Array.from({ length: 13 }, (_, i) => (i + 1) * content.rules.progression.xp_to_next_per_level).reduce((a, b) => a + b, 0);
    inject(g, awardXp(g.state().entities.pc.sheet, amount, content, 'Explicit Patch 9D Level-14 fixture'));
    inject(g, [{ t: 'xp.changed', d: { id: 'pc', xp: 14 * content.rules.progression.xp_to_next_per_level - 1, amount: 0, reason: 'Explicit fixture: one XP before Level 15' } }]);
    if (!legacy) inject(g, [careerFixture(profile, seed)]);
    if (profile === 'hybrid' && !legacy) inject(g, [{ t: 'skill.learned', d: { id: 'pc', skill: 'mage.arcane_bolt', prof: 1, why: 'Explicit hybrid fixture' } }]);
    const sh = g.state().entities.pc.sheet, dv = deriveCharacter(sh, content);
    inject(g, [['hp', dv.maxHp], ['mp', dv.maxMp], ['sta', dv.maxSta]].map(([resource, value]) => ({ t: 'resource.changed', d: { id: 'pc', resource, value } })));
    inject(g, [{ t: 'note', d: { fixture: 'patch9d', profile, seed, synthetic_history: true } }]);
    const base = g.llm;
    g.llm = async (q) => q.purpose.startsWith('forge') ? 'invalid fixture forge (deterministic fallback)' : base(q);
    return g;
}
