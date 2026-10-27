const PILLARS = [
  { key: 'scent-product-formulation', name: 'Aromas, essências e formulação', mission: 'Descobrir, formular e validar experiências olfativas para produtos distintos.' },
  { key: 'suppliers-production', name: 'Fornecedores, materiais e produção', mission: 'Encontrar matérias-primas, fornecedores e processos viáveis, documentados e competitivos.' },
  { key: 'portugal-market-opportunity', name: 'Mercado português e espaços por explorar', mission: 'Identificar oportunidades em Portugal com pesquisa explícita de concorrência e procura.' },
  { key: 'luxury-brand-intelligence', name: 'Inteligência individual de Maisons e marcas', mission: 'Estudar cada marca e as suas variantes como um território independente, sem copiar a sua expressão.' },
  { key: 'symbolic-systems-audience-entry', name: 'Sistemas simbólicos e novas portas de entrada', mission: 'Descobrir formas culturais e participativas de chegar a públicos relevantes, com contexto e rigor.' },
  { key: 'ebooks-interactive-publishing', name: 'Ebooks, livros-jogo e publicação interactiva', mission: 'Encontrar temas, narrativas, mecânicas e futuros ciclos editoriais.' },
  { key: 'digital-games-experiences', name: 'Jogos digitais e experiências interactivas', mission: 'Descobrir jogos, públicos, mecânicas e oportunidades comerciais para além dos produtos actuais.' },
  { key: 'human-needs-buying-motives', name: 'Necessidades humanas e motivos de compra', mission: 'Investigar o que as pessoas procuram, valorizam, evitam e realmente compram.' },
  { key: 'maison-philosophy-conversion', name: 'Filosofia Maison, voz, comunicação e conversão', mission: 'Evoluir a identidade e melhorar clareza, experiência e conversão sem perder autenticidade.' },
  { key: 'creators-partnerships-distribution', name: 'Criadores, parcerias e distribuição', mission: 'Encontrar pessoas, comunidades, parceiros e canais com adequação real à Maison.' },
  { key: 'growth-innovation-safety-learning', name: 'Inovação, segurança, aprendizagem e territórios novos', mission: 'Encontrar oportunidades, gerir riscos e aprender com resultados, incluindo falhas.' }
];

const CORE_LINKS = {
  'scent-product-formulation': ['suppliers-production', 'human-needs-buying-motives', 'portugal-market-opportunity', 'growth-innovation-safety-learning'],
  'suppliers-production': ['scent-product-formulation', 'portugal-market-opportunity', 'growth-innovation-safety-learning'],
  'portugal-market-opportunity': ['human-needs-buying-motives', 'customer-search-language', 'supplier-intelligence', 'market-gaps-competitor-weaknesses'],
  'luxury-brand-intelligence': ['scent-product-formulation', 'maison-philosophy', 'visual-sensory-design', 'portugal-market-opportunity'],
  'symbolic-systems-audience-entry': ['ebooks-themes', 'digital-game-concepts', 'human-needs-buying-motivations', 'creator-intelligence'],
  'ebooks-interactive-publishing': ['interactive-book-games', 'digital-game-concepts', 'reader-demand', 'story-worlds-spin-offs'],
  'digital-games-experiences': ['interactive-book-games', 'human-needs-buying-motivations', 'copywriting-conversion', 'story-worlds-spin-offs'],
  'human-needs-buying-motives': ['scent-product-formulation', 'digital-game-concepts', 'customer-search-language', 'copywriting-conversion'],
  'maison-philosophy-conversion': ['brand-positioning', 'human-needs-buying-motivations', 'customer-research', 'failed-ideas-negative-results'],
  'creators-partnerships-distribution': ['portugal-market-opportunity', 'creator-intelligence', 'community-building', 'retail-distribution'],
  'growth-innovation-safety-learning': ['portugal-market-opportunity', 'supplier-intelligence', 'product-safety-regulatory', 'failed-ideas-negative-results', 'unexplored-territories']
};

function makeOcean(key, name, pillar, mission, focus = [], connections = []) {
  return {
    ocean_key: key,
    display_name: name,
    pillar_key: pillar,
    mission,
    focus: Array.isArray(focus) ? focus : [],
    connections: [...new Set([...connections, ...(CORE_LINKS[pillar] || [])])],
    lifecycle_state: 'open',
    origin: 'foundational_catalog'
  };
}

