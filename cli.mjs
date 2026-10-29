#!/usr/bin/env node
/**
 * Agent Bounty Feed - Zero-dependency MCP & HTTP Client
 * Dual interface for autonomous agents and CLI operators.
 */

const MCP_ENDPOINT = 'https://agent-bounty-feed.dailydollar.workers.dev/mcp';
const EARN_NOW_ENDPOINT = 'https://agent-bounty-feed.dailydollar.workers.dev/earn-now';
const FEED_JSON_ENDPOINT = 'https://dailydollar-bot.github.io/agent-bounty-feed/feed.json';

/**
 * Call a remote MCP tool over Streamable HTTP (JSON-RPC 2.0).
 */
export async function callMcpTool(name, args = {}) {
  const payload = {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1000000),
    method: 'tools/call',
    params: {
      name,
      arguments: args
    }
  };

  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'agent-bounty-feed-client/1.0.0'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`MCP HTTP error ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`MCP Error [${json.error.code}]: ${json.error.message}`);
  }

  const text = json.result?.content?.[0]?.text;
  if (!text) {
    return json.result;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Fetch high-yield bounties via /earn-now endpoint.
 */
export async function getEarnNow() {
  const response = await fetch(EARN_NOW_ENDPOINT, {
    headers: { 'User-Agent': 'agent-bounty-feed-client/1.0.0' }
  });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Fetch full raw feed via feed.json.
 */
export async function getFeedJson() {
  const response = await fetch(FEED_JSON_ENDPOINT, {
    headers: { 'User-Agent': 'agent-bounty-feed-client/1.0.0' }
  });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Helper to parse CLI flags
 */
function parseArgs(args) {
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed[key] = args[i + 1];
        i++;
      } else {
        parsed[key] = true;
      }
    } else {
      parsed._.push(arg);
    }
  }
  return parsed;
}

function printUsage() {
  console.log(`
Agent Bounty Feed Client (Zero Dependencies)
Usage:
  node cli.mjs <command> [options]

Commands:
  stats                Display feed summary, active count, and pool value
  list                 List open paid bounties from the MCP server
  get <bounty-id>      Fetch full metadata and instructions for a bounty
  new                  Query recently added bounties via get_new_bounties
  earn-now             Fetch instant discovery bounties via /earn-now
  feed                 Download and inspect raw feed.json

Options:
  --limit <number>     Number of bounties to return (default: 5)
  --source <name>      Filter by source (algora, frantic, superteam, direct, etc.)
  --exclude <tags>     Exclude tags (e.g. kyc,stake,bond)
  --json               Emit pure JSON for AI agent programmatic parsing
  --help               Show this help message
`);
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const cmd = flags._[0] || 'list';

  if (flags.help || flags._.includes('help')) {
    printUsage();
    process.exit(0);
  }

  try {
    switch (cmd) {
      case 'stats': {
        const stats = await callMcpTool('get_feed_stats');
        if (flags.json) {
          console.log(JSON.stringify(stats, null, 2));
        } else {
          console.log('\n=== Agent Bounty Feed Statistics ===');
          console.log(`Updated At:  ${stats.generated_at}`);
          console.log(`Open Items:  ${stats.stats?.items}`);
          console.log(`Total Pool:  $${stats.stats?.total_usd?.toFixed(2)} USD`);
          console.log('\nBreakdown By Source:');
          for (const [src, data] of Object.entries(stats.stats?.by_source || {})) {
            console.log(`  - ${src.padEnd(14)}: ${String(data.items).padStart(3)} items | $${Number(data.usd).toFixed(2)}`);
          }
          console.log();
        }
        break;
      }

      case 'list': {
        const toolArgs = {};
        if (flags.limit) toolArgs.limit = parseInt(flags.limit, 10);
        if (flags.source) toolArgs.source = flags.source;
        if (flags.exclude) toolArgs.exclude_requires = flags.exclude;

        const data = await callMcpTool('list_bounties', toolArgs);
        if (flags.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(`\n=== Open Paid Bounties (${data.count} of ${data.total_matching}) ===\n`);
          for (const item of data.items || []) {
            const reward = `${item.reward} ${item.currency}`.padEnd(14);
            const estUsd = item.est_usd ? `(~$${item.est_usd})` : '';
            console.log(`[${item.source.toUpperCase()}] ${item.title}`);
            console.log(`  ID:       ${item.id}`);
            console.log(`  Reward:   ${reward} ${estUsd}`);
            console.log(`  Requires: ${item.requires?.join(', ') || 'none'}`);
            console.log(`  URL:      ${item.url}`);
            console.log();
          }
        }
        break;
      }

      case 'get': {
        const id = flags._[1];
        if (!id) {
          console.error('Error: Please specify a bounty id, e.g.: node cli.mjs get <bounty-id>');
          process.exit(1);
        }
        const data = await callMcpTool('get_bounty', { id });
        if (flags.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          const item = data.item;
          if (!item) {
            console.log('Bounty not found.');
            return;
          }
          console.log(`\n=== Bounty: ${item.title} ===`);
          console.log(`Source:     ${item.source}`);
          console.log(`ID:         ${item.id}`);
          console.log(`Reward:     ${item.reward} ${item.currency} (Est. $${item.est_usd} USD)`);
          console.log(`Requires:   ${item.requires?.join(', ') || 'none'}`);
          console.log(`URL:        ${item.url}`);
          console.log(`Eligibility:\n${item.eligibility || 'N/A'}\n`);
        }
        break;
      }

      case 'new': {
        const data = await callMcpTool('get_new_bounties', { limit: flags.limit ? parseInt(flags.limit, 10) : 5 });
        if (flags.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(`\n=== Recent Bounties (${data.count || 0}) ===\n`);
          for (const item of data.items || []) {
            console.log(`- [${item.source}] ${item.title} (${item.reward} ${item.currency})`);
            console.log(`  URL: ${item.url}`);
          }
          console.log(`Next Since Cursor: ${data.next_since || 'N/A'}\n`);
        }
        break;
      }

      case 'earn-now': {
        const data = await getEarnNow();
        if (flags.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(`\n=== Earn Now Instant Discovery ===`);
          console.log(`Generated: ${data.generated_at} (Age: ${data.feed_age_minutes}m)`);
          console.log(`Top Opportunities:\n`);
          const opportunities = data.opportunities || data.items || [];
          for (const opp of opportunities.slice(0, 10)) {
            console.log(`- ${opp.title || opp.name}`);
            if (opp.reward) console.log(`  Reward: ${opp.reward} ${opp.currency || ''}`);
            if (opp.url) console.log(`  URL:    ${opp.url}`);
          }
          console.log();
        }
        break;
      }

      case 'feed': {
        const feed = await getFeedJson();
        if (flags.json) {
          console.log(JSON.stringify(feed, null, 2));
        } else {
          console.log(`\n=== Raw Feed (JSON) ===`);
          console.log(`Total Items: ${feed.items?.length || 0}`);
          console.log(`Feed Version / Meta: ${feed.version || 'v1'}`);
          console.log(`First 3 items:\n`);
          for (const it of (feed.items || []).slice(0, 3)) {
            console.log(`- [${it.source}] ${it.title} -> ${it.reward} ${it.currency}`);
          }
          console.log();
        }
        break;
      }

      default:
        console.error(`Unknown command: ${cmd}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error(`Execution error: ${err.message}`);
    process.exit(1);
  }
}

import { fileURLToPath } from 'url';
import path from 'path';

const isMainModule = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
);

if (isMainModule) {
  main();
}
