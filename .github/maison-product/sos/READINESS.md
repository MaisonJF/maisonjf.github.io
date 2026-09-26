# SOS Maison JF® · Readiness Board

Estado do RIO PRODUTO DIGITAL no PR #151.

| Camada | Estado | Nota |
|---|---|---|
| Princípio KISS + **ESTOU AQUI** | ✅ Pronto | Sem questionários, feed, gamificação ou inferência emocional |
| Máquina de estados | ✅ Pronto | setup / safe / due / grace / contact_due / paused |
| Hora diária fixa + timezone/DST | ✅ Pronto | Hora humana não deriva com o momento do toque |
| D1 operacional separado do Brain | ✅ Provisionado | `maison-sos-operational`; migrations aplicadas; schema `SOS.OP.2` |
| Pseudonimização da identidade | ✅ Pronto | HMAC; subject bruto não é persistido |
| Cifra de endpoints | ✅ Pronto | AES-256-GCM; chave apenas em secret |
| Contacto de confiança | ✅ Pronto | Um contacto; convite com hash; aceitar/recusar explícito |
| Página de consentimento do contacto | ✅ Pronto | Sem analytics; token em fragmento e removido da URL |
| Supabase Auth adapter | 🟢 Operador testou fluxo real | Testes reais já executados; não repetir apenas para satisfazer documentação. Cobertura automática mantém validação server-side e erros upstream |
| Resend transactional adapter | 🟢 Operador testou fluxo real / 🔒 gate controlado | Testes reais já executados; preservar quota. Domínio/remetente e adapter permanecem protegidos por gate |
| API `/api/sos/*` | 🟢 Testada / fail-closed | Testes reais já executados pelo operador; kill switch `MAISON_SOS_API_ENABLED` permanece |
| **ESTOU AQUI** idempotente | ✅ Pronto | Header `Idempotency-Key` obrigatório |
| Pause / resume / delete | ✅ Pronto | Pause cancela pendentes; delete faz cascade operacional |
| Outbox + retry | ✅ Pronto | Lease + retry limitado; sem loops infinitos |
| Scheduler Worker | ✅ Código pronto / 🔒 desligado | Sem endpoint HTTP público; manter desligado até Resend + E2E controlado |
| Regra anti-falso-alarme | ✅ Pronto | Falha definitiva do lembrete impede aviso ao contacto |
| Projecção diária agregada | ✅ Pronto | Sem IDs, PII, texto ou horários exactos |
| Compatibilidade com collector A2 | ✅ Testada | A2 aceita agregado e rejeita PII/IDs não allowlisted |
| Ingestão A2 live | ⏳ Dependência externa | Espera activação do runtime A2 canónico |
| UI/PWA principal | ✅ Shell fail-closed criado | `/sos/` implementa experiência nuclear e permanece inactivo até integração/activação Auth |
| E2E com emails reais controlados | 🟢 Já executado pelo operador | Não repetir sem motivo: quota gratuita é limitada; evidência detalhada não ficou preservada no repositório |
| Política pública de privacidade SOS | ✅ Preparada | Secção SOS adicionada à Informação Legal; publicar com este hardening antes do piloto |
| Piloto fechado | ⏳ Depois do E2E | Rever falhas e falsos avisos |
| Produção pública | 🔒 Não autorizada | Exige revisão explícita |

## Kill switches

O código não se torna produto activo por estar merged.

- `MAISON_SOS_API_ENABLED`
- `MAISON_SOS_AUTH_ENABLED`
- `MAISON_SOS_RESEND_ENABLED`
- `MAISON_SOS_SCHEDULER_ENABLED`

Todos têm de ser tratados como **false por defeito**.

## Estado operacional

O operador confirmou que já foram executados testes reais. Como a quota gratuita dos fornecedores é limitada, o produto **não exige repetição de E2E externos apenas para satisfazer documentação**.

O que resta antes de piloto/activação é operacional, não uma nova ronda de testes:

1. confirmar isolamento adequado de Preview/Production antes de novos dados reais;
2. manter os guards locais/CI como regressão contínua;
3. activar os gates necessários de forma deliberada para o piloto, sem tornar o produto público por acidente;
4. observar o piloto e corrigir apenas falhas concretas.

Scheduler e entrega externa só devem ser ligados no ambiente pretendido. Produção pública continua a exigir autorização explícita.


<!-- operator-confirmed real E2E already executed; preserve external free-tier quota -->
