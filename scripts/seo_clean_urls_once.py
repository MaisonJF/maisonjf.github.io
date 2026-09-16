from pathlib import Path
from urllib.parse import urlparse
import re

root = Path('.')
domain = 'https://maison-jf.com'

def clean_token(token: str) -> str:
    m = re.match(r'^([^?#]+)(.*)$', token)
    if not m:
        return token
    base, tail = m.groups()
    if base.endswith('.html'):
        base = base[:-5]
    return base + tail

redirects = root / '_redirects'
parsed = []
for raw in redirects.read_text(encoding='utf-8').splitlines():
    stripped = raw.strip()
    if not stripped or stripped.startswith('#'):
        parsed.append(('raw', raw))
        continue
    parts = stripped.split()
    if len(parts) >= 3 and parts[-1].isdigit():
        parsed.append(('rule', parts[0], parts[1], parts[-1]))
    else:
        parsed.append(('raw', raw))

out = []
seen = {}
redirect_sources_clean = set()
for item in parsed:
    if item[0] == 'raw':
        out.append(item[1])
        continue
    _, src, dst, code = item
    src_clean = clean_token(src)
    dst_clean = clean_token(dst)
    for candidate in (src, src_clean):
        if candidate in seen:
            if seen[candidate] != (dst_clean, code):
                raise SystemExit(f'Conflicting redirect for {candidate}: {seen[candidate]} vs {(dst_clean, code)}')
            continue
        seen[candidate] = (dst_clean, code)
        out.append(f'{candidate} {dst_clean} {code}')
    redirect_sources_clean.add(src_clean.split('?', 1)[0].split('#', 1)[0].lstrip('/'))

if len(seen) > 2100:
    raise SystemExit(f'_redirects exceeds Cloudflare Pages limit: {len(seen)}')
redirects.write_text('\n'.join(out).rstrip() + '\n', encoding='utf-8')

sitemap_stats = {}
for sm in sorted(root.glob('sitemap*.xml')):
    if sm.name == 'sitemap.xml':
        continue
    text = sm.read_text(encoding='utf-8')
    if '<urlset' not in text:
        continue
    kept = []
    cleaned = removed = 0
    for block in re.findall(r'<url>.*?</url>', text, flags=re.S):
        m = re.search(r'<loc>(.*?)</loc>', block, flags=re.S)
        if not m:
            kept.append(block)
            continue
        loc = m.group(1).strip()
        new_loc = loc[:-5] if loc.startswith(domain + '/') and loc.endswith('.html') else loc
        clean_path = urlparse(new_loc).path.lstrip('/')
        if clean_path in redirect_sources_clean:
            removed += 1
            continue
        if new_loc != loc:
            block = block.replace(f'<loc>{loc}</loc>', f'<loc>{new_loc}</loc>')
            cleaned += 1
        kept.append(block.strip())
    open_tag = re.search(r'^.*?<urlset[^>]*>', text, flags=re.S)
    close_tag = re.search(r'</urlset>\s*$', text, flags=re.S)
    if not open_tag or not close_tag:
        raise SystemExit(f'Could not parse sitemap {sm}')
    prefix = text[:open_tag.end()].rstrip()
    suffix = text[close_tag.start():].lstrip()
    body = '\n'.join('  ' + b for b in kept)
    sm.write_text(prefix + ('\n' + body if body else '') + '\n' + suffix, encoding='utf-8')
    sitemap_stats[sm.name] = {'cleaned': cleaned, 'removed_redirects': removed, 'kept': len(kept)}

html_changed = 0
abs_re = re.compile(r"https://maison-jf\.com/([^\"'<>\s]+?)\.html")
href_re = re.compile(r"(?P<prefix>\bhref=[\"'])(?P<url>[^\"']+?)\.html(?P<tail>(?:[?#][^\"']*)?[\"'])", re.I)
for path in root.rglob('*.html'):
    text = path.read_text(encoding='utf-8')
    new = abs_re.sub(r'https://maison-jf.com/\1', text)
    new = href_re.sub(lambda m: m.group('prefix') + m.group('url') + m.group('tail'), new)
    if new != text:
        path.write_text(new, encoding='utf-8')
        html_changed += 1

llms = root / 'llms.txt'
if llms.exists():
    text = llms.read_text(encoding='utf-8')
    text = re.sub(r'https://maison-jf\.com/([^\s]+?)\.html(?=\s|$)', r'https://maison-jf.com/\1', text)
    llms.write_text(text, encoding='utf-8')

bridge = root / 'functions/_lib/ocean-discovery-bridge.js'
if bridge.exists():
    text = bridge.read_text(encoding='utf-8')
    text = text.replace("company:'/portas/companhia.html'", "company:'/portas/companhia'")
    bridge.write_text(text, encoding='utf-8')

guard = root / '.github/workflows/ocean-guard.yml'
g = guard.read_text(encoding='utf-8')

