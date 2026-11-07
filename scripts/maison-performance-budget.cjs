#!/usr/bin/env node
// Static image delivery guard: measurable repository budgets, not Lighthouse/Web Vitals.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const failures=[];
const entries=[
 ['images/perf/home/hero-640.webp',70*1024],
 ['images/perf/home/hero-960.webp',110*1024],
 ['images/perf/home/hero-1280.webp',155*1024],
 ['images/perf/home/hero-1672.webp',220*1024],
 ['images/perf/home/casa-1080.webp',155*1024],
 ['images/perf/home/corpo-1080.webp',155*1024],
 ['images/perf/home/cabeca-1080.webp',155*1024],
 ['images/perf/catalogue/product-vela-vidro-520.webp',85*1024],
 ['images/perf/editorial/virgulas-do-destino-520.webp',200*1024]
];
console.log('Maison 3.0 static image transfer budgets:');
for(const [p,max] of entries){
 const full=path.join(root,p);
 if(!fs.existsSync(full)){failures.push('missing: '+p);continue}
 const bytes=fs.statSync(full).size;
 console.log(' '+p+': '+(bytes/1024).toFixed(1)+' KiB (limit '+(max/1024).toFixed(0)+' KiB)');
 if(bytes>max)failures.push(p+' exceeds '+(max/1024).toFixed(0)+' KiB');
}
const home=read('index.html');
const hero=home.match(/<picture class="hero__media">([\s\S]*?)<\/picture>/i)?.[1]||'';
if(!hero.includes('srcset=')||!hero.includes('fetchpriority="high"')||!hero.includes('loading="eager"'))failures.push('homepage hero responsive/high priority invariant');
for(const name of ['casa','corpo','cabeca']){
 const page=read('portas/'+name+'.html');
 const match=[...page.matchAll(/<img\b[^>]*>/gi)].map(x=>x[0]).find(tag=>tag.includes('/images/perf/home/'+name+'-1080.webp'));
 if(!match||!match.includes('srcset=')||!match.includes('sizes='))failures.push(name+' hero missing responsive WebP');
}
const homeLazy=[...home.matchAll(/<img\b[^>]+>/gi)].filter(m=>m[0].includes('loading="lazy"'));
if(homeLazy.length<3)failures.push('Homepage below-the-fold must lazy-load 3 images');
for(const p of ['index.html','produtos/index.html','ebooks/index.html']){
 const h=read(p);
 if(!/<meta name="description" content="[^"]{30,}"/i.test(h))failures.push(p+' missing meaningful meta description');
 if(p==='index.html'&&!h.includes('name="robots" content="index,follow'))failures.push('Homepage not indexable after maintenance release');
}
if(failures.length){console.error('FAIL: '+failures.join('; '));process.exitCode=1}
else console.log('PASS: image transfer budgets, responsive delivery, lazy below-fold and SEO metadata.');
