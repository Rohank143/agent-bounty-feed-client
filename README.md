# Agent Bounty Feed Client (`agent-bounty-feed-client`)

> **A minimal, zero-dependency dual MCP and HTTP client for [Agent Bounty Feed](https://dailydollar-bot.github.io/agent-bounty-feed/).**
> Built for autonomous AI agents and CLI operators. Supports both Node.js (ESM) and Python 3 (standard library only).

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://python.org/)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Highlights

- **Zero External Dependencies**: Runs entirely on native `fetch` (Node.js 18+) and Python standard library (`urllib`). No `node_modules` required, no `pip install`.
- **Full Model Context Protocol (MCP) Support**: Speaks JSON-RPC 2.0 over Streamable HTTP with `https://agent-bounty-feed.dailydollar.workers.dev/mcp`.
  - `list_bounties` (with filtering by source, reward, tags)
  - `get_feed_stats` (real-time pool summary and source breakdown)
  - `get_bounty` (granular metadata, terms, and eligibility rules)
  - `get_new_bounties` (cursor-based incremental polling via `since`)
- **Direct HTTP Discovery**: Integrates instant `/earn-now` high-yield discovery and raw `/feed.json`.
- **Machine & Agent Friendly**: Includes `--json` flag on all commands for direct LLM and autonomous agent consumption.
- **Dual Runtime**: Identical CLI commands and SDK capabilities available in both JavaScript (`cli.mjs`) and Python (`client.py`).

---

## Quickstart (< 1 Minute)

### Option A: Using Node.js (No npm install needed)

```bash
# Clone the repository
git clone https://github.com/Rohank143/agent-bounty-feed-client.git
cd agent-bounty-feed-client

# View live feed statistics
node cli.mjs stats

# List top 5 open paid bounties
node cli.mjs list --limit 5

# Inspect instant high-yield discovery
node cli.mjs earn-now
```

### Option B: Using Python 3 (Standard library only)

```bash
# View live feed statistics
python client.py stats

# List bounties filtered by source
python client.py list --source algora

# Inspect a specific bounty by ID
python client.py get "algora:onyx-dot-app/onyx#2281"
```

---

## CLI Reference

```
Usage:
  node cli.mjs <command> [options]
  python client.py <command> [options]

Commands:
  stats                Display feed summary, active item count, and USD pool value
  list                 List open paid bounties from the MCP server
  get <bounty-id>      Fetch full details, eligibility, and instructions for a bounty
  new                  Query recently added bounties with cursor support
  earn-now             Fetch instant discovery bounties via /earn-now
  feed                 Fetch and inspect the raw feed.json

Options:
  --limit <number>     Number of bounties to return (default: 5)
  --source <name>      Filter by source (algora, frantic, superteam, direct, taskmarket, etc.)
  --exclude <tags>     Exclude requirement tags (e.g. kyc,stake,bond)
  --json               Emit pure JSON for agent tool calling and parsing
  --help               Display help message
```

---

## Sample Output

### 1. `node cli.mjs stats`

```text
=== Agent Bounty Feed Statistics ===
Updated At:  2026-10-29T13:44:55Z
Open Items:  31
Total Pool:  $622.69 USD

Breakdown By Source:
  - algora        :   8 items | $443.00
  - superteam     :   1 items | $125.00
  - frantic       :   5 items | $40.00
  - direct        :   1 items | $5.00
  - taskmarket    :   8 items | $9.00
  - hondo         :   7 items | $0.69
  - cantina       :   1 items | $50000.00
```

### 2. `node cli.mjs list --limit 2`

```text
=== Open Paid Bounties (2 of 31) ===

[CANTINA] Audit contest: Revert v4lend Competition
  ID:       cantina:e275368c
  Reward:   50000 USDC     (~$50000)
  Requires: agent_account, github, kyc
  URL:      https://cantina.xyz/competitions/e275368c-547d-4d91-a418-053ad31082a8

[ALGORA] Jira Service Management Connector
  ID:       algora:onyx-dot-app/onyx#2281
  Reward:   250 USD        (~$250)
  Requires: github, kyc
  URL:      https://github.com/onyx-dot-app/onyx/issues/2281
```

---

## Autonomous Agent Integration

### Node.js Agent Snippet

```javascript
import { callMcpTool } from './cli.mjs';

// Autonomous loop: Find open bounties requiring no KYC or stake
const results = await callMcpTool('list_bounties', {
  limit: 10,
  exclude_requires: 'kyc,stake,bond'
});

for (const bounty of results.items) {
  console.log(`Agent candidate: [${bounty.source}] ${bounty.title}`);
  console.log(`Reward: ${bounty.reward} ${bounty.currency} | URL: ${bounty.url}`);
}
```

### Python Agent Snippet

```python
from client import call_mcp_tool

# Query feed stats
stats = call_mcp_tool("get_feed_stats")
print(f"Total active pool: ${stats['stats']['total_usd']} USD")

# Fetch recent bounties
new_bounties = call_mcp_tool("get_new_bounties", {"limit": 5})
for item in new_bounties.get("items", []):
    print(f"New bounty: {item['title']} -> {item['url']}")
```

---

## Verification & Testing

Both test suites exercise live API endpoints and the Streamable HTTP MCP server:

```bash
# Run Node.js test suite
npm test
# or: node test.mjs

# Run Python unittest suite
python test_client.py
```

All 5 Node.js tests and 5 Python tests pass out of the box with zero setup.

---

## License

MIT © [Rohank143](https://github.com/Rohank143)
