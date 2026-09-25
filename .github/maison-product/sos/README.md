# RIO PRODUTO DIGITAL · SOS Maison JF®

## Estado desta fundação

**Fase:** fundação técnica e de produto, sem runtime de produção activado.

A auditoria de `main` encontrou:

- o conceito **SOS Maison JF** já validado nos Oceans como linguagem de *check-in + contacto de confiança*, sem promessa de emergência;
- um **Maison Brain / Knowledge Graph canónico** já existente;
- o envelope de eventos A1 e o registo de fontes A2 já existentes, com política **deny by default** e proibição de PII directa;
- nenhum runtime/aplicação SOS dedicado, nenhuma máquina de estados SOS e nenhum contrato específico para separar dados operacionais de sinais seguros para o Brain.

Por isso esta fundação **não cria um cérebro, um collector nem uma telemetria paralelos**. Reutiliza A1/A2 como única fronteira futura para sinais derivados.

## Princípio do produto

**KISS + Apple.**

A função nuclear é uma só:

> **ESTOU AQUI**

O produto não tenta interpretar a vida da pessoa. Não pergunta porquê. Não pede confissões. Não classifica emoções. Não transforma silêncio em diagnóstico.

O valor é operacional: a pessoa combina um ritmo de check-in; recebe um lembrete; se não confirmar dentro da margem definida, um contacto de confiança previamente verificado recebe um aviso factual.

## MVP de experiência

### Configuração inicial

No máximo três decisões visíveis:

1. **Quando queres fazer o check-in?** — primeira versão: cadência diária; o motor suporta a cadência como contrato, mas a interface não deve expor combinações desnecessárias.
2. **Quem é o teu contacto de confiança?** — um contacto no MVP.
3. **Confirmação do contacto** — o aviso a terceiros só fica activo depois de esse contacto aceitar explicitamente o papel.

Depois disso, a aplicação abre sempre no ecrã principal.

### Ecrã principal

Hierarquia visual:

1. estado curto e inequívoco;
2. próxima hora/data esperada;
3. botão principal grande **ESTOU AQUI**;
4. acções secundárias discretas: pausar e definições.

Sem feed. Sem gamificação. Sem streaks. Sem culpa.

### Fluxo de incumprimento

`check-in esperado` → `lembrete ao utilizador` → `margem de segurança` → `aviso ao contacto verificado`.

O aviso ao contacto deve dizer apenas que **o check-in combinado não foi confirmado**. Não deve afirmar que a pessoa está em perigo, inconsciente, desaparecida ou em emergência.

### Estados humanos

- **Configurar** — falta uma condição essencial.
- **Tudo certo** — o próximo check-in ainda não é devido.
- **Está na hora** — o check-in é devido.
- **Atrasado** — a pessoa foi lembrada e está dentro da margem de segurança.
- **Aviso devido/enviado** — a margem terminou e o contacto verificado pode/deve ser notificado.
- **Pausado** — nenhum aviso é emitido até reactivação.

A interface pode condensar estes estados; o motor mantém-nos explícitos para segurança e testes.

## Limites de segurança

O SOS Maison JF® **não é um serviço de emergência**, não substitui 112/serviços locais, profissionais de saúde, forças de segurança, apoio de crise ou acompanhamento presencial.

MVP proibido:

- localização/GPS;
- gravação de áudio ou vídeo;
- leitura de sensores do telefone para inferir estado;
- texto livre sobre o motivo do check-in;
- perguntas emocionais ou clínicas;
- IA a decidir se alguém “está bem”;
- múltiplas árvores de escalada;
- contacto de confiança não verificado;
- avisos repetidos para o mesmo prazo sem idempotência;
- qualquer linguagem que prometa resgate, vigilância ou detecção de emergência.

## Privacidade por arquitectura

Existem dois domínios deliberadamente separados.

### 1. Domínio operacional privado

Pode conter apenas o necessário para o produto funcionar:

- referência interna da conta;
- timezone e configuração do check-in;
- referência/endpoint do contacto de confiança, cifrado em repouso;
- estado e prova de consentimento/verificação do contacto;
- prazo actual, lembrete e recibos técnicos de entrega;
- estado de pausa/eliminação.

Estes dados **não alimentam o Brain**.

### 2. Projecção agregada para MAISON Brain

Só pode atravessar a fronteira A1/A2:

- `product_id`;
- tipo de sinal agregado;
- balde de cadência;
- resultado técnico de entrega;
- versão de produto;
- contador.

Nunca atravessam:

- nome;
- email/telefone;
- IDs de conta/contacto;
- hora exacta habitual de check-in;
- localização;
- histórico individual;
- motivo;
- mensagem;
- confissão;
- qualquer texto livre.

## Acessibilidade

Objectivo mínimo: WCAG 2.2 AA.

- botão principal com alvo táctil generoso;
- funcionamento completo com teclado;
- foco visível;
- estados anunciados por leitor de ecrã;
- não depender apenas de cor;
- contraste suficiente;
- respeito por `prefers-reduced-motion`;
- linguagem curta e literal;
- acções críticas sem gesto oculto.

## Arquitectura de execução futura

A fundação actual é deliberadamente **provider-agnostic**.

1. UI envia `ESTOU AQUI` para API autenticada.
2. API grava confirmação no domínio operacional.
3. scheduler/durable runner avalia prazos de forma idempotente.
4. adapter de mensagens envia lembrete/aviso.
5. receipts actualizam apenas estado operacional.
6. agregador produz contadores sanitizados.
7. esses contadores entram no collector canónico A1/A2 como `source=sos_product`.

Nenhum fornecedor de SMS/email/push é escolhido nesta fase; isso seria uma decisão de runtime/custo e não é necessário para validar a fundação.

## Ficheiros desta fundação

- `product-contract.json` — invariantes do produto e limites de activação.
- `operational-data-contract.json` — separação e minimização dos dados necessários.
- `brain-signal-contract.json` — fronteira exacta de convergência com o Brain.
- `functions/_lib/sos-maison-core.js` — máquina de estados e decisões puras, sem efeitos externos.
- `validate_sos.mjs` — testes determinísticos da fundação.

## Próximos incrementos permitidos

Depois desta fundação passar CI, o RIO PRODUTO DIGITAL pode construir, nesta ordem:

1. API operacional com armazenamento cifrado e autenticação;
2. convite/aceitação do contacto de confiança;
3. scheduler idempotente;
4. adapter de notificação;
5. UI/PWA mínima;
6. testes de falha, duplicação, timezone/DST e recuperação;
7. activação controlada em ambiente de teste.

A monetização pode envolver este produto no futuro, mas **preço, checkout e Stripe não pertencem a esta fundação**.
