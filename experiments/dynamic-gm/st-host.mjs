// Node coordinator / real browser ST bridge. No browser-side filesystem or scheduler duplicate.
import {copy,digest,fault} from '../architecture201/journal.mjs';
import {BoundPublication} from './publication.mjs';
export class BrowserHost {
 constructor(page){this.page=page;this.chatId='';this.epoch=0;this.targets=new Map();this.cache=new Map();this.chat=[];this.dom=new Map();this.display=Promise.resolve();this.log=[];}
 token(){return {chatId:this.chatId,epoch:this.epoch};}current(t){return t.chatId===this.chatId&&t.epoch===this.epoch;}
 stop(){this.epoch++;} readChatFor(id){return copy(this.cache.get(id)||[]);}readChat(){return this.readChatFor(this.chatId);}
 async bind(id){const target=await this.page.evaluate(()=>{const c=SillyTavern.getContext(),ch=c.characters[c.characterId];return {avatar_url:ch.avatar,ch_name:ch.name};});this.targets.set(id,Object.freeze({...target,file_name:id}));this.chatId=id;this.epoch++;this.dom.clear();await this.refresh(id);if(!this.cache.get(id).length)await this.rpc('/api/chats/save',{...this.targets.get(id),chat:[{user_name:'Alaric',character_name:target.ch_name,chat_metadata:{}},{mes:'Isolated GM test ready.',is_system:true,is_user:false,name:'System',extra:{}}]});await this.page.evaluate(async id=>SillyTavern.getContext().openCharacterChat(id),id);await this.refresh(id);await this.attach();}
 async attach(){this.page.__gmHost=this;if(!this.page.__gmBound){await this.page.exposeFunction('gmLifecycle',event=>{const h=this.page.__gmHost;h?.stop();h?.log.push('lifecycle:'+event);});this.page.__gmBound=true;}await this.page.evaluate(()=>{if(window.gmBound)return;window.gmBound=true;const c=SillyTavern.getContext();for(const event of ['GENERATION_STOPPED','CHAT_CHANGED'])c.eventSource.on(c.eventTypes[event],()=>window.gmLifecycle(event));});}
 async refresh(id){const data=await this.rpc('/api/chats/get',this.targets.get(id));this.cache.set(id,Array.isArray(data)?data.slice(1):[]);}
 async rpc(url,body){return this.page.evaluate(async({url,body})=>{const r=await fetch(url,{method:'POST',headers:SillyTavern.getContext().getRequestHeaders(),body:JSON.stringify(body)});if(!r.ok)throw Error(`ST ${url} ${r.status}`);return r.json();},{url,body});}
 async saveChatFor(id,{chatData}){
  const target=this.targets.get(id);if(!target)throw fault('unbound target');this.log.push('save:start');
  await this.rpc('/api/chats/save',{...target,chat:[{user_name:'Alaric',character_name:target.ch_name,chat_metadata:{}},...chatData]});
  await this.refresh(id);this.log.push('save:readback');
 }
 render(id,message){const token=this.token(),chat=copy(this.chat);this.display=this.display.then(async()=>{
  if(!this.current(token))throw fault('stale display');
  await this.page.evaluate(async({chat,id,expected})=>{const c=SillyTavern.getContext();if(c.characters[c.characterId]?.avatar!==expected.avatar_url||c.chatId!==expected.file_name)throw Error('browser character changed');
   const m=await import('/script.js');c.chat.splice(0,c.chat.length,...chat);document.querySelector('#chat').replaceChildren();
   for(let i=0;i<c.chat.length;i++)m.addOneMessage(c.chat[i],{forceId:i,scroll:false});
   window.gmTrace.push({event:'display',id});
  },{chat,id,expected:this.targets.get(token.chatId)});this.dom.set(id,message.mes);this.log.push('display');
 });}
 async reload(){await this.page.reload({waitUntil:'networkidle'});await this.page.waitForFunction(()=>window.SillyTavern?.getContext()?.characters?.length);await this.page.evaluate(async avatar=>{const c=SillyTavern.getContext();await c.selectCharacterById(String(c.characters.findIndex(ch=>ch.avatar===avatar)));},this.targets.get(this.chatId).avatar_url);await this.page.evaluate(async id=>SillyTavern.getContext().openCharacterChat(id),this.chatId);await install(this.page);await this.attach();this.epoch++;this.dom.clear();await this.refresh(this.chatId);this.chat=this.readChat();}
}
export async function install(page){await page.evaluate(async()=>{
 window.gmTrace=[];const c=SillyTavern.getContext();for(const k of ['GENERATION_STOPPED','MESSAGE_RECEIVED','CHARACTER_MESSAGE_RENDERED','CHAT_CHANGED'])if(c.eventTypes[k])c.eventSource.on(c.eventTypes[k],()=>window.gmTrace.push({event:k}));
 const panel=document.createElement('div');panel.id='dynamic-gm-controls';panel.style='position:fixed;top:0;left:0;z-index:99999;background:#222;padding:8px;color:white';
 panel.innerHTML='<button id="gm-stop">GM Stop</button><button id="gm-regenerate">GM Regenerate</button><button id="gm-swipe">GM Swipe</button><span id="gm-status"></span>';document.body.append(panel);
 panel.querySelector('#gm-stop').onclick=()=>c.eventSource.emit(c.eventTypes.GENERATION_STOPPED);
 document.addEventListener('click',e=>{if(e.target.closest('#option_regenerate,.swipe_left,.swipe_right,#send_but')){e.preventDefault();e.stopImmediatePropagation();document.querySelector('#gm-status').textContent='Alternative Geschichten werden im Prototyp kontrolliert abgelehnt.';}},true);
 for(const id of ['gm-regenerate','gm-swipe'])panel.querySelector('#'+id).onclick=()=>{document.querySelector('#gm-status').textContent='Alternative Geschichten werden im Prototyp kontrolliert abgelehnt.';};
});}
export async function raw(page,messages){return page.evaluate(async prompt=>(await import('/script.js')).generateRaw({prompt,api:'openai',trimNames:false,responseLength:2000}),messages);}
// Real ST backend request, SSE buffered outside stock Generate/StreamingProcessor. No message append on chunks.
export async function streamed(page,messages){return page.evaluate(async messages=>{
 const c=SillyTavern.getContext();const r=await fetch('/api/backends/chat-completions/generate',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({chat_completion_source:'custom',custom_url:'http://127.0.0.1:5138/v1',custom_model:'mock-gm',model:'mock-gm',messages,stream:true,max_tokens:2000})});
 if(!r.ok)throw Error(`ST generation ${r.status}`);let pending='',text='';const reader=r.body.getReader(),decoder=new TextDecoder();
 for(;;){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let cut;while((cut=pending.indexOf('\n\n'))>=0){const line=pending.slice(0,cut);pending=pending.slice(cut+2);for(const row of line.split('\n'))if(row.startsWith('data: ')){const data=row.slice(6);if(data==='[DONE]')continue;const x=JSON.parse(data);text+=x.choices?.[0]?.delta?.content||'';window.gmTrace.push({event:'buffered-chunk',visible:document.querySelectorAll('#chat .mes').length});}}}
 return text;
 },messages);}
