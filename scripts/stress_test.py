import asyncio
import random
import time
from datetime import datetime, timezone

import aiohttp

# Target Next.js Ingestion API
URL = "http://localhost:3001/api/ingest"

# Mock components that might fail
COMPONENTS = [
    "CACHE_CLUSTER_01",
    "RDBMS_PRIMARY",
    "MCP_HOST_A",
    "MCP_HOST_B",
    "PAYMENT_GATEWAY",
    "USER_SESSION_DB",
]
SEVERITIES = ["P0", "P1", "P2", "P3"]


async def send_signal(session):
    payload = {
        "component_id": random.choice(COMPONENTS),
        "severity": random.choice(SEVERITIES),
        "error_type": "TIMEOUT_OR_CRASH",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        async with session.post(URL, json=payload) as response:
            return response.status
    except Exception as e:
        return 0  # Connection failed


async def blast_signals(total_signals, concurrency_limit):
    connector = aiohttp.TCPConnector(limit=concurrency_limit)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [send_signal(session) for _ in range(total_signals)]

        start_time = time.time()
        results = await asyncio.gather(*tasks)
        end_time = time.time()

        successes = results.count(202)
        failures = len(results) - successes
        duration = end_time - start_time

        print(f"--- Stress Test Complete ---")
        print(f"Total Sent: {total_signals}")
        print(f"Successes (202): {successes}")
        print(f"Failures: {failures}")
        print(f"Time Taken: {duration:.2f} seconds")
        print(f"Throughput: {total_signals / duration:.2f} req/sec")


if __name__ == "__main__":
    # Let's start with a burst of 5,000 requests using 500 concurrent connections
    asyncio.run(blast_signals(total_signals=5000, concurrency_limit=500))
