# SOS Maison JF® · Provisioning Gate

Este ficheiro descreve o que falta **fora do código** antes de qualquer activação pública. Não contém credenciais.

## 1. Supabase Auth

O projecto dedicado de autenticação SOS está provisionado numa região da União Europeia.

Configuração mínima:
- email magic link/OTP;
- redirect URLs apenas para origens MAISON autorizadas;
- rate limits e protecção anti-abuso do fornecedor;
- estado SOS permanece em D1; Supabase é apenas a fronteira de identidade;
- nome, metadata e restantes campos do perfil não são copiados para D1.

Variáveis de runtime:
- `MAISON_SOS_AUTH_ENABLED`
- `MAISON_SOS_SUPABASE_URL`
- `MAISON_SOS_SUPABASE_PUBLISHABLE_KEY`

O adapter falha fechado se o gate/configuração estiver indisponível.

## 2. D1 operacional

Base dedicada: `maison-sos-operational`, binding `MAISON_SOS_DB`, schema `SOS.OP.2`.

Migrations:
1. `migrations/0001_operational_core.sql`
2. `migrations/0002_user_delivery.sql`

Secrets obrigatórios:
- `MAISON_SOS_SUBJECT_PEPPER` — mínimo 32 caracteres aleatórios;
- `MAISON_SOS_DATA_KEY_B64` — exactamente 32 bytes aleatórios em Base64.

A chave AES não pode ser reutilizada como pepper, token ou chave de outro sistema. Preview e Production devem ter isolamento adequado antes de dados reais.

## 3. Resend Transactional Email

Fornecedor seleccionado: Resend. Remetente dedicado: `sos@maison-jf.com`.

Configuração:
- domínio/remetente verificado;
- API key apenas como secret;
- tracking reduzido ao necessário;
- política de retenção coerente com a privacidade MAISON.

Variáveis:
- `MAISON_SOS_RESEND_ENABLED`
- `MAISON_SOS_RESEND_API_KEY`
- `MAISON_SOS_RESEND_SENDER_EMAIL`
- `MAISON_SOS_PUBLIC_URL=https://maison-jf.com`
- `MAISON_SOS_MAX_ACTIONS_PER_TICK=20`
- `MAISON_SOS_SCHEDULER_ENABLED` — só depois do E2E controlado.

## 4. Gates de activação

As rotas `/api/sos/*` já existem e são fail-closed. A existência das rotas não autoriza uso público.

Antes de piloto com dados reais:
- validação server-side Supabase E2E confirmada;
- D1 e crypto isolados adequadamente entre ambientes;
- secrets apenas fora do repositório;
- primeiro envio Resend controlado validado;
- token de convite enviado server-side e nunca devolvido ao browser do utilizador;
- scheduler/outbox, retry, duplicação e DST validados;
- página de aceitação mantém aviso de que SOS Maison JF não é serviço de emergência;
- política de privacidade SOS publicada.

## 5. Ordem de activação

1. testes locais e test doubles;
2. um E2E externo controlado que concentre as validações necessárias;
3. piloto humano reduzido;
4. revisão de falhas/falsos avisos;
5. só depois, exposição pública mediante autorização explícita.

Para preservar quotas gratuitas, não repetir chamadas externas quando guards/test doubles conseguem validar a mesma propriedade.

Nenhum provisioning ou merge autoriza produção pública.
