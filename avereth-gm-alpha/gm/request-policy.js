import { MODEL, LIMITS } from './budget.js';
export function templateExtras(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Include Body muss ein YAML-Objekt sein');
    if (Object.keys(value).some(k=>!['chat_template_kwargs','response_format'].includes(k))) throw Error('Include Body: nur chat_template_kwargs und optional response_format: {type: json_object} erlaubt; keine Nachrichten-, Modell-, Tool-, Sampling- oder Budgetüberschreibung');
    const t=value.chat_template_kwargs;
    if (!t || Object.keys(t).sort().join(',')!=='clear_thinking,reasoning_effort' || t.reasoning_effort!=='low' || t.clear_thinking!==true) throw Error('Include Body benötigt chat_template_kwargs: {reasoning_effort: low, clear_thinking: true}');
    if ('response_format' in value && (!value.response_format || typeof value.response_format!=='object' || Array.isArray(value.response_format) || Object.keys(value.response_format).join(',')!=='type' || value.response_format.type!=='json_object')) throw Error('Nur optionaler JSON-Objektmodus unterstützt; kein natives Tool-/Schemasystem');
    // Canonical JSON is also valid YAML in ST's backend. No arbitrary YAML,
    // aliases, macros or user-controlled keys survive into its late merge.
    return JSON.stringify({ chat_template_kwargs: { reasoning_effort:'low',clear_thinking:true }, ...(value.response_format ? {response_format:{type:'json_object'}} : {}) });
}
export function protectBody(body, extras) {
    if (body.chat_completion_source!=='custom' || body.model!==MODEL) throw Error('Alpha 2 benötigt Chat Completion / Custom und zai-org/GLM-5.3-Flash; andere Pfade sind noch nicht budgetgeprüft');
    const url=new URL(body.custom_url);
    if (url.username || url.password || !(url.protocol==='https:' && url.hostname==='api.featherless.ai' && url.pathname.replace(/\/$/,'')==='/v1' || ['127.0.0.1','localhost'].includes(url.hostname) && url.protocol==='http:') || url.search || url.hash) throw Error('Ungeprüfter Endpoint: Featherless /v1 oder lokaler Testprovider erforderlich');
    if (body.custom_exclude_body?.trim()) throw Error('Exclude Body muss für GM Alpha leer sein');
    if (body.custom_include_headers?.trim()) throw Error('Zusätzliche Custom-Header sind in diesem geprüften Profil nicht unterstützt; ST-Keyverwaltung verwenden');
    if (body.custom_prompt_post_processing && body.custom_prompt_post_processing!=='none') throw Error('Prompt Post-Processing muss None sein');
    if (body.stop?.length) throw Error('Zusätzliche Stopstrings sind für GM-JSON nicht erlaubt');
    if (body.max_tokens!==LIMITS.output || body.temperature!==.8 || body.top_p!==.95 || body.frequency_penalty!==0 || body.presence_penalty!==0) throw Error('GM Alpha 2 Preset wählen: 0.8 / 0.95 / Penalties 0 / Ausgabe 4096');
    body.custom_include_body=extras;body.custom_exclude_body='';body.custom_include_headers='';
    body.custom_prompt_post_processing='none';body.stream=false;body.n=1;
    for (const k of ['tools','tool_choice','max_completion_tokens','json_schema','response_format','seed','logit_bias','logprobs','top_logprobs']) delete body[k];
    return body;
}
