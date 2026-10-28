// Broad umbrella pillars are retained as stable identifiers for compatibility.
// New specialist pillars make the catalogue navigable at scale. Runtime-approved
// dynamic pillars can extend this list without a source-code release.
const PILLARS = [
  { key: 'scent-product-formulation', name: 'Aromas, essências e formulação — núcleo', mission: 'Núcleo de compatibilidade para a ciência olfactiva e a formulação de produtos.' },
  { key: 'suppliers-production', name: 'Fornecedores e produção — núcleo', mission: 'Núcleo de compatibilidade para aquisição, matérias-primas e produção.' },
  { key: 'portugal-market-opportunity', name: 'Mercado português — núcleo', mission: 'Núcleo de compatibilidade para mercado, concorrência e oportunidades em Portugal.' },
  { key: 'luxury-brand-intelligence', name: 'Maisons e marcas — núcleo', mission: 'Núcleo de compatibilidade para inteligência individual de marcas e as suas variantes.' },
  { key: 'symbolic-systems-audience-entry', name: 'Sistemas simbólicos — núcleo', mission: 'Núcleo de compatibilidade para sistemas simbólicos e novas portas de entrada.' },
  { key: 'ebooks-interactive-publishing', name: 'Edição e publicação — núcleo', mission: 'Núcleo de compatibilidade para ebooks, livros e publicação interactiva.' },
  { key: 'digital-games-experiences', name: 'Jogos digitais — núcleo', mission: 'Núcleo de compatibilidade para jogos digitais e experiências interactivas.' },
  { key: 'human-needs-buying-motives', name: 'Necessidades humanas — núcleo', mission: 'Núcleo de compatibilidade para necessidades humanas e motivações de compra.' },
  { key: 'maison-philosophy-conversion', name: 'Filosofia e conversão — núcleo', mission: 'Núcleo de compatibilidade para filosofia, comunicação e conversão da Maison.' },
  { key: 'creators-partnerships-distribution', name: 'Criadores e distribuição — núcleo', mission: 'Núcleo de compatibilidade para criadores, parcerias e distribuição.' },
  { key: 'growth-innovation-safety-learning', name: 'Crescimento e aprendizagem — núcleo', mission: 'Núcleo de compatibilidade para inovação, segurança, aprendizagem e novos territórios.' },

  { key: 'scent-science-research', name: 'Ciência olfactiva e investigação', mission: 'Investigar famílias olfactivas, matérias aromáticas, percepção, desempenho e evidência sensorial.' },
  { key: 'home-scent-products', name: 'Perfumação de espaços e têxteis', mission: 'Especializar conhecimento sobre névoas, águas perfumadas, águas de lençóis, velas e formatos para o lar.' },
  { key: 'personal-perfumery-formats', name: 'Perfumaria pessoal', mission: 'Estudar perfumes pessoais, concentrações, evolução na pele, formatos, colecções e descoberta.' },
  { key: 'sensory-ritual-experiences', name: 'Rituais sensoriais e experiências de cuidado', mission: 'Ligar aromas, materiais e ocasiões a experiências sensoriais para casa, corpo e presença.' },
  { key: 'supplier-materials-packaging', name: 'Matérias-primas, fornecedores e embalagem', mission: 'Encontrar, avaliar e comparar ingredientes, ceras, recipientes, sais, embalagens, ferramentas e fornecedores.' },
  { key: 'procurement-economics', name: 'Aquisição, custos e economia unitária', mission: 'Comparar custo entregue, portes, impostos aplicáveis, mínimos, desperdício, margens e capacidade de reposição.' },
  { key: 'market-competition-discovery', name: 'Mercado, concorrência e descoberta', mission: 'Investigar procura, concorrência, linguagem do público e lacunas de mercado com fontes datadas.' },
  { key: 'designer-luxury-houses', name: 'Maisons de moda e luxo', mission: 'Estudar casas de moda e luxo individualmente, incluindo linhas, variantes, códigos de marca, campanhas e posicionamento.' },
  { key: 'heritage-sensory-houses', name: 'Casas históricas e património sensorial', mission: 'Investigar casas de perfumaria e design com património, artesanato, rituais e identidade sensorial distintivos.' },
  { key: 'independent-niche-perfumery', name: 'Perfumaria independente e de nicho', mission: 'Estudar casas independentes e de nicho, perfumistas, composições, públicos e estratégias sem imitação.' },
  { key: 'arabian-fragrance-houses', name: 'Casas de perfumaria árabe e mercados relacionados', mission: 'Investigar marcas, tradições, catálogos, ingredientes e públicos de perfumaria árabe com contexto cultural.' },
  { key: 'symbolic-traditions', name: 'Tradições simbólicas e sistemas culturais', mission: 'Explorar Tarot, astrologias ocidental, sideral e védica, numerologias, tradições chinesas e vietnamitas e simbolismo.' },
  { key: 'reflection-tests', name: 'Reflexão, personalidade e testes', mission: 'Investigar formatos de reflexão e testes sobre atenção, apego, afecto e relações sem os apresentar como diagnóstico clínico.' },
  { key: 'editorial-narrative-publishing', name: 'Universos editoriais e narrativa interactiva', mission: 'Descobrir temas editoriais, livros-jogo, universos narrativos, séries e mecânicas de publicação.' },
  { key: 'game-design-social-play', name: 'Design de jogos e experiência social', mission: 'Investigar jogos para duas pessoas, grupos, convívio, descoberta social, mistério, escolhas e repetição.' },
  { key: 'game-growth-economics', name: 'Economia, crescimento e ecossistemas de jogos', mission: 'Estudar monetização, expansões, retenção, ligação entre jogos e livros e viabilidade de experiências digitais.' },
  { key: 'wellbeing-human-needs', name: 'Bem-estar, descanso e necessidades humanas', mission: 'Investigar como as pessoas procuram calma, conforto, descanso, pausa, prazer sensorial e regresso a casa.' },
  { key: 'relationships-social-connection', name: 'Relações, intimidade e conexão social', mission: 'Compreender necessidades de proximidade, amizade, intimidade, presença e experiências sociais seguras.' },
  { key: 'customer-motivations-gifting', name: 'Motivações de compra, presentes e identidade', mission: 'Investigar descoberta, recompensa, luxo acessível, colecção, expressão pessoal, oferta e razões reais de compra.' },
  { key: 'maison-identity-positioning', name: 'Identidade, filosofia e posicionamento Maison', mission: 'Evoluir a filosofia, os princípios, a proposta de valor e o posicionamento da Maison JF sem perder identidade.' },
  { key: 'storytelling-brand-voice', name: 'Voz da marca, storytelling e referências criativas', mission: 'Melhorar voz, narrativa e referências transferíveis, sem copiar obras protegidas nem perder autenticidade.' },
  { key: 'conversion-growth-experiments', name: 'Conversão, experiência comercial e experimentação', mission: 'Melhorar descoberta, páginas, navegação, ofertas, conversão, retenção e aprendizagem através de testes.' },
  { key: 'creator-influence-intelligence', name: 'Criadores e influência', mission: 'Descobrir criadores e comunidades influentes pela adequação, qualidade do público, afinidade e potencial real.' },
  { key: 'partnerships-distribution-retail', name: 'Parcerias, distribuição e canais físicos', mission: 'Encontrar lojas, concept stores, retalho, hotelaria, spas, colaborações e canais de distribuição relevantes.' },
  { key: 'community-audience-development', name: 'Comunidade e desenvolvimento de públicos', mission: 'Construir relações duradouras com comunidades, públicos, leitores, jogadores e pessoas que acompanham a Maison.' },
  { key: 'product-quality-safety-regulatory', name: 'Qualidade, segurança e conformidade', mission: 'Acompanhar qualidade, documentação, segurança de produto e requisitos legais, assinalando lacunas para validação competente.' },
  { key: 'sustainability-circular-design', name: 'Sustentabilidade e desenho circular', mission: 'Investigar reutilização, recargas, materiais, desperdício e escolhas sustentáveis apenas quando apoiadas por evidência.' },
  { key: 'bundles-revenue-ecosystems', name: 'Conjuntos, ecossistemas e novos modelos de receita', mission: 'Encontrar combinações de activos, ofertas, receitas e ecossistemas viáveis considerando custos, margens e capacidade.' },
  { key: 'visual-sensory-design', name: 'Design visual e experiência sensorial', mission: 'Estudar cor, materiais, embalagem, fotografia, tipografia, objectos e coerência entre experiência física e digital.' },
  { key: 'culture-seasonality-expansion', name: 'Cultura portuguesa, sazonalidade e ocasiões', mission: 'Transformar cultura, estações, datas e ocasiões em oportunidades relevantes, respeitando contexto e originalidade.' },
  { key: 'market-innovation-opportunities', name: 'Inovação, espaços por explorar e novos mercados', mission: 'Identificar necessidades não servidas, conceitos emergentes e oportunidades pioneiras com verificação de mercado explícita.' },
  { key: 'research-evidence-analytics', name: 'Investigação, evidência, dados e análise', mission: 'Avaliar fontes, confiança, novidade, resultados, métricas e hipóteses, distinguindo correlação, inferência e evidência.' },
  { key: 'operations-production-scale', name: 'Operações, produção e capacidade de escala', mission: 'Melhorar processos, equipamentos, repetibilidade, capacidade, dependências e eficiência operacional.' },
  { key: 'maison-internal-growth', name: 'Crescimento interno da Maison', mission: 'Apoiar estratégia interna, sistemas, operações, capacidades e decisões da Maison através do quadro canónico de crescimento.' },
  { key: 'founder-personal-growth', name: 'Desenvolvimento pessoal do fundador', mission: 'Disponibilizar aprendizagem relevante e opt-in ao fundador, protegendo privacidade, autonomia e contexto pessoal.' },
  { key: 'ethics-trust-human-impact', name: 'Ética, confiança e impacto humano', mission: 'Avaliar limites éticos, privacidade, persuasão responsável, impacto humano e confiança nas decisões do sistema.' }
];