const OCEANS = [
  makeOcean('olfactory-universe', 'Olfactory Universe', 'scent-product-formulation', 'Construir conhecimento sobre famílias olfativas, notas, acordes, matérias aromáticas e percepção sensorial.', ['famílias olfativas', 'notas e acordes', 'contrastes e texturas', 'evolução e percepção do aroma']),
  makeOcean('fragrance-formulation-lab', 'Fragrance Formulation Lab', 'scent-product-formulation', 'Desenvolver combinações aromáticas originais e acompanhar a passagem de hipótese a fórmula testada.', ['compatibilidade entre fragrâncias', 'proporções e diluições', 'testes documentados', 'estabilidade e desempenho']),
  makeOcean('home-fragrance', 'Home Fragrance', 'scent-product-formulation', 'Investigar névoas de ambiente, difusores, águas perfumadas e outros formatos de perfumação de espaços.', ['névoas de ambiente', 'águas perfumadas', 'difusão e intensidade', 'formatos e ocasiões']),
  makeOcean('linen-textile-fragrance', 'Linen & Textile Fragrance', 'scent-product-formulation', 'Investigar águas de lençóis e perfumação têxtil, separando ideias olfativas de compatibilidade e segurança de uso.', ['águas de lençóis', 'brumas têxteis', 'tecidos e materiais', 'manchas, estabilidade e segurança']),
  makeOcean('scented-candles', 'Scented Candles', 'scent-product-formulation', 'Melhorar velas aromáticas, considerando cera, pavio, recipiente, combustão e desempenho olfativo.', ['difusão a frio e a quente', 'ceras e pavios', 'recipientes e combustão', 'testes reprodutíveis']),
  makeOcean('personal-perfumery', 'Personal Perfumery', 'scent-product-formulation', 'Explorar perfumes pessoais, concentrações, evolução na pele, famílias olfativas e formatos de descoberta.', ['perfumes pessoais', 'concentrações', 'fixação e evolução', 'amostras e discovery sets']),
  makeOcean('massage-body-rituals', 'Massage & Body Rituals', 'scent-product-formulation', 'Investigar óleos de massagem e experiências perfumadas para o corpo com requisitos de segurança específicos.', ['óleos de massagem', 'rituais de cuidado', 'compatibilidade de bases', 'documentação de segurança']),
  makeOcean('scent-layering', 'Scent Layering', 'scent-product-formulation', 'Testar combinações entre aromas de corpo, ambiente e objectos, registando resultados em vez de presumir compatibilidade.', ['combinar fragrâncias', 'famílias complementares', 'contrastes olfativos', 'experiências por camadas']),
  makeOcean('aroma-by-occasion', 'Aroma by Occasion', 'scent-product-formulation', 'Relacionar experiências olfativas com ocasiões como chegar a casa, descansar, receber pessoas ou oferecer.', ['chegar a casa', 'pausa e descanso', 'receber convidados', 'presentes e datas']),
  makeOcean('sensory-innovation', 'Sensory Innovation', 'scent-product-formulation', 'Descobrir formatos sensoriais originais, objectos aromáticos, sólidos perfumados, kits e experiências.', ['novos formatos', 'objectos aromáticos', 'kits de descoberta', 'experiências multissensoriais']),
  makeOcean('proven-aroma-formulas', 'Proven Aroma Formulas', 'scent-product-formulation', 'Manter um laboratório de fórmulas com resultados observados, condições de teste, limitações, custos e validação por aplicação.', ['receitas e acordes testados', 'registo de resultados', 'custo por unidade', 'separação entre hipótese e fórmula validada']),

  makeOcean('supplier-intelligence', 'Supplier Intelligence', 'suppliers-production', 'Descobrir, comparar e acompanhar fornecedores por qualidade, fiabilidade, documentação, mínimos e custo entregue em Portugal.', ['fornecedores europeus', 'preços e portes', 'quantidades mínimas', 'fiabilidade e alternativas']),
  makeOcean('waxes-candle-materials', 'Waxes & Candle Materials', 'suppliers-production', 'Comparar ceras e materiais de vela por especificações técnicas, desempenho, preço, disponibilidade e custo logístico.', ['cera de coco', 'soja e colza', 'ponto de fusão', 'mínimos e custo entregue']),
  makeOcean('fragrance-suppliers', 'Fragrance Suppliers', 'suppliers-production', 'Avaliar fornecedores de fragrâncias, amostras, catálogos, documentação técnica e adequação às aplicações pretendidas.', ['catálogos e amostras', 'certificados e fichas', 'limites de utilização', 'consistência entre lotes']),
  makeOcean('containers-vessels', 'Containers & Vessels', 'suppliers-production', 'Encontrar recipientes e componentes compatíveis com estética, segurança, dimensões e custos da Maison.', ['frascos e recipientes', 'pulverizadores e tampas', 'recipientes para velas', 'mínimos e personalização']),
  makeOcean('salts-botanical-materials', 'Salts & Botanical Materials', 'suppliers-production', 'Pesquisar sais e matérias botânicas, qualidade, documentação, conservação e utilização pretendida.', ['sais para rituais', 'matérias botânicas', 'fornecedores', 'armazenamento e qualidade']),
  makeOcean('packaging-printing', 'Packaging & Printing', 'suppliers-production', 'Comparar etiquetas, caixas, impressão, acabamentos, materiais e opções de embalagem por escala e custo.', ['etiquetas', 'caixas e impressão', 'acabamentos', 'embalagem de oferta']),
  makeOcean('production-equipment', 'Production Equipment', 'suppliers-production', 'Identificar ferramentas e equipamentos que melhorem a repetibilidade, segurança e eficiência de produção.', ['balanças e termómetros', 'ferramentas', 'controlo de qualidade', 'processos repetíveis']),
  makeOcean('procurement-economics', 'Procurement Economics', 'suppliers-production', 'Calcular custo total de compra, impostos aplicáveis, transporte, mínimos, desperdício e custo real por unidade.', ['custo entregue', 'portes e impostos', 'custo por unidade', 'cenários de compra']),
  makeOcean('supplier-reliability', 'Supplier Reliability', 'suppliers-production', 'Acompanhar atrasos, alterações de catálogo, qualidade e risco de dependência de fornecedores.', ['prazos e disponibilidade', 'qualidade por lote', 'alternativas', 'risco de fornecimento']),
  makeOcean('european-sourcing', 'European Sourcing', 'suppliers-production', 'Encontrar opções europeias que reduzam fricção logística sem sacrificar qualidade, documentação ou custo.', ['fornecedores na Europa', 'alternativas locais', 'prazos', 'custo logístico']),

  makeOcean('portugal-market-white-space', 'Portuguese Market White Space', 'portugal-market-opportunity', 'Procurar conceitos e produtos pouco explorados em Portugal, verificando concorrência, procura e datas das pesquisas.', ['presença no mercado português', 'concorrência e disponibilidade', 'sinais de procura', 'oportunidades pioneiras verificáveis']),
  makeOcean('market-gaps-competitor-weaknesses', 'Market Gaps & Competitor Weaknesses', 'portugal-market-opportunity', 'Encontrar necessidades mal servidas, fricções e espaços de diferenciação sem presumir que a ausência de resultados prova ausência de oferta.', ['reclamações públicas', 'lacunas de experiência', 'oferta insuficiente', 'alternativas existentes']),
  makeOcean('customer-search-language', 'Customer Search & Language', 'portugal-market-opportunity', 'Recolher linguagem pública usada pelas pessoas para procurar produtos, descrever desejos e explicar problemas.', ['termos de pesquisa', 'linguagem de clientes', 'perguntas recorrentes', 'idiomas e variações locais']),
  makeOcean('competitor-price-intelligence', 'Competitor & Price Intelligence', 'portugal-market-opportunity', 'Acompanhar preços, formatos, disponibilidade e posicionamento de alternativas comparáveis com fontes datadas.', ['preços públicos', 'formatos e tamanhos', 'disponibilidade', 'comparabilidade real']),

  ...[
    ['tom-ford', 'Tom Ford'],
    ['dior', 'Dior'],
    ['yves-saint-laurent', 'Yves Saint Laurent / YSL Beauty'],
    ['chanel', 'Chanel'],
    ['hermes', 'Hermès'],
    ['guerlain', 'Guerlain'],
    ['jo-malone-london', 'Jo Malone London'],
    ['diptyque', 'Diptyque'],
    ['byredo', 'Byredo'],
    ['le-labo', 'Le Labo'],
    ['maison-margiela-fragrances', 'Maison Margiela Fragrances'],
    ['loewe', 'Loewe'],
    ['prada', 'Prada'],
    ['giorgio-armani-prive', 'Giorgio Armani Privé'],
    ['gucci-beauty', 'Gucci Beauty'],
    ['valentino-beauty', 'Valentino Beauty'],
    ['narciso-rodriguez', 'Narciso Rodriguez'],
    ['maison-francis-kurkdjian', 'Maison Francis Kurkdjian'],
    ['kilian-paris', 'Kilian Paris'],
    ['amouage', 'Amouage'],
    ['creed', 'Creed'],
    ['parfums-de-marly', 'Parfums de Marly'],
    ['xerjoff', 'Xerjoff'],
    ['initio-parfums-prives', 'Initio Parfums Privés'],
    ['serge-lutens', 'Serge Lutens'],
    ['frederic-malle', 'Éditions de Parfums Frédéric Malle'],
    ['bdk-parfums', 'BDK Parfums'],
    ['essential-parfums', 'Essential Parfums'],
    ['juliette-has-a-gun', 'Juliette Has a Gun'],
    ['escentric-molecules', 'Escentric Molecules'],
    ['artisan-parfumeur', "L'Artisan Parfumeur"],
    ['acqua-di-parma', 'Acqua di Parma'],
    ['penhaligons', "Penhaligon's"],
    ['floris-london', 'Floris London'],
    ['aesop', 'Aesop'],
    ['santa-maria-novella', 'Santa Maria Novella'],
    ['orto-parisi', 'Orto Parisi'],
    ['tiziana-terenzi', 'Tiziana Terenzi'],
    ['montale', 'Montale'],
    ['mancera', 'Mancera'],
    ['lattafa', 'Lattafa'],
    ['swiss-arabian', 'Swiss Arabian'],
    ['arabian-oud', 'Arabian Oud'],
    ['ajmal', 'Ajmal'],
    ['maison-crivelli', 'Maison Crivelli'],
    ['nishane', 'Nishane'],
    ['goldfield-and-banks', 'Goldfield & Banks'],
    ['ds-and-durga', 'D.S. & Durga'],
    ['commodity', 'Commodity'],
    ['imaginary-authors', 'Imaginary Authors'],
    ['zoologist-perfumes', 'Zoologist Perfumes']
  ].map(([slug, name]) => makeOcean(
    'brand-' + slug,
    name,
    'luxury-brand-intelligence',
    'Estudar esta marca como território independente: catálogo, linhas, variantes/flankers, colecções, lançamentos, preços públicos, campanhas, códigos sensoriais, experiência e recepção. Extrair princípios transferíveis sem copiar identidade nem expressão.',
    ['todas as linhas e variantes públicas', 'novos lançamentos e evolução de catálogo', 'preços, campanhas e distribuição', 'princípios transferíveis para MAISON JF']
  )),

  makeOcean('tarot-oracles', 'Tarot & Oracles', 'symbolic-systems-audience-entry', 'Descobrir formatos, perguntas, experiências e públicos ligados ao Tarot e a oráculos, distinguindo tradição, interpretação e entretenimento.', ['formatos de leitura', 'perguntas e temas', 'experiência de consulta', 'comunidades públicas']),
  makeOcean('western-astrology', 'Western Astrology', 'symbolic-systems-audience-entry', 'Investigar astrologia ocidental, linguagem, ciclos e formatos editoriais como possíveis portas de entrada para a Maison.', ['mapas e ciclos', 'conteúdos editoriais', 'perguntas recorrentes', 'ocasiões de procura']),
  makeOcean('sidereal-astrology', 'Sidereal Astrology', 'symbolic-systems-audience-entry', 'Explorar astrologia sideral, diferenças de enquadramento, vocabulário e públicos sem a confundir com outros sistemas.', ['zodíaco sideral', 'diferenças de sistemas', 'conteúdos e comunidades', 'contextualização cultural']),
  makeOcean('vedic-astrology-jyotisha', 'Vedic Astrology / Jyotisha', 'symbolic-systems-audience-entry', 'Investigar Jyotisha com respeito pelo seu contexto cultural, distinguindo fontes tradicionais, interpretação e alegações verificáveis.', ['fontes tradicionais', 'vocabulário e práticas', 'interesse do público', 'contexto cultural']),
  makeOcean('chinese-metaphysics', 'Chinese Metaphysics', 'symbolic-systems-audience-entry', 'Explorar tradições e sistemas simbólicos chineses relevantes, com rigor cultural e sem os reduzir a tendências superficiais.', ['calendários e símbolos', 'sistemas tradicionais', 'públicos e conteúdos', 'contexto histórico']),
  makeOcean('vietnamese-zodiac-traditions', 'Vietnamese Zodiac & Traditions', 'symbolic-systems-audience-entry', 'Pesquisar tradições zodiacais vietnamitas e as suas particularidades culturais antes de propor experiências ou conteúdos.', ['zodíaco vietnamita', 'diferenças regionais', 'fontes culturais', 'oportunidades editoriais']),
  makeOcean('numerology', 'Numerology', 'symbolic-systems-audience-entry', 'Investigar sistemas numerológicos, formatos de participação e procura pública sem os apresentar como instrumentos científicos de previsão.', ['sistemas numerológicos', 'conteúdos interactivos', 'perguntas do público', 'contextualização e limites']),
  makeOcean('dreams-symbolism', 'Dreams & Symbolism', 'symbolic-systems-audience-entry', 'Explorar sonhos e símbolos como temas culturais, narrativos e de reflexão, sem alegações diagnósticas.', ['símbolos recorrentes', 'narrativas', 'perguntas para reflexão', 'fontes culturais']),
  makeOcean('archetypes-mythology', 'Archetypes & Mythology', 'symbolic-systems-audience-entry', 'Investigar arquétipos, mitologias e narrativas que possam inspirar experiências originais e bem contextualizadas.', ['arquétipos', 'mitologias', 'estruturas narrativas', 'referências culturais']),
  makeOcean('seasonal-rituals', 'Seasonal Rituals', 'symbolic-systems-audience-entry', 'Descobrir rituais e conteúdos ligados às estações e a momentos do ano, respeitando contexto e diversidade cultural.', ['estações do ano', 'ciclos e ocasiões', 'rituais contemporâneos', 'conteúdos sazonais']),
  makeOcean('personal-reflection', 'Personal Reflection', 'symbolic-systems-audience-entry', 'Desenvolver perguntas e experiências de reflexão pessoal que sejam claras, voluntárias e não clínicas.', ['perguntas de reflexão', 'clareza pessoal', 'experiências guiadas', 'linguagem acessível']),
  makeOcean('personality-relationship-tests', 'Personality & Relationship Tests', 'symbolic-systems-audience-entry', 'Investigar testes sobre atenção, apego, afeto e relações, diferenciando entretenimento de instrumentos psicométricos validados.', ['testes de entretenimento', 'atenção, apego e afeto', 'experiências partilhadas', 'limites de interpretação']),

  makeOcean('ebooks-themes', 'Ebook Themes', 'ebooks-interactive-publishing', 'Descobrir temas para ebooks com sinais de interesse, utilidade concreta, diferenciação e potencial editorial.', ['problemas e perguntas reais', 'nichos editoriais', 'promessa e formato', 'procura e disposição para pagar']),
  makeOcean('interactive-fiction', 'Interactive Fiction', 'ebooks-interactive-publishing', 'Explorar ficção interactiva com escolhas, consequências, caminhos alternativos e finais diferentes.', ['escolhas narrativas', 'consequências', 'ramificações', 'repetição e replay']),
  makeOcean('interactive-book-games', 'Interactive Book Games', 'ebooks-interactive-publishing', 'Desenvolver mecânicas para livros-jogo interactivos, incluindo regras, decisões, pistas, missões e progressão.', ['mecânicas de livro-jogo', 'decisões e consequências', 'pistas e missões', 'experiência de leitura']),
  makeOcean('editorial-series-development', 'Editorial Series Development', 'ebooks-interactive-publishing', 'Descobrir e avaliar séries editoriais, universos narrativos e ciclos com espaço para evolução.', ['séries e colecções', 'coerência de universo', 'progressão entre volumes', 'potencial de continuidade']),
  makeOcean('first-thirteen-book-cycle', 'First Interactive Book Cycle — 12 + 1', 'ebooks-interactive-publishing', 'Apoiar a primeira série já definida: 12 livros e um 13.º volume para fechar o ciclo, sem misturar futuras séries com este plano.', ['continuidade dos 12 volumes', 'livro final de fecho', 'consistência interna', 'controlo de continuidade']),
  makeOcean('future-book-universes', 'Future Book Universes', 'ebooks-interactive-publishing', 'Descobrir temas e universos independentes para futuras séries de livros-jogo, sem depender do ciclo actual.', ['novas temáticas', 'universos e personagens', 'séries posteriores', 'diferenciação editorial']),
  makeOcean('interactive-narrative-mechanics', 'Interactive Narrative Mechanics', 'ebooks-interactive-publishing', 'Pesquisar mecanismos de participação, enigmas, decisões, inventários, pistas, estados e desfechos.', ['mecânicas narrativas', 'puzzles e pistas', 'decisões significativas', 'complexidade e acessibilidade']),
  makeOcean('reader-demand', 'Reader Demand', 'ebooks-interactive-publishing', 'Investigar procura pública, avaliações, recomendações, formatos de leitura e necessidades editoriais.', ['perguntas de leitores', 'géneros e subgéneros', 'avaliações públicas', 'barreiras à compra']),
  makeOcean('book-packaging-positioning', 'Book Packaging & Positioning', 'ebooks-interactive-publishing', 'Estudar títulos, capas, descrição, amostras, formatos, preço e apresentação comercial de livros.', ['títulos e capas', 'descrições e amostras', 'formato e preço', 'página de venda']),
  makeOcean('publishing-opportunities', 'Publishing Opportunities', 'ebooks-interactive-publishing', 'Avaliar formatos, canais, colecções e oportunidades de publicação viáveis para a Maison.', ['ebooks e formatos digitais', 'colecções', 'canais de publicação', 'custos e margens']),
  makeOcean('story-worlds-spin-offs', 'Story Worlds & Spin-offs', 'ebooks-interactive-publishing', 'Descobrir quando uma ideia pode crescer de um livro para um universo editorial ou experiência interactiva mais ampla.', ['spin-offs e expansões', 'universos partilhados', 'livro para jogo', 'coerência entre formatos']),

  makeOcean('digital-game-concepts', 'Digital Game Concepts', 'digital-games-experiences', 'Descobrir conceitos de jogos digitais independentes e necessidades de utilização ainda não respondidas.', ['novos conceitos', 'público e ocasião', 'mecânicas centrais', 'validação de interesse']),
  makeOcean('two-player-games', 'Two-Player Games', 'digital-games-experiences', 'Explorar jogos digitais para duas pessoas em diferentes contextos, com variedade entre intimidade, humor e descoberta.', ['jogos a dois', 'perguntas e desafios', 'dinâmicas de relação', 'repetição e partilha']),
  makeOcean('group-party-games', 'Group & Party Games', 'digital-games-experiences', 'Criar hipóteses para jogos de grupo, festas, convívios e quebra-gelos, incluindo experiências rápidas e escaláveis.', ['jogos de grupo', 'festas e convívios', 'quebra-gelos', 'regras simples']),
  makeOcean('couples-connection-games', 'Couples & Connection Games', 'digital-games-experiences', 'Investigar jogos para comunicação, cumplicidade e descoberta entre parceiros, sem pressupor um único modelo de relação.', ['comunicação', 'intimidade e cumplicidade', 'humor e vulnerabilidade', 'limites e consentimento']),
  makeOcean('social-discovery-games', 'Social Discovery Games', 'digital-games-experiences', 'Descobrir jogos que ajudem amigos ou desconhecidos a conhecer-se de formas interessantes e voluntárias.', ['conhecer pessoas', 'perguntas progressivas', 'icebreakers', 'contexto de utilização']),
  makeOcean('mystery-investigation-games', 'Mystery & Investigation Games', 'digital-games-experiences', 'Explorar jogos digitais de mistério, investigação, dedução, pistas e resolução de problemas.', ['mistério e investigação', 'pistas', 'dedução', 'estruturas de jogo']),
  makeOcean('choice-based-games', 'Choice-Based Games', 'digital-games-experiences', 'Pesquisar jogos em que as escolhas alteram a experiência, a narrativa ou os resultados.', ['escolhas e consequências', 'finais alternativos', 'ramificação', 'agência do jogador']),
  makeOcean('replayability-expansions', 'Replayability & Expansions', 'digital-games-experiences', 'Encontrar formas de renovar jogos existentes sem produzir variações superficiais ou conteúdo repetido.', ['repetibilidade', 'novas regras', 'expansões', 'conteúdo temático']),
  makeOcean('game-monetisation', 'Game Monetisation', 'digital-games-experiences', 'Avaliar modelos comerciais de jogos, preço, versões, expansões e conjuntos segundo valor real e viabilidade.', ['preço e modelos', 'versões e expansões', 'pacotes', 'margem e conversão']),
  makeOcean('game-book-ecosystems', 'Game-to-Book Ecosystems', 'digital-games-experiences', 'Encontrar ligações com sentido entre jogos digitais, livros-jogo, testes, Oráculo e universos narrativos.', ['livro e jogo', 'experiências cruzadas', 'universos narrativos', 'continuidade entre produtos']),

  makeOcean('human-needs-buying-motivations', 'Human Needs & Buying Motivations', 'human-needs-buying-motives', 'Investigar o resultado que as pessoas procuram obter quando compram um produto ou procuram uma experiência.', ['necessidade por trás da compra', 'ocasiões e contexto', 'critérios de escolha', 'evidência de comportamento']),
  makeOcean('calm-unwinding', 'Calm & Unwinding', 'human-needs-buying-motives', 'Investigar como as pessoas procuram desacelerar, fazer uma pausa e reduzir a sensação de sobrecarga, sem promessas clínicas.', ['desacelerar', 'pausas', 'rituais simples', 'experiências sensoriais']),
  makeOcean('homecoming-comfort', 'Homecoming & Comfort', 'human-needs-buying-motives', 'Explorar o desejo de gostar de regressar a casa e sentir o espaço como próprio, confortável e acolhedor.', ['regresso a casa', 'conforto e pertença', 'atmosfera do espaço', 'rituais de transição']),
  makeOcean('sleep-evening-rituals', 'Sleep & Evening Rituals', 'human-needs-buying-motives', 'Investigar rotinas e ambientes de fim de dia sem prometer tratar insónia ou condições médicas.', ['rotinas de noite', 'ambiente do quarto', 'desligar do trabalho', 'fricções e hábitos']),
  makeOcean('emotional-gifting', 'Emotional Gifting', 'human-needs-buying-motives', 'Perceber como as pessoas escolhem presentes para demonstrar cuidado, proximidade, gratidão ou reconhecimento.', ['presente com significado', 'ansiedade de escolha', 'ocasiões de oferta', 'conjuntos e personalização']),
  makeOcean('identity-self-expression', 'Identity & Self-Expression', 'human-needs-buying-motives', 'Investigar como produtos e experiências ajudam as pessoas a expressar gosto, identidade e pertença.', ['identidade e expressão', 'estética pessoal', 'autoimagem', 'escolha simbólica']),
  makeOcean('sensory-pleasure', 'Sensory Pleasure', 'human-needs-buying-motives', 'Estudar a procura de aromas, texturas, atmosferas e experiências sensoriais agradáveis.', ['prazer sensorial', 'aromas e texturas', 'ambiente', 'combinações sensoriais']),
  makeOcean('connection-intimacy', 'Connection & Intimacy', 'human-needs-buying-motives', 'Investigar necessidades de proximidade, compreensão e experiências partilhadas em diferentes relações.', ['proximidade', 'conversa e escuta', 'experiências partilhadas', 'limites e respeito']),
  makeOcean('discovery-novelty', 'Discovery & Novelty', 'human-needs-buying-motives', 'Descobrir porque as pessoas procuram novidade, surpresa, exploração e experiências diferentes.', ['novidade', 'curiosidade', 'descoberta', 'colecções e experiências']),
  makeOcean('affordable-luxury', 'Affordable Luxury', 'human-needs-buying-motives', 'Investigar a procura de qualidade, atenção e sensação de luxo a preços compatíveis com diferentes orçamentos.', ['luxo acessível', 'valor percebido', 'formatos pequenos', 'qualidade e preço']),
  makeOcean('ritual-meaning', 'Ritual & Meaning', 'human-needs-buying-motives', 'Explorar como objectos e práticas podem marcar momentos e dar significado à rotina.', ['marcadores de transição', 'rituais pessoais', 'significado', 'objectos e momentos']),
  makeOcean('home-atmosphere', 'Home Atmosphere', 'human-needs-buying-motives', 'Investigar o que leva as pessoas a alterar a atmosfera de uma casa e como descrevem o resultado pretendido.', ['ambiente da casa', 'divisões e ocasiões', 'preferências sensoriais', 'produtos e decoração']),
  makeOcean('collecting-personal-curation', 'Collecting & Personal Curation', 'human-needs-buying-motives', 'Explorar pessoas que gostam de descobrir, comparar, combinar e coleccionar objectos ou experiências.', ['colecções', 'curadoria pessoal', 'edições e conjuntos', 'descoberta progressiva']),
  makeOcean('stress-overload-digital-fatigue', 'Stress, Overload & Digital Fatigue', 'human-needs-buying-motives', 'Investigar procura por pausas, simplicidade e experiências menos dependentes do ecrã sem diagnosticar pessoas.', ['sobrecarga', 'fadiga digital', 'simplicidade', 'pausas offline']),
  makeOcean('personal-rewards', 'Personal Rewards', 'human-needs-buying-motives', 'Investigar compras e rituais de recompensa associados a conquistas, pequenos progressos ou necessidade de cuidado.', ['pequenas recompensas', 'conquistas', 'auto-oferta', 'ocasiões de compra']),
  makeOcean('quiet-social-experiences', 'Quiet Social Experiences', 'human-needs-buying-motives', 'Descobrir actividades partilhadas que não exigem grandes eventos, energia elevada ou produção complexa.', ['convivência tranquila', 'jogos leves', 'rituais partilhados', 'momentos em casa']),

  makeOcean('maison-philosophy', 'Maison JF Philosophy', 'maison-philosophy-conversion', 'Evoluir os princípios da Maison JF com coerência, aprendizagem e uma linguagem cada vez mais clara e própria.', ['filosofia e princípios', 'identidade e coerência', 'aprendizagem acumulada', 'distinção de marca']),
  makeOcean('brand-positioning', 'Brand Positioning', 'maison-philosophy-conversion', 'Clarificar o que a Maison representa, para quem é relevante e por que deve ser escolhida.', ['diferenciação', 'públicos e ocasiões', 'proposta de valor', 'alternativas reais']),
  makeOcean('copywriting-conversion', 'Copywriting & Conversion', 'maison-philosophy-conversion', 'Melhorar títulos, páginas, descrições, chamadas à acção e propostas de valor através de hipóteses testáveis.', ['clareza de mensagem', 'páginas de produto', 'CTAs', 'testes de conversão']),
  makeOcean('offer-architecture', 'Offer Architecture', 'maison-philosophy-conversion', 'Estruturar ofertas, conjuntos, complementos e caminhos de compra sem inflacionar artificialmente o valor.', ['ofertas e bundles', 'componentes reais', 'objeções', 'valor percebido']),
  makeOcean('pricing-value', 'Pricing & Value', 'maison-philosophy-conversion', 'Analisar preço, margem, valor percebido, custos e acessibilidade antes de propor alterações.', ['preço e margem', 'custos reais', 'valor percebido', 'testes de preço']),
  makeOcean('customer-journey', 'Customer Journey', 'maison-philosophy-conversion', 'Identificar fricções entre descoberta, compreensão, compra, utilização, recomendação e recompra.', ['descoberta', 'navegação e confiança', 'checkout', 'recompra']),
  makeOcean('mobile-commerce', 'Mobile Commerce', 'maison-philosophy-conversion', 'Simplificar a experiência móvel da Maison, melhorando hierarquia, leitura, navegação e decisões de compra.', ['usabilidade móvel', 'hierarquia visual', 'desempenho', 'fricção de checkout']),
  makeOcean('brand-voice-feral-frontality', 'Yoichi Feral — frontalidade sem pedir autorização', 'maison-philosophy-conversion', 'Estudar a energia de frontalidade, irreverência, coragem verbal e ausência de necessidade de agradar; criar uma expressão Maison original, sem copiar diálogos ou cenas.', ['dizer o que é incómodo com intenção', 'humor e confronto', 'voz sem desculpas por existir', 'diferença entre pancada verbal e agressão vazia']),
  makeOcean('storytelling', 'Storytelling', 'maison-philosophy-conversion', 'Encontrar formas narrativas próprias para explicar produtos, colecções e ideias com clareza e significado.', ['narrativa de produto', 'estrutura e ritmo', 'origem e intenção', 'coerência da marca']),
  makeOcean('retention-loyalty', 'Retention & Loyalty', 'maison-philosophy-conversion', 'Descobrir motivos para as pessoas regressarem, recomendarem e voltarem a comprar.', ['recompra', 'pós-venda', 'comunidade', 'continuidade de experiência']),
  makeOcean('experiments-conversion-learning', 'Experiments & Conversion Learning', 'maison-philosophy-conversion', 'Registar hipóteses, experiências comerciais e resultados para substituir intuição não testada por aprendizagem.', ['hipóteses testáveis', 'métricas e comparação', 'resultados negativos', 'aprendizagem reutilizável']),
  makeOcean('psychology-decision', 'Psychology of Decision', 'maison-philosophy-conversion', 'Estudar mecanismos de decisão com investigação e limites claros, sem os tratar como truques universais.', ['atenção e decisão', 'aversão à perda', 'prova e confiança', 'contra-evidência']),
  makeOcean('choice-architecture', 'Choice Architecture', 'maison-philosophy-conversion', 'Simplificar escolhas e orientar navegação sem ocultar alternativas, custos ou condições relevantes.', ['excesso de escolha', 'ordenação', 'clareza de opções', 'design ético']),
  makeOcean('customer-research', 'Customer Research', 'maison-philosophy-conversion', 'Transformar linguagem pública e feedback real em conhecimento sobre necessidades, obstáculos e compreensão.', ['perguntas de clientes', 'feedback', 'entrevistas autorizadas', 'padrões sem PII']),
  makeOcean('experience-design', 'Experience Design', 'maison-philosophy-conversion', 'Melhorar a experiência completa entre descoberta, narrativa, compra, uso e memória do produto.', ['experiência digital e física', 'momentos de utilização', 'coerência sensorial', 'fricção']),
  makeOcean('ethical-persuasion', 'Ethical Persuasion', 'maison-philosophy-conversion', 'Melhorar a persuasão sem falsas provas, pressão manipuladora, promessas infundadas ou ocultação de limites.', ['transparência', 'promessas verificáveis', 'redução de fricção', 'respeito pela escolha']),
  makeOcean('transferable-excellence-atelier', 'Atelier of Transferable Excellence', 'maison-philosophy-conversion', 'Estudar mecanismos documentados de excelência em marcas, cultura, psicologia, design e entretenimento para os adaptar de forma original.', ['Barnum/Forer com contexto crítico', 'Hormozi e arquitectura de ofertas', 'Apple e experiência', 'KISS e simplicidade']),

  makeOcean('creator-intelligence', 'Creator Intelligence', 'creators-partnerships-distribution', 'Descobrir criadores relevantes através de adequação temática, qualidade de comunidade, consistência e potencial comercial.', ['criadores e comunidades', 'qualidade de conteúdo', 'envolvimento genuíno', 'adequação à Maison']),
  makeOcean('fragrance-creators', 'Fragrance Creators', 'creators-partnerships-distribution', 'Encontrar criadores de conteúdo de perfumaria, velas, aromas, design sensorial e experiências de produto.', ['perfumaria e aromas', 'velas e casa', 'comentários de produto', 'audiência e adequação']),
  makeOcean('tarot-astrology-creators', 'Tarot & Astrology Creators', 'creators-partnerships-distribution', 'Encontrar criadores relevantes em Tarot, astrologia, numerologia e sistemas simbólicos com avaliação de contexto e público.', ['Tarot e oráculos', 'astrologia e numerologia', 'qualidade da comunidade', 'parcerias possíveis']),
  makeOcean('book-game-communities', 'Book & Game Communities', 'creators-partnerships-distribution', 'Descobrir comunidades públicas de leitores, jogos narrativos, livros-jogo e experiências digitais.', ['comunidades de leitura', 'jogos narrativos', 'livros interactivos', 'feedback público']),
  makeOcean('portuguese-micro-influence', 'Portuguese Micro-Influence', 'creators-partnerships-distribution', 'Encontrar criadores portugueses de menor dimensão cuja comunidade e conteúdo tenham verdadeira afinidade com a Maison.', ['criadores em Portugal', 'relevância local', 'envolvimento genuíno', 'custo e viabilidade']),
  makeOcean('collaboration-opportunities', 'Collaboration Opportunities', 'creators-partnerships-distribution', 'Descobrir parcerias com artistas, ilustradores, artesãos, perfumistas, autores e marcas complementares.', ['colaborações criativas', 'artistas e artesãos', 'co-criação', 'adequação e termos']),
  makeOcean('retail-distribution', 'Retail & Distribution', 'creators-partnerships-distribution', 'Identificar lojas independentes, concept stores e espaços de venda adequados à escala e identidade da Maison.', ['lojas independentes', 'concept stores', 'margens e consignação', 'apresentação de produto']),
  makeOcean('hospitality-experiences', 'Hospitality & Experiences', 'creators-partnerships-distribution', 'Investigar oportunidades com alojamentos, hotéis boutique, spas e espaços onde produtos ou experiências sensoriais possam ter valor.', ['hospitalidade', 'ofertas B2B', 'rituais e amenities', 'capacidade de fornecimento']),
  makeOcean('community-building', 'Community Building', 'creators-partnerships-distribution', 'Descobrir formas de criar uma comunidade que acompanha a Maison, participa e recomenda de forma voluntária.', ['participação', 'conteúdo recorrente', 'recomendação', 'rituais de comunidade']),
  makeOcean('global-luxury-design', 'Global Luxury & Design', 'creators-partnerships-distribution', 'Estudar marcas e projectos de luxo, moda, beleza, design, arte e hospitalidade por mecanismos transferíveis.', ['moda e beleza', 'design e arte', 'experiência de luxo', 'princípios não copiáveis']),

  makeOcean('portuguese-culture-sensory-identity', 'Portuguese Culture & Sensory Identity', 'growth-innovation-safety-learning', 'Investigar referências culturais, paisagens, memórias, materiais e expressões portuguesas para criações originais.', ['memória olfativa portuguesa', 'lugares e paisagens', 'artesanato e materiais', 'referências culturais verificadas']),
  makeOcean('seasonal-gifting-opportunities', 'Seasonal & Gifting Opportunities', 'growth-innovation-safety-learning', 'Descobrir ocasiões sazonais e momentos de compra que possam gerar colecções, conjuntos e campanhas viáveis.', ['estações e datas', 'presentes', 'ocasiões menos óbvias', 'planeamento de catálogo']),
  makeOcean('sustainability-circular-design', 'Sustainability & Circular Design', 'growth-innovation-safety-learning', 'Explorar materiais, recargas, reutilização e redução de desperdício com alegações ambientais verificáveis.', ['recargas e reutilização', 'embalagem', 'desperdício de produção', 'provas de alegações ambientais']),
  makeOcean('product-quality-customer-feedback', 'Product Quality & Customer Feedback', 'growth-innovation-safety-learning', 'Aprender com avaliações e feedback para melhorar produto, embalagem, instruções e pós-venda.', ['avaliações públicas', 'reclamações e elogios', 'qualidade e uso', 'acções correctivas']),
  makeOcean('bundles-product-ecosystems', 'Bundles & Product Ecosystems', 'growth-innovation-safety-learning', 'Encontrar combinações coerentes entre velas, névoas, óleos, livros, jogos, testes e experiências, olhando a margem real.', ['conjuntos de produtos', 'ponte físico-digital', 'complementaridade', 'margem e experiência']),
  makeOcean('revenue-models-new-business', 'Revenue Models & New Business', 'growth-innovation-safety-learning', 'Avaliar receitas recorrentes, edições, produtos digitais, serviços, licenciamento e oportunidades B2B adequadas à capacidade da Maison.', ['modelos de receita', 'recorrência e edições', 'B2B e licenciamento', 'capacidade e margem']),
  makeOcean('visual-sensory-design', 'Visual & Sensory Design', 'growth-innovation-safety-learning', 'Estudar cor, materiais, tipografia, embalagem, fotografia e coerência entre experiência física e digital.', ['direcção artística', 'materiais e cor', 'fotografia e embalagem', 'coerência sensorial']),
  makeOcean('emerging-creators-ideas', 'Emerging Creators & New Ideas', 'growth-innovation-safety-learning', 'Descobrir criadores, técnicas, tecnologias e ideias emergentes relevantes para o próximo ciclo da Maison.', ['novos criadores', 'técnicas e formatos', 'tecnologias relevantes', 'ideias com aplicação concreta']),
  makeOcean('emerging-markets-languages', 'Emerging Markets & Languages', 'growth-innovation-safety-learning', 'Avaliar oportunidades internacionais, idiomas, adequação cultural, procura e custos antes de recomendar expansão.', ['mercados internacionais', 'idiomas', 'procura e concorrência', 'logística e cultura']),
  makeOcean('failed-ideas-negative-results', 'Failed Ideas & Negative Results', 'growth-innovation-safety-learning', 'Registar ideias tentadas, resultados negativos e aprendizagens para evitar repetição de erros e variantes cosméticas.', ['experiências falhadas', 'causas e limitações', 'reutilização de aprendizagem', 'deduplicação']),
  makeOcean('unexplored-territories', 'Unexplored Territories', 'growth-innovation-safety-learning', 'Procurar perguntas, necessidades e territórios que não encaixam nos Oceans existentes e propor novos Oceans quando merecido.', ['lacunas de cobertura', 'perguntas sem dono', 'novos territórios', 'propostas de Ocean com evidência']),
  makeOcean('product-safety-regulatory', 'Product Safety & Regulatory Intelligence', 'growth-innovation-safety-learning', 'Identificar requisitos legais, documentação e lacunas de segurança por categoria de produto, encaminhando validações para responsáveis competentes.', ['cosméticos e produtos aromáticos', 'rotulagem e documentação', 'restrições de uso', 'validação por responsável competente'])
];

