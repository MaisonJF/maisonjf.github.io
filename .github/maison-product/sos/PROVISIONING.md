# SOS Maison JF® · Provisioning Gate

Este ficheiro descreve o que falta **fora do código** antes de qualquer activação pública. Não contém credenciais.

## 1. Supabase Auth

Criar um projecto dedicado à autenticação SOS numa **região específica da União Europeia**.

Configuração mínima:

- activar um método de entrada simples; email magic link/OTP é o primeiro candidato;
- usar signing keys compatíveis com a configuração suportada pelo fornecedor;
- configurar os redirect URLs apenas para origens MAISON autorizadas;
- aplicar rate limits e protecção anti-abuso do próprio Auth;
- não criar tabelas de aplicação no Supabase: o estado SOS continua em D1;
- a MAISON não copia nome, metadata ou outros campos do perfil para o D1.

Variáveis futuras no runtime:

- `MAISON_SOS_AUTH_ENABLED=true`
- `MAISON_SOS_SUPABASE_URL`
- `MAISON_SOS_SUPABASE_PUBLISHABLE_KEY`

O adapter falha fechado enquanto o gate estiver desligado.

## 2. D1 operacional

Criar uma base D1 exclusiva para o produto SOS e bindá-la como:

`MAISON_SOS_DB`

Aplicar, por ordem:

1. `migrations/0001_operational_core.sql`
2. `migrations/0002_user_delivery.sql`

Secrets obrigatórios:

- `MAISON_SOS_SUBJECT_PEPPER` — pelo menos 32 caracteres aleatórios;
- `MAISON_SOS_DATA_KEY_B64` — exactamente 32 bytes aleatórios codificados em Base64.

A chave AES não pode ser reutilizada como pepper, token ou chave de outro sistema.

## 3. Brevo Transactional Email

Verificar um remetente do domínio MAISON, preferencialmente dedicado ao produto, por exemplo:

`sos@maison-jf.com`

Configurar:

- autenticação do domínio (SPF/DKIM conforme instruções do fornecedor);
- chave apenas com o âmbito necessário a email transaccional;
- limites/budget operacional;
- tracking reduzido ao estritamente necessário;
- política de retenção coerente com privacidade MAISON.

Variáveis:

- `MAISON_SOS_BREVO_ENABLED=true`
- `MAISON_SOS_BREVO_API_KEY`
- `MAISON_SOS_BREVO_SENDER_EMAIL`
- `MAISON_SOS_PUBLIC_URL=https://maison-jf.com`

O adapter continua desligado até remetente, domínio e mensagens estarem testados.

## 4. Gates antes de criar rotas públicas

Só criar/activar `/api/sos/*` quando todos forem verdadeiros:

- Supabase Auth funcional e validado;
- D1 criado e migrations aplicadas;
- secrets instalados fora do repositório;
- Brevo sender verificado;
- fluxo de convite consegue enviar o token directamente ao contacto;
- o browser do utilizador **nunca recebe o token de aceitação do contacto**;
- scheduler/outbox testado com relógio controlado;
- retry e duplicação testados;
- página de aceitação explica claramente que SOS Maison JF não é emergência;
- política de privacidade pública actualizada antes da recolha real de dados.

## 5. Ordem de activação

1. local/test doubles;
2. ambiente fechado com endereços de teste;
3. piloto humano reduzido;
4. revisão de falhas e falsos avisos;
5. só depois, exposição pública.

Nenhum passo de provisioning autoriza merge automaticamente.
