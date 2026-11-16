// Run the existing ST1.19 sources with an explicitly separate test data root; no personal profile import.
import fs from 'node:fs';import {spawn,execFileSync} from 'node:child_process';import path from 'node:path';
const st=process.env.GM_ST_SOURCE||'/workspace/avereth-setup/st-sandbox/SillyTavern';
const root='/workspace/avereth-setup/dynamic-host';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:st,encoding:'utf8'}).trim()!=='7e8663cd9c184a550b37238218bdd32c6efc68e9')throw Error('Expected ST1.19 pinned source');
fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'ISOLATED_GM_TEST'),'Separate data root; never import personal profile\n');
const child=spawn(process.execPath,['server.js','--port','8137','--dataRoot',path.join(root,'data'),'--browserLaunchEnabled','false'],{cwd:st,stdio:'inherit'});
process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'));child.on('exit',code=>process.exit(code||0));
