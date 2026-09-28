import { serveLocalizedPage } from '../_lib/site-localizer.js';

export function onRequest(context){
  return serveLocalizedPage(context,"pt-BR");
}
