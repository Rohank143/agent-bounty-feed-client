#!/usr/bin/env python3
"""
Agent Bounty Feed - Zero-dependency Python 3 Client & SDK
Zero external libraries: works with Python 3.8+ standard library.
"""

import sys
import json
import argparse
import urllib.request
import urllib.error

MCP_ENDPOINT = "https://agent-bounty-feed.dailydollar.workers.dev/mcp"
EARN_NOW_ENDPOINT = "https://agent-bounty-feed.dailydollar.workers.dev/earn-now"
FEED_JSON_ENDPOINT = "https://dailydollar-bot.github.io/agent-bounty-feed/feed.json"
USER_AGENT = "agent-bounty-feed-python-client/1.0.0"


def call_mcp_tool(name: str, arguments: dict = None) -> dict:
    """Call a remote MCP tool over Streamable HTTP (JSON-RPC 2.0)."""
    if arguments is None:
        arguments = {}

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": name,
            "arguments": arguments,
        },
    }

    req = urllib.request.Request(
        MCP_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    if "error" in data:
        err = data["error"]
        raise RuntimeError(f"MCP error [{err.get('code')}]: {err.get('message')}")

    content = data.get("result", {}).get("content", [])
    if content and "text" in content[0]:
        try:
            return json.loads(content[0]["text"])
        except json.JSONDecodeError:
            return {"raw_text": content[0]["text"]}

    return data.get("result", {})


def get_earn_now() -> dict:
    """Fetch instant discovery feed via /earn-now."""
    req = urllib.request.Request(EARN_NOW_ENDPOINT, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_feed_json() -> dict:
    """Fetch raw feed from GitHub Pages."""
    req = urllib.request.Request(FEED_JSON_ENDPOINT, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description="Agent Bounty Feed CLI (Python stdlib)")
    parser.add_argument("command", choices=["stats", "list", "get", "new", "earn-now", "feed"], nargs="?", default="list")
    parser.add_argument("target_id", nargs="?", help="Bounty ID for 'get' command")
    parser.add_argument("--limit", type=int, default=5, help="Number of items to retrieve")
    parser.add_argument("--source", type=str, help="Filter by bounty source (e.g. algora, direct, frantic)")
    parser.add_argument("--exclude", type=str, help="Exclude requirement tags (e.g. kyc,stake,bond)")
    parser.add_argument("--json", action="store_true", help="Output pure JSON for agent consumption")

    args = parser.parse_args()

    try:
        if args.command == "stats":
            stats = call_mcp_tool("get_feed_stats")
            if args.json:
                print(json.dumps(stats, indent=2))
            else:
                print("\n=== Agent Bounty Feed Statistics ===")
                print(f"Generated:   {stats.get('generated_at')}")
                st = stats.get("stats", {})
                print(f"Open Items:  {st.get('items')}")
                print(f"Total Value: ${st.get('total_usd', 0):.2f} USD")
                print("\nBreakdown by Source:")
                for src, sdata in st.get("by_source", {}).items():
                    print(f"  - {src:<14}: {sdata.get('items', 0):>3} items | ${float(sdata.get('usd', 0)):.2f}")
                print()

        elif args.command == "list":
            tool_args = {"limit": args.limit}
            if args.source:
                tool_args["source"] = args.source
            if args.exclude:
                tool_args["exclude_requires"] = args.exclude

            data = call_mcp_tool("list_bounties", tool_args)
            if args.json:
                print(json.dumps(data, indent=2))
            else:
                items = data.get("items", [])
                print(f"\n=== Open Paid Bounties ({len(items)} of {data.get('total_matching', len(items))}) ===\n")
                for it in items:
                    est_usd = f"(~${it['est_usd']})" if it.get("est_usd") else ""
                    requires = ", ".join(it.get("requires") or ["none"])
                    print(f"[{it.get('source', '').upper()}] {it.get('title')}")
                    print(f"  ID:       {it.get('id')}")
                    print(f"  Reward:   {it.get('reward')} {it.get('currency')} {estUsd}")
                    print(f"  Requires: {requires}")
                    print(f"  URL:      {it.get('url')}")
                    print()

        elif args.command == "get":
            if not args.target_id:
                print("Error: Target ID is required. Example: python client.py get <bounty-id>", file=sys.stderr)
                sys.exit(1)
            data = call_mcp_tool("get_bounty", {"id": args.target_id})
            if args.json:
                print(json.dumps(data, indent=2))
            else:
                item = data.get("item")
                if not item:
                    print("Bounty not found.")
                    return
                print(f"\n=== Bounty: {item.get('title')} ===")
                print(f"Source:     {item.get('source')}")
                print(f"ID:         {item.get('id')}")
                print(f"Reward:     {item.get('reward')} {item.get('currency')} (Est. ${item.get('est_usd')} USD)")
                print(f"URL:        {item.get('url')}")
                print(f"Requires:   {', '.join(item.get('requires') or ['none'])}")
                print(f"\nEligibility:\n{item.get('eligibility', 'N/A')}\n")

        elif args.command == "new":
            data = call_mcp_tool("get_new_bounties", {"limit": args.limit})
            if args.json:
                print(json.dumps(data, indent=2))
            else:
                print(f"\n=== Recent Bounties ({data.get('count', 0)}) ===\n")
                for it in data.get("items", []):
                    print(f"- [{it.get('source')}] {it.get('title')} ({it.get('reward')} {it.get('currency')})")
                    print(f"  URL: {it.get('url')}")
                print(f"Next Since: {data.get('next_since', 'N/A')}\n")

        elif args.command == "earn-now":
            data = get_earn_now()
            if args.json:
                print(json.dumps(data, indent=2))
            else:
                print(f"\n=== Earn Now Instant Discovery ===")
                print(f"Generated: {data.get('generated_at')}")
                items = data.get("opportunities") or data.get("items") or []
                for it in items[:10]:
                    print(f"- {it.get('title') or it.get('name')}")
                    if it.get("reward"):
                        print(f"  Reward: {it.get('reward')} {it.get('currency', '')}")
                    if it.get("url"):
                        print(f"  URL:    {it.get('url')}")
                print()

        elif args.command == "feed":
            data = get_feed_json()
            if args.json:
                print(json.dumps(data, indent=2))
            else:
                items = data.get("items", [])
                print(f"\n=== Raw Feed JSON ({len(items)} items) ===")
                for it in items[:3]:
                    print(f"- [{it.get('source')}] {it.get('title')} -> {it.get('reward')} {it.get('currency')}")
                print()

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
