// ST 1.19 decodes SSE frames; the native processor independently decides whether it consumed them successfully.
// Keep the transport receipt separate from the primary choice's regular stop.
export async function readNarratorFrames(frames, finish) {
    const reader = frames.getReader();
    let done = false, stopped = false, valid = true;
    let terminal = null;
    try {
        for (;;) {
            const frame = await reader.read();
            if (frame.done) break;
            if (done) continue; // ST stops decoding at the first [DONE].
            const data = frame.value.data;
            if (frame.value.type === 'error') valid = false;
            if (data === '[DONE]') {
                done = true;
                finish(valid && stopped);
            } else {
                try {
                    const packet = JSON.parse(data);
                    const choice = packet?.choices?.find(c => (c.index ?? 0) === 0);
                    // Wafer repeats the empty primary stop on its final usage receipt.
                    // It must belong to the same generation and carry no new output.
                    const receipt = stopped && terminal && packet.usage && packet.choices?.length === 1
                        && packet.id === terminal.id && packet.model === terminal.model && packet.provider === terminal.provider
                        && choice?.finish_reason === 'stop' && choice.native_finish_reason === terminal.native_finish_reason
                        && choice.delta && Object.entries(choice.delta).every(([k,v]) =>
                            k === 'role' ? v === 'assistant' : ['content','reasoning'].includes(k) && (v === '' || v === null))
                        && !choice.message && !packet.error;
                    if (receipt) { terminal = null; continue; }
                    if (packet?.error || (stopped && choice)) valid = false;
                    if (choice?.finish_reason != null) {
                        stopped = choice.finish_reason === 'stop';
                        if (!stopped) valid = false;
                        if (stopped && packet.id && packet.model && packet.provider) terminal = {
                            id:packet.id, model:packet.model, provider:packet.provider, native_finish_reason:choice.native_finish_reason
                        };
                    }
                } catch { valid = false; }
            }
        }
        return done;
    } finally {
        if (!done) finish(false);
        reader.releaseLock();
    }
}

// A processor instance belongs to exactly one native generation. Capture both sides of an async receipt.
export function streamReply(owner, ctx, epoch) {
    const processor = ctx.streamingProcessor;
    const msg = ctx.chat[processor?.messageId];
    if (!owner || processor !== owner.processor || ctx.chat !== owner.chat || ctx.getCurrentChatId() !== owner.chatId ||
        ctx.characterId !== owner.characterId || owner.epoch !== epoch || ctx.chat[owner.index] !== owner.user ||
        owner.user.mes !== owner.input || owner.user.extra?.avereth_action_input?.id !== owner.inputId ||
        owner.user.extra?.avereth_action_input?.revision !== owner.revision ||
        processor.messageId <= owner.index || !msg || msg.is_user || msg.is_system || msg !== ctx.chat.at(-1)) return null;
    if (owner.reply && (msg !== owner.reply || (msg.swipe_id ?? 0) !== owner.swipe)) return null;
    return msg;
}