const CORE_LINKS = {
  'scent-product-formulation': ['fragrance-suppliers', 'human-needs-buying-motivations', 'portugal-market-white-space', 'product-safety-regulatory'],
  'suppliers-production': ['fragrance-formulation-lab', 'portugal-market-white-space', 'procurement-economics', 'supplier-reliability'],
  'portugal-market-opportunity': ['human-needs-buying-motivations', 'customer-search-language', 'supplier-intelligence', 'market-gaps-competitor-weaknesses'],
  'luxury-brand-intelligence': ['fragrance-formulation-lab', 'maison-philosophy', 'visual-sensory-design', 'portugal-market-white-space'],
  'symbolic-systems-audience-entry': ['ebooks-themes', 'digital-game-concepts', 'human-needs-buying-motivations', 'creator-intelligence'],
  'ebooks-interactive-publishing': ['interactive-book-games', 'digital-game-concepts', 'reader-demand', 'story-worlds-spin-offs'],
  'digital-games-experiences': ['interactive-book-games', 'human-needs-buying-motivations', 'copywriting-conversion', 'story-worlds-spin-offs'],
  'human-needs-buying-motives': ['fragrance-formulation-lab', 'digital-game-concepts', 'customer-search-language', 'copywriting-conversion'],
  'maison-philosophy-conversion': ['brand-positioning', 'human-needs-buying-motivations', 'customer-research', 'failed-ideas-negative-results'],
  'creators-partnerships-distribution': ['portugal-market-white-space', 'creator-intelligence', 'community-building', 'retail-distribution'],
  'growth-innovation-safety-learning': ['portugal-market-white-space', 'supplier-intelligence', 'product-safety-regulatory', 'failed-ideas-negative-results', 'unexplored-territories']
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
  makeOcean('product-safety-regulatory', 'Product Safety & Regulatory Intelligence', 'growth-innovation-safety-learning', 'Identificar requisitos legais, documentação e lacunas de segurança por categoria de produto, encaminhando validações para responsáveis competentes.', ['cosméticos e produtos aromáticos', 'rotulagem e documentação', 'restrições de uso', 'validação por responsável competente']),
  makeOcean('maison-internal-growth', 'Maison Internal Growth', 'maison-internal-growth', 'Integrar conhecimento útil para estratégia interna, operações, sistemas e capacidades da Maison através do quadro de crescimento canónico.', ['estratégia interna', 'operações e sistemas', 'capacidade organizacional', 'aprendizagem transversal'], ['research-evidence-analytics','operations-production-scale','conversion-growth-experiments']),
  makeOcean('founder-personal-growth', 'Founder Personal Growth', 'founder-personal-growth', 'Disponibilizar aprendizagem relevante para o crescimento pessoal do fundador apenas em contexto privado e opt-in, sem inferir traços ou expor dados pessoais.', ['aprendizagem opt-in', 'desenvolvimento de capacidades', 'decisão e reflexão', 'privacidade e agência'], ['maison-internal-growth','research-evidence-analytics','ethics-trust-human-impact'])
];

