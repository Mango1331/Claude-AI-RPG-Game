import { normText } from '../util.js';
import { tradeObject } from './trade.js';
import { playerTurnV4 } from './turn.js';

/** Direct controls reuse the story action handler and its ordinary event log. */
export function nativeAction(state, content, text, msg) {
    const input = /^#(equip|rest)\b([^#]*)$/i.exec(text.trim());
    if (!input) return null;
    const name = input[1].toLowerCase();
    const arg = input[2].trim();
    const panel = lines => ({events:[],command:{panels:[`[SYSTEM // ${name.toUpperCase()}]\n${lines}`],llm:null}});
    if (state.encounter || state.pending_combat?.length)
        return panel('Finish the current encounter before using this command.');
    let action;
    if (name === 'equip') {
        const inventory = Object.keys(state.entities.pc.sheet.inventory || {}).map(id => `item.${id}`);
        const held = [...inventory,...Object.keys(state.objects || {})].map(id => tradeObject(state,content,id))
            .filter(o => o?.holder?.entity === 'pc');
        const item = held.find(o => o.id === arg) || held.filter(o => arg && normText(o.name) === normText(arg));
        const object = Array.isArray(item) ? (item.length === 1 ? item[0].id : null) : item.id;
        if (!object) return panel('Use #equip <exact item name or inventory ID>. The item must be unique and in your bag.');
        action = {type:'equip',object};
    } else {
        const duration = /^(\d{1,4})\s*(m|min|minutes?|h|hours?)?$/i.exec(arg);
        const minutes = duration && Number(duration[1]) * (/^h/i.test(duration[2] || '') ? 60 : 1);
        if (!minutes || minutes > 1440) return panel('Use #rest <minutes>, e.g. #rest 30 or #rest 2h (up to one day).');
        action = {type:'activity',kind:'rest',minutes};
    }
    const turn = playerTurnV4(state,content,text,{msg,commands:[{seq:1,quote:text,...action}],
        interp:{source:'native'},c:true,skipPulse:name === 'equip'});
    if (!turn.command && !turn.outcome?.auth?.pulse?.open) {
        const lines = [...turn.outcome.actions,...(turn.outcome.engine_lines || [])];
        turn.command = panel(lines.join('\n')).command;
    }
    return turn;
}
