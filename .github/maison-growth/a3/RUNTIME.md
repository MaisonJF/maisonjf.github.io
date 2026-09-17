# Fronteira de runtime A3

Nesta fase não existe runtime Cloudflare do Growth Engine.

## Preparado

O código usa contratos e adapters que podem ser ligados posteriormente a:
- D1 dedicada;
- Worker interno do Growth Engine;
- Queue/consumidor de eventos;
- jobs de rebuild.

`SQLiteA3Repository` funciona como referência D1-compatible.

## Por testar apenas quando activarmos Cloudflare

- concorrência real de D1;
- latência e limites de D1;
- entrega real Queue → A3;
- eventos repetidos/redeliveries em produção;
- rebuilds concorrentes;
- falhas/retries de Worker;
- volume/carga;
- binding e permissões reais.

Nenhum destes testes justifica criar recursos Cloudflare antes da activação aprovada.

A indisponibilidade total do Growth Engine deve continuar sem afectar site, Oráculo, checkout, produtos ou ebooks.