// Keep legacy pillars addressable while routing specialist Oceans into smaller,
// more meaningful territories. The brand clusters are first-class Oceans per brand.
const OCEAN_PILLAR_OVERRIDES = {
  'olfactory-universe':'scent-science-research',
  'fragrance-formulation-lab':'scent-product-formulation',
  'home-fragrance':'home-scent-products',
  'linen-textile-fragrance':'home-scent-products',
  'scented-candles':'home-scent-products',
  'personal-perfumery':'personal-perfumery-formats',
  'massage-body-rituals':'sensory-ritual-experiences',
  'scent-layering':'sensory-ritual-experiences',
  'aroma-by-occasion':'sensory-ritual-experiences',
  'sensory-innovation':'sensory-ritual-experiences',
  'proven-aroma-formulas':'scent-science-research',
  'supplier-intelligence':'suppliers-production',
  'waxes-candle-materials':'supplier-materials-packaging',
  'fragrance-suppliers':'supplier-materials-packaging',
  'containers-vessels':'supplier-materials-packaging',
  'salts-botanical-materials':'supplier-materials-packaging',
  'packaging-printing':'supplier-materials-packaging',
  'production-equipment':'operations-production-scale',
  'procurement-economics':'procurement-economics',
  'supplier-reliability':'suppliers-production',
  'european-sourcing':'supplier-materials-packaging',
  'portugal-market-white-space':'portugal-market-opportunity',
  'market-gaps-competitor-weaknesses':'market-competition-discovery',
  'customer-search-language':'market-competition-discovery',
  'competitor-price-intelligence':'market-competition-discovery',
  'tarot-oracles':'symbolic-systems-audience-entry',
  'western-astrology':'symbolic-traditions',
  'sidereal-astrology':'symbolic-traditions',
  'vedic-astrology-jyotisha':'symbolic-traditions',
  'chinese-metaphysics':'symbolic-traditions',
  'vietnamese-zodiac-traditions':'symbolic-traditions',
  'numerology':'symbolic-traditions',
  'dreams-symbolism':'symbolic-traditions',
  'archetypes-mythology':'symbolic-traditions',
  'seasonal-rituals':'culture-seasonality-expansion',
  'personal-reflection':'reflection-tests',
  'personality-relationship-tests':'reflection-tests',
  'ebooks-themes':'ebooks-interactive-publishing',
  'interactive-fiction':'editorial-narrative-publishing',
  'interactive-book-games':'editorial-narrative-publishing',
  'editorial-series-development':'editorial-narrative-publishing',
  'first-thirteen-book-cycle':'editorial-narrative-publishing',
  'future-book-universes':'editorial-narrative-publishing',
  'interactive-narrative-mechanics':'editorial-narrative-publishing',
  'reader-demand':'editorial-narrative-publishing',
  'book-packaging-positioning':'editorial-narrative-publishing',
  'publishing-opportunities':'editorial-narrative-publishing',
  'story-worlds-spin-offs':'editorial-narrative-publishing',
  'digital-game-concepts':'digital-games-experiences',
  'two-player-games':'game-design-social-play',
  'group-party-games':'game-design-social-play',
  'couples-connection-games':'game-design-social-play',
  'social-discovery-games':'game-design-social-play',
  'mystery-investigation-games':'game-design-social-play',
  'choice-based-games':'game-design-social-play',
  'replayability-expansions':'game-growth-economics',
  'game-monetisation':'game-growth-economics',
  'game-book-ecosystems':'game-growth-economics',
  'human-needs-buying-motivations':'human-needs-buying-motives',
  'calm-unwinding':'wellbeing-human-needs',
  'homecoming-comfort':'wellbeing-human-needs',
  'sleep-evening-rituals':'wellbeing-human-needs',
  'emotional-gifting':'customer-motivations-gifting',
  'identity-self-expression':'customer-motivations-gifting',
  'sensory-pleasure':'wellbeing-human-needs',
  'connection-intimacy':'relationships-social-connection',
  'discovery-novelty':'customer-motivations-gifting',
  'affordable-luxury':'customer-motivations-gifting',
  'ritual-meaning':'wellbeing-human-needs',
  'home-atmosphere':'wellbeing-human-needs',
  'collecting-personal-curation':'customer-motivations-gifting',
  'stress-overload-digital-fatigue':'wellbeing-human-needs',
  'personal-rewards':'customer-motivations-gifting',
  'quiet-social-experiences':'relationships-social-connection',
  'maison-philosophy':'maison-identity-positioning',
  'brand-positioning':'maison-identity-positioning',
  'copywriting-conversion':'conversion-growth-experiments',
  'offer-architecture':'bundles-revenue-ecosystems',
  'pricing-value':'procurement-economics',
  'customer-journey':'conversion-growth-experiments',
  'mobile-commerce':'conversion-growth-experiments',
  'brand-voice-feral-frontality':'storytelling-brand-voice',
  'storytelling':'storytelling-brand-voice',
  'retention-loyalty':'community-audience-development',
  'experiments-conversion-learning':'research-evidence-analytics',
  'psychology-decision':'customer-motivations-gifting',
  'choice-architecture':'conversion-growth-experiments',
  'customer-research':'research-evidence-analytics',
  'experience-design':'visual-sensory-design',
  'ethical-persuasion':'ethics-trust-human-impact',
  'transferable-excellence-atelier':'maison-identity-positioning',
  'creator-intelligence':'creators-partnerships-distribution',
  'fragrance-creators':'creator-influence-intelligence',
  'tarot-astrology-creators':'creator-influence-intelligence',
  'book-game-communities':'community-audience-development',
  'portuguese-micro-influence':'creator-influence-intelligence',
  'collaboration-opportunities':'partnerships-distribution-retail',
  'retail-distribution':'partnerships-distribution-retail',
  'hospitality-experiences':'partnerships-distribution-retail',
  'community-building':'community-audience-development',
  'global-luxury-design':'luxury-brand-intelligence',
  'portuguese-culture-sensory-identity':'culture-seasonality-expansion',
  'seasonal-gifting-opportunities':'culture-seasonality-expansion',
  'sustainability-circular-design':'sustainability-circular-design',
  'product-quality-customer-feedback':'product-quality-safety-regulatory',
  'bundles-product-ecosystems':'bundles-revenue-ecosystems',
  'revenue-models-new-business':'bundles-revenue-ecosystems',
  'visual-sensory-design':'visual-sensory-design',
  'emerging-creators-ideas':'market-innovation-opportunities',
  'emerging-markets-languages':'market-innovation-opportunities',
  'failed-ideas-negative-results':'research-evidence-analytics',
  'unexplored-territories':'growth-innovation-safety-learning',
  'product-safety-regulatory':'product-quality-safety-regulatory',
  'maison-internal-growth':'maison-internal-growth',
  'founder-personal-growth':'founder-personal-growth'
};
const BRAND_PILLAR = {
  'brand-tom-ford':'designer-luxury-houses',
  'brand-dior':'designer-luxury-houses',
  'brand-yves-saint-laurent':'designer-luxury-houses',
  'brand-chanel':'luxury-brand-intelligence',
  'brand-hermes':'designer-luxury-houses',
  'brand-guerlain':'heritage-sensory-houses',
  'brand-jo-malone-london':'heritage-sensory-houses',
  'brand-diptyque':'heritage-sensory-houses',
  'brand-byredo':'independent-niche-perfumery',
  'brand-le-labo':'independent-niche-perfumery',
  'brand-maison-margiela-fragrances':'designer-luxury-houses',
  'brand-loewe':'designer-luxury-houses',
  'brand-prada':'designer-luxury-houses',
  'brand-giorgio-armani-prive':'designer-luxury-houses',
  'brand-gucci-beauty':'designer-luxury-houses',
  'brand-valentino-beauty':'designer-luxury-houses',
  'brand-narciso-rodriguez':'designer-luxury-houses',
  'brand-maison-francis-kurkdjian':'independent-niche-perfumery',
  'brand-kilian-paris':'independent-niche-perfumery',
  'brand-amouage':'arabian-fragrance-houses',
  'brand-creed':'independent-niche-perfumery',
  'brand-parfums-de-marly':'independent-niche-perfumery',
  'brand-xerjoff':'independent-niche-perfumery',
  'brand-initio-parfums-prives':'independent-niche-perfumery',
  'brand-serge-lutens':'independent-niche-perfumery',
  'brand-frederic-malle':'independent-niche-perfumery',
  'brand-bdk-parfums':'independent-niche-perfumery',
  'brand-essential-parfums':'independent-niche-perfumery',
  'brand-juliette-has-a-gun':'independent-niche-perfumery',
  'brand-escentric-molecules':'independent-niche-perfumery',
  'brand-acqua-di-parma':'heritage-sensory-houses',
  'brand-floris-london':'heritage-sensory-houses',
  'brand-aesop':'heritage-sensory-houses',
  'brand-santa-maria-novella':'heritage-sensory-houses',
  'brand-orto-parisi':'independent-niche-perfumery',
  'brand-tiziana-terenzi':'independent-niche-perfumery',
  'brand-montale':'arabian-fragrance-houses',
  'brand-mancera':'arabian-fragrance-houses',
  'brand-lattafa':'arabian-fragrance-houses',
  'brand-swiss-arabian':'arabian-fragrance-houses',
  'brand-arabian-oud':'arabian-fragrance-houses',
  'brand-ajmal':'arabian-fragrance-houses',
  'brand-maison-crivelli':'independent-niche-perfumery',
  'brand-nishane':'independent-niche-perfumery',
  'brand-goldfield-and-banks':'independent-niche-perfumery',
  'brand-ds-and-durga':'independent-niche-perfumery',
  'brand-commodity':'independent-niche-perfumery',
  'brand-imaginary-authors':'independent-niche-perfumery',
  'brand-zoologist-perfumes':'independent-niche-perfumery'
};
const PILLAR_LINKS = {
  'scent-science-research':['home-scent-products','personal-perfumery-formats','supplier-materials-packaging','wellbeing-human-needs','product-quality-safety-regulatory','research-evidence-analytics'],
  'home-scent-products':['scent-science-research','sensory-ritual-experiences','supplier-materials-packaging','wellbeing-human-needs','customer-motivations-gifting','portugal-market-opportunity'],
  'personal-perfumery-formats':['scent-science-research','designer-luxury-houses','heritage-sensory-houses','independent-niche-perfumery','arabian-fragrance-houses','customer-motivations-gifting'],
  'supplier-materials-packaging':['procurement-economics','operations-production-scale','product-quality-safety-regulatory','sustainability-circular-design','scent-science-research'],
  'procurement-economics':['supplier-materials-packaging','bundles-revenue-ecosystems','customer-motivations-gifting','operations-production-scale'],
  'market-competition-discovery':['market-innovation-opportunities','customer-motivations-gifting','conversion-growth-experiments','creator-influence-intelligence','research-evidence-analytics'],
  'designer-luxury-houses':['heritage-sensory-houses','independent-niche-perfumery','storytelling-brand-voice','visual-sensory-design','maison-identity-positioning'],
  'heritage-sensory-houses':['designer-luxury-houses','independent-niche-perfumery','visual-sensory-design','scent-science-research'],
  'independent-niche-perfumery':['arabian-fragrance-houses','scent-science-research','designer-luxury-houses','customer-motivations-gifting'],
  'arabian-fragrance-houses':['independent-niche-perfumery','scent-science-research','symbolic-traditions','customer-motivations-gifting'],
  'symbolic-traditions':['reflection-tests','editorial-narrative-publishing','game-design-social-play','creator-influence-intelligence','ethics-trust-human-impact'],
  'reflection-tests':['wellbeing-human-needs','relationships-social-connection','symbolic-traditions','ethics-trust-human-impact','game-design-social-play'],
  'editorial-narrative-publishing':['game-design-social-play','symbolic-traditions','community-audience-development','customer-motivations-gifting'],
  'game-design-social-play':['relationships-social-connection','reflection-tests','editorial-narrative-publishing','game-growth-economics','community-audience-development'],
  'game-growth-economics':['bundles-revenue-ecosystems','editorial-narrative-publishing','conversion-growth-experiments','community-audience-development'],
  'wellbeing-human-needs':['sensory-ritual-experiences','home-scent-products','customer-motivations-gifting','maison-internal-growth'],
  'relationships-social-connection':['reflection-tests','game-design-social-play','community-audience-development','founder-personal-growth'],
  'customer-motivations-gifting':['wellbeing-human-needs','visual-sensory-design','bundles-revenue-ecosystems','conversion-growth-experiments'],
  'maison-identity-positioning':['storytelling-brand-voice','conversion-growth-experiments','designer-luxury-houses','research-evidence-analytics'],
  'storytelling-brand-voice':['maison-identity-positioning','editorial-narrative-publishing','creator-influence-intelligence','visual-sensory-design'],
  'conversion-growth-experiments':['research-evidence-analytics','market-competition-discovery','customer-motivations-gifting','maison-internal-growth'],
  'creator-influence-intelligence':['community-audience-development','partnerships-distribution-retail','market-competition-discovery','content-discovery'],
  'partnerships-distribution-retail':['creator-influence-intelligence','bundles-revenue-ecosystems','operations-production-scale','maison-internal-growth'],
  'community-audience-development':['relationships-social-connection','game-design-social-play','editorial-narrative-publishing','creator-influence-intelligence'],
  'product-quality-safety-regulatory':['supplier-materials-packaging','scent-science-research','ethics-trust-human-impact','research-evidence-analytics'],
  'sustainability-circular-design':['supplier-materials-packaging','visual-sensory-design','operations-production-scale'],
  'bundles-revenue-ecosystems':['procurement-economics','customer-motivations-gifting','conversion-growth-experiments','game-growth-economics'],
  'visual-sensory-design':['storytelling-brand-voice','designer-luxury-houses','home-scent-products','sustainability-circular-design'],
  'culture-seasonality-expansion':['home-scent-products','symbolic-traditions','customer-motivations-gifting','portugal-market-opportunity'],
  'market-innovation-opportunities':['market-competition-discovery','scent-science-research','emerging-markets-languages','unexplored-territories'],
  'research-evidence-analytics':['market-competition-discovery','conversion-growth-experiments','product-quality-safety-regulatory','maison-internal-growth'],
  'operations-production-scale':['supplier-materials-packaging','procurement-economics','product-quality-safety-regulatory','sustainability-circular-design'],
  'maison-internal-growth':['research-evidence-analytics','operations-production-scale','conversion-growth-experiments','bundles-revenue-ecosystems'],
  'founder-personal-growth':['maison-internal-growth','research-evidence-analytics','ethics-trust-human-impact'],
  'ethics-trust-human-impact':['product-quality-safety-regulatory','reflection-tests','symbolic-traditions','founder-personal-growth']
};
for (const ocean of OCEANS) {
  const target = OCEAN_PILLAR_OVERRIDES[ocean.ocean_key] || BRAND_PILLAR[ocean.ocean_key];
  if (target) ocean.pillar_key = target;
}
for (const ocean of OCEANS) {
  const related = [...new Set((PILLAR_LINKS[ocean.pillar_key] || []).flatMap(pillarKey =>
    OCEANS.filter(candidate => candidate.pillar_key === pillarKey && candidate.ocean_key !== ocean.ocean_key)
      .slice(0, 2)
      .map(candidate => candidate.ocean_key)
  ))];
  ocean.connections = [...new Set([...(ocean.connections || []), ...related])];
}
// Materialize typed cross-links on each pillar for downstream graph consumers.
for (const pillar of PILLARS) {
  pillar.connections = [...new Set(PILLAR_LINKS[pillar.key] || [])];
}

