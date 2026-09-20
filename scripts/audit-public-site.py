#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
import re
import sys

ROOT=Path('.')
DOMAIN='https://maison-jf.com'
ASSET_EXTS={'.css','.js','.png','.jpg','.jpeg','.webp','.avif','.svg','.ico','.json','.woff','.woff2'}

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title=''
        self._in_title=False
        self.meta=[]
        self.links=[]
        self.images=[]
    def handle_starttag(self, tag, attrs):
        d={str(k).lower(): ('' if v is None else str(v)) for k,v in attrs}
        tag=tag.lower()
        if tag=='title': self._in_title=True
        elif tag=='meta': self.meta.append(d)
        elif tag=='link': self.links.append(('link',d))
        elif tag=='a': self.links.append(('a',d))
        elif tag=='script': self.links.append(('script',d))
        elif tag=='img':
            self.images.append(d)
            self.links.append(('img',d))
    def handle_endtag(self, tag):
        if tag.lower()=='title': self._in_title=False
    def handle_data(self, data):
        if self._in_title: self.title+=data

def sitemap_children():
    text=(ROOT/'sitemap.xml').read_text(encoding='utf-8')
    return re.findall(r'<loc>'+re.escape(DOMAIN)+r'/([^<]+\.xml)</loc>',text)

def public_urls():
    urls=[]
    for child in sitemap_children():
        p=ROOT/child
        if not p.exists():
            raise SystemExit(f'Sitemap filho em falta: {child}')
        urls += re.findall(r'<loc>([^<]+)</loc>',p.read_text(encoding='utf-8'))
    return urls

def redirects():
    out={}
    p=ROOT/'_redirects'
    if not p.exists(): return out
    for raw in p.read_text(encoding='utf-8').splitlines():
        s=raw.strip()
        if not s or s.startswith('#'): continue
        parts=s.split()
        if len(parts)>=2: out[parts[0]]=parts[1]
    return out

def backing_file(url):
    path=urlparse(url).path
    rel=path.lstrip('/')
    if not rel: return ROOT/'index.html'
    if path.endswith('/'): return ROOT/rel/'index.html'
    exact=ROOT/rel
    if exact.exists() and exact.is_file(): return exact
    html=ROOT/(rel+'.html')
    if html.exists(): return html
    index=ROOT/rel/'index.html'
    if index.exists(): return index
    return html

def attrs_meta(parser,name):
    for m in parser.meta:
        if m.get('name','').lower()==name.lower():
            return m.get('content','').strip()
    return ''

def canonical(parser):
    for tag,a in parser.links:
        if tag=='link' and a.get('rel','').lower()=='canonical':
            return a.get('href','').strip()
    return ''

def local_target(page_url, raw):
    raw=(raw or '').strip()
    if not raw or raw.startswith('#'): return None
    if raw.startswith(('mailto:','tel:','javascript:','data:')): return None
    absolute=urljoin(page_url,raw)
    u=urlparse(absolute)
    if u.scheme not in ('http','https') or u.netloc not in ('maison-jf.com','www.maison-jf.com'):
        return None
    return u._replace(query='',fragment='').geturl().replace('https://www.maison-jf.com','https://maison-jf.com')

def exists_target(url, redirect_map):
    path=urlparse(url).path
    if path.startswith('/api/'): return True
    if path in redirect_map: return True
    p=backing_file(url)
    if p.exists(): return True
    ext=Path(path).suffix.lower()
    if ext in ASSET_EXTS:
        return (ROOT/path.lstrip('/')).exists()
    return False

def main():
    urls=public_urls()
    redirect_map=redirects()
    issues=[]
    seen=set()
    for url in urls:
        if url in seen:
            issues.append((url,'URL duplicado no sitemap'))
            continue
        seen.add(url)
        file=backing_file(url)
        if not file.exists():
            issues.append((url,'ficheiro público em falta'))
            continue
        html=file.read_text(encoding='utf-8',errors='replace')
        parser=PageParser()
        try: parser.feed(html)
        except Exception as exc:
            issues.append((url,f'HTML não analisável: {exc}'))
            continue

        if len(parser.title.strip())<3:
            issues.append((url,'title em falta'))
        desc=attrs_meta(parser,'description')
        if len(desc)<20:
            issues.append((url,'meta description em falta ou demasiado curta'))
        robots=attrs_meta(parser,'robots').lower().replace(' ','')
        if 'noindex' in robots:
            issues.append((url,'URL do sitemap marcada noindex'))
        can=canonical(parser)
        if can!=url:
            issues.append((url,f'canonical incorreto: {can or "(em falta)"}'))

        for img in parser.images:
            if not img.get('src','').strip():
                issues.append((url,'imagem sem src'))
            if 'alt' not in img or not img.get('alt','').strip():
                issues.append((url,'imagem sem alt'))
        for tag,a in parser.links:
            attr='href' if tag in ('a','link') else 'src'
            raw=a.get(attr,'').strip()
            if tag=='a' and raw=='#':
                issues.append((url,'link vazio href="#"'))
                continue
            target=local_target(url,raw)
            if target and not exists_target(target,redirect_map):
                issues.append((url,f'{tag} aponta para recurso interno inexistente: {raw}'))

    print(f'Páginas públicas auditadas: {len(urls)}')
    if issues:
        print(f'Problemas encontrados: {len(issues)}')
        for url,why in issues:
            print(' -',url,'::',why)
        return 1
    print('Auditoria pública: OK')
    return 0

if __name__=='__main__':
    sys.exit(main())
