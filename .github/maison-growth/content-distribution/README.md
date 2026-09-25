# RIO CONTEÚDO · DISTRIBUIÇÃO

Camada interna e derivada da MAISON JF® para transformar inteligência já validada em peças de conteúdo distribuíveis, sem criar um segundo Brain e sem publicar automaticamente.

## Regra de propriedade

O Brain continua a ser a origem da inteligência. Este rio recebe apenas referências canónicas e o mínimo de contexto humano necessário para produzir um brief.

Um brief de conteúdo é **derivado e descartável**. Não é uma nova base de conhecimento, não substitui Oceans, A1/A13, A5, A7, A11, A12 ou A14 e não pode tornar-se fonte canónica de verdade.

Fluxo:

`Brain / oportunidade validada → brief de conteúdo → copy + revisão humana → distribuição manual → métricas agregadas → A2 collector → A1 event envelope → handoff ao Brain / A11`

## O que este rio cobre

- Reels / Shorts / TikTok;
- Stories;
- posts e carrosséis;
- páginas editoriais;
- hooks e ângulos;
- intenção e CTA;
- reutilização da mesma ideia em novas superfícies;
- calendário de distribuição manual;
- normalização de métricas;
- feedback de desempenho ao Brain.

## O que não cobre

- descoberta de novos Oceans;
- preços, checkout ou pagamentos;
- SEO técnico;
- arquitectura central do Brain;
- envio automático para redes sociais;
- publicação automática no site;
- contacto/outreach automático;
- criação de um CRM ou datastore de inteligência paralelo.

## Voz pública

A fonte canónica de voz é `functions/_lib/maison-content-ontology.js`.

Princípio já existente no repositório:

> João escreve. Brain pensa. MAISON fala.

Este rio acrescenta estrutura, não uma voz concorrente.

Em público:
- português europeu natural;
- uma ideia humana de cada vez;
- situações concretas e reconhecíveis;
- directo, elegante e inesperado quando isso ajuda;
- sem linguagem de sistema, consultoria, manual de psicologia ou IA;
- sem travessão longo ou médio como vício;
- sem falsa intimidade, diagnóstico, urgência, escassez ou certeza.

## Sistema de conteúdo

Cada brief tem:

1. **origem** — `source_refs` canónicos;
2. **eixo** — Casa, Corpo, Cabeça ou transversal;
3. **intenção** — reconhecer, tensionar, reenquadrar, ensinar, mover ou converter;
4. **uma tensão humana** — curta, legível, sem copiar a base de inteligência;
5. **formato primário**;
6. **família de hooks** a escrever;
7. **estrutura narrativa mínima**;
8. **CTA**;
9. **plano de reutilização**;
10. **gate editorial humano**;
11. **contrato de feedback**.

O planeador nunca inventa automaticamente a “voz do João”. Ele cria o esqueleto editorial e os requisitos da peça.

## Content Operating System

O `operating_system.py` organiza uma oportunidade editorial já validada sem se tornar uma nova fonte de inteligência.

### Campanha e coorte

Uma campanha é um **contentor de execução derivado** em torno de uma única tensão humana validada. Não é uma base de conhecimento.

A sequência-base pode criar até cinco papéis editoriais:

- **recognise** — fazer a pessoa reconhecer-se;
- **cost_of_ignoring** — tornar visível o custo de continuar a ignorar;
- **reframe** — oferecer uma leitura nova sem fabricar certeza;
- **movement** — propor um gesto ou próximo passo;
- **commercial_bridge** — ligar a um destino MAISON já aprovado, quando existe.

Cada peça continua a exigir revisão humana própria. A campanha não concede publicação, scheduling ou aprovação em bloco.

### Comparações editoriais

O sistema pode preparar comparações de:

- `hook_family`;
- `format`;
- `cta_kind`.

A regra é simples: **muda uma variável de cada vez**.

Estas comparações são observacionais, porque a distribuição continua manual e não existe randomização controlada neste rio. Por isso o sistema pode dizer que uma variante teve um sinal observado mais forte numa métrica declarada previamente, mas não pode afirmar causalidade, eleger automaticamente um vencedor ou promover conteúdo sozinho.

Mudanças de destino comercial de CTA continuam a pertencer ao A8. Este rio não usa uma comparação editorial para contornar o Experiment Manager.

### Cadência