const FOUNDATIONAL_KEYS = new Set(OCEANS.map(ocean => ocean.ocean_key));
for (const ocean of OCEANS) {
  ocean.connections = [...new Set((ocean.connections || []).filter(key => key !== ocean.ocean_key && FOUNDATIONAL_KEYS.has(key)))];
}

const KEY_RE = /^[a-z0-9][a-z0-9._:-]{1,159}$/;
const PILLAR_BY_KEY = new Map(PILLARS.map(p => [p.key, p]));
const OCEAN_BY_KEY = new Map(OCEANS.map(o => [o.ocean_key, o]));
const BRAND_OCEANS = OCEANS.filter(o => o.ocean_key.startsWith('brand-'));
const NON_BRAND_PILLARS = PILLARS.filter(p => p.key !== 'luxury-brand-intelligence');

export const OCEAN_CATALOG_VERSION = 'JF-OCEANS-2026.10.2';
const PILLAR_KEY_RE = /^[a-z0-9][a-z0-9._:-]{1,159}$/;
const normaliseKey = value => String(value ?? '').trim().toLowerCase();
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

function normalisedDynamicPillar(row) {
  return {
    key: String(row.pillar_key),
    name: String(row.display_name),
    mission: String(row.mission),
    focus: parseJsonArray(row.focus_json),
    connections: parseJsonArray(row.connections_json),
    parent_pillars: parseJsonArray(row.parent_pillars_json),
    lifecycle_state: String(row.lifecycle_state || 'open'),
    origin: 'human_approved_dynamic',
    source_candidate_id: row.source_candidate_id || null
  };
}

