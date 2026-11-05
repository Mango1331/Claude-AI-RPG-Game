// Real ST rendering of canonical User01 snapshots plus an actual board.read/normal turn.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
const u = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user01_stealth.json.gz', import.meta.url))));
export const uiTurns = [
 { key:'ui157board',player:"I read today's Guild board.",plan:{commands:[{seq:1,type:'board.read',rank:null,quote:"I read today's Guild board."}]},reply:'Alaric reads the official notices.',answer:{scene:'here',expected:{},deltas:[]} },
 { key:'ui157ground',player:'I look at the objects in this chamber.',plan:{commands:[]},reply:'Alaric studies the objects in this chamber.',answer:{scene:'here',expected:{},deltas:[]} },
];
export async function uiSmoke({page,send,idle,onReload,out}) {
 const seed=async end=>{
  await page.evaluate(async prefix=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...prefix);await c.saveChat();await c.reloadCurrentChat();},structuredClone(u.prefix.slice(0,end)));
  onReload();
 };
 const snapshot=()=>page.evaluate(async()=>{
  const {foldChat}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
  const c=SillyTavern.getContext(),s=foldChat(c.chat).state;
  return {quests:Object.keys(s.quests).sort(),objects:JSON.stringify(s.objects),at:s.scene.at,errors:foldChat(c.chat).errors,status:c.chat.at(-1)?.extra?.avereth?.extraction?.status};
 });
 await seed(13); const before=await snapshot();
 await send(uiTurns[0].player);await idle();const after=await snapshot();
 const root=page.locator('#chat :is(.avereth-board, .custom-avereth-board)').last();
 const checks={
  boardUsesCanonicalListings:await root.locator(':is(.avereth-board-card, .custom-avereth-board-card)').count()===5 && JSON.stringify(before.quests)===JSON.stringify(after.quests) && after.status==='applied',
  boardCoreVisible:await root.innerText().then(t=>/reward:/.test(t)&&/kills total|Clear/.test(t)),
  boardDetailsCollapsed:await root.locator('details[open]').count()===0,
 };
 await page.screenshot({path:path.join(out,'ui157-board-wide.png'),fullPage:false});
 const summary=root.locator('summary').first();await summary.focus();await summary.press('Enter');
 checks.nativeKeyboardDetails=await root.locator('details[open]').count()===1;
 await page.setViewportSize({width:390,height:844});await root.scrollIntoViewIfNeeded();
 checks.narrowBoardFits=await root.evaluate(el=>el.scrollWidth<=el.clientWidth+2);
 await page.screenshot({path:path.join(out,'ui157-board-narrow.png'),fullPage:false});
 await page.setViewportSize({width:1280,height:900});
 await seed(27);const groundBefore=await snapshot();await send(uiTurns[1].player);await idle();const groundAfter=await snapshot();
 await page.locator('#chat .last_mes details:is(.avereth-hud, .custom-avereth-hud)').last().evaluate(el=>el.open=true);
 const view=await page.locator('#chat .last_mes').innerText();
 checks.groundAndFloorVisible=/On the ground/.test(view)&&/Dungeon level 1/.test(view)&&groundBefore.objects===groundAfter.objects&&groundBefore.at===groundAfter.at;
 await page.screenshot({path:path.join(out,'ui157-ground.png'),fullPage:false});
 // Render a real original active encounter through the current view; no events or model turns for layout inspection.
 const combatEnd=u.prefix.findIndex(m=>m.extra?.avereth?.hud?.includes('avereth-combat-hud'))+1;
 await seed(combatEnd);
 checks.combatCanonicalView=await page.evaluate(async()=>{
  const h=await import('/scripts/extensions/third-party/avereth-engine/src/host.js'),v=await import('/scripts/extensions/third-party/avereth-engine/src/hud.js'),cmod=await import('/scripts/extensions/third-party/avereth-engine/src/content.js');
  const content=await cmod.loadContentPack(async n=>await(await fetch('/scripts/extensions/third-party/avereth-engine/content/'+n)).json());
  const c=SillyTavern.getContext(),s=h.foldChat(c.chat).state,m=c.chat.at(-1);
  h.showPanel(m,m.extra.avereth.panel,v.renderHud(s,content),{playerFacing:true});await c.saveChat();await c.reloadCurrentChat();
  const el=document.querySelector('#chat .last_mes');
  return !!s.encounter && el.querySelectorAll('.avereth-combat-hud, .custom-avereth-combat-hud').length===1 && !!el.querySelector('.avereth-awareness, .custom-avereth-awareness');
 });
 onReload();await page.screenshot({path:path.join(out,'ui157-combat.png'),fullPage:false});
 await page.setViewportSize({width:390,height:844});
 const combat=page.locator('#chat :is(.avereth-combat-hud, .custom-avereth-combat-hud)').last();await combat.scrollIntoViewIfNeeded();
 checks.narrowCombatFits=await combat.evaluate(el=>el.scrollWidth<=el.clientWidth+2);
 await page.screenshot({path:path.join(out,'ui157-combat-narrow.png'),fullPage:false});
 await page.setViewportSize({width:1280,height:900});
 return checks;
}
