import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../..',import.meta.url));
const source=path.join(root,'experiments/dynamic-gm/alpha'),out=path.join(root,'avereth-gm-alpha'),engine=path.join(root,'avereth-engine');
fs.mkdirSync(out,{recursive:true});
for(const dir of ['src','content'])fs.cpSync(path.join(engine,dir),path.join(out,dir),{recursive:true});
fs.mkdirSync(path.join(out,'gm'),{recursive:true});
fs.cpSync(path.join(source,'tokenizer'),path.join(out,'tokenizer'),{recursive:true});
for(const name of ['util.js','storage.js','scheduler.js','engine.js','runtime.js','transport.js','host.js','budget.js','request-policy.js'])fs.copyFileSync(path.join(source,name),path.join(out,'gm',name));
let contract=fs.readFileSync(path.join(root,'experiments/dynamic-gm/contract.mjs'),'utf8')
 .replaceAll('../../avereth-engine/src/','../src/').replaceAll('../architecture201/journal.mjs','./util.js').replaceAll('../architecture201/engine.mjs','./engine.js');
fs.writeFileSync(path.join(out,'gm/contract.js'),contract);
fs.copyFileSync(path.join(source,'index.js'),path.join(out,'index.js'));
fs.writeFileSync(path.join(out,'style.css'),fs.readFileSync(path.join(engine,'style.css'),'utf8')+'\n'+fs.readFileSync(path.join(source,'style.css'),'utf8'));
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({display_name:'Avereth GM Alpha 2',loading_order:1,js:'index.js',css:'style.css',author:'Avereth RPG project',version:'4.3.0-gm.alpha.2',auto_update:false,generate_interceptor:'averethGMAlphaInterceptor'},null,2)+'\n');
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify({private:true,type:'module',version:'4.3.0-gm.alpha.2'},null,2)+'\n');
const preset={reasoning_effort:'low',seed:-1,temperature:0.8,frequency_penalty:0,presence_penalty:0,top_p:0.95,openai_max_context:32768,openai_max_tokens:4096,max_context_unlocked:false,stream_openai:false,n:1,function_calling:false,show_thoughts:false,enable_web_search:false,request_images:false,send_if_empty:'',use_sysprompt:false,
 prompts:[{identifier:'main',name:'Avereth GM Alpha — style',system_prompt:true,role:'system',content:'GM Alpha supplies its own system contract and style. This Prompt Manager entry is not sent by its raw transport.',injection_position:0,injection_depth:4}],
 prompt_order:[{character_id:100001,order:[{identifier:'main',enabled:true}]}]};
fs.mkdirSync(path.join(out,'presets'),{recursive:true});
for(const name of ['Avereth GM Alpha 1.json','Avereth GM Alpha 1 Text Completion.json','Avereth GM Alpha 2 Text Completion.json'])fs.rmSync(path.join(out,'presets',name),{force:true});
fs.writeFileSync(path.join(out,'presets/Avereth GM Alpha 2.json'),JSON.stringify(preset,null,2)+'\n');
const card={spec:'chara_card_v2',spec_version:'2.0',data:{name:'Avereth GM Alpha',description:'Avereth: a free, living high-fantasy sandbox. You are its creative game master. The GM Alpha extension supplies mechanics, retrieved memory and its dynamic operation contract. No additional narrator contract or legacy lorebook is required.',personality:'',scenario:'Alaric, an eighteen-year-old human from Earth, arrives in Avereth. His origin is private knowledge. Medieval high fantasy; no assumed modern industry. NPCs have their own interests and limited knowledge.',first_mes:'AVERETH GM ALPHA 2\n\nLocation: Public roadside verge outside Alderwatch, Kingdom of Valdorn\n\nStart a new test game using the GM Alpha controls. Choose Warrior, Mage or Rogue, then two Skills. Character creation is resolved by the engine.\n\nCHARACTER CREATION — STEP 1/2',mes_example:'',creator_notes:'Requires avereth-gm-alpha extension. New test chats only. Keep the .200 narrator and its campaigns separate.',system_prompt:'',post_history_instructions:'',alternate_greetings:[],tags:['Avereth','GM Alpha'],creator:'Avereth RPG project',character_version:'4.3.0-gm.alpha.2',extensions:{avereth_gm_alpha:1}}};
fs.writeFileSync(path.join(out,'presets/Avereth GM Alpha.character.json'),JSON.stringify(card,null,2)+'\n');
for(const file of ['INSTALLATION_DE.md','LIMITATIONS.md'])if(fs.existsSync(path.join(source,file)))fs.copyFileSync(path.join(source,file),path.join(out,file));
if(fs.existsSync(path.join(source,'ABNAHME_2026-11-16.md'))) {
 fs.mkdirSync(path.join(out,'abnahme/results'),{recursive:true});
 fs.copyFileSync(path.join(source,'ABNAHME_2026-11-16.md'),path.join(out,'abnahme/ABNAHME_2026-11-16.md'));
 for(const file of ['browser.json','presets.json','restart.json','ui.json','acceptance.json','unit.log'])if(fs.existsSync(path.join(source,'results',file)))fs.copyFileSync(path.join(source,'results',file),path.join(out,'abnahme/results',file));
}
if(fs.existsSync(path.join(source,'ABNAHME_ALPHA2_2026-11-16.md')))fs.copyFileSync(path.join(source,'ABNAHME_ALPHA2_2026-11-16.md'),path.join(out,'abnahme/ABNAHME_ALPHA2_2026-11-16.md'));
for(const name of ['transport.json','tokenizer.log','alpha2-unit.log'])if(fs.existsSync(path.join(source,'results',name)))fs.copyFileSync(path.join(source,'results',name),path.join(out,'abnahme/results',name));
const hashes={};
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())walk(full);else hashes[path.relative(out,full)]=createHash('sha256').update(fs.readFileSync(full)).digest('hex');}}
walk(path.join(out,'src'));walk(path.join(out,'content'));
fs.writeFileSync(path.join(out,'ENGINE_PROVENANCE.json'),JSON.stringify({product:'4.3.0-c.6.6.200',commit:'0cd14806cd0c7fe2ab0d54b8463c486ee572714b',note:'Unmodified engine/content copies. Alpha version belongs to host integration, not gameplay rules.',sha256:hashes},null,2)+'\n');
console.log(out);
