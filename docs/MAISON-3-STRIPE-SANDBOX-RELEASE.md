# MAISON JF® 3.0 — Stripe Sandbox, Lighthouse e critérios de merge

**Branch:** `maison-3.0` · **PR:** https://github.com/MaisonJF/maisonjf.github.io/pull/262

## 1. Ambientes separados

- Produção em `maison-jf.com`: **503 ativo**, vendas fechadas. Não retirar durante a auditoria.
- Preview Cloudflare Pages do projeto `maisonjf-github-io`: o middleware só permite **duas páginas e três endpoints sandbox** quando o hostname termina em `.maisonjf-github-io.pages.dev`, `MAISON_SANDBOX_ENABLED=1` e `STRIPE_SECRET_KEY` começa por `sk_test_` ou `rk_test_`.
- Nunca permitir chaves `sk_live_` em `STRIPE_SECRET_KEY` no preview. Não reutilizar `STRIPE_LIVE_SECRET_KEY` no sandbox.
- `maison-sos-runtime` está **congelado intencionalmente**; não é gate para a PR #262.

## 2. Configurar os segredos **sem os colocar no GitHub**

1. Abrir o Dashboard Stripe da MAISON JF® e selecionar **modo de teste**.
2. Copiar a chave secreta de teste (`sk_test_...`). Não a partilhar no chat nem guardar num ficheiro do repositório.
3. Ir a Cloudflare → **Workers & Pages** → projeto Pages `maisonjf-github-io` → **Settings → Variables and Secrets** → selecionar o ambiente **Preview**.
4. Adicionar `MAISON_SANDBOX_ENABLED` com valor `1` como variável normal, e `STRIPE_SECRET_KEY` com `sk_test_...` como **Secret / Encrypt**. Guardar as alterações.
5. Voltar a implementar a branch de preview para aplicar os novos bindings. Proteger o domínio de preview com **Cloudflare Access** se o ambiente for usado por mais pessoas.
6. **`pk_test_...` é opcional e não é utilizada pelo fluxo atual:** o backend cria a Checkout Session, e o navegador segue o `session.url` alojado na Stripe. Se no futuro for adotado Stripe.js/Elements, adicionar `pk_test_...` como variável **pública** ao build/frontend, nunca `sk_test_`.
7. Confirmar que `MAISON_SANDBOX_ENABLED` **não está ativada em Production** e que `STRIPE_LIVE_SECRET_KEY` não foi alterada.

Referência: https://developers.cloudflare.com/pages/functions/bindings/

## 3. Percurso manual sandbox

1. Abrir `https://<preview>.maisonjf-github-io.pages.dev/checkout-teste.html`, usando o endereço exato disponibilizado pelo Cloudflare Pages.
2. Escolher `O Turista` ou `Meandros da Vida` e clicar em **Criar sessão Stripe de teste**.
3. Verificar que a Stripe apresenta **modo de teste**; usar apenas um cartão de teste da documentação oficial Stripe: https://docs.stripe.com/testing.
4. Concluir a transação de teste. O redirect tem de levar a `/checkout-sucesso.html?session_id=cs_test_...`.
5. A página deve mostrar `Pagamento de teste confirmado.`, após a API `/api/checkout-session-test` devolver `environment: test` e `payment_status: paid`.
6. Repetir com pagamento cancelado/não confirmado. Não deve aparecer como compra paga.
7. Confirmar que **não existe download de ebook de produção via sessão de teste**. O download privado de produção é testado em CI com Stripe/R2 simulados; um teste verdadeiro da entrega com R2 exige configuração isolada própria.
8. Confirmar que `https://maison-jf.com/` e `https://maison-jf.com/checkout-teste.html` continuam a devolver 503 na manutenção.

Testar o endpoint sem pagamento:
```bash
curl -i 'https://<preview>.maisonjf-github-io.pages.dev/api/checkout-session-test?session_id=invalid'
# Esperado: HTTP 400 para ID inválido, se o sandbox estiver corretamente configurado.
```

## 4. Validação automatizada

Executar localmente, numa cópia da branch:
```bash
node --experimental-default-type=module --test scripts/checkout-e2e-simulated.test.mjs
node scripts/maison-3-smoke.cjs
node scripts/maison-performance-budget.cjs
```
O GitHub Actions executa o checkout simulado e o workflow **Maison 3.0 smoke checks**. O workflow smoke agora inclui Lighthouse **mobile e desktop** nas rotas locais `/`, `/produtos/` e `/ebooks/`, sem abrir o site público. Os relatórios são produzidos como artifacts do job.

As métricas Lighthouse obtidas pelo servidor Python são **laboratoriais estáticas**, não incluem as Functions/Cloudflare de produção nem confirmam INP real. A medição final da experiência real requer um preview acessível com as mesmas Functions e recursos.

## 5. Critérios de aprovação

- [ ] Sandbox isolado com chave `sk_test_` em **Preview** e sem alterações em produção.
- [ ] Redirect e confirmação de pagamento real de teste concluídos.
- [ ] Não há desbloqueio de conteúdo através de sessão de teste.
- [ ] CI: checkout simulado, navegação, descoberta, traduções, runtime privado e outros testes ativos a verde.
- [ ] Lighthouse mobile e desktop concluído nas três páginas, com relatórios revistos.
- [ ] Revisão visual do preview em telemóvel e computador, sem imagens em falta, erros críticos ou bloqueios de navegação.
- [ ] Confirmar bindings de armazenamento de ebooks e acesso real numa infraestrutura de teste isolada, se for necessária prova end-to-end de entrega.
- [ ] PR #262 atualizada, aprovada e preparada para merge.

O Worker `maison-sos-runtime` **não** figura na lista de aprovação. Se estiver configurado como *required status check* na proteção de branch, retirar **apenas esse requisito** nas regras do GitHub; não desativar os restantes testes.

**Merge não equivale a lançamento:** o middleware continuará a devolver HTTP 503 na produção até ser tomada uma decisão posterior explícita para remover a manutenção.
