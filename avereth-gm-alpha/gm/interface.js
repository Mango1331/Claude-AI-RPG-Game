import { interpreterSchema, catalogIds } from '../src/v4/interpret.js';
import { MECH_COMMANDS, MECH_RULES, ORDER_RULES } from '../src/v4/planner.js';
import { deltaSchema, worldVocab, PLACE_KINDS } from '../src/v4/extract.js';
import { copy, proposalError } from './util.js';

// Lossless JSON-Schema factoring. The validator keeps its original schema; the
// model sees the same constraints without repeating every place ID per field.
export function compactSchema(schema) {
    const counts = new Map();
    const eligible = x => x && !Array.isArray(x) && typeof x === 'object'
        && ('type' in x || 'anyOf' in x || 'enum' in x) && JSON.stringify(x).length > 80;
    function count(x) {
        if (!x || typeof x !== 'object') return;
        if (eligible(x)) { const key=JSON.stringify(x); counts.set(key,(counts.get(key)||0)+1); }
        for (const v of Object.values(x)) count(v);
    }
    count(schema);
    const names=new Map(),defs={};
    function visit(x, root=false) {
        if (!x || typeof x !== 'object') return x;
        const key=JSON.stringify(x);
        if (!root && eligible(x) && counts.get(key)>1) {
            if (!names.has(key)) {
                const name=`D${names.size+1}`; names.set(key,name);
                defs[name]=visit(x,true);
            }
            return {$ref:`#/$defs/${names.get(key)}`};
        }
        return Array.isArray(x)?x.map(v=>visit(v)):Object.fromEntries(Object.entries(x).map(([k,v])=>[k,visit(v)]));
    }
    const result=visit(schema,true);
    return Object.keys(defs).length?{...result,$defs:defs}:result;
}