const KEY_RE = /^[a-z0-9][a-z0-9._:-]{1,159}$/;
const PILLAR_BY_KEY = new Map(PILLARS.map(p => [p.key, p]));
const OCEAN_BY_KEY = new Map(OCEANS.map(o => [o.ocean_key, o]));
const BRAND_OCEANS = OCEANS.filter(o => o.ocean_key.startsWith('brand-'));
const NON_BRAND_PILLARS = PILLARS.filter(p => p.key !== 'luxury-brand-intelligence');

export const OCEAN_CATALOG_VERSION = 'JF-OCEANS-2026.10.1';
export const OCEAN_PILLARS = PILLARS;
export const OCEAN_CATALOG = OCEANS;

export function isValidOceanKey(value) {
  return KEY_RE.test(String(value ?? '').trim().toLowerCase());
}

export function isFoundationalOceanKey(value) {
  return OCEAN_BY_KEY.has(String(value ?? '').trim().toLowerCase());
}

export function getFoundationalOcean(key) {
  return OCEAN_BY_KEY.get(String(key ?? '').trim().toLowerCase()) || null;
}

export function isKnownPillar(key) {
  return PILLAR_BY_KEY.has(String(key ?? '').trim().toLowerCase());
}

export function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizedDynamicRow(row) {
  return {
    ocean_key: String(row.ocean_key),
    display_name: String(row.display_name),
    pillar_key: String(row.pillar_key),
    mission: String(row.mission),
    focus: parseJsonArray(row.focus_json),
    connections: parseJsonArray(row.connections_json),
    lifecycle_state: String(row.lifecycle_state || 'open'),
    origin: 'human_approved_dynamic',
    source_candidate_id: row.source_candidate_id || null
  };
}

