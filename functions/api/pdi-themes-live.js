// Public theme catalogues are intentionally not exposed. Theme selection is server-side.
export async function onRequestGet(){
  return new Response(JSON.stringify({error:'not_found'}),{
    status:404,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff'
    }
  });
}
