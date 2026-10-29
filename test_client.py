import unittest
from client import call_mcp_tool, get_earn_now, get_feed_json


class AgentBountyFeedTests(unittest.TestCase):
    def test_stats(self):
        stats = call_mcp_tool("get_feed_stats")
        self.assertIn("stats", stats)
        self.assertGreater(stats["stats"].get("items", 0), 0)

    def test_list_bounties(self):
        data = call_mcp_tool("list_bounties", {"limit": 3})
        items = data.get("items", [])
        self.assertIsInstance(items, list)
        self.assertGreater(len(items), 0)
        self.assertIn("id", items[0])
        self.assertIn("url", items[0])

    def test_get_bounty(self):
        data = call_mcp_tool("list_bounties", {"limit": 1})
        first_id = data["items"][0]["id"]
        bounty = call_mcp_tool("get_bounty", {"id": first_id})
        self.assertIn("item", bounty)
        self.assertEqual(bounty["item"]["id"], first_id)

    def test_earn_now(self):
        data = get_earn_now()
        self.assertIn("generated_at", data)

    def test_feed_json(self):
        data = get_feed_json()
        self.assertIn("items", data)
        self.assertGreater(len(data["items"]), 0)


if __name__ == "__main__":
    unittest.main()
