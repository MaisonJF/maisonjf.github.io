import unittest

from provenance import canonicalize_url, normalize_observation, convergence_summary

class A13Tests(unittest.TestCase):
    def test_tracking_parameters_do_not_create_fake_independence(self):
        a = canonicalize_url("https://www.example.com/a?utm_source=x")
        b = canonicalize_url("https://example.com/a")
        self.assertEqual(a, b)

    def test_many_models_same_root_counts_once(self):
        a = normalize_observation(
            provider_id="openai", model_id="m1", source_class="ai_api",
            response_text="A grounded observation.",
            prompt="question",
            citations=["https://example.com/report?utm_source=x"],
            retrieved_at="2026-09-22T00:00:00+00:00"
        )
        b = normalize_observation(
            provider_id="anthropic", model_id="m2", source_class="ai_api",
            response_text="Another grounded observation.",
            prompt="question",
            citations=["https://www.example.com/report"],
            retrieved_at="2026-09-22T00:00:01+00:00"
        )
        s = convergence_summary([a, b])
        self.assertEqual(s["model_observation_count"], 2)
        self.assertEqual(s["provider_count"], 2)
        self.assertEqual(s["independent_evidence_root_count"], 1)

    def test_ungrounded_model_outputs_are_not_independent_evidence(self):
        a = normalize_observation(
            provider_id="openai", model_id="m1", source_class="ai_api",
            response_text="Hypothesis only.", prompt="question", citations=[],
            retrieved_at="2026-09-22T00:00:00+00:00"
        )
        s = convergence_summary([a])
        self.assertEqual(s["independent_evidence_root_count"], 0)
        self.assertEqual(s["ungrounded_observation_count"], 1)

    def test_user_memory_requires_explicit_consent(self):
        with self.assertRaisesRegex(ValueError, "explicit_consent_required"):
            normalize_observation(
                provider_id="user_contributed_memory", model_id=None,
                source_class="user_contributed_memory",
                response_text="I keep postponing decisions.",
                citations=[]
            )

    def test_user_memory_accepts_selected_revocable_contribution(self):
        obs = normalize_observation(
            provider_id="user_contributed_memory", model_id=None,
            source_class="user_contributed_memory",
            response_text="I keep postponing decisions.",
            citations=[],
            consent={
                "consent_version":"1",
                "granted_at":"2026-09-22T00:00:00+00:00",
                "scope":"selected_excerpt",
                "user_selected_content":True,
                "revocable":True
            }
        )
        self.assertIsNotNone(obs.consent_receipt_hash)

    def test_direct_email_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "direct_pii_email"):
            normalize_observation(
                provider_id="public_web", model_id=None, source_class="public_web",
                response_text="Contact me at person@example.com", citations=[]
            )

if __name__ == "__main__":
    unittest.main()
