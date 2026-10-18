# Revogar autorizações MCP da conta antiga

Página de gestão: https://maison-jf.com/oauth/manage/

- A página autentica exclusivamente a conta `maisonjf@proton.me` via Supabase magic link.
- Usa `getUserGrants()` para listar as autorizações OAuth que essa conta concedeu.
- Pré-seleciona apenas clientes cujo nome contenha ChatGPT/OpenAI; não revoga nada automaticamente.
- A revogação só acontece quando o utilizador confirma os itens selecionados. Chama `revokeGrant(client_id)`, que invalida sessões ativas e refresh tokens do cliente OAuth selecionado.
- Nenhum token de sessão, publishable key, ou grant é enviado para o GitHub ou guardado em logs próprios.
- Não usar chaves administrativas nem service-role no browser.
- Se não aparecer a autorização do ChatGPT/OpenAI, não selecionar aplicações não relacionadas. Investigar pelo nome do cliente mostrado no Supabase Auth OAuth Server.
- Isto é adicional ao bloqueio fail-closed do MCP implementado nos endpoints Maison; os dados D1/Oceans/Vault não são modificados.