export async function loadActiveOceanRegistry(env) {
  const registry = [...OCEANS];
  if (!env?.GROWTH_DB) return registry;
  const result = await env.GROWTH_DB.prepare(`
    SELECT ocean_key,display_name,pillar_key,mission,focus_json,connections_json,lifecycle_state,source_candidate_id
      FROM ocean_specialist_registry
     WHERE lifecycle_state='open'
     ORDER BY created_at,ocean_key
  `).all();
  const known = new Set(registry.map(o => o.ocean_key));
  for (const row of result?.results || []) {
    const item = normalizedDynamicRow(row);
    if (!known.has(item.ocean_key)) {
      registry.push(item);
      known.add(item.ocean_key);
    }
  }
  return registry;
}

export function selectOceanFocus({catalog = OCEANS, runKey = '', limit = 16} = {}) {
  const max = Math.max(1, Math.min(24, Number.parseInt(limit, 10) || 16));
  const byPillar = new Map(PILLARS.map(p => [p.key, []]));
  const dynamic = [];
  for (const ocean of catalog || []) {
    if (!ocean || ocean.lifecycle_state === 'paused' || ocean.lifecycle_state === 'archived') continue;
    if (byPillar.has(ocean.pillar_key)) byPillar.get(ocean.pillar_key).push(ocean);
    else dynamic.push(ocean);
  }
  for (const group of byPillar.values()) group.sort((a, b) => a.ocean_key.localeCompare(b.ocean_key));
  dynamic.sort((a, b) => a.ocean_key.localeCompare(b.ocean_key));
  const seed = [...String(runKey || new Date().toISOString().slice(0, 10))]
    .reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 7);
  const selected = [];
  for (const pillar of PILLARS) {
    const group = byPillar.get(pillar.key) || [];
    if (!group.length) continue;
    if (pillar.key === 'luxury-brand-intelligence') {
      selected.push(group[seed % group.length]);
    } else {
      const offset = Math.floor(seed / 11) % group.length;
      selected.push(group[offset]);
    }
  }
  const brandPool = [...BRAND_OCEANS].sort((a, b) => a.ocean_key.localeCompare(b.ocean_key));
  const used = new Set(selected.map(o => o.ocean_key));
  for (let i = 0; selected.length < max && i < max * 4; i++) {
    let next;
    if (brandPool.length && i < Math.max(0, max - PILLARS.length)) {
      next = brandPool[(seed + i * 7) % brandPool.length];
    } else {
      const all = [...catalog].sort((a, b) => a.ocean_key.localeCompare(b.ocean_key));
      if (!all.length) break;
      next = all[(seed + i * 13) % all.length];
    }
    if (next && !used.has(next.ocean_key)) {
      selected.push(next);
      used.add(next.ocean_key);
    }
  }
  for (const ocean of dynamic) {
    if (selected.length >= max) break;
    if (!used.has(ocean.ocean_key)) {
      selected.push(ocean);
      used.add(ocean.ocean_key);
    }
  }
  return selected.slice(0, max).map(ocean => {
    const links = [...new Set((ocean.connections || []).filter(key => key !== ocean.ocean_key))].slice(0, 8);
    const focus = Array.isArray(ocean.focus) ? ocean.focus : [];
    return {
      ocean_key: ocean.ocean_key,
      display_name: ocean.display_name,
      pillar_key: ocean.pillar_key,
      mission: ocean.mission,
      focus,
      connections: links
    };
  });
}

