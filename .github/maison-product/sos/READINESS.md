# SOS Maison JF® · Readiness Board

Estado do RIO PRODUTO DIGITAL no PR #151.

| Camada | Estado | Nota |
|---|---|---|
| Princípio KISS + **ESTOU AQUI** | ✅ Pronto | Sem questionários, feed, gamificação ou inferência emocional |
| Máquina de estados | ✅ Pronto | setup / safe / due / grace / contact_due / paused |
| Hora diária fixa + timezone/DST | ✅ Pronto | Hora humana não deriva com o momento do toque |
| D1 operacional separado do Brain | ✅ Código pronto | Falta criar recurso e aplicar migrations |
| Pseudonimização da identidade | ✅ Pronto | HMAC; subject bruto não é persistido |
| Cifra de endpoints | ✅ Pronto | AES-256-GCM; chave apenas em secret |
| Contacto de confiança | ✅ Pronto | Um contacto; convite com hash; aceitar/recusar explícito |
| Página de consentimento do contacto | ✅ Pronto | Sem analytics; token em fragmento e removido da URL |
| Supabase Auth adapter | ✅ Código pronto / 🔒 desligado | Falta projecto UE/configuração |
| Brevo transactional adapter | ✅ Código pronto / 🔒 desligado | Falta domínio/remetente/chave |
| API `/api/sos/*` | ✅ Código pronto / 🔒 fail-closed | Kill switch `MAISON_SOS_API_ENABLED` |
| **ESTOU AQUI** idempotente | ✅ Pronto | Header `Idempotency-Key` obrigatório |
| Pause / resume / delete | ✅ Pronto | Pause cancela pendentes; delete faz cascade operacional |
| Outbox + retry | ✅ Pronto | Lease + retry limitado; sem loops infinitos |
| Scheduler Worker | ✅ Código pronto / 🔒 desligado | Sem endpoint HTTP público; falta binding/deploy |
| Regra anti-falso-alarme | ✅ Pronto | Falha definitiva do lembrete impede aviso ao contacto |
| Projecção diária agregada | ✅ Pronto | Sem IDs, PII, texto ou horários exactos |
| Compatibilidade com collector A2 | ✅ Testada | A2 aceita agregado e rejeita PII/IDs não allowlisted |
| Ingestão A2 live | ⏳ Dependência externa | Espera activação do runtime A2 canónico |
| UI/PWA principal | ✅ Shell fail-closed criado | `/sos/` implementa experiência nuclear e permanece inactivo até integração/activação Auth |
| E2E com emails reais controlados | ⏳ Próximo | Só após D1 + Auth + Brevo |
| Política pública de privacidade SOS | ⏳ Antes do piloto real | Necessária antes de recolher dados reais |
| Piloto fechado | ⏳ Depois do E2E | Rever falhas e falsos avisos |
| Produção pública | 🔒 Não autorizada | Exige revisão explícita |

## Kill switches

O código não se torna produto activo por estar merged.

- `MAISON_SOS_API_ENABLED`
- `MAISON_SOS_AUTH_ENABLED`
- `MAISON_SOS_BREVO_ENABLED`
- `MAISON_SOS_SCHEDULER_ENABLED`

Todos têm de ser tratados como **false por defeito**.

## Bloqueio actual

O próximo salto já não é uma decisão de arquitectura. É provisioning externo:

1. projecto Supabase em região UE;
2. D1 operacional dedicado;
3. domínio/remetente Brevo verificado;
4. secrets/bindings;
5. teste fechado.

Até isso existir, a UI principal não deve fingir que o SOS está operacional.
