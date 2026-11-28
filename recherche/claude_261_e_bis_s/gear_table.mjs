// Offline: product itemProfile/valueOf/gearRetailPrice for every gear kind x quality x rank F/E/D (no change to the product).
// node gear_table.mjs <engine root>
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2]; const imp = p => import(pathToFileURL(path.join(root, p)).href);
const c = await (await imp('tests/helpers.js')).loadProductContent();
const { itemProfile, gearRetailPrice } = await imp('src/v4/items.js');
const bases = ['longsword', 'staff', 'dagger', 'heavy armor', 'robes', 'leather armor', 'shield'];
const qs = ['crude', 'common', 'fine', 'superior', 'exceptional'];
console.log('base | quality | F atk/matk/def/mdef value retail | E ... | D ...');
for (const b of bases) for (const q of qs) {
  const row = ['F', 'E', 'D'].map(r => { const p = itemProfile(c, { name: `${q} ${r}-Rank ${b}`, balance: true });
    return p ? `${p.atk}/${p.matk}/${p.def}/${p.mdef} v${p.value_cp} r${gearRetailPrice(c, p) ?? '-'}` : 'null'; });
  console.log(`${b} | ${q} | ${row.join(' | ')}`);
}
