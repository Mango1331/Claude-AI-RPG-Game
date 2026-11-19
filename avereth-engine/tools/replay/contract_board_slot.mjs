// Historical board retries returned five listings. Replay only the requested raw slot under the new wire contract.
import { extractJsonObject } from '../../src/v4/json.js';

export function recordedBoardSlot(text, purpose, messages) {
    if (purpose !== 'board') return text;
    const slot = Number(messages?.[0]?.content.match(/no code fences: \{"slot":([1-5]),"listing":/)?.[1]);
    if (!slot) return text;
    const listings = extractJsonObject(text).value?.listings;
    return listings?.length === 5 ? JSON.stringify({slot, listing:listings[slot-1]}) : text;
}