export async function loadActivePillarRegistry(env) {
  const registry = [...PILLARS.map(p => ({ ...p }))];
  if (!env?.GROWTH_DB) return registry;
  const result = await env.GROWTH_DB.prepare(`
    SELECT pillar_key,display_name,mission,focus_json,connections_json,parent_pillars_json,lifecycle_state,source_candidate_id
      FROM ocean_pillar_registry
     WHERE lifecycle_state='open'
     ORDER BY created_at,pillar_key
  `).all();
  const known = new Set(registry.map(p => p.key));
  for (const row of result?.results || []) {
    const item = normalisedDynamicPillar(row);
    if (!known.has(item.key)) {
      registry.push(item);
      known.add(item.key);
    }
  }
  const allKeys = new Set(registry.map(p => p.key));
  for (const pillar of registry) {
    pillar.connections = [...new Set((pillar.connections || []).filter(key => key !== pillar.key && allKeys.has(key)))];
    pillar.parent_pillars = [...new Set((pillar.parent_pillars || []).filter(key => key !== pillar.key && allKeys.has(key)))];
  }
  return registry;
}

export async function loadActiveOceanRegistry(env) {
  const registry = [...OCEANS];
  if (!env?.GROWTH_DB) return registry;
  const [result, pillars] = await Promise.all([
    env.GROWTH_DB.prepare(`
      SELECT ocean_key,display_name,pillar_key,mission,focus_json,connections_json,lifecycle_state,source_candidate_id
        FROM ocean_specialist_registry
       WHERE lifecycle_state='open'
       ORDER BY created_at,ocean_key
    `).all(),
    loadActivePillarRegistry(env)
  ]);
  const known = new Set(registry.map(o => o.ocean_key));
  const knownPillars = new Set(pillars.map(p => p.key));
  for (const row of result?.results || []) {
    const item = normalizedDynamicRow(row);
    if (!known.has(item.ocean_key) && knownPillars.has(item.pillar_key)) {
      registry.push(item);
      known.add(item.ocean_key);
    }
  }
  return registry;
}

