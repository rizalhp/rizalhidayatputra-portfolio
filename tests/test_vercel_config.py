import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "vercel.json"


class VercelHeaderConfigTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

    def test_header_rules_have_valid_structure_and_unique_sources(self):
        self.assertIsInstance(self.config, dict)
        rules = self.config.get("headers")
        self.assertIsInstance(rules, list)
        self.assertTrue(rules, "vercel.json must define at least one header rule")

        sources = []
        for rule in rules:
            self.assertIsInstance(rule, dict)
            source = rule.get("source")
            self.assertIsInstance(source, str)
            self.assertTrue(source.strip())
            sources.append(source)

            entries = rule.get("headers")
            self.assertIsInstance(entries, list)
            for entry in entries:
                self.assertIsInstance(entry, dict)
                self.assertTrue(str(entry.get("key", "")).strip())
                self.assertIsInstance(entry.get("value"), str)

        self.assertEqual(len(sources), len(set(sources)))

    def test_header_names_are_unique_within_each_rule(self):
        for rule in self.config["headers"]:
            names = [entry["key"].lower() for entry in rule["headers"]]
            with self.subTest(source=rule["source"]):
                self.assertEqual(len(names), len(set(names)))

    def test_asset_cache_policy_is_scoped_to_static_assets(self):
        asset_rules = [
            rule for rule in self.config["headers"]
            if rule["source"] == "/assets/(.*)"
        ]
        self.assertEqual(len(asset_rules), 1)
        asset_headers = {
            entry["key"].lower(): entry["value"]
            for entry in asset_rules[0]["headers"]
        }
        self.assertEqual(
            asset_headers.get("cache-control"),
            "public, max-age=86400, stale-while-revalidate=604800",
        )

        catch_all_rules = [
            rule for rule in self.config["headers"]
            if rule["source"] == "/(.*)"
        ]
        self.assertEqual(len(catch_all_rules), 1)
        catch_all_names = {
            entry["key"].lower() for entry in catch_all_rules[0]["headers"]
        }
        self.assertNotIn("cache-control", catch_all_names)

    def test_security_headers_are_configured_for_all_routes(self):
        catch_all_rules = [
            rule for rule in self.config["headers"]
            if rule["source"] == "/(.*)"
        ]
        self.assertEqual(len(catch_all_rules), 1)
        headers = {
            entry["key"].lower(): entry["value"]
            for entry in catch_all_rules[0]["headers"]
        }

        self.assertEqual(headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(
            headers.get("referrer-policy"),
            "strict-origin-when-cross-origin",
        )
        self.assertEqual(
            headers.get("permissions-policy"),
            "camera=(), microphone=(), geolocation=()",
        )


if __name__ == "__main__":
    unittest.main()
