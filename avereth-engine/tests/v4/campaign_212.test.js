import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, walk, say, progressionBoard, lastUser } from './patch8_lib.js';
import { foldChat, messageEvents, rec } from '../../src/host.js';
import { onEditedV4, onSwipedV4, prepareGenerationAsync, processReplyAny, runExtraction } from '../../src/v4/runtime.js';
import { generationSource } from '../../src/v4/revisions.js';

const HALL = 'loc.alderwatch.guild_hall';
const SMITHY = {new:{name:'Alderwatch Smithy',kind:'site',parent:'loc.alderwatch'}};
const who = (game, name) => Object.values(game.state().entities).find(e => e.name === name)?.id;
const events = game => game.chat.flatMap(messageEvents);
const sheet = game => game.state().entities.pc.sheet;
const offer = (game, filter) => Object.values(game.state().offers).find(o => o.status === 'open' && filter(o));
const accept = (id, quote = 'I accept this price.') => ({type:'offer.accept',offer:id,quote});

test('a single offline campaign connects creation, guild hunts, combat, recovery, trade and revision', async () => {
    const content = await loadProductContent();
    content.rules.pulse.force = [{when:'west pasture',open:true,kind:'meeting'},{open:false}];
    const game = await campaign(content,{fProgression:true});
    assert.equal(sheet(game).stats.INT,6);
    assert.equal(sheet(game).stats.STR,5);
    await walk(game,HALL,{text:'I walk to the Alderwatch Guild hall.',prose:'Alaric enters the Guild hall. Maren, the clerk, looks up.',
        deltas:[{seq:2,type:'person.new',ref:'Maren',name:'Maren',role:'guild clerk',desc:['guild clerk'],present:true,relevant:true,band:'SHORT',scene:HALL}]});
    const clerk = who(game,'Maren');
    assert.ok(clerk);
    await say(game,'I pay two silver to register at the Guild.',{type:'pay',to:clerk,amount_cp:20,for:'Guild registration'});
    await game.reply('Maren takes the fee and records the registration.');
    assert.deepEqual(events(game).filter(e => e.t === 'coin.changed').map(e => e.d.delta),[-20]);
    assert.ok(events(game).some(e => e.t === 'guild.registered'));

    game.listings = progressionBoard();
    const first = game.listings[0];
    Object.assign(first,{title:'Clear a Giant Rat from West Pasture',task:'Defeat the lone giant rat at the west pasture.',
        desired_end_state:'The lone giant rat at the west pasture is defeated.',
        objectives:[{verb:'DEFEAT',what:'giant rat',qty:1,where:'the west pasture'}],
        habitat:{species:'giant rat',anchor:'rat',min_level:1,max_level:1}});
    await say(game,'I read the Guild board.',{type:'board.read',rank:null});
    await game.reply('The board is available to read.');
    const quest = Object.values(game.state().quests).find(q=>q.title===first.title);
    assert.ok(quest?.count_rule);
    await say(game,'I accept the giant rat contract.',{type:'quest.accept',quest:quest.id});
    await game.reply('Maren records Alaric’s chosen contract.');
    assert.equal(game.state().quests[quest.id].status,'active');
    const habitat = game.state().quests[quest.id].hunt.at;

    // Reconstructed from helper run 3: a READY report cannot supply its own evidence.
    await say(game,'I ask whether any proof has been received for the giant rat contract.');
    const invalidReady = await game.reply('Maren notes the contract is ready.',{scene:'here',expected:{},deltas:[
        {seq:1,type:'quest.ready',quest:quest.id,note:'Maren notes the contract is ready',alternative:null,depends_on:['1']},
    ]});
    assert.equal(game.state().quests[quest.id].status,'active');
    assert.ok(invalidReady.record.rejected.some(r=>r.rule==='quest_dependency'));
    assert.equal(game.calls.at(-1).purpose,'extract');

    await walk(game,habitat,{text:'I walk to the west pasture.',prose:'A shepherd waves. Alaric reaches the west pasture and spots a giant rat.',
        deltas:[{seq:2,type:'creature.new',scene:habitat,ref:'pasture rat',species:'giant rat',anchor:'rat',
            desc:['a giant rat'],count:1,present:true,band:'SHORT',threat:true}]});
    assert.equal(game.state().scene.at,habitat);
    assert.ok(events(game).some(e => e.t==='pulse.rolled' && e.d.open && e.d.kind==='meeting'));
    const rat = game.state().scene.present.find(id=>game.state().entities[id]?.kind==='creature');
    assert.ok(rat);
    const fight = async target => {
        for (let i = 0; i < 8 && game.state().entities[target]?.status !== 'dead'; i++) {
            const text = 'I cast Flame Lance at my opponent.';
            await say(game,text,{type:'use_skill',skill:'mage.flame_lance',target});
            assert.ok(lastUser(game).events.some(e => /^encounter\./.test(e.t)),JSON.stringify(lastUser(game).plan));
            await game.reply('Alaric follows through with his attack.');
        }
        assert.equal(game.state().entities[target]?.status,'dead');
        assert.equal(game.state().encounter,null);
    };
    await fight(rat);
    assert.ok(sheet(game).xp > 0 || sheet(game).level > 1);

    await say(game,'#rest 2h');
    assert.ok(lastUser(game).events.some(e => e.t === 'time.advanced'));
    await say(game,'I watch the edge of the pasture.');
    await game.reply('A highway robber named Harl steps from behind the hedge with a dagger. He demands coin.',
        {scene:'here',expected:{},deltas:[{seq:1,type:'person.new',ref:'Harl',name:'Harl',role:'highway robber',
            desc:['highway robber'],present:true,relevant:true,threat:true,armed:'dagger',band:'SHORT'}]});
    await fight(who(game,'Harl'));
    assert.ok(sheet(game).level > 1);

    await walk(game,HALL,{text:'I return to the Guild hall.',prose:'Alaric returns to the Guild hall. Maren is writing at her desk.',
        deltas:[{seq:2,type:'enter',who:clerk,evidence:'Maren is writing at her desk',scene:HALL}]});
    assert.equal(who(game,'Maren'),clerk);
    await say(game,'I turn in the giant rat contract.',{type:'quest.turn_in',quest:quest.id});
    await game.reply('Maren recognizes Alaric and closes the completed contract.');
    assert.equal(game.state().quests[quest.id].status,'completed');
    const paid = sheet(game).coin_cp;
    await say(game,'I turn in the giant rat contract again.',{type:'quest.turn_in',quest:quest.id});
    await game.reply('Maren points to the closed contract.');
    assert.equal(sheet(game).coin_cp,paid);

    await walk(game,{new:'Alderwatch Smithy'},{text:'I enter the Alderwatch Smithy.',at:SMITHY,prose:'Alaric enters the Alderwatch Smithy. Tom, the smith, looks up.',
        deltas:[{seq:2,type:'person.new',ref:'Tom',name:'Tom',role:'blacksmith',desc:['blacksmith'],present:true,relevant:true,band:'SHORT',scene:SMITHY}]});
    const merchant = who(game,'Tom');
    const stock = Object.values(game.state().objects).filter(o=>o.holder?.entity==='pc' && o.id.startsWith('obj.loot')).slice(0,2);
    assert.equal(stock.length,2);
    await say(game,'I lay out two pieces of loot for a price.');
    await game.reply('Tom weighs the two pieces. “Fifty copper for the pair,” he offers.',{scene:'here',expected:{},deltas:[
        {seq:1,type:'bid',buyer:merchant,price_cp:50,lines:stock.map(o=>({object:o.id,qty:o.qty})),said:'Fifty copper for the pair',
            phase:'firm',condition:null,pricing:{basis:'total',quote:'Fifty copper'}},
    ]});
    const bid = offer(game,o=>o.bid && o.seller===merchant);
    assert.equal(bid?.terms,'firm');
    const beforeSell = sheet(game).coin_cp;
    await say(game,'I accept this price.',accept(bid.id));
    await game.reply('Tom counts out the agreed price.');
    assert.equal(sheet(game).coin_cp,beforeSell+50);

    await say(game,'What staffs do you sell?');
    const gearReply = await game.reply('Tom offers a common staff for eighty copper.',{scene:'here',expected:{},deltas:[
        {seq:1,type:'offer',seller:merchant,lines:[{kind:'goods',service:null,what:'common staff',qty:1,price_cp:80,said:'a common staff for eighty copper',
            phase:'firm',pricing:{basis:'total',quote:'eighty copper'},equipment:true,base:'staff',quality:'common'}]},
    ]});
    const gear = offer(game,o=>!o.bid && o.seller===merchant && o.lines.some(l=>l.profile?.kind==='gear'));
    assert.ok(gear,JSON.stringify(gearReply.record?.rejected || gearReply.record?.extraction));
    await say(game,'I accept this price.',accept(gear.id));
    await game.reply('Tom hands over the staff they agreed on.');
    const newStaff = Object.values(game.state().objects).find(o=>o.holder?.entity==='pc' && o.profile?.title==='staff');
    const oldStaff = sheet(game).equipment.weapon;
    assert.ok(newStaff);
    await say(game,`#equip ${newStaff.id}`);
    assert.equal(sheet(game).equipment.weapon.object,newStaff.id);
    assert.equal(sheet(game).inventory[oldStaff],1);

    await say(game,'I ask Tom what he offers for my old staff.');
    await game.reply('Tom says, “Three copper for the old staff.”',{scene:'here',expected:{},deltas:[
        {seq:1,type:'bid',buyer:merchant,price_cp:3,lines:[{object:`item.${oldStaff}`,qty:1}],
            said:'Three copper for the old staff',phase:'firm',pricing:{basis:'total',quote:'Three copper'}},
    ]});
    const starterBid = offer(game,o=>o.bid && o.lines.some(l=>l.object===`item.${oldStaff}`));
    assert.ok(starterBid);
    await say(game,'I accept this price.',accept(starterBid.id));
    await game.reply('Tom pays the three copper.');
    assert.equal(sheet(game).inventory[oldStaff]||0,0);

    const room = {new:{name:'bench',kind:'interior',parent:game.state().scene.at}};
    await say(game,'I walk to the bench.');
    const input = game.chat.length - 1;
    const shop = game.state().scene.at;
    await game.reply('Alaric reached the bench.',{scene:room,expected:{},deltas:[{seq:1,type:'arrive',at:room,with:[]}]});
    assert.equal(game.state().scene.at,shop);
    assert.ok(!Object.values(game.state().places).some(place=>place.name==='bench'));
    const reply = game.chat[input+1];
    const beforeEdit = foldChat(game.chat,input).state;
    game.chat[input].mes = 'I stay here.';
    onEditedV4(game.chat,input,content);
    await prepareGenerationAsync(game.chat,content,{type:'swipe',llm:async ()=>'{"commands":[]}'});
    assert.deepEqual(messageEvents(reply),[]);
    reply.swipe_id=1;
    reply.mes='Alaric stays where he is.';
    assert.ok(processReplyAny(game.chat,input+1,content,{generatedFrom:generationSource(game.chat,input)}).extract);
    await runExtraction(game.chat,input+1,content,async()=>'{"scene":"here","expected":{},"deltas":[]}');
    assert.equal(rec(reply).extraction.status,'applied');
    onSwipedV4(game.chat,input+1);
    assert.equal(game.state().scene.at,beforeEdit.scene.at);
    assert.deepEqual(foldChat(game.chat).errors,[]);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(game.chat))).state,game.state());
});