export function selectOceanFocus({catalog = OCEANS, pillars = PILLARS, runKey = '', limit = 16} = {}) {
  const max = Math.max(1, Math.min(128, Number.parseInt(limit, 10) || 16));
  const activePillars = [...(pillars || PILLARS)].filter(p => p && p.lifecycle_state !== 'paused' && p.lifecycle_state !== 'archived');
  const byPillar = new Map(activePillars.map(p => [p.key, []]));
  const unclassified = [];
  for (const ocean of catalog || []) {
    if (!ocean || ocean.lifecycle_state === 'paused' || ocean.lifecycle_state === 'archived') continue;
    if (byPillar.has(ocean.pillar_key)) byPillar.get(ocean.pillar_key).push(ocean);
    else unclassified.push(ocean);
  }
  for (const group of byPillar.values()) group.sort((a, b) => a.ocean_key.localeCompare(b.ocean_key));
  unclassified.sort((a, b) => a.ocean_key.localeCompare(b.ocean_key));
  const seed = [...String(runKey || new Date().toISOString().slice(0, 10))]
    .reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 7);
  const activeWithOceans = activePillars.filter(p => (byPillar.get(p.key) || []).length > 0);
  const rotation = activeWithOceans.length ? seed % activeWithOceans.length : 0;
  const orderedPillars = [...activeWithOceans.slice(rotation), ...activeWithOceans.slice(0, rotation)];
  const selected = [];
  for (const pillar of orderedPillars) {
    if (selected.length >= max) break;
    const group = byPillar.get(pillar.key) || [];
    if (!group.length) continue;
    const offset = Math.floor(seed / 11) % group.length;
    selected.push((pillar.key.includes('brand') || pillar.key.includes('perfumery') || pillar.key.includes('maison'))
      ? group[(seed + selected.length * 7) % group.length]
      : group[offset]);
  }
  const brandPool = [...(catalog || [])].filter(o => o?.ocean_key?.startsWith('brand-'))
    .sort((a, b) => a.ocean_key.localeCompare(b.ocean_key));
  if (max >= 8 && brandPool.length && !selected.some(o => o.ocean_key.startsWith('brand-'))) {
    const brand = brandPool[seed % brandPool.length];
    if (!selected.some(o => o.ocean_key === brand.ocean_key) && selected.length) selected[selected.length - 1] = brand;
  }
  const all = [...(catalog || [])].filter(o => o && o.lifecycle_state !== 'paused' && o.lifecycle_state !== 'archived')
    .sort((a, b) => a.ocean_key.localeCompare(b.ocean_key));
  const used = new Set(selected.map(o => o.ocean_key));
  for (let i = 0; selected.length < max && i < max * 6; i++) {
    const next = all.length ? all[(seed + i * 13) % all.length] : null;
    if (next && !used.has(next.ocean_key)) {
      selected.push(next);
      used.add(next.ocean_key);
    }
  }
  for (const ocean of unclassified) {
    if (selected.length >= max) break;
    if (!used.has(ocean.ocean_key)) {
      selected.push(ocean);
      used.add(ocean.ocean_key);
    }
  }
  const knownKeys = new Set((catalog || []).map(ocean => ocean?.ocean_key).filter(Boolean));
  const knownPillarKeys = new Set(activePillars.map(p => p.key));
  return selected.slice(0, max).map(ocean => ({
    ocean_key: ocean.ocean_key,
    display_name: ocean.display_name,
    pillar_key: ocean.pillar_key,
    mission: ocean.mission,
    focus: Array.isArray(ocean.focus) ? ocean.focus : [],
    connections: [...new Set((ocean.connections || []).filter(key => key !== ocean.ocean_key && knownKeys.has(key)))].slice(0, 12),
    connected_pillars: [...new Set((activePillars.find(p => p.key === ocean.pillar_key)?.connections || []).filter(key => key !== ocean.pillar_key && knownPillarKeys.has(key)))].slice(0, 12)
  }));
}

