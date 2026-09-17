# Economia A3

A3 distingue explicitamente **preço**, **receita** e **valor económico**.

- `reference_price_minor`: característica versionada da solução; não prova receita.
- `revenue_minor`: valor observado no evento de conversão.
- `variable_cost_minor`: custo variável estimado/versionado.
- `human_effort_minutes`: esforço humano, mantido como dimensão própria.
- `human_effort_cost_minor`: custo económico atribuído a esse esforço quando existe estimativa aprovada.
- `immediate_contribution_minor = revenue - variable_cost - human_effort_cost`.
- `continuation_expected_value_minor`: estimativa versionada e opcional.
- `expected_total_value_minor`: só existe se houver estimativa de continuidade; caso contrário fica `null`.

Capacidade, escalabilidade, repetição e confiança são guardadas separadamente. Não são convertidas automaticamente em euros.

## Limites de inferência

A3 nunca:
- usa preço como substituto de receita ausente;
- transforma `unknown` em zero;
- inventa margem/custo;
- atribui continuidade sem perfil versionado;
- conclui causalidade de first/last touch;
- usa PII ou texto pago do Oráculo.

Perfis económicos são imutáveis. Uma alteração cria nova versão.
