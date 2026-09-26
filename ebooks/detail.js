(function(){
 const host=document.querySelector('[data-book]');
 if(!host)return;
 const slug=host.getAttribute('data-book');
 const books=window.MAISON_EBOOKS||[];
 const book=books.find(item=>item.slug===slug&&item.status==='published');
 if(!book){host.textContent='Obra indisponível.';return}
 const title=host.querySelector('[data-title]');
 const description=host.querySelector('[data-description]');
 const price=host.querySelector('[data-price]');
 const buy=host.querySelector('[data-buy]');
 const coverTarget=host.querySelector('[data-cover]');
 if(title)title.textContent=book.title;
 if(description)description.textContent=book.description||'';
 if(price)price.textContent=book.price==null?'':Number(book.price).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 if(buy&&book.checkoutId&&book.price!=null){
   buy.hidden=false;buy.dataset.buyEbook=book.checkoutId;
   buy.textContent='Comprar agora';
 }else if(buy){buy.hidden=true}
 document.title=book.title+' | MAISON JF®';

 const media=(book.media&&book.media.length)?book.media:(book.cover?[{role:'cover',src:book.cover,alt:'Capa de '+book.title,aspect:'book'}]:[]);
 const coverMedia=media.find(m=>m.role==='cover'||m.aspect==='book');
 if(coverTarget&&coverMedia){
   coverTarget.src=coverMedia.src;
   coverTarget.alt=coverMedia.alt||('Capa de '+book.title);
 }
 const essayMedia=coverTarget?media.filter(m=>m!==coverMedia):media;
 if(essayMedia.length){
   const section=document.createElement('section');section.className='editorial-essay library-essay';
   const grid=document.createElement('div');grid.className='essay-grid';
   essayMedia.forEach(function(m,i){
     const fig=document.createElement('figure');
     const aspect=m.aspect||((i%3===0)?'wide':'portrait');
     const isCover=m.role==='cover'||aspect==='book';
     fig.className='essay-shot essay-shot--'+(isCover?'portrait':aspect);
     if(isCover){fig.style.aspectRatio='2 / 3';fig.style.maxWidth='360px'}
     const img=document.createElement('img');img.src=m.src;img.alt=m.alt||book.title;img.loading='lazy';
     if(isCover){img.style.objectFit='contain';img.style.aspectRatio='2 / 3'}
     fig.appendChild(img);
     if(m.caption){const cap=document.createElement('figcaption');cap.className='media-caption';cap.textContent=m.caption;fig.appendChild(cap)}
     grid.appendChild(fig);
   });
   section.appendChild(grid);host.appendChild(section);
 }
})();