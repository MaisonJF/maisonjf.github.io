# MAISON JF® — Primeira Versão Funcional

Homepage premium, responsive e pronta para deploy em Cloudflare Pages.

---

## Como testar localmente

### Opção 1: Abrir diretamente
Abre o ficheiro `index.html` no browser. Funciona sem servidor.

### Opção 2: Servidor local (recomendado)
```bash
# Python 3
python -m http.server 8000

# Node.js (se tiveres npx)
npx serve .

# PHP
php -S localhost:8000
```

Depois abre `http://localhost:8000`

---

## Como publicar em Cloudflare Pages

1. Cria um novo repositório no GitHub
2. Faz upload de todos os ficheiros desta pasta
3. Vai a [Cloudflare Pages](https://dash.cloudflare.com) → Pages → Create a project
4. Conecta o repositório GitHub
5. Framework preset: **None**
6. Build command: deixa vazio
7. Build output directory: `./` (raiz)
8. Deploy
9. Configura o domínio `maison-jf.com` quando estiveres pronto

---

## Onde editar as cores

Abre `css/styles.css` e edita as variáveis no início do ficheiro:

```css
:root {
  --noite: #0a0a0a;        /* Preto profundo */
  --marfim: #f5f0e8;       /* Marfim */
  --ambre: #c9a96e;        /* Âmbar principal */
  --dourado: #d4af37;      /* Dourado */
  --esmeralda: #1a4d3a;    /* Verde-esmeralda */
  --bordeaux: #4a1a2a;     /* Bordeaux */
  --violeta: #2a1a4a;      /* Violeta */
}
```

Todas as cores do site derivam destas variáveis.

---

## Onde editar o copy

### Hero (texto principal)
Ficheiro: `index.html` → secção `<section class="hero">`

### Farol — perguntas e opções
Ficheiro: `js/farol.js` → objeto `FAROL_DATA`

Estrutura:
```javascript
FAROL_DATA.step1    // Perguntas iniciais (6 + outro)
FAROL_DATA.results  // Resultados finais (combinações step1 + step2)
```

Para adicionar novas opções no Step 1:
1. Adiciona entrada em `FAROL_DATA.step1`
2. Cria as sub-opções em `options`
3. Cria os resultados em `FAROL_DATA.results` com a chave `"novaKey_subKey"`

### Secções do site
Todas as secções estão em `index.html` com comentários identificáveis:
- `<!-- HERO -->`
- `<!-- FAROL -->`
- `<!-- TRANSFORMAÇÕES -->`
- `<!-- EXPLORAR -->`
- `<!-- JOÃO -->`
- `<!-- PROFISSIONAIS -->`
- `<!-- FECHO -->`
- `<!-- FOOTER -->`

---

## Onde editar as opções do Farol

Ficheiro: `js/farol.js`

### Adicionar uma nova dor/desejo no Step 1:
```javascript
minha_nova_opcao: {
  label: 'Texto visível no botão',
  icon: 'shield',  // não usado visualmente ainda, mas reservado
  question: 'Pergunta do Step 2',
  options: [
    { key: 'sub1', label: 'Opção A' },
    { key: 'sub2', label: 'Opção B' }
  ]
}
```

### Adicionar o resultado correspondente:
```javascript
'minha_nova_opcao_sub1': {
  title: 'Título do resultado',
  text: 'Descrição do resultado',
  cta: { text: 'Botão principal', href: '#', style: 'primary' },
  cta2: { text: 'Botão secundário', href: '#explorar', style: 'secondary' }
}
```

---

## Estrutura de ficheiros

```
maison-jf/
├── index.html              # Homepage completa
├── css/
│   └── styles.css          # Todos os estilos
├── js/
│   ├── main.js             # Funcionalidades gerais
│   └── farol.js            # Lógica do Farol interativo
├── assets/
│   ├── images/             # Fotografias e atmosferas da versão atual
│   └── icons/
│       ├── favicon.svg
│       └── apple-touch-icon.svg
├── robots.txt
├── sitemap.xml
└── README.md
```

---

## O que ficou placeholder

- **Fotografia de João**: mantida como composição tipográfica JF para não inventar uma fotografia do fundador. Pode ser trocada mais tarde por uma fotografia real.
- **Links internos**: Todos os links `#` devem ser atualizados quando as páginas internas forem criadas.
- **Open Graph image**: `assets/images/og-image.jpg` — criar imagem 1200×630px.
- **Checkout/pagamentos**: Arquitetura preparada, mas não implementada. Integração futura com MB WAY / Multibanco.
- **Companhia social**: Arquitetura de serviços expansível, mas sem destaque na homepage nesta versão.
- **Schema.org Person**: Preparado para adicionar dados do João quando finalizados.
- **Redes sociais**: Links placeholder no footer.

---

## Notas técnicas

- **Zero dependências**: HTML + CSS + JS vanilla
- **Google Fonts**: Playfair Display + Inter (carregadas via CDN)
- **Responsive**: Testado em 360px, 390px, 768px, 1024px, 1440px, 1920px
- **Acessibilidade**: HTML semântico, ARIA labels, keyboard navigation, prefers-reduced-motion
- **SEO**: Meta tags, Schema.org JSON-LD, canonical, sitemap.xml
- **Performance**: Sem frameworks, lazy-loading ready, animações suaves

---

MAISON JF® — Pára de Ignorar. Volta Para Casa.
