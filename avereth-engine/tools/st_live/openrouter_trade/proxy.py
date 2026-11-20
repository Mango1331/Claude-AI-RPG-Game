"""Run one serial loopback transport for both ST instances. No upstream retry or model lookup."""
import asyncio
from decimal import Decimal
import fcntl
import hashlib
import json
import os
from pathlib import Path
import ssl
import time

from stream_usage import UsageFrames

import httpx
from aiohttp import web

MODEL = "z-ai/glm-5.3-flash"
BASE = "https://openrouter.ai/api/v1"
ROOT = Path(os.environ["AVERETH_AB_DIR"])
KEY = os.environ["OPENROUTER_API_KEY"]
LOG = ROOT / "physical.jsonl"
LIMIT = 60
CAP = Decimal("0.50")
ROUTE = json.loads((ROOT / "route.json").read_text())
RATES = ROUTE["pricing"]
PRICE = {k: float(Decimal(RATES[k]) * 1000000) for k in ("prompt", "completion")}
PRICE.update(request=0, image=0)
CLOCK = lambda: round(time.time() * 1000)
PARAMETERS = ("model", "stream", "max_tokens", "temperature", "top_p", "top_k", "frequency_penalty",
              "presence_penalty", "provider", "reasoning", "seed", "n", "stream_options")


def record(data):
    line = json.dumps(data, ensure_ascii=False)
    if KEY in line:
        raise RuntimeError("Sensitive value detected in diagnostic record")
    with LOG.open("a") as f:
        f.write(line + "\n")
        f.flush()
        os.fsync(f.fileno())


def role(messages):
    first = messages[0]["content"]
    if first.startswith(("You are the intent planner", "You are the command interpreter")):
        return "planner"
    if first.startswith("You write the official contracts"):
        return "board"
    if first.startswith("You read one reply"):
        return "extractor"
    return "narrator"


def inspect_answer(payload, stream):
    packets = []
    done = not stream
    if stream:
        ended = False
        for block in payload.decode().replace("\r\n", "\n").replace("\r", "\n").split("\n\n"):
            data = "\n".join(line[5:].lstrip(" ") for line in block.split("\n") if line.startswith("data:"))
            if not data:
                continue
            if ended:
                raise ValueError("data after DONE")
            if data == "[DONE]":
                done = ended = True
            else:
                packets.append(json.loads(data))
    else:
        packets.append(json.loads(payload))
    text, finish, usage, models = "", None, None, set()
    providers = set()
    reasoning_chars = 0
    for packet in packets:
        if packet.get("provider"): providers.add(packet["provider"])
        if packet.get("error"):
            raise ValueError("provider error packet")
        if packet.get("model"):
            models.add(packet["model"])
        if packet.get("usage") is not None:
            usage = packet["usage"]
        for c in packet.get("choices") or []:
            if c.get("index", 0) != 0:
                raise ValueError("unexpected choice")
            msg = c.get("delta") or c.get("message") or {}
            reasoning_chars += len(msg.get("reasoning") or msg.get("reasoning_content") or "")
            text += (c.get("delta") or c.get("message") or {}).get("content") or ""
            if c.get("finish_reason") is not None:
                finish = c["finish_reason"]
    if not done or finish is None:
        raise ValueError("no regular completion evidence")
    if not models or not models.issubset({MODEL, ROUTE["canonical_slug"]}):
        raise ValueError("reported model mismatch")
    if providers != {ROUTE["provider_name"]}:
        raise ValueError("provider identity unconfirmed: "+str(providers))
    return dict(providers=sorted(providers), reasoningChars=reasoning_chars,text=text, finish=finish, done=done, usage=usage, reportedModels=sorted(models))


