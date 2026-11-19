export function observeTurn({index,regenerate=false}) {
    const c=SillyTavern.getContext(), marks={}, end=document.querySelector('#send_but');
    const stats=window.abTurn={marks,active:true,world:null};
    if(regenerate) marks.click=performance.now();
    const original=console.info;
    console.info=function(label,...values){
        if(label==='[Avereth] world completion'){
            const m=JSON.parse(values[0]);
            if(m.id===index){
                stats.world=m;
                const stamp=performance.now();
                marks.confirmedSave=m.persisted ? (m.persisted_at_ms ?? stamp) : null;
                marks.worldCommit=m.record_changed ? (m.committed_at_ms ?? (stamp-m.save_readback_ms)) : null;
                marks.worldTimesInferred=m.persisted_at_ms==null;
            }
        }
        return original.call(console,label,...values);
    };
    stats.stop=()=>{stats.active=false;console.info=original;};
    if(!regenerate) document.addEventListener('click',function click(e){
        if(!e.target.closest('#send_but'))return;
        document.removeEventListener('click',click,true);
        marks.click=performance.now();
    },true);
    const filtered=n=>!n.parentElement?.closest('details,pre,code,.mes_reasoning,.avereth-hud,.custom-avereth-hud,script,style');
    const initialProse = regenerate ? c.chat[index]?.mes : null;
    let prior='';
    function frame(){
        if(!stats.active)return;
        const el=document.querySelector('#chat .mes[mesid="'+index+'"] .mes_text');
        const reply=c.chat[index];
        if(marks.click!=null && (!regenerate || reply?.mes!==initialProse) && el?.checkVisibility() && reply && !reply.is_user){
            const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[];
            for(let n=walk.nextNode();n;n=walk.nextNode())if(filtered(n)&&n.textContent)nodes.push(n);
            const text=nodes.map(n=>n.textContent).join('');
            if(text && text!==prior){marks.lastRenderedChange=performance.now();prior=text;}
            if(!marks.firstProse && text.trim().length>=8){
                const match=/[^.!?…]*[.!?…](?:["'”’]*)\s*/u.exec(text);
                if(match && /[a-z]{3}/i.test(match[0])){
                    const first=nodes[0];let length=match.index+match[0].trimEnd().length;
                    for(const n of nodes){
                        if(length>n.textContent.length){length-=n.textContent.length;continue;}
                        const range=document.createRange();range.setStart(first,0);range.setEnd(n,length);
                        const box=range.getBoundingClientRect(), viewport=document.querySelector('#chat').getBoundingClientRect();
                        if(box.height>0 && box.top>=viewport.top-1 && box.bottom<=viewport.bottom+1){marks.firstProse=performance.now();stats.firstSentence=match[0].trim();}
                        break;
                    }
                }
            }
            if(!marks.ready && stats.world?.persisted && document.querySelector('#avereth-action-status')?.textContent==='Gespeichert' && end.checkVisibility() && !document.querySelector('#mes_stop')?.checkVisibility()){
                marks.ready=performance.now();stats.finalRendered=prior.trim();
            }
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