// Real DOM rendering is asynchronous across the bridge. Persist published only after its actual acknowledgement.
export class BrowserPublication extends BoundPublication {
 async publish(id,token,hook=()=>{}){
  const db=this.journal.read(),t=db.turns[id],h=this.host;
  if(!t?.originChatId||token.chatId!==t.originChatId||h.chatId!==t.originChatId||!h.current(token))throw fault('origin chat mismatch or stale host');
  if(!['committed','published'].includes(t.phase)||db.world.revision!==t.baseRevision+1||digest(db.world.chat)!==digest(t.chat))throw fault('publication revision conflict');
  const key=`${id}@${t.baseRevision+1}`,chat=copy(t.chat);chat.at(-1).extra.prototypeCommit=key;delete chat.at(-1).extra.display_text;
  // ST prefers this derived display cache; continuation changed mes after the original draft was processed.
  if(chat.at(-1).swipes){chat.at(-1).swipes=[chat.at(-1).mes];chat.at(-1).swipe_id=0;}
  // Always real backend readback, even on resume; do not trust a pre-reload JS cache.
  await h.refresh(t.originChatId);
  if(digest(h.readChatFor(t.originChatId))!==digest(chat))await h.saveChatFor(t.originChatId,{chatData:chat});
  if(digest(h.readChatFor(t.originChatId))!==digest(chat))throw fault('ST save acknowledgement not confirmed');
  await hook('after_host_save');if(!h.current(token))throw fault('chat changed while saving');
  h.chat=chat;if(!h.dom.has(key)){h.render(key,chat.at(-1));await h.display;}
  await hook('after_display');if(!h.current(token))throw fault('stale display acknowledgement');
  this.journal.update(db=>{db.turns[id].phase='published';});
 }
}
