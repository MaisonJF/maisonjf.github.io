import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPublicDiscovery} from './build_public_discovery.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const OUTPUT=path.join(ROOT,'sitemap-images.xml');
const SURFACES=[
  [
    "https://maison-jf.com/",
    [
      "/images/maison-jf-hero-hq.jpg",
      "/images/maison-jf-casa-amigos-hq.jpg",
      "/images/maison-jf-corpo-homem-hq.jpg",
      "/images/cabeca-mulher-q94.jpg",
      "/images/maison-jf-companhia-hq.jpg",
      "/images/maison-jf-b2b-office-hq.jpg"
    ]
  ],
  [
    "https://maison-jf.com/portas/casa",
    [
      "/images/maison-jf-casa-amigos-hq.jpg",
      "/images/cinematic/casa.avif"
    ]
  ],
  [
    "https://maison-jf.com/portas/corpo",
    [
      "/images/maison-jf-corpo-homem-hq.jpg",
      "/images/cinematic/corpo.avif"
    ]
  ],
  [
    "https://maison-jf.com/portas/cabeca",
    [
      "/images/cabeca-mulher-q94.jpg",
      "/images/cabeca-perspectiva-final.jpg"
    ]
  ],
  [
    "https://maison-jf.com/portas/companhia",
    [
      "/images/cinematic/companhia.avif"
    ]
  ],
  [
    "https://maison-jf.com/ebooks/",
    [
      "/images/ebooks/posters/virgulas-do-destino.webp",
      "/images/ebooks/posters/sombras-da-luz.webp",
      "/images/ebooks/posters/escrito-nas-entrelinhas.webp",
      "/images/ebooks/posters/sombras-da-alma.webp"
    ]
  ],
  [
    "https://maison-jf.com/ebooks/virgulas-do-destino-o-turista/",
    [
      "/images/ebooks/o-turista.webp"
    ]
  ],
  [
    "https://maison-jf.com/ebooks/virgulas-do-destino-meandros-da-vida/",
    [
      "/images/ebooks/meandros-da-vida.webp"
    ]
  ],
  [
    "https://maison-jf.com/profissionais/",
    [
      "/images/maison-jf-b2b-office-hq.jpg",
      "/images/maison-jf-farol-nocturno-hq.jpg"
    ]
  ],
  [
    "https://maison-jf.com/servicos/",
    [
      "/images/cinematic/editorial.avif"
    ]
  ],
  [
    "https://maison-jf.com/produtos/oleo-massagem/",
    [
      "/images/cinematic/ritual.avif"
    ]
  ]
];

function esc(value){
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function buildImageSitemap(){
  const publicUrls=new Set(buildPublicDiscovery().pages.map(page=>page.url));
  const seenImages=new Set();
  const lines=[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
  ];
  for(const [url,images] of SURFACES){
    if(!publicUrls.has(url))throw new Error('image_sitemap_page_not_public:'+url);
    lines.push('  <url>','    <loc>'+esc(url)+'</loc>');
    for(const rel of images){
      const clean=String(rel).split('?')[0];
      if(!/^\/images\/.+\.(?:avif|webp|png|jpe?g)$/i.test(clean))throw new Error('image_sitemap_unsupported:'+rel);
      const file=path.join(ROOT,clean.replace(/^\//,''));
      if(!fs.existsSync(file))throw new Error('image_sitemap_file_missing:'+clean);
      const absolute='https://maison-jf.com'+clean;
      seenImages.add(absolute);
      lines.push('    <image:image><image:loc>'+esc(absolute)+'</image:loc></image:image>');
    }
    lines.push('  </url>');
  }
  lines.push('</urlset>','');
  return {xml:lines.join('\n'),pages:SURFACES.length,unique_images:seenImages.size};
}

export function writeImageSitemap({check=false}={}){
  const built=buildImageSitemap();
  if(check){
    if(!fs.existsSync(OUTPUT)||fs.readFileSync(OUTPUT,'utf8')!==built.xml){
      console.error('sitemap-images.xml is stale');
      return false;
    }
    console.log('MAISON image sitemap: OK · '+built.pages+' pages · '+built.unique_images+' unique images');
    return true;
  }
  fs.writeFileSync(OUTPUT,built.xml);
  console.log('Wrote MAISON image sitemap · '+built.pages+' pages · '+built.unique_images+' unique images');
  return true;
}

const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const ok=writeImageSitemap({check:process.argv.includes('--check')});
  if(!ok)process.exit(1);
}