async def serve():
    if not KEY.strip() or os.environ["OPENROUTER_API_BASE_URL"].rstrip("/") != BASE or os.environ["OPENROUTER_MODEL"] != MODEL:
        raise SystemExit("Invalid provider configuration")
    if ROUTE["model_id"] != MODEL or ROUTE["tag"] != "wafer/us" or ROUTE["provider_name"] != "Wafer":
        raise SystemExit("Unexpected route")
    if any(PRICE[k] > ceiling for k, ceiling in (("prompt", 0.042), ("completion", 0.184))):
        raise SystemExit("Published price above the verified ceiling")
    lock = (ROOT / "process.lock").open("a")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    prior = [json.loads(line) for line in LOG.read_text().splitlines()] if LOG.exists() else []
    started = [r for r in prior if r.get("kind") == "start"]
    ended = [r for r in prior if r.get("kind") == "end"]
    if [r["id"] for r in started] != [r["id"] for r in ended] or any(not r["ok"] for r in ended):
        raise SystemExit("Previous incomplete or unsuccessful request. Physical gate remains closed.")
    count, blocked = len(started), False
    spent = sum((Decimal(r["chargedOrReservedUSD"]) for r in ended), Decimal(0))
    serial = asyncio.Lock()
    client = httpx.AsyncClient(verify=ssl.create_default_context(), timeout=httpx.Timeout(480, connect=30), follow_redirects=False)

    async def models(req):
        record(dict(kind="models", at=CLOCK(), port=req.transport.get_extra_info("sockname")[1]))
        return web.json_response({"object":"list","data":[{"id":MODEL,"object":"model","owned_by":"zai-org"}]})

    async def chat(req):
        nonlocal count, blocked, spent
        body = await req.read()
        data = json.loads(body)
        arm = "A" if req.transport.get_extra_info("sockname")[1] == 18551 else "B"
        async with serial:
            gate = json.loads((ROOT / "gate.json").read_text())
            if blocked or count >= LIMIT or gate.get("arm") != arm or data.get("model") != MODEL or data.get("n", 1) != 1:
                return web.json_response({"error":"Local physical request gate closed"},status=409)
            if req.transport is None or req.transport.is_closing():
                return web.Response(status=409)
            limit = data.get("max_tokens")
            if not isinstance(limit,int) or not 0 < limit <= ROUTE["max_completion_tokens"]:
                return web.json_response({"error":"Missing or invalid output limit"},status=400)
            reserve = Decimal(ROUTE["context_length"]) * Decimal(RATES["prompt"]) + Decimal(limit) * Decimal(RATES["completion"])
            if spent + reserve > CAP:
                blocked=True
                record(dict(kind="budget_stop", at=CLOCK(), spent=str(spent), reserve=str(reserve)))
                return web.json_response({"error":"Test cost ceiling"},status=409)
            data.pop("clear_thinking",None)
            data.pop("reasoning_effort",None)
            data.update(reasoning={"effort":"low"}, provider={"only":[ROUTE["tag"]],"order":[ROUTE["tag"]],"allow_fallbacks":False,"require_parameters":True,"max_price":PRICE})
            if data.get("stream"):
                data["stream_options"]={"include_usage":True}
            body=json.dumps(data, ensure_ascii=False).encode()
            count += 1
            start = CLOCK()
            tag = {**gate, "id":count, "role": role(data["messages"]), "arm":arm}
            record(dict(kind="start", **tag, at=start, reserveUSD=str(reserve), body=data, params={k:data[k] for k in PARAMETERS if k in data},
                        messagesHash=hashlib.sha256(json.dumps(data["messages"],ensure_ascii=False).encode()).hexdigest()))
            content = bytearray()
            result = dict(ok=False)
            downstream = None
            try:
                async with client.stream("POST", BASE+"/chat/completions", content=body, headers={
                    "Authorization":"Bearer "+KEY, "Content-Type":"application/json","Accept-Encoding":"identity",
                }) as upstream:
                    result.update(status=upstream.status_code,headersAt=CLOCK())
                    downstream = web.StreamResponse(status=upstream.status_code, headers={
                        "Content-Type":upstream.headers.get("content-type","application/octet-stream"), "Cache-Control":"no-cache"})
                    await downstream.prepare(req)
                    adapter = UsageFrames() if data.get("stream") and upstream.is_success else None
                    async for chunk in upstream.aiter_bytes():
                        content.extend(chunk)
                        if chunk and "firstByteAt" not in result:
                            result["firstByteAt"] = CLOCK()
                        for part in adapter.feed(chunk) if adapter else [chunk]:
                            await downstream.write(part)
                    if adapter:
                        if adapter.pending: await downstream.write(adapter.pending)
                        result["usageFrameNormalizations"] = adapter.normalized
                    if not upstream.is_success:
                        result["reason"]="upstream_http_error"
                        try:
                            err=json.loads(content)
                            err=err.get("error",err) if isinstance(err,dict) else {}
                            if isinstance(err,dict):
                                result["serviceError"]={k:str(err[k])[:600] for k in ("type","code","message","detail") if err.get(k)}
                        except (ValueError,UnicodeError):
                            pass
                    else:
                        result.update(inspect_answer(bytes(content),bool(data.get("stream"))))
                        result["ok"]=True
                    await downstream.write_eof()
            except (Exception, asyncio.CancelledError) as e:
                result.update(ok=False,reason=type(e).__name__)
                if isinstance(e,ValueError):
                    result["detail"]=str(e)[:200]
            finally:
                reported=(result.get("usage") or {}).get("cost")
                charged = Decimal(str(reported)) if isinstance(reported,(int,float)) and reported >= 0 else reserve
                spent += charged
                result.update(chargedOrReservedUSD=str(charged), spentOrReservedUSD=str(spent))
                blocked = not result["ok"] or spent >= CAP
                record(dict(kind="end", **tag, **result, at=CLOCK(), elapsedMs=CLOCK()-start))
            if downstream is not None:
                return downstream
            return web.json_response({"error":"Upstream completion unconfirmed; test stopped"},status=502)

    app=web.Application(client_max_size=16*1024*1024)
    app.router.add_get("/v1/models",models)
    app.router.add_post("/v1/chat/completions",chat)
    runner=web.AppRunner(app,access_log=None)
    await runner.setup()
    for port in (18551,18552):
        await web.TCPSite(runner,"127.0.0.1",port).start()
    print("Loopback gate ready",flush=True)
    try:
        await asyncio.Event().wait()
    finally:
        await client.aclose()
        await runner.cleanup()


if __name__=="__main__":
    asyncio.run(serve())
