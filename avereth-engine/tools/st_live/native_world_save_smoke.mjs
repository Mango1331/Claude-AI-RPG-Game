// A native streaming final save must finish before an arriving extractor result mutates its snapshot.
export async function nativeWorldSaveSmoke({page,send,idle,calls,onReload}){
 const base='/scripts/extensions/third-party/avereth-engine/';
 const prefix=await page.evaluate(()=>{const c=SillyTavern.getContext(),u=c.chat.findIndex(m=>m.is_user && m.mes==='I Fire Lance Barkscorpion B');if(u<0)throw Error('Native-save probe requires the base Barkscorpion fixture');return structuredClone(c.chat.slice(0,u));});
 await page.evaluate(async prefix=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...prefix);await c.saveChat();await c.reloadCurrentChat();c.chatCompletionSettings.stream_openai=true;},prefix);onReload();await idle();
 let sawPendingWrite=false,gets=0,release,entered,handled;
 const gate=new Promise(r=>release=r),held=new Promise(r=>entered=r),done=new Promise(r=>handled=r);
 const observe=req=>{if(req.method()==='POST' && req.url().endsWith('/api/chats/save')){
  try{if(req.postDataJSON().chat?.at(-1)?.extra?.avereth?.extraction?.status==='pending')sawPendingWrite=true;}catch{}
 }};
 const route=async r=>{
  if(sawPendingWrite && ++gets===2){entered();await gate;await r.continue();handled();}else await r.continue();
 };
 page.on('request',observe);await page.route('**/api/chats/get',route);
 // Handle rejection immediately, even when an earlier gate fails and the runner closes the page.
 const response=page.waitForResponse(r=>r.url().endsWith('/api/backends/chat-completions/generate') && r.request().postDataJSON().messages?.[0]?.content?.startsWith('You read one reply'),{timeout:20000}).then(value=>({value}),error=>({error}));
 const n=calls.length;await page.fill('#send_textarea','I Fire Lance Barkscorpion B');await page.click('#send_but');
 let timer;
 try{
  await Promise.race([held,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Native final-save gate not reached')),15000))]);clearTimeout(timer);
  const received=await response;if(received.error)throw received.error;
  await received.value.finished();await page.waitForTimeout(100);
  const pending=await page.evaluate(()=>SillyTavern.getContext().chat.at(-1)?.extra?.avereth?.extraction?.status);
  const checks={nativePriorReadHeld:gets===2,worldWaitsForNativeSave:pending==='pending'};
  release();await done;await page.unroute('**/api/chats/get',route);page.off('request',observe);await idle();
  checks.worldAppliedAfterNativeSave=await page.evaluate(()=>SillyTavern.getContext().chat.at(-1)?.extra?.avereth?.extraction?.status==='applied');
  checks.noExtraModel=calls.slice(n).map(c=>c.purpose).join(',')==='plan,narrator,extract';
  const final=await page.evaluate(async base=>{const {foldChat}=await import(base+'src/host.js');return JSON.stringify(foldChat(SillyTavern.getContext().chat).state);},base);
  await page.evaluate(async()=>{await SillyTavern.getContext().reloadCurrentChat();});onReload();await idle();
  checks.sameWorldAfterReload=await page.evaluate(async({base,final})=>{const {foldChat}=await import(base+'src/host.js');return JSON.stringify(foldChat(SillyTavern.getContext().chat).state)===final;},{base,final});
  return checks;
 }finally{clearTimeout(timer);release();page.off('request',observe);}
}
