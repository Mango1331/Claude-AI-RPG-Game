// Same browser clock for send, revision-specific world commit, verified storage and visible host readiness.
export async function watchInput(page) {
   await page.evaluate(() => {
    const ctx=SillyTavern.getContext(), replyIndex=ctx.chat.length+1;
    $('#send_but').one('click.user07', () => {
     const marks=window.user07InputTiming={click:performance.now()};
     const inspect=()=>{
      const reply=ctx.chat[replyIndex];
      if (reply?.extra?.avereth?.extraction?.status==='applied' &&
          document.querySelector('#avereth-action-status')?.textContent==='Gespeichert' &&
          document.querySelector('#send_but')?.checkVisibility() &&
          !document.querySelector('#mes_stop')?.checkVisibility()) marks.ready=performance.now();
      else if (performance.now()-marks.click<60000) requestAnimationFrame(inspect);
     };
     requestAnimationFrame(inspect);
    });
   });
}

export async function inputTiming(page, jobs) {
    await page.waitForFunction(() => Number.isFinite(window.user07InputTiming?.ready));
    const marks = await page.evaluate(() => window.user07InputTiming);
    const job = jobs[0];
    return {
        verified:jobs.length === 1 && job.persisted && job.extraction_status === 'applied' &&
            marks.click <= job.committed_at_ms && job.committed_at_ms <= job.persisted_at_ms && job.persisted_at_ms <= marks.ready,
        worldCommitMs:job?.committed_at_ms - marks.click,
        readbackMs:job?.persisted_at_ms - marks.click,
        readyMs:marks.ready - marks.click,
        saveDurationMs:job?.save_readback_ms,
    };
}
