// Local threat handling for rejected Dungeon creatures; arrival is always structured.
export function unbookedDungeonThreat(threadText, refused) {
  if (!Array.isArray(refused) || !refused.length) return false;
  const text = String(threadText || '').toLowerCase();
  const local = /\b(?:here|ahead|nearby|around the bend|behind the bend|beyond the bend|in (?:the|a|this) (?:[\w-]+ ){0,4}(?:chamber|room|tunnel|passage|cavern|hall)|(?:at|by) (?:the|a|this) (?:[\w-]+ ){0,3}(?:fire|cookfire|bend|wall))\b/i.test(text);
  if (!local) return false;
  if (/\b(?:traders?|merchants?|witnesses?)\s+(?:report|warn|say|claim|describe|tell)\b/i.test(text)) return false;
  const named = refused.some((x) => {
    const species = String(x.species || '').toLowerCase().trim().replace(/\s+/g, ' ');
    if (!species) return false;
    const escaped = species.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}s?\\b`, 'i').test(text);
  });
  if (named) return true;
  const count = refused.reduce((n, x) => n + (Number.isInteger(x.count) && x.count > 0 ? x.count : 1), 0);
  if (count < 1 || count > 12) return false;
  const words = [null, 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return new RegExp(`\\b(?:${count}|${words[count]})\\s+(?:[\\w-]+\\s+){0,2}(?:shapes?|figures?|silhouettes?|forms?|creatures?|beings?|shadows?)\\b`, 'i').test(text);
}

/**
 * Natural batch on .191 (main: testrun_10b/npc-20261115-103140Z/GEGENREVIEW_OPUS.md, Warrior T70): does a thread's
 * text claim a creature this very reply could not book as being here or acting now ("… as the two spear-goblins
 * advanced")? Of any thread kind. The creature is named by its full species ("goblin warriors") or by its count with
 * its body plan or a word of its species ("two spear-goblins"). Where creatures the engine did book here share that
 * species or body plan (the goblin lookouts), the naming alone could mean them: then only newcomers count (more, other,
 * or an arrival or approach in the same clause: "advanced", "came out of the dark"). Not a claim of presence: traces of
 * them (tracks, prints, a smell), a report or rumour ("the miners say"), a sound with no such naming.
 * @param refused [{species, anchor, count}] the creature.new of this reply that the engine refused
 * @param booked  [{species, anchor}] the creatures the engine holds in this scene (alive or slain here)
 */
export function refusedCreatureInThread(threadText, refused, booked = []) {
  if (!Array.isArray(refused) || !refused.length) return false;
  const text = ` ${String(threadText || '').toLowerCase().replace(/\s+/g, ' ')} `;
  if (/\b(?:says?|said|claims?|claimed|rumou?rs?|reportedly|reports?|reported|told|warn(?:s|ed)?|tales?|stories)\b/.test(text)) return false;
  const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const norm = (w) => String(w || '').toLowerCase().replace(/[_\s]+/g, ' ').trim();
  const words = [null, 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const TRACE = /\b(?:tracks?|prints?|footprints?|bootprints?|spoor|droppings?|trail|scent|smell|stench|remains|bones|corpses?|bodies|marks?|signs?|traces?)\s+(?:of\s+)?(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|some)\s+)?(?:[\w-]+\s+)?$/;
  const ARRIVAL = /^[^.;!?]{0,60}?\b(?:advanc|approach|came|come|coming|emerg|ris(?:e|es|ing)|rose|step|walk|charg|rush|appear|join|arriv|enter|creep|crept|clos|edg|stalk|loom)\w*/;
  const NEW = /\b(?:more|other|new|fresh|further)\s+(?:[\w-]+\s+){0,2}$/;
  return refused.some((x) => {
    const species = norm(x.species);
    const anchor = norm(x.anchor);
    const sameSpecies = booked.some((b) => species && norm(b.species) === species);
    const sameKind = sameSpecies || booked.some((b) => anchor && norm(b.anchor) === anchor);
    const terms = [...new Set([anchor, ...species.split(' ')].filter((w) => w.length > 2))];
    const n = Number.isInteger(x.count) && x.count > 0 && x.count <= 12 ? x.count : null;
    const hits = [];
    const collect = (re, shared) => { for (const m of text.matchAll(re)) hits.push({ at: m.index, end: m.index + m[0].length, own: m[0], shared }); };
    if (species) collect(new RegExp(`\\b${esc(species)}(?:e?s)?\\b`, 'g'), sameSpecies);
    if (n && terms.length) collect(new RegExp(`\\b(?:${n}|${words[n]})\\s+(?:[\\w-]+\\s+){0,2}?(?:[\\w]+-)?(?:${terms.map(esc).join('|')})(?:e?s)?\\b`, 'g'), sameKind);
    return hits.some(({ at, end, own, shared }) => {
      const before = text.slice(Math.max(0, at - 40), at).replace(/\b(?:the|a|an)\s+$/, '');
      if (TRACE.test(before)) return false;
      return !shared || NEW.test(before) || /\b(?:more|other|new|fresh|further)\b/.test(own) || ARRIVAL.test(text.slice(end));
    });
  });
}