export function selectPillarFocus({pillars = PILLARS, focusOceans = [], runKey = '', limit = 48} = {}) {
  const max=Math.max(1,Math.min(128,Number.parseInt(limit,10)||48));
  const active=[...(pillars||PILLARS)].filter(p=>p&&p.lifecycle_state!=='paused'&&p.lifecycle_state!=='archived');
  const byKey=new Map(active.map(p=>[p.key,p]));
  const selected=[];
  const selectedKeys=new Set();
  const add=key=>{
    const item=byKey.get(key);
    if(item&&!selectedKeys.has(item.key)&&selected.length<max){
      selected.push(item);
      selectedKeys.add(item.key);
      return true;
    }
    return false;
  };
  // Local graph neighbourhood first: the current Ocean focuses and their linked pillars.
  const seeds=[];
  for(const ocean of focusOceans||[]){
    if(ocean?.pillar_key&&!seeds.includes(ocean.pillar_key))seeds.push(ocean.pillar_key);
  }
  for(const key of seeds)add(key);
  let frontier=[...selected];
  for(let depth=0;depth<2&&selected.length<max;depth++){
    const next=[];
    for(const pillar of frontier){
      for(const linked of [...(pillar.connections||[]),...(pillar.parent_pillars||[])]){
        if(add(linked))next.push(byKey.get(linked));
      }
    }
    frontier=next;
  }
  // Then explore the broader network with a deterministic rotating window,
  // avoiding a permanent bias toward the first alphabetic/database records.
  const seed=[...String(runKey||new Date().toISOString().slice(0,10))]
    .reduce((n,char)=>(n*31+char.charCodeAt(0))>>>0,7);
  if(active.length){
    const start=seed%active.length;
    for(let i=0;selected.length<max&&i<active.length;i++){
      add(active[(start+i)%active.length].key);
    }
  }
  return selected.slice(0,max).map(p=>({
    ...p,
    connections:[...(p.connections||[])],
    parent_pillars:[...(p.parent_pillars||[])]
  }));
}

