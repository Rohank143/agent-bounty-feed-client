import assert from 'assert';
import { callMcpTool, getEarnNow, getFeedJson } from './cli.mjs';

async function runTests() {
  console.log('Running test suite for agent-bounty-feed-client (Node.js ESM)...');

  // Test 1: get_feed_stats
  console.log('Test 1: callMcpTool("get_feed_stats")');
  const stats = await callMcpTool('get_feed_stats');
  assert.ok(stats, 'Stats response should be truthy');
  assert.ok(typeof stats.stats?.items === 'number', 'Items count should be numeric');
  assert.ok(stats.stats.items > 0, 'Items count should be > 0');
  console.log('  PASS (Stats retrieved successfully, open items: ' + stats.stats.items + ')');

  // Test 2: list_bounties with limit
  console.log('Test 2: callMcpTool("list_bounties", { limit: 3 })');
  const list = await callMcpTool('list_bounties', { limit: 3 });
  assert.ok(Array.isArray(list.items), 'items should be an array');
  assert.ok(list.items.length <= 3, 'items length should respect limit');
  assert.ok(list.items.length > 0, 'items should have at least 1 bounty');
  assert.ok(list.items[0].id, 'First item must have an id');
  assert.ok(list.items[0].url, 'First item must have a URL');
  console.log('  PASS (Listed ' + list.items.length + ' bounties)');

  // Test 3: get_bounty by id
  console.log('Test 3: callMcpTool("get_bounty")');
  const firstId = list.items[0].id;
  const bounty = await callMcpTool('get_bounty', { id: firstId });
  assert.ok(bounty.item, 'Bounty item should exist');
  assert.strictEqual(bounty.item.id, firstId, 'Retrieved bounty ID should match');
  console.log('  PASS (Fetched details for ' + firstId + ')');

  // Test 4: getEarnNow
  console.log('Test 4: getEarnNow()');
  const earn = await getEarnNow();
  assert.ok(earn, 'Earn now response should be truthy');
  assert.ok(earn.generated_at, 'Earn now must have generated_at');
  console.log('  PASS (Earn now generated at ' + earn.generated_at + ')');

  // Test 5: getFeedJson
  console.log('Test 5: getFeedJson()');
  const feed = await getFeedJson();
  assert.ok(Array.isArray(feed.items), 'feed.items should be an array');
  assert.ok(feed.items.length > 0, 'feed should have items');
  console.log('  PASS (Feed JSON contains ' + feed.items.length + ' items)');

  console.log('\nAll 5 Node.js integration tests passed successfully!\n');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
