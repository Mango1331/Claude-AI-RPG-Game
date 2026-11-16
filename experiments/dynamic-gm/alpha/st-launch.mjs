import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const source='/workspace/avereth-setup/st-sandbox/SillyTavern',root='/workspace/avereth-setup/gm-alpha-host';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!=='7e8663cd9c184a550b37238218bdd32c6efc68e9')throw Error('Expected pinned ST 1.19 source');
fs.mkdirSync(root,{recursive:true});fs.writeFileSync(root+'/ISOLATED_GM_ALPHA_TEST','Separate data root; mock provider only. No personal data or credentials.\n');
const ext=root+'/data/default-user/extensions/avereth-gm-alpha';fs.mkdirSync(ext,{recursive:true});
fs.cpSync(new URL('../../../avereth-gm-alpha/',import.meta.url),ext,{recursive:true});
const child=spawn(process.execPath,['server.js','--port','8139','--dataRoot',root+'/data','--browserLaunchEnabled','false'],{cwd:source,stdio:'inherit'});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>child.kill(sig));child.on('exit',code=>process.exit(code||0));