export function validateOceanProposal(raw, catalog = OCEANS, pillars = PILLARS) {
  const key = normaliseKey(raw?.proposed_ocean_key);
  if (!KEY_RE.test(key)) throw new Error('invalid_ocean_proposal_key');
  if (catalog.some(o => o.ocean_key === key)) throw new Error('ocean_proposal_key_exists');
  const pillar = normaliseKey(raw?.pillar_key);
  if (!(pillars || PILLARS).some(p => p.key === pillar)) throw new Error('invalid_ocean_proposal_pillar');
  const displayName = String(raw?.display_name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const mission = String(raw?.mission ?? '').trim().replace(/\s+/g, ' ').slice(0, 1200);
  if (displayName.length < 3) throw new Error('invalid_ocean_proposal_name');
  if (mission.length < 20) throw new Error('invalid_ocean_proposal_mission');
  const focus = parseJsonArray(raw?.focus).map(x => String(x).trim().replace(/\s+/g, ' ').slice(0, 200)).filter(Boolean).slice(0, 12);
  if (focus.length < 2) throw new Error('invalid_ocean_proposal_focus');
  const known = new Set(catalog.map(o => o.ocean_key));
  const connections = [...new Set(parseJsonArray(raw?.connections).map(normaliseKey).filter(connectionKey => known.has(connectionKey) && connectionKey !== key))].slice(0, 12);
  return { ocean_key: key, display_name: displayName, pillar_key: pillar, mission, focus, connections };
}

export function validatePillarProposal(raw, pillars = PILLARS) {
  const key = normaliseKey(raw?.proposed_pillar_key);
  if (!PILLAR_KEY_RE.test(key)) throw new Error('invalid_pillar_proposal_key');
  if ((pillars || PILLARS).some(p => p.key === key)) throw new Error('pillar_proposal_key_exists');
  const displayName = String(raw?.display_name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const mission = String(raw?.mission ?? '').trim().replace(/\s+/g, ' ').slice(0, 1200);
  if (displayName.length < 3) throw new Error('invalid_pillar_proposal_name');
  if (mission.length < 30) throw new Error('invalid_pillar_proposal_mission');
  const known = new Set((pillars || PILLARS).map(p => p.key));
  const connections = [...new Set(parseJsonArray(raw?.connections).map(normaliseKey).filter(connected => known.has(connected) && connected !== key))].slice(0, 12);
  const parents = [...new Set(parseJsonArray(raw?.parent_pillars).map(normaliseKey).filter(parent => known.has(parent) && parent !== key))].slice(0, 8);
  if (!connections.length && !parents.length) throw new Error('pillar_proposal_requires_links');
  const focus = parseJsonArray(raw?.focus).map(x => String(x).trim().replace(/\s+/g, ' ').slice(0, 200)).filter(Boolean).slice(0, 12);
  if (focus.length < 2) throw new Error('invalid_pillar_proposal_focus');
  return { key, display_name: displayName, mission, connections, parent_pillars: parents, focus };
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
