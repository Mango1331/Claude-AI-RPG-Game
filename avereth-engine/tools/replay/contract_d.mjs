// Offline-only conversion of pre-D offer lines. Never imported by product code.
// Preserve the old name/quality reading; do not split an old package or invent goods.
import {itemProfile,gearBases,qualityOf,rankInName} from '../../src/v4/items.js';
export function gearContract(value, content) {
 const v=structuredClone(value);
 if (!v?.deltas) return v;
 for(const d of v.deltas) if(d.type==='offer') for(const l of d.lines || []) {
  if(l.base != null || l.quality != null || l.equipment===false || l.kind!=='goods' || (rankInName(l.what) && rankInName(l.what)!=='F')) continue;
  const p=itemProfile(content,{name:l.what,balance:true});
  if(p?.kind!=='gear')continue;
  const all=gearBases(content);
  const bases=all.some(b=>b.kind===p.base) ? all.filter(b=>b.kind===p.base) : all;
  const words=` ${String(l.what).toLowerCase().replace(/[^a-z0-9]+/g,' ')} `;
  const b=bases.find(b=>words.includes(` ${b.name} `));
  if(b){l.base=b.id;l.quality=qualityOf(content,l.what).tier;}
 }
 return v;
}
