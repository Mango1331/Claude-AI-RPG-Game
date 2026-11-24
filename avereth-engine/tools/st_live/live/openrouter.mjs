// Explicit OpenRouter connection for a single isolated live run.
// The player's SillyTavern profile is read-only; its former Featherless/custom
// endpoint, proxy, model, include-body and player overrides are not reused.
import { routeOf } from './import_profile.mjs';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1';
export const OPENROUTER_MODEL = 'z-ai/glm-5.3-flash';

/** Apply only to the in-memory import; seedProfile writes the isolated ST profile later. */
export function useOpenRouter(imp, options = {}) {
    if (!options.openrouter) return imp;
    const model = String(options.openrouterModel || OPENROUTER_MODEL).trim();
    if (!model || model.length > 200 || !/^[a-z0-9][a-z0-9._/+:-]*$/i.test(model))
        throw new Error('OpenRouter model ID must be a nonempty author/model slug, without URL or credentials');
    const connection = {
        chat_completion_source: 'custom',
        custom_url: OPENROUTER_URL,
        custom_model: model,
        custom_include_body: '',
        custom_exclude_body: '',
        custom_include_headers: '',
        bypass_status_check: false,
    };
    return {
        ...imp,
        source: 'custom',
        connection,
        route: {
            ...imp.route,
            runner: routeOf(connection),
            same: false,
            differences: ['OpenRouter explicitly selected for this isolated runner; original ST profile is unchanged'],
            reverseProxy: null,
            proxyPassword: false,
        },
        warnings: [...(imp.warnings || []), 'This run deliberately uses OpenRouter, not the connection currently selected in the personal ST profile. No personal profile settings or credentials are changed.'],
    };
}
