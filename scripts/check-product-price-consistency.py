#!/usr/bin/env python3
"""Guard prices across the public catalogue, product pages, cart and Stripe checkout."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = (ROOT / "data/products.js").read_text(encoding="utf-8")
CHECKOUT = (ROOT / "functions/api/create-product-checkout-live.js").read_text(encoding="utf-8")
CART = (ROOT / "produtos/carrinho/index.html").read_text(encoding="utf-8")
BUNDLE_PAGE = (ROOT / "produtos/maison-jf-bundles/index.html").read_text(encoding="utf-8")

PAGES = {
    "vela-vidro": "produtos/vela-vidro/index.html",
    "vela-pequena": "produtos/vela-pequena/index.html",
    "oleo-massagem": "produtos/oleo-massagem/index.html",
    "nevoa": "produtos/nevoa/index.html",
    "escalda-pes": "produtos/escalda-pes/index.html",
}
BUNDLES = {
    "bundle-essencial": ("Maison JF Bundle Essencial", 1000, "10 €", "bundle-essencial"),
    "bundle-corpo-alma": ("Maison JF Bundle Corpo & Alma", 1500, "15 €", "bundle-corpo-alma"),
    "bundle-completo": ("Maison JF Bundle Completo", 2900, "29 €", "bundle-completo"),
}
errors = []

def fail(message):
    errors.append(message)

def cents(value):
    return round(float(value) * 100)

catalogue_prices = {}
for line in CATALOGUE.splitlines():
    if "slug:" not in line or "price:" not in line:
        continue
    slug_match = re.search(r"slug:'([^']+)'", line)
    price_match = re.search(r"price:([0-9]+(?:\.[0-9]+)?)", line)
    if slug_match and price_match:
        catalogue_prices[slug_match.group(1)] = cents(price_match.group(1))

for slug, relative_path in PAGES.items():
    if slug not in catalogue_prices:
        fail(f"{slug}: missing price in data/products.js")
        continue
    html = (ROOT / relative_path).read_text(encoding="utf-8")
    schema = re.search(r'"offers"\s*:\s*\{.*?"price"\s*:\s*"([0-9]+(?:\.[0-9]+)?)"', html, re.S)
    if not schema:
        fail(f"{relative_path}: missing Product schema Offer price")
    elif cents(schema.group(1)) != catalogue_prices[slug]:
        fail(f"{slug}: Product schema price differs from catalogue")
    display = re.search(r'class="product-price">\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*€', html)
    if not display:
        fail(f"{relative_path}: missing visible product price")
    elif cents(display.group(1).replace(",", ".")) != catalogue_prices[slug]:
        fail(f"{slug}: visible page price differs from catalogue")

    line = next((line for line in CHECKOUT.splitlines() if re.search(r"['\"]" + re.escape(slug) + r"['\"]\s*:", line)), "")
    if not line:
        fail(f"{slug}: missing from server checkout price map")
    elif "unitCents:" in line:
        amount = re.search(r"unitCents:(\d+)", line)
        if not amount or int(amount.group(1)) != catalogue_prices[slug]:
            fail(f"{slug}: checkout unitCents differs from catalogue")
    else:
        price_id = re.search(r"price:'(price_[A-Za-z0-9]+)'", line)
        if not price_id:
            fail(f"{slug}: checkout has neither Stripe price ID nor unitCents")
        # Stripe's configured amount cannot be verified from repository source alone.

for slug, (name, amount_cents, display_price, cart_slug) in BUNDLES.items():
    server_line = next((line for line in CHECKOUT.splitlines() if re.search(r"['\"]" + re.escape(slug) + r"['\"]\s*:", line)), "")
    if not server_line:
        fail(f"{slug}: missing from checkout")
    else:
        amount = re.search(r"unitCents:(\d+)", server_line)
        if not amount or int(amount.group(1)) != amount_cents:
            fail(f"{slug}: checkout amount differs from bundle price")
        if name not in server_line:
            fail(f"{slug}: checkout name differs from bundle name")

    cart_line = next((line for line in CART.splitlines() if re.search(r"['\"]" + re.escape(cart_slug) + r"['\"]\s*:", line)), "")
    if not cart_line:
        fail(f"{slug}: missing from cart bundle map")
    else:
        amount = re.search(r"price:([0-9]+(?:\.[0-9]+)?)", cart_line)
        if not amount or cents(amount.group(1)) != amount_cents:
            fail(f"{slug}: cart amount differs from checkout")

    if not re.search(r'href="../../produtos/carrinho/\?add=' + re.escape(slug) + r'"', BUNDLE_PAGE):
        fail(f"{slug}: public bundle page does not link to add-to-cart")
    if display_price not in BUNDLE_PAGE:
        fail(f"{slug}: visible bundle price missing from public page")

if "Vela Aromática 70 g" not in BUNDLE_PAGE or "Vela Aromática 70 g" not in CART or "Vela Aromática 70 g" not in CHECKOUT:
    fail("bundle-completo: small 70 g candle must be named consistently on page, cart and checkout")
if "images/products/vela-pequena/hero.webp" not in BUNDLE_PAGE:
    fail("bundle-completo: public page must use the existing 70 g candle product image")

if errors:
    print("PRODUCT PRICE CONSISTENCY FAILED")
    for error in errors:
        print(" - " + error)
    sys.exit(1)

print(f"Product price consistency passed: {len(PAGES)} product pages and {len(BUNDLES)} direct-checkout bundles.")
print("Note: Stripe Price IDs are checked for presence only; their live amounts require Stripe API access.")
