// Patch 7.2A: the extension's settings as SillyTavern saved them, brought to this build. Settings saved before
// 4.3.0-c.6.6.21 carry no settingsRev: their planner value stays, unchanged, as legacyPlanner, the path of the campaigns
// started before (they carry no path of their own: src/v4/runtime.js campaignPath), so no running game changes its
// path; the planner setting itself becomes the new default for new campaigns, V4-C. Pure: index.js stores the result.
export const SETTINGS_REV = 2;

/**
 * @param {object|undefined} saved what SillyTavern holds (extensionSettings.avereth), or nothing on a fresh install
 * @param {object} defaults index.js DEFAULTS
 * @returns {object} the settings to use and store
 */
export function migrateSettings(saved, defaults) {
    const s = saved && !saved.settingsRev ? { ...saved, legacyPlanner: !!saved.planner, planner: true, settingsRev: SETTINGS_REV } : saved;
    return { ...defaults, ...(s || {}) };
}
