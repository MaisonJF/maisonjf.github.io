# MAISON JF® — Receção operacional B2B (produção)

## Contrato
O formulário de `/profissionais/` faz `POST /api/b2b-lead` com `type:"b2b_application"` e `data` contendo nome, empresa, email, atividade, objetivo, mensagem e consentimento explícito. O endpoint responde `201`, `ok:true`, `stored:true` **apenas se a escrita D1 tiver sido confirmada**. Falhas devolvem 4xx/503 e nunca são anunciadas como sucesso.

O contrato de telemetria anterior `event_type:"b2b.lead"` continua separado, sem nomes, emails, telefones ou mensagens. Nunca enviar dados pessoais para `events`.

## Onde estão os pedidos
Utiliza a ligação D1 **`MAISON_BRAIN_DB`** de Cloudflare Pages Production. A tabela `b2b_inquiries` é criada quando chega a primeira candidatura válida (sem segunda base de dados nem webhook externo).

SQL de consulta, **apenas no painel autorizado da Cloudflare D1**, nunca numa API pública:

```sql
SELECT created_at, full_name, company, email, business_type, goal, message, status
FROM b2b_inquiries
WHERE status='new' AND expires_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
ORDER BY created_at DESC LIMIT 100;
```

Para registar contacto humano:

```sql
UPDATE b2b_inquiries SET status='reviewed'
WHERE inquiry_id = 'REFERENCIA_CONFIRMADA';
```

Para apagar um pedido específico, incluindo exercício de direitos:

```sql
DELETE FROM b2b_inquiries WHERE inquiry_id = 'REFERENCIA_CONFIRMADA';
```

## Proteção e retenção
- A tabela contém dados pessoais de contacto e exige acesso restrito ao D1 e finalidade comercial limitada; não publicar exports ou logs.
- A submissão inclui consentimento obrigatório, limites de caracteres e campo anti-spam invisível. Não equivale a um CAPTCHA ou WAF; ativar políticas anti-abuso na Cloudflare se necessário.
- Cada candidatura executa uma eliminação automática de registos com mais de 90 dias. **Esta limpeza por escrita não substitui um processo programado diário** se o objetivo for garantir eliminação no prazo mesmo em períodos sem novos pedidos.
- Para garantir o limite máximo de 90 dias, executar diariamente a instrução abaixo por um mecanismo administrativo autorizado (agendamento de D1 ainda não foi configurado):

```sql
DELETE FROM b2b_inquiries WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
```

- O registo **não envia automaticamente um email ao proprietário**: consultar o painel D1 ou configurar um serviço de notificações numa revisão futura. Não alegar o contrário.
- Não apagar, migrar ou inserir dados de produção com testes sintéticos; testar contrato com mock D1 e validar o binding em preview/produção com autorização.

## Revisão de segurança pré-publicação
Conferir que o binding `MAISON_BRAIN_DB` em Production tem acesso D1 de escrita, que a tabela está restrita e que a política de privacidade descreve finalidade, retenção, direitos e contacto. Assegurar processo diário de eliminação para que a afirmação de 90 dias seja plenamente verdadeira.
