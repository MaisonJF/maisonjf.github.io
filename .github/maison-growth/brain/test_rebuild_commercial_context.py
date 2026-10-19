#!/usr/bin/env python3
from __future__ import annotations

import unittest
from pathlib import Path


ROOT=Path(__file__).resolve().parent
SCRIPT=ROOT/"rebuild_commercial_context.sh"


class RebuildCommercialContextTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=SCRIPT.read_text(encoding="utf-8")

    def test_write_order_updates_oceans_before_catalogue_and_rankings(self):
        expected=[
            'build_vpc_ocean_signals.mjs"',
            'build_editorial_queue.mjs"',
            'build_commercial_assets.mjs"',
            'digital_experience_coverage.py"',
            'build_commercial_bundles.py"',
            'build_commercial_attention.py"',
        ]
        positions=[self.source.index(token) for token in expected]
        self.assertEqual(positions,sorted(positions))

    def test_check_mode_checks_every_derived_projection(self):
        check_block=self.source.split("  --check)",1)[1].split("  *)",1)[0]
        for name in (
            "build_vpc_ocean_signals.mjs",
            "build_editorial_queue.mjs",
            "build_commercial_assets.mjs",
            "digital_experience_coverage.py",
            "build_commercial_bundles.py",
            "build_commercial_attention.py",
        ):
            line=next(line for line in check_block.splitlines() if name in line)
            self.assertIn("--check",line)

    def test_oceans_feed_evidence_backed_ebook_proposals(self):
        queue_builder=(ROOT/"build_editorial_queue.mjs").read_text(encoding="utf-8")
        for contract in (
            "previous.ebookProposals",
            "ebookProposals",
            "evidence.length<2",
            "approvalRequired:true",
            "automaticPublication:false",
            "automaticActivation:false",
            "proposedOutline",
            "internalOperations",
        ):
            self.assertIn(contract,queue_builder)

    def test_ebook_proposals_flow_into_commercial_assets(self):
        assets_builder=(ROOT/"build_commercial_assets.mjs").read_text(encoding="utf-8")
        self.assertIn("editorialQueue.ebookProposals",assets_builder)
        self.assertIn("editorial_queue.ebookProposals",assets_builder)
        self.assertIn("automatic_publication:false",assets_builder)
        self.assertIn("proposals_require_human_approval:true",assets_builder)

    def test_daily_content_candidates_scale_from_distinct_evidence_backed_ocean_themes(self):
        queue_builder=(ROOT/"build_editorial_queue.mjs").read_text(encoding="utf-8")
        for contract in (
            "dailyContentCandidates",
            "classifyHumanNeed(ocean)",
            "maisonSolutionForNeed(humanNeed.id,adjacency)",
            "humanNeedAction(humanNeed.id)",
            "const text=[ocean.territory,ocean.intent,ocean.painLanguage",
            "commercial adjacency must never be allowed to make unrelated human needs look like product demand",
            "humanNeedCluster:humanNeed.id",
            "humanNeedLabel:humanNeed.label",
            "questionThemeCandidates",
            "slice(0,3)",
            "format:'post'",
            "format:'reel'",
            "format:'carousel'",
            "format:'story'",
            "pollOptions",
            "evidenceCount:evidence.length",
            "draftOnly:true",
            "approvalRequired:true",
            "automaticPublication:false",
            "automaticActivation:false",
            "internalOperations",
            "Só considera um produto pago se ele te fizer sentido",
            "sem pressão para comprar",
        ):
            self.assertIn(contract,queue_builder)

    def test_human_need_drafts_offer_only_relevant_existing_maison_assets(self):
        queue_builder=(ROOT/"build_editorial_queue.mjs").read_text(encoding="utf-8")
        assets=(ROOT/"build_commercial_assets.mjs").read_text(encoding="utf-8")
        for need in (
            "autonomia_descanso_transicao",
            "limites_escolhas_agencia",
            "ligacao_pertença",
            "clareza_incerteza",
            "atencao_informacao",
            "valor_autoconhecimento",
            "seguranca_financeira",
            "luto_perda_significado",
            "carga_mental_cuidado",
            "prazer_celebracao",
            "rituais_sensoriais",
            "presenca_apoio",
        ):
            self.assertIn(need,queue_builder)
        self.assertIn("daily_solution_linked_candidates",assets)
        self.assertIn("daily_human_need_clusters",assets)

    def test_daily_content_candidates_flow_into_commercial_context(self):
        assets_builder=(ROOT/"build_commercial_assets.mjs").read_text(encoding="utf-8")
        self.assertIn("editorialQueue.dailyContentCandidates",assets_builder)
        self.assertIn("daily_content_candidates:dailyContentCandidates.length",assets_builder)
        self.assertIn("daily_content_requires_human_approval",assets_builder)
        self.assertIn("daily_carousel_candidates",assets_builder)
        self.assertIn("daily_story_candidates",assets_builder)

    def test_script_has_no_deploy_or_write_to_external_systems(self):
        lowered=self.source.lower()
        for forbidden in (
            "wrangler deploy",
            "wrangler d1 execute",
            "curl ",
            "git push",
            "gh pr",
        ):
            self.assertNotIn(forbidden,lowered)


if __name__=="__main__":
    unittest.main(verbosity=2)
