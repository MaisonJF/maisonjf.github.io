# A3 · Journeys + Economia

A3 é uma camada interna do Maison Growth Engine. Não serve tráfego público e não é dependência do site Maison.

## Responsabilidades

- aceitar apenas eventos A2/A1 `schema_version=2`;
- trabalhar com `journey_id` opaco/pseudonimizado;
- reconstruir jornadas por `(occurred_at, event_id)`;
- calcular first touch, assisted touch e last touch por conversão;
- conservar eventos sem journey como `unresolved`, sem inferir identidade;
- representar soluções e perfis económicos versionados;
- separar preço de receita observada e de valor económico;
- gerar cálculos determinísticos e auditáveis;
- preparar persistência D1 através de uma porta SQLite/D1-compatible.

## Isolamento

A3 não altera páginas, redirects, sitemaps, workflows, checkout, funções públicas, preços, conteúdo do Oráculo ou repositório público. Nenhum Worker, Queue, binding ou D1 é provisionado nesta etapa.

## Ficheiros

- `journey_engine.py` — reconstrução, atribuição e economia;
- `repository.py` — adaptador SQLite/D1-compatible;
- `migrations/0002_journeys_economics.sql` — extensão do A1;
- `solution-contract.json` — tipos de solução e conversões;
- `economics-contract.json` — cálculo e limites;
- `a3-permissions.json` — deny-by-default;
- `ATTRIBUTION.md` / `ECONOMICS.md` / `RUNTIME.md` — contratos operacionais;
- `test_a3.py` — testes automáticos;
- `validate_a3.py` — validação do módulo.

A4 não é iniciado por A3.
