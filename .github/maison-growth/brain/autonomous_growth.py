#!/usr/bin/env python3
from __future__ import annotations

EDITORIAL_ROUTES={"game_question","oracle_block","social_post","short_video","editorial_page","seo_opportunity","geo_aeo_answer"}
PRODUCT_ROUTES={"physical_product","digital_product","ebook","service","workshop","experience","b2b","wholesale","white_label","licensing","subscription","bundle","partnership","personalisation","corporate_gifting","ip_content_licensing","oracle"}

def route_growth_packet(packet, *, max_editorial_candidates: int = 12) -> dict:
    """Route a Critic-approved packet into bounded internal factory work only."""
    if not packet.critic.safe_to_forward:
        return {"state":"held","reason":"critic_rejected","work":[]}
    if packet.scout.status!="candidate":
        return {"state":"held","reason":"insufficient_signal","work":[]}
    routes=tuple(dict.fromkeys((*packet.scout.reuse_routes,*(x.offer_type for x in packet.offer_concepts))))
    work=[]
    editorial_count=0
    for route in routes:
        if route in EDITORIAL_ROUTES and editorial_count<max_editorial_candidates:
            editorial_count+=1
            work.append({"route":route,"authority":"internal_candidate_write","state":"candidate",
              "source_refs":list(packet.scout.evidence_refs),"opportunity_ref":packet.scout.scout_id,
              "public_write_authorized":False,"spend_authorized":False})
        elif route in PRODUCT_ROUTES:
            work.append({"route":route,"authority":"product_hypothesis_write","state":"candidate",
              "source_refs":list(packet.scout.evidence_refs),"opportunity_ref":packet.scout.scout_id,
              "price_change_authorized":False,"checkout_change_authorized":False,
              "stock_procurement_authorized":False,"launch_authorized":False,"spend_authorized":False})
    return {"state":"routed","reason":"critic_passed","work":work}
