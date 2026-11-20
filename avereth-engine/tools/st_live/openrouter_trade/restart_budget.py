"""Retrieve a completed generation record (no model inference) and calculate the cumulative allowance."""
from datetime import datetime, timezone
from decimal import Decimal
import json
import os
from pathlib import Path
import sys
import httpx

OLD_UNKNOWN_START = datetime.fromtimestamp(1795132937.525, timezone.utc)
PREVIOUS_CONFIRMED = Decimal("0.001771268")
PREVIOUS_RESERVED = Decimal("0.046565124")


def allowance(generation):
    created = datetime.fromisoformat(generation["created_at"].replace("Z", "+00:00"))
    if abs((created - OLD_UNKNOWN_START).total_seconds()) > 2:
        raise ValueError("Generation time does not match the old narrator")
    if (generation.get("provider_name") != "Wafer"
            or generation.get("model") not in ("z-ai/glm-5.3-flash", "z-ai/glm-5.3-flash-20260826")
            or generation.get("streamed") is not True
            or generation.get("id") != "gen-1795132937-y4K4TwwYrW4wGZzHAFzA"):
        raise ValueError("Provider, model, streaming or assigned generation ID mismatch")
    if not generation.get("finish_reason") and generation.get("cancelled") is not True:
        raise ValueError("No provider terminal status")
    cost = Decimal(str(generation["total_cost"]))
    if not cost.is_finite() or cost < 0:
        raise ValueError("Invalid settled cost")
    return max(Decimal(0), Decimal("0.50") - max(PREVIOUS_RESERVED, PREVIOUS_CONFIRMED + cost))


if __name__ == "__main__":
    root = Path(os.environ["AVERETH_AB_DIR"])
    if (root / "physical.jsonl").exists():
        raise SystemExit("Use a fresh journal")
    response = httpx.get("https://openrouter.ai/api/v1/generation",
                         params={"id": sys.argv[1]}, headers={"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"]})
    response.raise_for_status()
    data = response.json()["data"]
    assert data["id"] == sys.argv[1]
    cap = allowance(data)
    fields = ("id", "provider_name", "model", "streamed", "native_tokens_prompt", "created_at",
              "finish_reason", "cancelled", "total_cost")
    receipt = {key: data.get(key) for key in fields}
    (root / "prior-settlement.json").write_text(json.dumps(receipt, indent=2))
    print("Remaining USD ceiling", cap)
