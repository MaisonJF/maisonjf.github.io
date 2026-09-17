# Atribuição de jornadas

## Identidade de jornada

`journey_id` é um ID opaco `jrn_<UUIDv7>`. Não é hash de email, telefone, Stripe customer ID, nome, morada ou qualquer outro PII.

A3 não tenta descobrir que dois eventos pertencem à mesma pessoa. Se um evento chega sem `journey_id`, fica `unresolved`. Uma futura camada autorizada pode fornecer ligação pseudonimizada, mas A3 nunca usa PII para a inferir.

## Ordem

Eventos são ordenados por:

1. `occurred_at` normalizado para UTC;
2. `event_id` como desempate determinístico.

A chegada fora de ordem não muda a regra. Eventos tardios originam novo rebuild/snapshot imutável.

## First / assisted / last

Para cada conversão, consideram-se apenas touches anteriores à conversão na mesma jornada.

- primeiro touch: `first`;
- último touch: `last`;
- intermédios: `assisted`;
- se existe apenas um touch, é `first_last`.

Uma conversão sem touch anterior continua a existir como facto económico, mas não recebe atribuição inventada.

Atribuição não significa causalidade. É descrição da sequência observada.