A cadência nasce de slots explícitos. O Content OS pode ligar peças já aprovadas a datas e canais, mas:

- não publica;
- não agenda APIs externas;
- não aceita a mesma peça no mesmo canal e dia duas vezes;
- não transforma frequência em regra de inteligência;
- não aprova conteúdo por pertença a uma campanha.

### Aprendizagem por desempenho

Cada observação pode transportar lineage opcional:

`campaign_id → thesis_id → comparison_id → comparison_dimension → variant_key`

Isto permite ao Brain distinguir desempenho da ideia, do formato e da execução sem copiar para A1 a inteligência canónica que originou a campanha.

## Formatos

### short_video

Superfícies: Instagram Reels, YouTube Shorts, TikTok.

Estrutura-base:
- hook;
- reconhecimento;
- viragem;
- movimento;
- CTA.

### story_sequence

Superfície: Instagram Stories.

Estrutura-base:
- cena;
- espelho;
- tensão;
- gesto;
- CTA opcional.

### carousel_post

Superfície principal: Instagram feed.

Estrutura-base:
- capa;
- reconhecimento;
- desenvolvimento;
- viragem;
- movimento;
- CTA.

### editorial_page

Superfície: site MAISON.

Estrutura-base:
- abertura;
- reconhecimento;
- aprofundamento;
- reenquadramento;
- gesto possível;
- CTA contextual.

## Hook families

O sistema não escreve frases feitas. Pede ao autor uma destas operações:

- **recognition** — abrir com uma situação que a pessoa reconhece imediatamente;
- **pattern_break** — contrariar uma leitura comum sem fabricar choque;
- **cost_of_ignoring** — mostrar o custo real de continuar a ignorar;
- **specific_moment** — entrar por um momento concreto, não por uma teoria;
- **desire** — começar pelo que a pessoa quer sentir/recuperar, não pela categoria do produto.

## CTA

O CTA segue a intenção da peça.

Pode pedir:
- guardar;
- partilhar;
- responder;
- continuar a pensar;
- visitar um destino MAISON já existente e aprovado.

Um CTA comercial exige `approved_destination_ref`. O rio não cria ofertas, preços ou promessas.

## Reutilização

Reutilizar não significa copiar e colar.

Cada ideia tem:
- uma peça primária;
- derivados com a mesma tese;
- nova entrada, ritmo e densidade por superfície;
- lineage por `source_content_id`.

A aprendizagem pode assim distinguir “ideia” de “execução de formato”.

## Calendário

O planeador de calendário aceita apenas peças em `approved_for_manual_distribution` e com `human_review_ref`.

O resultado é um plano. Não chama APIs de redes sociais, não agenda publicação e não faz POST externo.

## Aprendizagem

Métricas são agregadas e normalizadas sem criar um “score mágico”.

Podem entrar:
- impressões;
- alcance;
- visualizações/inícios;
- conclusões;
- tempo visto;
- guardados;
- partilhas;
- comentários;
- visitas de perfil;
- cliques;
- leads;
- conversões.

Taxas só são calculadas quando existe denominador observado. Zero desconhecido nunca é inventado. As taxas seguem em basis points inteiros para caberem no contrato do colector sem floats ambíguos.

O feedback é produzido como input A2 `content.performance_observed`. O A2 valida a fonte pela allowlist, aplica o contrato de privacidade e só depois produz o envelope A1 v2. O payload usa:
- privacidade `aggregated`;
- idempotência determinística por conteúdo/plataforma/janela;
- métricas inteiras observadas;
- taxas em basis points apenas quando existe denominador real;
- hash das referências canónicas de origem, em vez de replicar inteligência do Brain;
- referência da revisão humana.

O A11 actual não aceita `content` como `source_kind`. Este rio não altera esse contrato, porque isso pertence à arquitectura central de aprendizagem. O ficheiro `brain-feedback-handoff.json` descreve o handoff necessário sem criar datastore, regra de confiança ou motor de aprendizagem paralelo.

Receita e valor económico continuam a pertencer a A3. Este rio não transforma engagement em dinheiro por estimativa.

## Gates

Nenhum brief, calendário ou feedback concede:
- publicação automática;
- autorização outbound;
- spend;
- alteração de preço;
- alteração de checkout;
- alteração de catálogo;
- bypass de A12/A9.

Conteúdo público continua sujeito às gates existentes da MAISON.
