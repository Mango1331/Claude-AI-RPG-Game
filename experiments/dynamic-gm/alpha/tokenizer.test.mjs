import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {formatGLM} from '../../../avereth-gm-alpha/gm/budget.js';
test('Bundled browser WASM matches pinned Python HF tokenizer/template on 107 multilingual vectors',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'avereth-tokenizer-')),file=path.join(dir,'tokenizer.cjs');
 try {fs.copyFileSync(new URL('../../../avereth-gm-alpha/tokenizer/web-tokenizers.js',import.meta.url),file);const {Tokenizer}=createRequire(import.meta.url)(file),bytes=fs.readFileSync(new URL('../../../avereth-gm-alpha/tokenizer/tokenizer.json',import.meta.url));const t=await Tokenizer.fromJSON(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 for(const x of JSON.parse(fs.readFileSync(new URL('./tokenizer-vectors.json',import.meta.url)))){assert.equal(formatGLM(x.messages),x.formatted);assert.equal(t.encode(x.formatted).length,x.tokens);}
 t.dispose();}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
