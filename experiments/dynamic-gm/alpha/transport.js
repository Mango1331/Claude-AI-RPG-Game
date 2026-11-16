// Reuse ST's active connection and server-side secrets. No API key is requested,
// read, stored, exported or logged by this extension.
export function createTransport(context, status = () => {}) {
    return async ({ messages }) => {
        const c = context();
        let body, url;
        if (c.mainApi === 'openai') {
            const api = await import('/scripts/openai.js');
            const settings = { ...c.chatCompletionSettings, stream_openai: false, n: 1, function_calling: false, enable_web_search: false, request_images: false, bias_preset_selected: '' };
            const model = api.getChatCompletionModel(settings);
            if (!model) throw Object.assign(Error('Select a model in the existing ST connection'), { remoteFinished: true });
            body = (await api.createGenerationParameters(settings, model, 'quiet', messages)).generate_data;
            // Other tool extensions must not introduce an uncontrolled second dispatcher.
            delete body.tools; delete body.tool_choice; body.stream = false; body.n = 1;
            url = '/api/backends/chat-completions/generate';
        } else if (c.mainApi === 'textgenerationwebui') {
            const api = await import('/scripts/textgen-settings.js'), st = await import('/script.js');
            // Includes ST's configured model instruct template, not the old narrator/card.
            const prompt = st.createRawPrompt(messages, c.mainApi, false, false, '', '');
            body = await api.getTextGenGenerationData(prompt, st.amount_gen, false, false, null, 'quiet');
            body.stream = false; body.streaming = false;
            url = '/api/backends/text-completions/generate';
        } else throw Object.assign(Error('Alpha supports Chat Completion or Text Completion (including Featherless)'), { remoteFinished: true });
        status('Modellanfrage · vorhandene ST-Verbindung · Ausgabe zurückgehalten');
        // No abort timeout here: the scheduler times out locally while preserving the
        // outstanding lease; a late HTTP answer can still prove remote completion.
        const response = await fetch(url, { method: 'POST', headers: c.getRequestHeaders(), body: JSON.stringify(body) });
        if (!response.ok) throw Object.assign(Error(`Provider/ST HTTP ${response.status}${response.status === 429 ? ' (capacity/rate rejection; no automatic retry)' : ''}`), { remoteFinished: response.status < 500 && ![408,504].includes(response.status) });
        const data = await response.json();
        if (data.error) throw Error('Provider returned an error; remote completion unconfirmed');
        const choice = data.choices?.[0], text = choice?.message?.content ?? choice?.text ?? data.results?.[0]?.text;
        if (choice?.finish_reason && choice.finish_reason !== 'stop') throw Object.assign(Error(`Incomplete answer: ${choice.finish_reason}`), { remoteFinished: true });
        if (typeof text !== 'string' || !text.trim()) throw Object.assign(Error('Provider returned no narration JSON'), { remoteFinished: true });
        return text;
    };
}
