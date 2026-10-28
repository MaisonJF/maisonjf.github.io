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
            "build_ocean_catalog_snapshot.mjs",
            "build_vpc_ocean_signals.mjs",
            "build_editorial_queue.mjs",
            "build_pdi_expansion_queue.mjs",
            "build_ai_reader_panel.mjs",
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
            "Classify the human topic, not product keywords repeated in commercial adjacency",
            "humanNeedCluster:humanNeed.id",
            "humanNeedLabel:humanNeed.label",
            "questionThemeCandidates",
            "slice(0,MAX_DAILY_THEMES_PER_OCEAN)",
            "MAX_DAILY_THEMES_PER_OCEAN=6",
            "normalizeHumanTheme",
            "ENGLISH_THEME_TRANSLATIONS",
            "UNKNOWN_ENGLISH_THEME",
            "dailyThemesPerOceanCap:MAX_DAILY_THEMES_PER_OCEAN",
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
            "autonomia_descanso_transicao",
            "atencao_informacao",
            "valor_autoconhecimento",
            "rituais_sensoriais",
            "presenca_apoio",
            "rituais_sensoriais",
            "presenca_apoio",
        ):
            self.assertIn(need,queue_builder)
        self.assertIn("daily_solution_linked_candidates",assets)
        self.assertIn("daily_human_need_clusters",assets)

    def test_daily_content_candidates_flow_into_commercial_context(self):
        assets_builder=(ROOT/"build_commercial_assets.mjs").read_text(encoding="utf-8")
        self.assertIn("editorialQueue.dailyContentCandidates",assets_builder)
        self.assertIn("daily_content_candidates:dailyContentCandidates,",assets_builder)
        self.assertIn("daily_content_candidates:dailyContentCandidates.length",assets_builder)
        self.assertIn("daily_content_requires_human_approval",assets_builder)
        self.assertIn("daily_themes_per_ocean_cap:editorialQueue.summary?.dailyThemesPerOceanCap||0",assets_builder)
        self.assertIn("daily_carousel_candidates",assets_builder)
        self.assertIn("daily_story_candidates",assets_builder)

    def test_ocean_snapshot_sync_reports_rows_and_rebuilds_all_derived_organs(self):
        workflow=(ROOT.parents[1]/"workflows"/"maison-ocean-snapshot-sync.yml").read_text(encoding="utf-8")
        self.assertIn("Report Ocean snapshot intake count",workflow)
        self.assertIn("Pending Ocean snapshot rows returned by D1",workflow)
        self.assertIn("rebuild_commercial_context.sh --write",workflow)
        self.assertIn("rebuild_commercial_context.sh --check",workflow)
        self.assertIn(".github/maison-growth/brain/",workflow)
        self.assertIn("Acknowledge D1 snapshot",workflow)

    def test_refresh_context_tracks_main_and_growth_branch_sources(self):
        workflow=(ROOT.parents[1]/"workflows"/"refresh-maison-derived-context.yml").read_text(encoding="utf-8")
        self.assertIn("      - main",workflow)
        self.assertIn("      - feat/pdi-exponential-growth",workflow)
        self.assertIn("'functions/_lib/pdi-theme-sources.js'",workflow)
        self.assertIn("ref: ${{ github.ref }}",workflow)
        self.assertIn('git push origin "HEAD:${GITHUB_REF_NAME}"',workflow)
        self.assertIn("if: github.actor != 'github-actions[bot]'",workflow)

    def test_pdi_expansion_queue_scales_game_questions_oracle_and_ebook_concepts(self):
        builder=(ROOT/"build_pdi_expansion_queue.mjs").read_text(encoding="utf-8")
        assets=(ROOT/"build_commercial_assets.mjs").read_text(encoding="utf-8")
        for contract in (
            "buildPdiThemeSourceSignals",
            "groupExactThemeSignals",
            "const duoTemplates=",
            "const groupTemplates=",
            "type:'pdi_question_draft'",
            "mode==='group'",
            "ORACLE_TERRITORIES.flatMap",
            "const bookConceptSpecs=",
            "marketDemandValidated:false",
            "readerResearchRequired:true",
            "approvalRequired:true",
            "automaticActivation:false",
            "publiclyAvailable:false",
            "readyForComposer:false",
            "pdi_expansion_queue_out_of_sync",
        ):
            self.assertIn(contract,builder)
        self.assertIn("build_pdi_expansion_queue.mjs",self.source)
        self.assertIn('node "$ROOT/build_pdi_expansion_queue.mjs" --check',self.source)
        self.assertIn("pdi_question_drafts:expansionQueue.summary.questionDrafts",assets)
        self.assertIn("oracle_role_briefs:expansionQueue.summary.oracleRoleBriefs",assets)
        self.assertIn("ebook_concept_seeds:expansionQueue.summary.ebookConceptSeeds",assets)

    def test_ai_reader_panel_is_transparent_and_never_fabricates_customer_testimonials(self):
        builder=(ROOT/"build_ai_reader_panel.mjs").read_text(encoding="utf-8")
        assets=(ROOT/"build_commercial_assets.mjs").read_text(encoding="utf-8")
        for contract in (
            "SIMULAÇÃO EDITORIAL GERADA POR IA",
            "simulatedComment:",
            "READER_VOICES",
            "A ideia de deixar de passar por cima daquilo que já sei",
            "Gosto da opção de passar e de não exigir histórias pessoais",
            "fullManuscriptReviewed:false",
            "actualReader:false",
            "verifiedPurchase:false",
            "realCustomer:false",
            "testimonial:false",
            "starRating:null",
            "publicDisplayAllowed:false",
            "disclosureRequired:true",
            "humanReviewRequired:true",
            "data/ebooks.js catalogue description only",
        ):
            self.assertIn(contract,builder)
        self.assertIn("build_ai_reader_panel.mjs",self.source)
        self.assertIn('node "$ROOT/build_ai_reader_panel.mjs" --check',self.source)
        self.assertIn("ai_reader_assessments_are_testimonials:false",assets)
        self.assertIn("ai_reader_assessments_public:false",assets)

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
