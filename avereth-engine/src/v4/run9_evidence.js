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
