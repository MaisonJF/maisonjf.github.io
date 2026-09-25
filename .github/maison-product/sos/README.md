# RIO PRODUTO DIGITAL · SOS Maison JF®

## Estado desta fundação

**Fase:** fundação de produto + runtime privado + API fail-closed + scheduler + projecção A2 prontos em código, sem runtime de produção activado.

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

## Núcleo operacional privado

O núcleo operacional está implementado e as rotas `/api/sos/*` já existem no repositório, mas permanecem **fail-closed**: sem `MAISON_SOS_API_ENABLED=true` comportam-se como indisponíveis e não há recursos externos provisionados.

- binding futuro dedicado: `MAISON_SOS_DB`;
- identidade externa obrigatoriamente verificada antes de entrar no produto;
- sujeito de autenticação transformado num `account_ref` estável por HMAC — o identificador bruto não é persistido;
- endpoint do contacto cifrado em repouso com AES-256-GCM;
- token de convite entregue uma única vez e persistido apenas como SHA-256;
- apenas um contacto de confiança activo por conta no MVP;
- aceitação do contacto activa a primeira janela diária;
- a rotina é ancorada numa hora local fixa (`HH:MM` + timezone IANA), não em “24 horas depois do último toque”;
- o próximo prazo é calculado no calendário local, preservando a hora humana através de DST;
- `ESTOU AQUI` exige chave de idempotência para resistir a retries da rede;
- scheduler escreve numa outbox; não envia directamente;
- um aviso ao contacto só pode ser criado depois do lembrete ao utilizador estar marcado como enviado;
- claims de entrega têm lease curto para recuperação depois de crash;
- substituir o contacto cancela janelas e avisos pendentes antes de iniciar nova verificação.

O armazenamento operacional fica **fisicamente separado do MAISON Brain**. Esta separação é uma fronteira de privacidade, não um novo cérebro.

## Arquitectura de execução

1. a futura UI autentica a pessoa no Supabase e chama as rotas SOS;
2. a API valida a sessão server-side e transforma o subject numa referência HMAC;
3. `/api/sos/setup` cifra o canal do utilizador, configura a hora local e envia o convite directamente ao contacto;
4. a página `/sos/aceitar/` permite **ACEITAR** ou **RECUSAR** explicitamente; o token viaja no fragmento `#token=` e é removido da barra antes do POST;
5. `/api/sos/checkin` executa **ESTOU AQUI** com chave de idempotência e mantém a hora local fixa;
6. o Worker agendado cria/reclama acções da outbox em lotes pequenos;
7. Brevo entrega lembretes/avisos; endpoints são decifrados apenas *just in time*;
8. falhas temporárias têm retry limitado; falha definitiva do lembrete bloqueia a escalada ao contacto;
9. uma projecção diária produz exclusivamente contagens agregadas;
10. esses envelopes são validados pelo collector canónico A2 como `source=sos_product`; o SOS não cria collector próprio.

Os adapters seleccionados para o primeiro MVP são **Supabase Auth** e **Brevo Transactional Email**. Ambos permanecem desligados por variáveis de ambiente. As rotas existem em código, mas o produto continua inactivo enquanto os gates e recursos de provisioning não forem configurados.

A validação de sessão consulta directamente o endpoint de utilizador do Supabase e descarta o perfil depois de extrair apenas o subject estável e, quando já confirmado pelo fornecedor, o email necessário ao lembrete. Esse email é imediatamente cifrado no domínio operacional.

O Brevo recebe apenas o endereço estritamente necessário à entrega e mensagens transaccionais em texto simples. O adapter não envia nomes de destinatário nem conteúdo pessoal da utilização do SOS.

## Ficheiros desta fundação

- `product-contract.json` — invariantes do produto e limites de activação.
- `operational-data-contract.json` — separação e minimização dos dados necessários.
- `brain-signal-contract.json` — fronteira exacta de convergência com o Brain.
- `functions/_lib/sos-maison-core.js` — máquina de estados humana, sem efeitos externos.
- `functions/_lib/sos-auth.js` — fronteira de identidade verificada + pseudonimização HMAC.
- `functions/_lib/sos-crypto.js` — cifra AES-GCM para campos operacionais sensíveis.
- `functions/_lib/sos-runtime.js` — configuração, convite, consentimento, check-in, pausa/retoma, eliminação e outbox.
- `functions/_lib/sos-time.js` — calendário diário por hora local fixa e timezone IANA, incluindo DST.
- `migrations/0001_operational_core.sql` — esquema D1 operacional separado do Brain.
- `runtime-contract.json` — bindings, secrets e gates necessários antes de qualquer activação.
- `adapters-contract.json` — contratos Supabase/Brevo e respectivos kill switches.
- `functions/_lib/sos-supabase-auth.js` — validação server-side da sessão sem persistir o perfil.
- `functions/_lib/sos-brevo.js` — email transaccional factual, sem nomes nem promessa de emergência.
- `functions/_lib/sos-delivery.js` — entrega da outbox com retry limitado.
- `api-contract.json` + `functions/api/sos/**` — API mínima fail-closed para setup, status, **ESTOU AQUI**, pausa, retoma, eliminação e consentimento do contacto.
- `sos/aceitar/` — superfície mínima e sem analytics para o contacto aceitar/recusar.
- `scheduler-contract.json` + `workers/sos-runtime/` — Worker agendado sem rota HTTP pública.
- `a2-projection-contract.json` + `sos-brain-projection.js` — contagens agregadas compatíveis com o collector A2 canónico.
- `validate_sos.mjs` — invariantes da primeira fundação.
- `validate_sos_runtime.mjs` + `validate_sos_schema.py` — segurança e integridade da segunda fundação.

## Próximos incrementos permitidos

Depois desta fundação passar CI, o RIO PRODUTO DIGITAL pode construir, nesta ordem:

1. provisionar o projecto Supabase numa região específica da UE e configurar Auth;
2. verificar o remetente/domínio no Brevo e criar a chave transaccional;
3. provisionar o D1 operacional `MAISON_SOS_DB` e aplicar as duas migrations;
4. instalar secrets e bindings sem os colocar no repositório;
5. integrar a UI/PWA principal **ESTOU AQUI** já criada com a sessão Supabase provisionada;
6. testar end-to-end convite → aceitação → lembrete → grace → aviso com endereços controlados;
7. actualizar a política pública de privacidade antes de recolher dados reais;
8. ligar a ingestão da projecção SOS apenas quando o runtime A2 canónico estiver activado;
9. iniciar um piloto humano fechado e rever falsos avisos/falhas antes de exposição pública.

A monetização pode envolver este produto no futuro, mas **preço, checkout e Stripe não pertencem a esta fundação**.
