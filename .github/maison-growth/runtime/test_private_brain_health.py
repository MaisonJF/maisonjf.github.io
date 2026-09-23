#!/usr/bin/env python3
from __future__ import annotations

import unittest

from verify_private_brain_health import validate_health


class PrivateBrainHealthTests(unittest.TestCase):
    def test_accepts_only_read_only_health(self):
        result = validate_health({"status": "ok", "mode": "read_only"})
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["mode"], "read_only")
        self.assertFalse(result["writes_performed"])
        self.assertFalse(result["execution_authority"])

    def test_rejects_non_ok_status(self):
        with self.assertRaisesRegex(ValueError, "health_not_ok"):
            validate_health({"status": "degraded", "mode": "read_only"})

    def test_rejects_non_read_only_mode(self):
        with self.assertRaisesRegex(ValueError, "health_not_read_only"):
            validate_health({"status": "ok", "mode": "write"})


if __name__ == "__main__":
    unittest.main(verbosity=2)
