// Independent, limited assertions derived from the named passages. An unannotated turn is unscored.
const rule = (name,test) => ({name,test});
const lookout = n => 'mon.mossback_warrens_c1_l1_e1_'+n;
const fact = (state,s,p,words) => Object.values(state.facts).some(f => !f.until && f.s===s && f.p===p && words.test(f.o));
const requirements = {
    'U5A/8':[rule('The clerk introduces herself as Brenna Hallowell', ({state})=>state.entities['npc.npcglassmere_clerk']?.name==='Brenna Hallowell')],
    'U5A/14':[rule('Brenna records the contract and warns about the grotto',({events})=>events.some(e=>e.t==='quest.detailed' &&
        e.d.id==='quest.clear_the_outer_grottos_of_glimmerdeep' && /beetles/i.test(e.d.note) && /slimes/i.test(e.d.note)))],
    'U6/6':[rule('Alaric reaches the Ashbridge Guild desk and meets the clerk',({state})=>state.scene.at==='loc.ashbridge.guild_hall' &&
        state.scene.present.includes('npc.npcguild_clerk'))],
    'U6/14':[rule('The clerk warns of scouts and warriors on the accepted first-floor contract',({events})=>events.some(e=>
        e.t==='quest.detailed' && e.d.id==='quest.clear_mossback_warrens_level_1' && /scouts/i.test(e.d.note) && /warriors/i.test(e.d.note)))],
    'U6/18':[rule('Both lookouts are present after the gate',({state})=>[1,2].every(n=>state.scene.present.includes(lookout(n)))),
        rule('The gatekeeper at the palisade does not accompany Alaric around the bend',({state})=>!state.scene.present.includes('npc.npcwarren_gatekeeper'))],
    'U6/20':[rule('Knife and spear belong to distinct lookouts',({state})=>fact(state,lookout(1),'armed',/knife/i) && fact(state,lookout(2),'armed',/spear/i))],
};
export const expectations = (name,id) => requirements[name+'/'+id] || [];
