# Política permanente de preços do mercado digital brasileiro — MAISON JF®

**Estado:** regra comercial ativa  
**Aplicação:** novos produtos digitais, novas páginas localizadas e alterações futuras de checkout  
**Regra-base:** o preço brasileiro é para compras elegíveis no mercado brasileiro; não é um desconto obtido apenas por selecionar português do Brasil.

## Política comercial

1. **Preço local definido manualmente.** Cada produto elegível tem um preço BRL explícito, escolhido para o poder de compra e para a estratégia comercial brasileira. Não converter automaticamente o preço EUR através do câmbio. O preço só muda com uma decisão comercial explícita.
2. **Idioma não é elegibilidade.** URL `/pt-br/`, idioma do navegador e `locale: "pt-BR"` controlam apresentação e idioma. Não autorizam, por si sós, o preço brasileiro.
3. **Elegibilidade no servidor.** Antes de criar um Checkout em BRL, exigir a localização por país fornecida no servidor pela Cloudflare (`request.cf.country === "BR"`). Não confiar em campos do browser nem em cabeçalhos de país enviados pelo cliente. Se a informação não estiver disponível ou não indicar Brasil, bloquear o checkout em BRL.
4. **Morada de faturação pela Stripe.** Checkout de preço brasileiro deve exigir recolha de morada de faturação. Uma morada declarada no Brasil é um sinal adicional, não prova independente de residência.
5. **Validação antes da entrega.** Depois do pagamento, confirmar sessão Stripe de produção, estado pago, produto e idioma constantes dos metadados, país de faturação `BR`, moeda `brl` e valor exato calculado pelo catálogo do servidor. Só então libertar ebook, leitura, jogo ou outro conteúdo digital.
6. **Sem fallback silencioso.** Um pedido não elegível não pode receber o preço em reais por contornar o frontend. O cliente pode usar a página e o preço do mercado a que é elegível; não criar automaticamente um checkout BRL nem mudar o valor depois de iniciado.
7. **Uma única alteração comercial, todos os pontos coerentes.** Ao definir ou alterar um preço brasileiro, atualizar em conjunto o preço no checkout, catálogo, página pública localizada, dados estruturados e catálogo/Brain comercial; acrescentar testes de valor, moeda e elegibilidade.
8. **Compatibilidade de compras anteriores.** Sessões antigas podem ser validadas contra totais históricos explicitamente conhecidos. Esses totais servem apenas para validar sessões antigas, nunca para definir o preço de novas compras.
9. **Falhas após pagamento.** Se uma cobrança for concluída mas a validação de entrega falhar, não libertar o conteúdo de forma insegura; encaminhar o caso para revisão e resolução manual. Não prometer reembolso automático sem um fluxo de reembolso implementado e testado.
10. **Limites antifraude.** VPNs e moradas falsas podem contornar sinais isolados. A regra reduz o abuso, mas não garante prova absoluta de residência. Rever alertas e, se necessário, adicionar controlos de risco de pagamento.

## Regra de implementação e exceções

- Qualquer novo endpoint que crie sessões Stripe de checkout tem de usar `brazilMarketAccessResponse` se puder vender com preço localizado brasileiro.
- Qualquer novo endpoint que liberte conteúdo digital comprado tem de usar `brazilSessionEligibilityResponse` e validar também produto, sessão paga, moeda e valor exato.
- Um endpoint não abrangido tem de declarar uma exceção explícita no código com `BRAZIL_MARKET_EXEMPT:` ou `BRAZIL_MARKET_FULFILLMENT_EXEMPT:`, seguida de uma justificação concreta. Exceções atuais: checkout de produtos físicos (EUR + envio) e serviços/consultas que ainda usam preço EUR em todos os idiomas. Se esses preços passarem a BRL, a exceção deve ser removida e a verificação aplicada.
- A verificação automática `.github/maison-growth/validate_brazil_market.mjs` deve descobrir novos criadores de checkout e resolvers de sessão e falhar se surgir uma rota sem controlo nem exceção documentada.

## Preço de referência atual

- **Pára de Ignorar! · Livro:** Portugal **5,99 €**; Brasil **R$ 21,90**.
- Outros preços brasileiros permanecem os valores explicitamente registados no catálogo. Um produto novo só recebe preço BRL depois de haver decisão comercial própria e atualização de todos os pontos acima.

Esta política é a referência permanente para decisões futuras do Brain/Oceans, catálogo, páginas localizadas e desenvolvimento do checkout da MAISON JF®.
