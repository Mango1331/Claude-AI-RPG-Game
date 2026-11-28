// M15 probe (analysis copy, U18_FIX=1): both free-text invitations beside the HUD quest acceptance go through the
// recruitment path; the NPC decisions are synthetic (env U18_SERA=decline lets Sera decline). Stops after M16.
export const stopAt = 16;
export const extra = (i, purpose, n, messages) => {
    if (i !== 15 || purpose !== 'party_decision') return null;
    const who = JSON.parse(messages.at(-1).content).who;
    return JSON.stringify({invitation: 'x', who, decision: who === 'npc.sera' && process.env.U18_SERA === 'decline' ? 'decline' : 'accept'});
};