export function validateOceanProposal(raw, catalog = OCEANS) {
  const key = String(raw?.proposed_ocean_key ?? '').trim().toLowerCase();
  if (!KEY_RE.test(key)) throw new Error('invalid_ocean_proposal_key');
  if (catalog.some(o => o.ocean_key === key)) throw new Error('ocean_proposal_key_exists');
  const pillar = String(raw?.pillar_key ?? '').trim().toLowerCase();
  if (!PILLAR_BY_KEY.has(pillar)) throw new Error('invalid_ocean_proposal_pillar');
  const displayName = String(raw?.display_name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const mission = String(raw?.mission ?? '').trim().replace(/\s+/g, ' ').slice(0, 1200);
  if (displayName.length < 3) throw new Error('invalid_ocean_proposal_name');
  if (mission.length < 20) throw new Error('invalid_ocean_proposal_mission');
  const focus = parseJsonArray(raw?.focus).map(x => String(x).trim().replace(/\s+/g, ' ').slice(0, 200)).filter(Boolean).slice(0, 12);
  if (focus.length < 2) throw new Error('invalid_ocean_proposal_focus');
  const known = new Set(catalog.map(o => o.ocean_key));
  const connections = parseJsonArray(raw?.connections).map(x => String(x).trim().toLowerCase()).filter(x => known.has(x) && x !== key).slice(0, 12);
  return { ocean_key: key, display_name: displayName, pillar_key: pillar, mission, focus, connections };
}

export async function handleOceanCatalogRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/internal/oceans/catalog') return null;
  const enabled = String(env?.OCEAN_MEMORY_ENABLED ?? '').toLowerCase() === 'true';
  if (!enabled) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  if (!env?.BRAIN_CONTROL_TOKEN) return new Response(JSON.stringify({ error: 'ocean_catalog_misconfigured' }), { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  const authorization = request.headers.get('Authorization') || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const expected = String(env.BRAIN_CONTROL_TOKEN);
  let diff = supplied.length ^ expected.length;
  const count = Math.max(supplied.length, expected.length);
  for (let i = 0; i < count; i++) diff |= (supplied.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  if (diff !== 0) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  try {
    const registry = await loadActiveOceanRegistry(env);
    return new Response(JSON.stringify({
      kind: 'ocean_specialist_catalog',
      version: OCEAN_CATALOG_VERSION,
      storage: 'source_control_plus_approved_dynamic_registry',
      foundational_count: OCEANS.length,
      dynamic_count: registry.length - OCEANS.length,
      total_open: registry.length,
      pillars: PILLARS,
      rows: registry
    }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) {
    console.error('Ocean catalog read failed', error?.message || error);
    return new Response(JSON.stringify({ error: 'ocean_catalog_unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
