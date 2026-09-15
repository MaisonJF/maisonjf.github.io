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
 if(title)title.textContent=book.title;
 if(description)description.textContent=book.description||'';
 if(price)price.textContent=book.price==null?'':Number(book.price).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 if(buy&&book.checkoutId&&book.price!=null){
   buy.hidden=false;
   buy.dataset.buyEbook=book.checkoutId;
   buy.textContent='Comprar agora · '+Number(book.price).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 }else if(buy){buy.hidden=true}
 document.title=book.title+' | MAISON JF®';
})();