export function commandContract(content,catalog,types) {
    const selected={...content.commandVocab,commands:content.commandVocab.commands.filter(c=>types.includes(c.type))};
    const schema=interpreterSchema(selected,catalog);
    const mechanics={
        other:{what:{type:'string'},quote:{type:'string'}},
        clarify:{about:{type:'string',enum:['target','skill','action']},question:{type:'string'},options:{type:'array',items:{type:'string'}}},
    };
    for(const [type,fields] of Object.entries(mechanics)) if(types.includes(type)) {
        const properties={seq:{type:'integer',minimum:1},type:{type:'string',enum:[type]},...fields};
        schema.properties.commands.items.anyOf.push({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
    }
    for(const variant of schema.properties.commands.items.anyOf) {
        // parsePlan accepts dependency metadata outside interpreterSchema.
        variant.properties.needs={type:'integer',minimum:1};
    }
    return {
        schema:compactSchema(schema),
        descriptions:selected.commands.map(({type,summary})=>({type,summary})),
        references:'Known references are direct canonical ID strings, never internal type descriptors. Unknown command references use {new:"short name"} only where allowed. An exact single-key {ref:"canonical-id"} is accepted as an input alias only for a declared reference argument; no name guessing.',
        rules:content.commandVocab.rules.filter((r,i)=> i!==12 && (catalog.offers?.length || ![7,8].includes(i))),
        order:ORDER_RULES,
        mechanical:MECH_COMMANDS.split('\n').filter(line=>types.some(t=>line.startsWith(`- ${t} `))).join('\n'),
        mechanicalRules:MECH_RULES.split('\n').filter(r=> {
            if(r.startsWith('Private jobs:'))return catalog.privateQuests===true;
            if(types.some(t=>!['other','clarify'].includes(t)&&MECH_COMMANDS.includes(`- ${t} `)))return true;
            if(/^(Ordinary meals|Accepting an offer|2\.|6\.|8\.)/.test(r))return true;
            if(/^7c\./.test(r))return !!catalog.exits?.length;
            if(/^7[a-e.-]/.test(r)||/^7\./.test(r))return types.includes('go');
            return /^8a\./.test(r)&&types.includes('activity');
        }),
    };
}

// A representation alias, not entity resolution. Only declared reference fields;
// person.new.ref and arbitrary nested objects are intentionally never unwrapped.
export function normalizeReferences(commands,content,catalog) {
    const normalized=copy(commands),changes=[],ids=catalogIds(catalog);
    if (!Array.isArray(normalized)) throw proposalError('commands must be an array');
    for (const [i,c] of normalized.entries()) {
        const spec=content.commandVocab.commands.find(x=>x.type===c?.type);
        for(const [field,arg] of Object.entries(spec?.args||{})) {
            const value=c[field];
            if (!arg.ref || !value || typeof value!=='object' || Array.isArray(value)) continue;
            if (Object.keys(value).length===1 && typeof value.ref==='string' && (ids[arg.ref]||[]).includes(value.ref)) {
                changes.push({path:`commands[${i}].${field}`,before:copy(value),after:value.ref});c[field]=value.ref;
            }
        }
    }
    return {commands:normalized,changes};
}

export const COMMON_WORLD=['time','fact','learn','memory','thread','person.new','person.named','enter','leave','place.reported','attitude'];
// Known vocabulary rules keep their meaning. Unclassified rules stay visible;
// only explicitly unrelated domains are omitted from the small default contract.
function relevantRules(vocab,types) {
    const trade=types.some(t=>/^(offer|bid|coin\.)/.test(t));
    const objects=types.some(t=>/^object\./.test(t));
    const fight=types.some(t=>['hostile','intent','aware','position','creature.new'].includes(t));
    const creatures=types.includes('creature.new');
    return vocab.rules.filter(r=> {
        if(!types.includes('overreach') && /^Overreach is/.test(r))return false;
        if (!trade && /^(Prices |Prices and |A price |Paid work |coin\.gift)/.test(r)) return false;
        if (!creatures && /^(For creature\.new|creature\.new |When creatures become visible)/.test(r))return false;
        if (!types.includes('aware') && /^Co-presence is not awareness/.test(r))return false;
        if (!objects && /^(When PLAYER ACTIONS already grant|The engine's automatic loot|A thing a person |Things Alaric takes out|A Skill Stone)/.test(r)) return false;
        if (!fight && /^(Range Bands|During ACTIVE combat|GROUP REFS)/.test(r)) return false;
        if (!types.some(t=>/^quest\.|^guild\.|^listing\./.test(t)) && /^(For a known Guild contract|During the reply that FIRST|For quest\.|An operating Guild branch|Guild contract proof|For every active Guild contract|An escort contract)/.test(r)) return false;
        return true;
    }).map(r=>r.startsWith('Report only what THIS reply establishes')
        ? 'Create plausible new world events in your narration. Report what that narration actually establishes in chronological order; never store unspoken facts, promises or effects as if they had occurred.' : r);
}
export function worldInterface(content,state,catalog,{types=COMMON_WORLD,expectedKeys={},vocab=worldVocab(content.deltaVocab,state),ids}={}) {
    if(!ids) {const refs=catalogIds(catalog);ids={places:refs.place,quests:refs.quest,objects:refs.object};}
    const selected={...vocab,deltas:vocab.deltas.filter(d=>types.includes(d.type))};
    return {
        expectedKeys, schema:compactSchema(deltaSchema(selected,ids,expectedKeys)),
        descriptions:selected.deltas.map(({type,summary})=>({type,summary})),
        rules:relevantRules(vocab,types),
        format:[
            'The schema is authoritative for fields/types; $ref points to its shared $defs. Nullable fields may be omitted, arrays remain arrays. seq follows narrative chronology.',
            `World place reference: canonical ID or {new:{name,kind,parent}}; kind exactly ${PLACE_KINDS.join('|')}. parent is the actual containing place. Commands instead use {new:"short name"}.`,
            'Actual arrival requires arrive, before local meetings/exchanges there. expected.arrived summarizes the final chosen destination, never moves anyone. An intermediate stop can arrive while final arrived is false; scene alone creates/moves nothing.',
            'Known NPCs return with enter and literal evidence from this narration; person.new is only a genuinely new identity. A report or memory is not presence. Ordinary autonomous reactions are allowed within the supplied world envelope.',
            'Use existing thread IDs to update/resolve existing matters; new promises use null ID and actual parties. Important knowledge needs its legitimate observer/source. Never duplicate the same promise as a fact.',
            ...(types.some(t=>t.startsWith('object.'))?['A real new gift: object.new on its giver, then object.move to pc. Refer to the new object with {new:"exact name"}; never invent obj.* IDs. Existing/booked goods use their IDs and are not created again.']:[]),
        ],
    };
}
