// Narrow evidence tests for Dungeon arrival and objective phantom threats.
// Only a completed Alaric crossing qualifies; rejected local creatures cannot become threats.
export function crossedDungeonGate(prose) {
  const text = String(prose || '');
  if (!/\binside\b/i.test(text)) return false;
  if (/\b(?:Alaric|he)\s+(?:remained|stayed|stood|waited|stopped)\s+(?:\w+\s+){0,3}(?:outside|at the gate)\b/i.test(text)
      || /\b(?:remaining|staying|stayed|stopping|stopped|returned|backed|retreated)\s+outside\b/i.test(text)) return false;
  return text.split(/(?<=[.!?])\s+|\n+/u).some((sentence) => {
    const matched = /\bAlaric\s+(?:stepped|walked|strode|went|passed|crossed|moved|slipped|entered)\s+(?:(?:carefully|quietly|slowly|fully|cautiously|directly|boldly)\s+){0,3}(?:(?:through|past|across|into)\s+(?:the\s+)?(?:gate|entrance|threshold|doorway|mouth|tunnel|warrens|dungeon)|inside\b)/i.exec(sentence);
    if (!matched) return false;
    return !/\b(?:if|unless|would|could|might|imagine|imagined|pretend|pretended)\b/i.test(sentence.slice(0, matched.index))
      && !/\b(?:almost|nearly|tried|attempted|imagined|pretended|might|would|could|if|unless|but\s+stopped|but\s+turned\s+back)\b/i.test(sentence);
  });
}

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
