import { measureBudget, MODEL } from './budget.js';
import { templateExtras, protectBody } from './request-policy.js';
const finite = x => Number.isFinite(x) && x >= 0 ? x : null;
export function createTransport(context, status = () => {}) {
    const prepare = async ({ messages }) => {
        try {
            const c=context();
            if(c.mainApi!=='openai') throw Error('Alpha 2: geprüften Chat-Completion/Custom-Pfad verwenden; Text Completion ist nicht freigegeben');
            const api=await import('/scripts/openai.js'), {yaml}=await import('/lib.js');
            const settings={...c.chatCompletionSettings,stream_openai:false,n:1,function_calling:false,enable_web_search:false,request_images:false,bias_preset_selected:''};
            let parsed;try {parsed=yaml.parse(settings.custom_include_body || '');}catch {throw Error('Include Body: ungültiges YAML; Inhalt wird nicht protokolliert');}
            const extras=templateExtras(parsed);
            if(settings.openai_max_context!==32768) throw Error('GM Alpha 2: Gesamtkontext auf 32768 setzen');
            const body=(await api.createGenerationParameters(settings,api.getChatCompletionModel(settings),'quiet',structuredClone(messages))).generate_data;
            protectBody(body,extras);
            const budget=await measureBudget(body.messages);
            return {body,budget};
        } catch(e) { throw Object.assign(e,{remoteFinished:true,notDispatched:true}); }
    };
    const transport=async ({id='direct',messages,prepared,diagnose=async()=>{}}) => {
        const p=prepared || await prepare({messages}),start=Date.now();
        const info={id,phase:id.includes(':engine:')?id.split(':engine:')[1].split(':attempt:')[0]:id.includes(':gm:')?'gm:'+id.split(':gm:')[1].split(':attempt:')[0]:'direct',model:MODEL,dispatched:true,parameters:{temperature:p.body.temperature,top_p:p.body.top_p,max_tokens:p.body.max_tokens,stream:false,n:1,chat_template_kwargs:{reasoning_effort:'low',clear_thinking:true}},finishReason:null,promptTokens:null,completionTokens:null,reasoningTokens:null,separateReasoning:false,budget:p.budget};
        status('Modellanfrage · GLM Low · Ausgabe zurückgehalten');
        try {
            const response=await fetch('/api/backends/chat-completions/generate',{method:'POST',headers:context().getRequestHeaders(),body:JSON.stringify(p.body)});
            info.httpStatus=response.status;
            if(!response.ok) throw Object.assign(Error(`Provider/ST HTTP ${response.status}${response.status===429?' (capacity/rate rejection; no automatic retry)':''}`),{remoteFinished:response.status<500&&![408,504].includes(response.status)});
            let data;
            try {data=await response.json();} catch {throw Error('Ungültige ST/Provider-Antworthülle; Remoteabschluss unbekannt');}
            if(data.error) throw Error('Provider returned an error; remote completion unconfirmed (ST may mask HTTP 429)');
            const choice=data.choices?.[0],message=choice?.message;
            Object.assign(info,{finishReason:choice?.finish_reason??null,promptTokens:finite(data.usage?.prompt_tokens),completionTokens:finite(data.usage?.completion_tokens),reasoningTokens:finite(data.usage?.completion_tokens_details?.reasoning_tokens),separateReasoning:typeof message?.reasoning_content==='string'&&!!message.reasoning_content});
            if(data.choices?.length!==1 || !choice?.finish_reason) throw Object.assign(Error('Antwortabschluss fehlt oder mehrere Antworten; nichts veröffentlicht'),{remoteFinished:true});
            if(choice.finish_reason!=='stop') throw Object.assign(Error(`Incomplete answer: ${choice.finish_reason}`),{remoteFinished:true});
            const text=message?.content;
            if(typeof text!=='string'||!text.trim()) throw Object.assign(Error('Provider returned no narration JSON; separaten Reasoningkanal/Outputlimit prüfen'),{remoteFinished:true});
            const clean=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
            try {const a=JSON.parse(clean);if(!a||typeof a!=='object'||Array.isArray(a))throw Error();} catch {throw Object.assign(Error('Ungültige strukturierte JSON-Antwort (ggf. Reasoning im Content); keine automatische Reparatur'),{remoteFinished:true});}
            info.result='complete_json';return clean;
        } catch(e) {info.result=e.remoteFinished?'rejected_complete':'remote_unknown';info.error=e.message;throw e;}
        finally {info.durationMs=Date.now()-start;await diagnose(info);}
    };
    transport.prepare=prepare;
    return transport;
}