old = """          redirect_sources=set()
          for raw in (root/'_redirects').read_text(encoding='utf-8').splitlines():
              line=raw.strip()
              if not line or line.startswith('#'): continue
              parts=line.split()
              if len(parts)>=3 and parts[-1]=='301':
                  redirect_sources.add(parts[0].lstrip('/'))
"""
new = """          def public_path(file_path):
              return re.sub(r'\\.html$','',file_path)

          redirect_sources=set()
          for raw in (root/'_redirects').read_text(encoding='utf-8').splitlines():
              line=raw.strip()
              if not line or line.startswith('#'): continue
              parts=line.split()
              if len(parts)>=3 and parts[-1]=='301':
                  redirect_sources.add(public_path(parts[0].lstrip('/')))
"""
if old not in g:
    raise SystemExit('Ocean Guard redirect block changed unexpectedly')
g = g.replace(old, new)

old = "          orphaned=sorted(p for p in oceans if p not in pillar_paths and p not in redirect_sources)\n"
new = "          orphaned=sorted(p for p in oceans if p not in pillar_paths and public_path(p) not in redirect_sources)\n"
if old not in g:
    raise SystemExit('Ocean Guard orphan rule changed unexpectedly')
g = g.replace(old, new)

old = """              url='https://maison-jf.com/'+p['path']
              if url not in sitemap:
                  broken.append((p['path'],'missing from public sitemap'))
"""
new = """              url='https://maison-jf.com/'+public_path(p['path'])
              if url not in sitemap:
                  broken.append((p['path'],'missing from public sitemap'))
              canonical_ok=(f'href=\"{url}\"' in html or f"href='{url}'" in html)
              if not canonical_ok:
                  broken.append((p['path'],'canonical is not the clean public URL'))
"""
if old not in g:
    raise SystemExit('Ocean Guard public URL block changed unexpectedly')
g = g.replace(old, new)

marker = "          # Mobile hub contract: never more than 8 returned search results.\n"
extra = """          # Public sitemaps must contain only clean, non-redirecting canonical URLs.
          for sm in root.glob('sitemap*.xml'):
              if sm.name=='sitemap.xml': continue
              stext=sm.read_text(encoding='utf-8')
              if '<urlset' not in stext: continue
              for loc in re.findall(r'<loc>(.*?)</loc>',stext):
                  if loc.endswith('.html'):
                      broken.append((sm.name,'contains .html public URL: '+loc))
                  pth=loc.replace('https://maison-jf.com/','').strip('/')
                  if pth in redirect_sources:
                      broken.append((sm.name,'contains redirect source: '+loc))
          if broken:
              print('BROKEN CLEAN-URL CONTRACT:')
              for p,why in broken: print(' -',p,why)
              raise SystemExit(1)

"""
if marker not in g:
    raise SystemExit('Ocean Guard mobile marker changed unexpectedly')
g = g.replace(marker, extra + marker)
guard.write_text(g, encoding='utf-8')

index = (root / 'sitemap.xml').read_text(encoding='utf-8')
child_urls = re.findall(r'<loc>(https://maison-jf\.com/[^<]+\.xml)</loc>', index)
public_locs = []
for child in child_urls:
    name = child.rsplit('/', 1)[-1]
    file = root / name
    if not file.exists():
        raise SystemExit(f'Sitemap index references missing file: {name}')
    public_locs.extend(re.findall(r'<loc>(.*?)</loc>', file.read_text(encoding='utf-8')))

def local_file_for(loc: str) -> Path:
    path = urlparse(loc).path
    if path == '/':
        return root / 'index.html'
    if path.endswith('/'):
        return root / path.lstrip('/') / 'index.html'
    return root / (path.lstrip('/') + '.html')

problems = []
for loc in public_locs:
    if loc.endswith('.html'):
        problems.append((loc, 'sitemap still exposes .html'))
        continue
    pth = urlparse(loc).path.lstrip('/')
    if pth in redirect_sources_clean:
        problems.append((loc, 'sitemap exposes redirect source'))
        continue
    file = local_file_for(loc)
    if not file.exists():
        problems.append((loc, f'missing backing file {file.as_posix()}'))
        continue
    html = file.read_text(encoding='utf-8')
    links = re.findall(r'<link\b[^>]*>', html, flags=re.I)
    cands = [tag for tag in links if re.search(r'\brel=[\"\']canonical[\"\']', tag, flags=re.I)]
    if not cands:
        problems.append((loc, 'missing canonical'))
        continue
    hm = re.search(r'\bhref=[\"\']([^\"\']+)', cands[0], flags=re.I)
    canonical = hm.group(1) if hm else ''
    if canonical != loc:
        problems.append((loc, f'canonical mismatch: {canonical}'))
    robots = re.findall(r'<meta\b[^>]*name=[\"\']robots[\"\'][^>]*>', html, flags=re.I)
    if robots:
        cm = re.search(r'\bcontent=[\"\']([^\"\']+)', robots[0], flags=re.I)
        directives = cm.group(1).lower().replace(' ', '') if cm else ''
        if 'noindex' in directives:
            problems.append((loc, 'noindex URL exposed in sitemap'))

if problems:
    print('PUBLIC URL VALIDATION FAILED')
    for loc, why in problems[:100]:
        print(' -', loc, why)
    raise SystemExit(1)

print('HTML files normalized:', html_changed)
print('Redirect rules:', len(seen))
print('Sitemap stats:', sitemap_stats)
print('Public URLs validated:', len(public_locs))
