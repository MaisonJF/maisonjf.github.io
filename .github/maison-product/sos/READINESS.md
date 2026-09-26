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
| Supabase Auth adapter | 🟡 Provisionado / diagnóstico E2E pendente | Projecto UE criado; Preview chega ao fluxo autenticado, mas validação server-side `/status` ainda requer diagnóstico final |
| Brevo transactional adapter | ✅ Código pronto / 🔒 desligado | Falta domínio/remetente/chave |
| API `/api/sos/*` | 🟡 Preview activado / fail-closed | Kill switch `MAISON_SOS_API_ENABLED`; `/status` autenticado ainda em diagnóstico |
| **ESTOU AQUI** idempotente | ✅ Pronto | Header `Idempotency-Key` obrigatório |
| Pause / resume / delete | ✅ Pronto | Pause cancela pendentes; delete faz cascade operacional |
| Outbox + retry | ✅ Pronto | Lease + retry limitado; sem loops infinitos |
| Scheduler Worker | ✅ Código pronto / 🔒 desligado | Sem endpoint HTTP público; manter desligado até Brevo + E2E controlado |
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

A fundação externa já avançou: Supabase UE e D1 dedicado estão provisionados. O caminho restante para piloto é:

1. fechar o diagnóstico E2E da validação server-side Supabase no Preview;
2. resolver o isolamento criptográfico/D1 entre Preview e Production antes de gravar dados reais;
3. provisionar domínio/remetente/chave Brevo;
4. executar testes controlados de scheduler/outbox, DST, retry e duplicação;
5. publicar política de privacidade SOS;
6. executar piloto fechado e rever falhas/falsos avisos.

Até estes gates passarem, Brevo e scheduler permanecem desligados e a UI não deve declarar o SOS operacional.


<!-- closed-test redeploy trigger: auth diagnostics -->
