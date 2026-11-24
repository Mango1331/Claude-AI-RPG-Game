"""Local-only two-arm research transport. The adapter/parser come from the reviewed OpenRouter runner."""
import asyncio
from decimal import Decimal
import fcntl
import gzip
import json
import os
from pathlib import Path
import sys
import time

from aiohttp import web
import httpx

ROOT = Path(os.environ["AVERETH_AB_DIR"])
sys.path.insert(0, os.environ["AVERETH_TRADE_TOOLS"])
from proxy import inspect_answer, role, record, LOG, KEY, MODEL, BASE, UsageFrames

ROUTE = json.loads((ROOT / "route.json").read_text())
LIMIT, CAP = 220, Decimal("1.50")
RATES = {"prompt": Decimal("0.0000000356"), "completion": Decimal("0.0000000815")}
PORTS = {18551: "B", 18552: "C"}

def clock():
    return time.time_ns() // 1000000

def read_history():
    events = [json.loads(s) for s in LOG.read_text().splitlines()] if LOG.exists() else []
    starts = [e["id"] for e in events if e["kind"] == "start"]
    ends = [e for e in events if e["kind"] == "end"]
    if starts != [e["id"] for e in ends] or any(not e["ok"] for e in ends):
        raise RuntimeError("The research journal records an unsettled or failed request")
    return len(starts), sum((Decimal(e["chargedOrReservedUSD"]) for e in ends), Decimal(0))

def reserve_for(maximum):
    return Decimal(ROUTE["context_length"]) * RATES["prompt"] + maximum * RATES["completion"]

async def serve():
    assert os.environ["OPENROUTER_API_BASE_URL"].rstrip("/") == BASE
    assert os.environ["OPENROUTER_MODEL"] == MODEL == ROUTE["model_id"] and KEY.strip()
    assert ROUTE["tag"] == "relace/fp4" and ROUTE["provider_name"] == "Relace"
    assert all(Decimal(ROUTE["pricing"][k]) <= v for k, v in RATES.items())
    assert all(Decimal(ROUTE["pricing"].get(k, "0")) == 0 for k in ("request","image"))
    lock = (ROOT / "transport.lock").open("a")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    count, spent = read_history()
    serial = asyncio.Lock()
    hard_stop = False
    client = httpx.AsyncClient(timeout=httpx.Timeout(600, connect=30),follow_redirects=False)
    price = {k:float(v * 1000000) for k,v in RATES.items()}
    price.update(request=0,image=0)
    async def models(req):
        return web.json_response({"object":"list","data":[{"id":MODEL,"object":"model","owned_by":"z-ai"}]})
    async def chat(req):
        nonlocal count, spent, hard_stop
        arm = PORTS[req.transport.get_extra_info("sockname")[1]]
        data = await req.json()
        async with serial:
            gate = json.loads((ROOT / "gate.json").read_text())
            if (not (ROOT / "historical-go").is_file() or hard_stop or count >= LIMIT or gate.get("arm") != arm
                    or data.get("model") != MODEL or data.get("n",1) != 1 or not req.transport or req.transport.is_closing()):
                return web.json_response({"error":"physical gate closed"},status=409)
            maximum = data.get("max_tokens")
            if not isinstance(maximum,int) or not 0 < maximum <= ROUTE["max_completion_tokens"]:
                return web.json_response({"error":"invalid request limit"},status=400)
            reserve = reserve_for(maximum)
            if spent + reserve > CAP:
                record(dict(kind="budgetStop",arm=arm,at=clock(),spent=str(spent),reserve=str(reserve)))
                hard_stop=True
                return web.json_response({"error":"budget exhausted"},status=409)
            data.pop("clear_thinking",None)
            data.pop("reasoning_effort",None)
            data["reasoning"]={"effort":"low"}
            data["provider"]={"only":[ROUTE["tag"]],"order":[ROUTE["tag"]],"allow_fallbacks":False,
                              "require_parameters":True,"max_price":price}
            if data.get("stream"): data["stream_options"]={"include_usage":True}
            body=json.dumps(data,ensure_ascii=False).encode()
            if KEY.encode() in body: raise RuntimeError("unexpected secret in body")
            count += 1
            start=clock()
            tag={"arm":arm,"turn":gate["turn"],"id":count,"role":role(data["messages"])}
            record(dict(kind="start",**tag,at=start,reserveUSD=str(reserve),body=data))
            response=None
            raw=bytearray()
            result={"ok":False}
            try:
                async with client.stream("POST",BASE+"/chat/completions",content=body,headers={
                    "Authorization":"Bearer "+KEY,"Content-Type":"application/json","Accept-Encoding":"identity"}) as upstream:
                    result.update(status=upstream.status_code,headersAt=clock())
                    receipt=upstream.headers.get("x-generation-id") or upstream.headers.get("x-openrouter-generation-id")
                    if receipt: result["generationId"]=receipt
                    response=web.StreamResponse(status=upstream.status_code,headers={
                        "Content-Type":upstream.headers.get("content-type","application/octet-stream"),"Cache-Control":"no-cache"})
                    await response.prepare(req)
                    adapter=UsageFrames() if data.get("stream") and upstream.is_success else None
                    async for block in upstream.aiter_bytes():
                        raw.extend(block)
                        if block and "firstByteAt" not in result: result["firstByteAt"]=clock()
                        for part in adapter.feed(block) if adapter else [block]:
                            await response.write(part)
                    if adapter:
                        if adapter.pending: await response.write(adapter.pending)
                        result["usageFrameNormalizations"]=adapter.normalized
                    if upstream.is_success:
                        result.update(inspect_answer(bytes(raw),bool(data.get("stream"))))
                        result["ok"]=True
                    else:
                        result["reason"]="upstream_http_error"
                    await response.write_eof()
            except (Exception, asyncio.CancelledError) as err:
                result.update(ok=False,reason=type(err).__name__,detail=str(err)[:180])
            finally:
                rawname=f"{arm}/raw-{count}.{'sse' if data.get('stream') else 'json'}.gz"
                if KEY.encode() in raw: raise RuntimeError("unexpected secret in response")
                (ROOT/rawname).write_bytes(gzip.compress(raw,mtime=0))
                actual=(result.get("usage") or {}).get("cost")
                charged=Decimal(str(actual)) if isinstance(actual,(int,float)) and actual >= 0 else reserve
                spent+=charged
                hard_stop=not result["ok"] or spent >= CAP
                record(dict(kind="end",**tag,**result,at=clock(),elapsedMs=clock()-start,chargedOrReservedUSD=str(charged),rawFile=rawname))
            return response if response is not None else web.json_response({"error":"remote completion unknown"},status=502)
    app=web.Application(client_max_size=16*1024*1024)
    app.router.add_get("/v1/models",models)
    app.router.add_post("/v1/chat/completions",chat)
    runner=web.AppRunner(app,access_log=None)
    await runner.setup()
    try:
        for port in PORTS: await web.TCPSite(runner,"127.0.0.1",port).start()
        print("Loopback gate ready",flush=True)
        await asyncio.Event().wait()
    finally:
        await client.aclose()
        await runner.cleanup()
if __name__=="__main__":
    asyncio.run(serve())
