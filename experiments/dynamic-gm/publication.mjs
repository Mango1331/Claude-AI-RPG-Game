import {HeldPublication,ST119Mock} from '../architecture201/host.mjs';
import {copy,fault} from '../architecture201/journal.mjs';

// A real host must implement this explicit-target persistence contract. It cannot infer the target after an await.
export class OriginHost extends ST119Mock {
 async saveChatFor(chatId,{chatData}) {
  if(this.saveMode==='silent'){this.saveMode=null;return;}
  if(this.saveMode==='throw'){this.saveMode=null;throw fault('ST save failed');}
  this.store.update(db=>{db.hostChats||={};db.hostChats[chatId]=copy(chatData);});
 }
 readChatFor(chatId){return copy(this.store.read().hostChats?.[chatId]||[]);}
}
export class BoundPublication extends HeldPublication {
 async publish(id,token,hook){
  const t=this.journal.read().turns[id];
  if(!t?.originChatId||token.chatId!==t.originChatId||this.host.chatId!==t.originChatId)throw fault('origin chat mismatch');
  const host=this.host,origin=t.originChatId;
  if(typeof host.saveChatFor!=='function'||typeof host.readChatFor!=='function')throw fault('host lacks explicit chat-target persistence');
  const scoped=new Proxy(host,{get(target,key){
   if(key==='saveChat')return args=>host.saveChatFor(origin,args);
   if(key==='readChat')return ()=>host.readChatFor(origin);
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(host):value;
  }});
  return new HeldPublication(this.journal,scoped).publish(id,token,hook);
 }
}
