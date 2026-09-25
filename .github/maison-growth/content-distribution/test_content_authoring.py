#!/usr/bin/env python3
import unittest

from authoring import (
    approve_for_manual_distribution,
    build_authoring_packet,
    build_review_package,
    validate_draft,
)
from planner import ContentContractError


class ContentAuthoringTests(unittest.TestCase):
    def piece(self):
        return {
            "content_id": "cnt_abc",
            "campaign_id": "cmp_abc",
            "thesis_id": "ths_abc",
            "role": "recognise",
            "format": "short_video",
            "intent": "recognition",
        }

    def context(self):
        return {
            "human_tension": "Chegas ao fim do dia mas a conversa continua dentro da tua cabeça.",
            "desire": "Queres que o dia acabe também por dentro.",
            "audience_moment": "Fim do dia, sozinho, telemóvel na mão.",
            "cta_kind": "save",
        }

    def draft(self):
        return {
            "hook": "O dia acabou. A conversa na tua cabeça é que não.",
            "spoken_body": "Há assuntos que continuam a pedir energia mesmo quando já não existe nada para resolver hoje. Às vezes o próximo passo é mesmo deixar amanhã chegar.",
            "caption": "Nem tudo o que continua na cabeça precisa de resposta esta noite.",
            "cta_text": "Guarda para quando voltares a levar o dia inteiro para a cama.",
        }

    def visual(self):
        return {
            "subject": "uma pessoa sozinha a chegar a casa",
            "setting": "entrada de casa ao fim do dia",
            "mood": "silêncio, contraste entre rua e interior",
        }

    def test_packet_keeps_voice_and_publication_boundary(self):
        packet = build_authoring_packet(self.piece(), self.context())
        self.assertEqual(packet["format"], "short_video")
        self.assertEqual(packet["writing_direction"]["principle"], "João escreve. Brain pensa. MAISON fala.")
        self.assertFalse(packet["automatic_publication"])

    def test_commercial_cta_requires_existing_destination(self):
        context = self.context()
        context["cta_kind"] = "visit_existing_destination"
        with self.assertRaises(ContentContractError):
            build_authoring_packet(self.piece(), context)

    def test_clean_draft_passes_structural_voice_checks(self):
        packet = build_authoring_packet(self.piece(), self.context())
        result = validate_draft(packet, self.draft())
        self.assertTrue(result["ok"])
        self.assertFalse(result["errors"])

    def test_internal_engine_language_and_long_dash_are_blocked(self):
        packet = build_authoring_packet(self.piece(), self.context())
        draft = self.draft()
        draft["hook"] = "O A14 percebeu — e agora tens de agir."
        result = validate_draft(packet, draft)
        self.assertFalse(result["ok"])
        self.assertTrue(any("internal_engine_language" in e for e in result["errors"]))
        self.assertTrue(any("dash_forbidden" in e for e in result["errors"]))

    def test_fake_urgency_and_placeholder_are_blocked(self):
        packet = build_authoring_packet(self.piece(), self.context())
        draft = self.draft()
        draft["caption"] = "[CTA] Só hoje."
        result = validate_draft(packet, draft)
        self.assertFalse(result["ok"])
        self.assertTrue(any("placeholder" in e for e in result["errors"]))
        self.assertTrue(any("urgency" in e for e in result["errors"]))

    def test_review_package_requires_visual_brief(self):
        packet = build_authoring_packet(self.piece(), self.context())
        review = build_review_package(packet, self.draft(), {"subject": "", "setting": "", "mood": ""})
        self.assertEqual(review["status"], "blocked")
        self.assertFalse(review["validation"]["ok"])

    def test_valid_review_package_still_needs_human_review(self):
        packet = build_authoring_packet(self.piece(), self.context())
        review = build_review_package(packet, self.draft(), self.visual())
        self.assertEqual(review["status"], "needs_human_review")
        self.assertTrue(review["human_review_required"])
        self.assertFalse(review["automatic_publication"])

    def test_human_approval_enables_manual_distribution_not_publication(self):
        packet = build_authoring_packet(self.piece(), self.context())
        review = build_review_package(packet, self.draft(), self.visual())
        approved = approve_for_manual_distribution(
            review,
            human_review_ref="a12:review:content-123",
            approval_scope="content_and_cta",
        )
        self.assertEqual(approved["status"], "approved_for_manual_distribution")
        self.assertEqual(approved["distribution"]["manual_only"], True)
        self.assertFalse(approved["distribution"]["automatic_publication"])
        self.assertFalse(approved["distribution"]["automatic_scheduling"])

    def test_invalid_draft_cannot_be_approved(self):
        packet = build_authoring_packet(self.piece(), self.context())
        draft = self.draft()
        draft["caption"] = "Lorem ipsum"
        review = build_review_package(packet, draft, self.visual())
        with self.assertRaises(ContentContractError):
            approve_for_manual_distribution(
                review,
                human_review_ref="a12:review:content-123",
                approval_scope="content_and_cta",
            )

    def test_all_supported_formats_can_reach_human_review(self):
        cases = [
            (
                {"content_id": "cnt_short", "format": "short_video", "intent": "recognition"},
                {"hook": "Chegaste a casa. A tua cabeça ainda não.", "spoken_body": "Às vezes o corpo chega primeiro.", "caption": "O dia pode acabar por dentro também.", "cta_text": "Guarda."},
            ),
            (
                {"content_id": "cnt_story", "format": "story_sequence", "intent": "movement"},
                {"frames": ["Chegaste a casa.", "Mas continuas a responder à conversa na tua cabeça.", "E se hoje não precisasses de resolver mais nada?"], "cta_text": "Responde quando te acontecer."},
            ),
            (
                {"content_id": "cnt_carousel", "format": "carousel_post", "intent": "reframe"},
                {"cover": "Nem tudo o que continua na cabeça precisa de solução hoje.", "slides": ["Há pensamentos que pedem atenção só porque ficaram abertos.", "Fechar o dia não é resolver tudo.", "Às vezes é decidir o que fica para amanhã."], "caption": "Uma pausa não apaga o problema. Só deixa de lhe dar a noite inteira.", "cta_text": "Guarda para mais tarde."},
            ),
            (
                {"content_id": "cnt_page", "format": "editorial_page", "intent": "education"},
                {"title": "Quando o dia acaba e a cabeça não", "opening": "Há noites em que o trabalho terminou, mas tu continuas dentro dele.", "body": "Nem todos os assuntos precisam de uma conclusão antes de dormires. Às vezes basta reconhecer que hoje já terminou.", "cta_text": "Volta a isto quando precisares."},
            ),
        ]
        for piece, draft in cases:
            with self.subTest(format=piece["format"]):
                packet = build_authoring_packet(piece, self.context())
                review = build_review_package(packet, draft, self.visual())
                self.assertEqual(review["status"], "needs_human_review")
                self.assertTrue(review["validation"]["ok"])


if __name__ == "__main__":
    unittest.main()
