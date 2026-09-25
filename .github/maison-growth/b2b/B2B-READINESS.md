# MAISON JF® — B2B Readiness

Status: **rio B2B estruturado; execução comercial humana; sem CRM, Brain ou telemetria paralelos**.

## 1. Superfícies públicas existentes

- `/profissionais/` — entrada B2B;
- `/profissionais/teste/` — diagnóstico gratuito profissional;
- páginas profissionais de revenda, bem-estar, aromas, alojamento e diferenciação;
- `/contacto/?interesse=b2b` — contacto profissional;
- `/contacto/?interesse=b2b-presentes` — gifting;
- `/contacto/?interesse=b2b-formacao` — workshop/formação em modo piloto.

O diagnóstico preserva apenas contexto categórico não identificável (negócio, objectivo, gap, modelo, escala, resultado) durante a navegação e entrega-o ao contacto. Não coloca nome, email, telefone, mensagem livre ou dados de saúde no URL.

## 2. Matriz de oferta

### Activo por orçamento
- revenda curada;
- boas-vindas & hospitalidade;
- assinatura sensorial / experiência.

### Proposta manual
- gifting;
- pequenas séries e projectos especiais.

### Piloto por conversa
- workshop curto para equipas, não-clínico.

### Investigação
- formação profissional MAISON;
- ferramentas profissionais;
- produtos digitais profissionais.

### Futuro, só após validação
- rede profissional licenciada / certificação privada de marca;
- qualquer modelo territorial semelhante a franchising.

A fonte canónica dos estados é `functions/_lib/b2b-offer-brain.js`.

## 3. Regra de procura

Um problema de mercado, dimensão de sector ou obrigação de formação **não prova procura pagante pela MAISON**.

Estados separados:
- `active_quote` — formato já suportado por activos/superfície actual e negociado caso a caso;
- `manual_proposal` — proposta possível, mas não normalizada;
- `pilot_by_conversation` — só se valida em pequeno piloto;
- `research_validation` — não existe oferta pública;
- `future_validation` — não promover nem comercializar.

## 4. Evidência actual

### Hospitalidade
Turismo de Portugal reporta 32,5 milhões de hóspedes e 82,1 milhões de dormidas em Portugal em 2025.
TravelBI/INE reporta 5,1 milhões de hóspedes e 12,1 milhões de dormidas em alojamento local com mais de 10 camas em 2025.

Fontes:
- https://www.turismodeportugal.pt/en/Turismo_Portugal/visao_geral/Pages/default.aspx
- https://travelbi.turismodeportugal.pt/en/accommodation/short-term-accommodation-2025/

Leitura permitida: sector activo e relevante para pilotos de experiência/hospitalidade.
Leitura proibida: afirmar que hotéis/alojamentos querem comprar MAISON sem teste real.

### Equipas / formação
EU-OSHA, OSH Pulse 2025: 29% dos trabalhadores da UE reportam stress, depressão ou ansiedade; mais de 40% reportam forte pressão de tempo e quase 30% má comunicação ou cooperação.
DGERT: formação contínua visa aprofundar competências profissionais e relacionais; o Código do Trabalho estabelece um mínimo anual de 40 horas de formação contínua por trabalhador.

Fontes:
- https://osha.europa.eu/en/highlights/world-mental-health-day-29-eu-workers-suffer-stress-depression-or-anxiety
- https://www.dgert.gov.pt/tipologias-de-formacao-profissional

Leitura permitida: existe um problema organizacional real e enquadramento de formação que justificam investigação/pilotos.
Leitura proibida: apresentar a MAISON como prestador clínico, entidade certificada DGERT ou assumir procura pagante sem validação.

## 5. Pilotos B2B

O rio reutiliza o planeador e dossier manual já existentes no Brain.

Um piloto B2B precisa de:
- perfil exacto do cliente/parceiro;
- hipótese e âmbito;
- activos existentes ou decisão humana explícita de nova oferta;
- capacidade;
- custo;
- preço/regra de orçamento;
- prazo de entrega;
- aprovação humana antes de outreach.

Sinais de sucesso já definidos pelo Brain:
- pedido de reunião/orçamento;
- encomenda paga;
- margem observada positiva;
- sinal de recorrência.

Sinais de paragem:
- capacidade insuficiente;
- margem desconhecida/negativa;
- personalização inviável;
- ausência de acesso ao decisor.

## 6. Recorrência

Suportada agora:
- reposição;
- projecto repetido;
- ocasião;
- sazonalidade.

Piloto:
- repetição de workshop.

Ainda não validada:
- cohorts;
- renovação de licença;
- licença/update digital;
- subscrição;
- certificação periódica.

Regra: **recorrência nasce de comportamento observado; não se inventa uma subscrição só para criar receita recorrente.**

## 7. Leads e Brain

Contrato canónico já existente: `b2b.lead`.

O rio B2B agora produz um contexto de intenção não-PII coerente no percurso público e mantém o contrato dentro do Knowledge Graph.

Limite actual deliberado:
- `contact_whatsapp_click` continua a ser medição de interface;
- a persistência canónica de `b2b.lead` pertence à telemetria/commerce central;
- não criar um endpoint, CRM ou base B2B paralela neste rio.

Quando a camada central aceitar o evento, deve reutilizar os campos permitidos definidos em `MAISON_B2B_BRAIN.leadContract`.

## 8. Formação e rede profissional

Workshop-piloto é a única superfície pública nova nesta fase.

Formação estruturada, certificação privada MAISON, facilitadores e formadores licenciados continuam internos até validar:
- procura;
- currículo;
- competência de entrega;
- capacidade;
- qualidade;
- enquadramento jurídico;
- economia do modelo.

A MAISON mantém a autoridade de certificação e não permite sublicença por defeito.

## 9. Definition of Done do rio

O B2B pode ser considerado estruturalmente fechado quando:
- Knowledge Graph e B2B usam o mesmo contrato;
- diagnóstico cobre negócio e organização sem enviesar resultados;
- contexto chega ao contacto;
- cada família de oferta tem estado e limites;
- recorrência não é inventada;
- pilotos reutilizam o Brain existente;
- investigação tem evidência e claim limits;
- formação/rede não são vendidas como oficiais antes de validação;
- qualquer futura ingestão de `b2b.lead` reutiliza telemetria central;
- CI impede regressão destes contratos.


## 10. Operação de lead → piloto

A checklist operacional está em:
`.github/maison-growth/b2b/B2B-PILOT-CHECKLIST.md`

Ela reutiliza o `commercial-service-capacity.template.json`, o `manual-pilot-context.schema.json` e o dossier manual já existentes no Brain. Não cria CRM, pipeline ou base de dados paralelos.
