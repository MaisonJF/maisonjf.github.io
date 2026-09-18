/** MAISON JF® | O Farol — curadoria por momento humano */
(function(){
'use strict';

function track(name,parameters={}){
  if(window.maisonAnalytics&&typeof window.maisonAnalytics.track==='function'){
    window.maisonAnalytics.track(name,parameters);
  }
}

const data={
  "step1": {
    "decisao": {
      "question": "O que te faria sair daqui diferente?",
      "options": [
        {
          "key": "perspectiva",
          "label": "Ver isto de um ângulo que ainda não vi."
        },
        {
          "key": "falar",
          "label": "Dizer o caso todo sem receber mais uma opinião solta."
        },
        {
          "key": "reler",
          "label": "Receber algo por escrito e voltar quando a cabeça recomeçar."
        },
        {
          "key": "padrao",
          "label": "Perceber porque volto sempre ao mesmo ponto."
        }
      ]
    },
    "relacao": {
      "question": "O que queres mesmo desta noite?",
      "options": [
        {
          "key": "resposta",
          "label": "Uma resposta à pergunta que não me larga."
        },
        {
          "key": "fundo",
          "label": "Perceber o que esta história está a fazer comigo."
        },
        {
          "key": "cortar",
          "label": "Parar de ir às mensagens, às redes, à mesma conversa."
        },
        {
          "key": "historia",
          "label": "Entrar noutra história por umas horas."
        },
        {
          "key": "presenca",
          "label": "Não quero analisar. Queria presença."
        }
      ]
    },
    "cansaco": {
      "question": "O que o teu corpo te está a pedir sem palavras?",
      "options": [
        {
          "key": "agua",
          "label": "Calor. Água. Dez minutos em que ninguém me pede nada."
        },
        {
          "key": "toque",
          "label": "Toque. Quero sentir o corpo aqui, não só a cabeça."
        },
        {
          "key": "luz",
          "label": "Que a casa baixe o tom comigo."
        },
        {
          "key": "historia",
          "label": "Que a cabeça vá viver outra história por um bocado."
        },
        {
          "key": "continua",
          "label": "Isto já não é só hoje. Preciso de continuidade."
        }
      ]
    },
    "casa": {
      "question": "O que devia mudar primeiro quando entras?",
      "options": [
        {
          "key": "ar",
          "label": "O ar. Quero sentir a diferença antes de pensar nela."
        },
        {
          "key": "luz",
          "label": "A luz e o ritmo. Quero que a casa diga: acabou por hoje."
        },
        {
          "key": "corpo",
          "label": "O corpo. Quero um ritual que me obrigue a parar."
        },
        {
          "key": "ritual",
          "label": "A atmosfera toda. Quero algo mais ritual do que perfumar."
        }
      ]
    },
    "trabalho": {
      "question": "O que está realmente a pedir movimento?",
      "options": [
        {
          "key": "escolher",
          "label": "Tenho uma decisão que já não cabe em mais uma lista."
        },
        {
          "key": "descarregar",
          "label": "Preciso de dizer tudo sem receber mais uma opinião."
        },
        {
          "key": "aprofundar",
          "label": "Isto tem história. Não é só “mudar ou ficar”."
        },
        {
          "key": "projeto",
          "label": "Quero tirar um projecto do ponto morto."
        },
        {
          "key": "desligar",
          "label": "Hoje só quero que o trabalho fique do lado de fora."
        }
      ]
    },
    "dinheiro": {
      "question": "O que está a pesar mais: os números ou o que eles fazem contigo?",
      "options": [
        {
          "key": "emocao",
          "label": "Quero perceber o medo e o ruído que isto me está a criar."
        },
        {
          "key": "simbolico",
          "label": "Os factos eu trato. Queria outra perspectiva sobre o que isto desperta em mim."
        },
        {
          "key": "projeto",
          "label": "O dinheiro está a travar um projecto que quero pôr de pé."
        },
        {
          "key": "parar",
          "label": "Hoje só queria parar de fazer contas por dentro."
        }
      ]
    },
    "eu": {
      "question": "Onde é que te perdes primeiro?",
      "options": [
        {
          "key": "aprovacao",
          "label": "Só descanso quando alguém confirma que fiz bem."
        },
        {
          "key": "comparacao",
          "label": "Olho para outra pessoa e parece logo que estou atrasado(a)."
        },
        {
          "key": "padrao",
          "label": "Muda o cenário. Eu acabo outra vez no mesmo sítio."
        },
        {
          "key": "corpo",
          "label": "Hoje não quero analisar-me. Quero fazer alguma coisa por mim."
        }
      ]
    },
    "desligar": {
      "question": "Como queres desaparecer daqui sem fugir de ti?",
      "options": [
        {
          "key": "livro",
          "label": "Quero uma história que me leve para outro sítio."
        },
        {
          "key": "luz",
          "label": "Quero baixar a luz e o ruído."
        },
        {
          "key": "ar",
          "label": "Quero mudar a atmosfera num gesto."
        },
        {
          "key": "toque",
          "label": "Quero trocar pensamento por sensação."
        },
        {
          "key": "presenca",
          "label": "Quero alguém comigo."
        }
      ]
    },
    "aprender": {
      "question": "O que queres conseguir dizer daqui a uns meses?",
      "options": [
        {
          "key": "tarot",
          "label": "“Eu sei ler Tarot.” Não apenas decorar significados."
        },
        {
          "key": "astrologia",
          "label": "“Eu percebo um mapa.” Não apenas frases soltas."
        },
        {
          "key": "numerologia",
          "label": "“Eu consigo ler os números com estrutura.”"
        },
        {
          "key": "outra",
          "label": "“Finalmente comecei.” Seja qual for a área."
        }
      ]
    },
    "companhia": {
      "question": "O que te faria dizer “ainda bem que fui”?",
      "options": [
        {
          "key": "evento",
          "label": "Ter alguém comigo num evento ou plano concreto."
        },
        {
          "key": "conversa",
          "label": "Sair, conversar e não ter de representar nada."
        },
        {
          "key": "afecto",
          "label": "Proximidade, carinho e um pouco de romance, com limites claros."
        },
        {
          "key": "continua",
          "label": "Perceber que o que me pesa não é só este plano. É a falta de presença."
        }
      ]
    },
    "presente": {
      "question": "O que queres que a pessoa sinta antes de saber quanto custou?",
      "options": [
        {
          "key": "casa",
          "label": "“Pensei na tua casa.”"
        },
        {
          "key": "corpo",
          "label": "“Quero que pares um bocadinho.”"
        },
        {
          "key": "historia",
          "label": "“Vi esta história e pensei em ti.”"
        },
        {
          "key": "especial",
          "label": "“Isto não podia vir de uma prateleira qualquer.”"
        }
      ]
    },
    "outro": {
      "question": "O que é mais fácil agora?",
      "options": [
        {
          "key": "ver",
          "label": "Mostra-me a Maison sem me explicar tudo."
        },
        {
          "key": "falar",
          "label": "Prefiro dizer o que se passa em português normal."
        }
      ]
    }
  },
  "results": {
    "decisao_perspectiva": {
      "title": "Talvez não precises de pensar mais. Precises de outro espaço para olhar.",
      "text": "Uma consulta pode fazer sentido aqui. Dentro de Consultas, escolhes o formato que te serve melhor.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": {
        "href": "/oraculo/escolhas",
        "text": "Ou abrir Escolhas & Mudança"
      }
    },
    "decisao_falar": {
      "title": "Já tens opiniões suficientes.",
      "text": "Talvez precises de um espaço onde possas trazer o caso como ele é. Em Consultas, escolhes como queres fazê-lo.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": null
    },
    "decisao_reler": {
      "title": "Há coisas que só ficam claras quando podes voltar a elas.",
      "text": "Uma consulta pode fazer sentido. Falado, escrito, com Tarot ou sem Tarot: a escolha fica contigo.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": null
    },
    "decisao_padrao": {
      "title": "Talvez a decisão mude. O padrão continua.",
      "text": "Uma consulta pode ajudar-te a olhar para o que se repete. Se sentires que isto pede continuidade, tens também Acompanhamento.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": {
        "href": "/contacto/?interesse=acompanhamento",
        "text": "Ver Acompanhamento"
      }
    },
    "relacao_resposta": {
      "title": "Há uma pergunta a mandar no resto da história.",
      "text": "Uma consulta pode ser o espaço certo para levares essa pergunta sem o Farol escolher o formato por ti.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": {
        "href": "/oraculo/amor",
        "text": "Ou abrir Amor & Relações"
      }
    },
    "relacao_fundo": {
      "title": "Não é só sobre essa pessoa. É sobre o lugar onde isto te deixou.",
      "text": "Se queres olhar para esta história com mais contexto, entra em Consultas e escolhe a forma que te serve.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": null
    },
    "relacao_cortar": {
      "title": "Hoje não precisas de outra conversa com alguém que nem está aqui.",
      "text": "Acende a Vela. Baixa a luz. Marca fisicamente o fim desta noite antes de voltares às mensagens outra vez.",
      "cta": {
        "href": "/produtos/vela-vidro/",
        "text": "Vela Aromática · 14 €"
      },
      "cta2": {
        "href": "/produtos/nevoa/",
        "text": "Mudar também o ar · 6,50 €"
      }
    },
    "relacao_historia": {
      "title": "Se a tua cabeça insiste numa história, dá-lhe outra.",
      "text": "A Biblioteca reúne as histórias disponíveis na Maison. Entra sem saber ainda qual te vai prender primeiro.",
      "cta": {
        "href": "/ebooks/",
        "text": "Entrar na Biblioteca"
      },
      "cta2": null
    },
    "relacao_presenca": {
      "title": "Talvez hoje não precises de interpretar nada.",
      "text": "Se o que te falta é alguém contigo num café, passeio, evento ou momento combinado, entra pela Companhia. Os limites são definidos antes.",
      "cta": {
        "href": "/portas/companhia",
        "text": "Descobrir Companhia"
      },
      "cta2": null
    },
    "cansaco_agua": {
      "title": "O teu corpo não pediu uma teoria.",
      "text": "Água morna. Escalda-Pés. Alguns minutos em que o dia deixa de ter acesso a ti.",
      "cta": {
        "href": "/produtos/escalda-pes/",
        "text": "Escalda-Pés · 5 €"
      },
      "cta2": {
        "href": "/produtos/oleo-massagem/",
        "text": "Prefiro toque · 12,50 €"
      }
    },
    "cansaco_toque": {
      "title": "Há dias em que o corpo precisa de ser lembrado de que existe.",
      "text": "O Óleo de Massagem transforma toque em pausa. Sem performance. Sem teres de perceber nada primeiro.",
      "cta": {
        "href": "/produtos/oleo-massagem/",
        "text": "Óleo de Massagem · 12,50 €"
      },
      "cta2": {
        "href": "/produtos/escalda-pes/",
        "text": "Prefiro água e calor · 5 €"
      }
    },
    "cansaco_luz": {
      "title": "Não tentes descansar no mesmo cenário que te manteve ligado(a).",
      "text": "A Vela muda luz, aroma e ritmo num único gesto. A casa percebe a transição antes da cabeça.",
      "cta": {
        "href": "/produtos/vela-vidro/",
        "text": "Vela Aromática · 14 €"
      },
      "cta2": {
        "href": "/produtos/nevoa/",
        "text": "Quero mudar o ar · 6,50 €"
      }
    },
    "cansaco_historia": {
      "title": "Talvez descansar hoje seja deixar outra vida ocupar a tua cabeça.",
      "text": "Há noites em que descansar é sair da tua própria história por umas páginas. A Biblioteca está aí para isso.",
      "cta": {
        "href": "/ebooks/",
        "text": "Abrir a Biblioteca"
      },
      "cta2": null
    },
    "cansaco_continua": {
      "title": "Quando o cansaço deixa de ser só de hoje, um ritual pode não chegar.",
      "text": "O Acompanhamento existe para aquilo que continua entre uma decisão e a seguinte. O âmbito é combinado antes.",
      "cta": {
        "href": "/contacto/?interesse=acompanhamento",
        "text": "Acompanhamento · desde 170 €"
      },
      "cta2": {
        "href": "/servicos/#maison-todo-o-mes",
        "text": "Maison Todo o Mês · desde 19 €"
      }
    },
    "casa_ar": {
      "title": "Não queres mudar a casa toda. Queres sentir que entraste noutro lugar.",
      "text": "A Névoa muda o ar num gesto. É a diferença mais rápida entre o que veio da rua e o que fica cá dentro.",
      "cta": {
        "href": "/produtos/nevoa/",
        "text": "Névoa de Ambiente · 6,50 €"
      },
      "cta2": {
        "href": "/produtos/vela-vidro/",
        "text": "Quero também luz · 14 €"
      }
    },
    "casa_luz": {
      "title": "A casa também pode dizer: por hoje chega.",
      "text": "A Vela Aromática cria esse marcador com luz e aroma. Um pequeno ritual para fechar uma porta que não se vê.",
      "cta": {
        "href": "/produtos/vela-vidro/",
        "text": "Vela Aromática · 14 €"
      },
      "cta2": {
        "href": "/produtos/vela-pequena/",
        "text": "Formato pequeno · 8 €"
      }
    },
    "casa_corpo": {
      "title": "Talvez o primeiro quarto a acalmar seja o teu corpo.",
      "text": "Começa pelos pés: água, calor e um gesto que te impede de continuar a correr enquanto estás parado(a).",
      "cta": {
        "href": "/produtos/escalda-pes/",
        "text": "Escalda-Pés · 5 €"
      },
      "cta2": {
        "href": "/produtos/oleo-massagem/",
        "text": "Levar a pausa ao toque · 12,50 €"
      }
    },
    "casa_ritual": {
      "title": "Não procuras perfume. Procuras uma mudança de atmosfera.",
      "text": "Há pedidos que pedem ritual: defumação, limpeza energética ou outra preparação definida para o contexto. Primeiro percebemos o que queres criar.",
      "cta": {
        "href": "/contacto/?interesse=defumacoes",
        "text": "Falar sobre um ritual"
      },
      "cta2": {
        "href": "/contacto/?interesse=limpeza-energetica",
        "text": "Explorar limpeza energética"
      }
    },
    "trabalho_escolher": {
      "title": "Mais uma lista talvez não seja o que falta.",
      "text": "Uma consulta pode ajudar-te a olhar para a decisão de outra maneira. Dentro de Consultas, a escolha do formato é tua.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": null
    },
    "trabalho_descarregar": {
      "title": "O que precisas pode não ser conselho. Pode ser espaço.",
      "text": "Uma consulta pode dar-te esse espaço. O Farol não precisa de decidir se queres falar, escrever, usar Tarot ou não.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": null
    },
    "trabalho_aprofundar": {
      "title": "Se isto já tem história, não o trates como uma pergunta curta.",
      "text": "Uma consulta pode ser o próximo passo. Se depois sentires que uma sessão não chega, tens continuidade.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": {
        "href": "/contacto/?interesse=acompanhamento",
        "text": "Ver Acompanhamento"
      }
    },
    "trabalho_projeto": {
      "title": "O projecto não precisa de mais uma pasta chamada “um dia”.",
      "text": "A Mentoria serve para aprender, estruturar e avançar com objectivos e acompanhamento durante um período definido.",
      "cta": {
        "href": "/contacto/?interesse=mentoria",
        "text": "Mentoria · desde 125 €"
      },
      "cta2": null
    },
    "trabalho_desligar": {
      "title": "O trabalho já acabou. Falta o teu corpo acreditar.",
      "text": "Acende a Vela quando fechas o computador. Um marcador simples: daqui para a frente, o dia já não manda.",
      "cta": {
        "href": "/produtos/vela-vidro/",
        "text": "Vela Aromática · 14 €"
      },
      "cta2": {
        "href": "/ebooks/",
        "text": "Prefiro desaparecer num livro"
      }
    },
    "dinheiro_emocao": {
      "title": "Os números são uma coisa. O que eles estão a fazer contigo é outra.",
      "text": "Uma consulta pode ajudar-te a pôr por ordem o medo e o ruído à volta da questão. Não substitui aconselhamento financeiro; o formato escolhes tu.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": null
    },
    "dinheiro_simbolico": {
      "title": "Os factos vêm primeiro. O símbolo pode vir depois.",
      "text": "Dinheiro & Segurança é uma abertura simbólica sobre a forma como estás a viver esta questão — não uma indicação sobre onde investir, gastar ou escolher.",
      "cta": {
        "href": "/oraculo/dinheiro",
        "text": "Dinheiro & Segurança · 2 €"
      },
      "cta2": null
    },
    "dinheiro_projeto": {
      "title": "Talvez o problema não seja só dinheiro. Talvez o projecto ainda não tenha estrutura.",
      "text": "Se o que queres é organizar uma ideia, objectivos e próximos passos, pergunta pela Mentoria. Não é aconselhamento financeiro.",
      "cta": {
        "href": "/contacto/?interesse=mentoria",
        "text": "Mentoria · desde 125 €"
      },
      "cta2": null
    },
    "dinheiro_parar": {
      "title": "Hoje não precisas de resolver a vida às onze da noite.",
      "text": "Amanhã os números continuam lá. Hoje podes fechar a folha e deixar outra história ocupar a cabeça durante umas páginas.",
      "cta": {
        "href": "/ebooks/",
        "text": "Entrar na Biblioteca"
      },
      "cta2": {
        "href": "/produtos/vela-vidro/",
        "text": "Ou marcar o fim do dia · 14 €"
      }
    },
    "eu_aprovacao": {
      "title": "Se só fica certo depois de alguém confirmar, a dúvida já está a cobrar renda.",
      "text": "Podes começar pela abertura simbólica. Se preferires levar a questão para um espaço mais teu, entra em Consultas e escolhe o formato.",
      "cta": {
        "href": "/oraculo/necessidade-aprovacao",
        "text": "Aprovação & Validação · 2 €"
      },
      "cta2": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      }
    },
    "eu_comparacao": {
      "title": "A vida dos outros parece sempre estar a acontecer mais depressa quando olhas de fora.",
      "text": "Comparação & Inveja abre esse desconforto sem moralismo. Se hoje preferes sair da comparação em vez de a analisar, entra numa história.",
      "cta": {
        "href": "/oraculo/comparacao-inveja",
        "text": "Comparação & Inveja · 2 €"
      },
      "cta2": {
        "href": "/ebooks/",
        "text": "Prefiro entrar noutra história"
      }
    },
    "eu_padrao": {
      "title": "Mudam as pessoas. Muda o cenário. Tu reconheces a sensação.",
      "text": "Uma consulta pode ajudar-te a olhar para o padrão sem escolher por ti como o queres trabalhar. Se isto pede continuidade, tens também Acompanhamento.",
      "cta": {
        "href": "/servicos/#consultas",
        "text": "Explorar Consultas"
      },
      "cta2": {
        "href": "/contacto/?interesse=acompanhamento",
        "text": "Ver Acompanhamento"
      }
    },
    "eu_corpo": {
      "title": "Nem tudo precisa de virar análise.",
      "text": "Óleo, toque, alguns minutos e nenhum relatório sobre o que sentiste. Fazer alguma coisa por ti também pode ser só isto.",
      "cta": {
        "href": "/produtos/oleo-massagem/",
        "text": "Óleo de Massagem · 12,50 €"
      },
      "cta2": {
        "href": "/produtos/escalda-pes/",
        "text": "Prefiro água e calor · 5 €"
      }
    },
    "desligar_livro": {
      "title": "Então vai. A tua cabeça fica cá; tu vais atrás da história.",
      "text": "Não te vou escolher o livro antes de o veres. Entra na Biblioteca e deixa uma capa, uma frase ou uma história fazer o resto.",
      "cta": {
        "href": "/ebooks/",
        "text": "Entrar na Biblioteca"
      },
      "cta2": null
    },
    "desligar_luz": {
      "title": "Baixa a luz antes de pedires à cabeça para baixar o volume.",
      "text": "A Vela Aromática muda o ritmo visual e o aroma do espaço. Não resolve nada. Talvez seja exactamente essa a ideia.",
      "cta": {
        "href": "/produtos/vela-vidro/",
        "text": "Vela Aromática · 14 €"
      },
      "cta2": null
    },
    "desligar_ar": {
      "title": "Muda o ar. O resto pode esperar cinco minutos.",
      "text": "A Névoa de Ambiente é imediata: um gesto, outro aroma, outra entrada no mesmo espaço.",
      "cta": {
        "href": "/produtos/nevoa/",
        "text": "Névoa de Ambiente · 6,50 €"
      },
      "cta2": null
    },
    "desligar_toque": {
      "title": "Troca pensamento por sensação.",
      "text": "O Óleo de Massagem dá-te um ritual simples de toque e presença corporal. Sem teres de chegar a conclusão nenhuma.",
      "cta": {
        "href": "/produtos/oleo-massagem/",
        "text": "Óleo de Massagem · 12,50 €"
      },
      "cta2": {
        "href": "/produtos/escalda-pes/",
        "text": "Prefiro água e calor · 5 €"
      }
    },
    "desligar_presenca": {
      "title": "Há noites em que distração não chega. Queres alguém ali.",
      "text": "A Companhia é presença adulta combinada antes: café, passeio, evento ou outro momento acordado, com formato e limites claros.",
      "cta": {
        "href": "/portas/companhia",
        "text": "Descobrir Companhia"
      },
      "cta2": null
    },
    "aprender_tarot": {
      "title": "Não queres decorar 78 cartas. Queres conseguir lê-las.",
      "text": "A Mentoria dá estrutura, prática e acompanhamento para aprender Tarot a sério, com objectivos definidos antes de começar.",
      "cta": {
        "href": "/contacto/?interesse=mentoria",
        "text": "Mentoria · desde 125 €"
      },
      "cta2": null
    },
    "aprender_astrologia": {
      "title": "Queres perceber um mapa, não coleccionar frases feitas.",
      "text": "As análises e formatos de Astrologia são preparados sob encomenda. Diz-nos o que queres aprender e confirmamos o formato disponível.",
      "cta": {
        "href": "/contacto/?interesse=astrologia",
        "text": "Perguntar sobre Astrologia"
      },
      "cta2": null
    },
    "aprender_numerologia": {
      "title": "Os números só ficam interessantes quando deixam de ser decoração.",
      "text": "Os trabalhos de Numerologia são definidos conforme a questão ou objectivo. Primeiro percebemos o que queres aprender ou aprofundar.",
      "cta": {
        "href": "/contacto/?interesse=numerologia",
        "text": "Perguntar sobre Numerologia"
      },
      "cta2": null
    },
    "aprender_outra": {
      "title": "O primeiro luxo é não ter de aprender sozinho(a).",
      "text": "Diz-nos a área e o objectivo. Se houver enquadramento na Maison, a Mentoria pode ser desenhada com estrutura e acompanhamento.",
      "cta": {
        "href": "/contacto/?interesse=mentoria",
        "text": "Perguntar pela Mentoria · desde 125 €"
      },
      "cta2": null
    },
    "companhia_evento": {
      "title": "O convite já existe. Falta não chegares sozinho(a).",
      "text": "A Companhia pode acompanhar um evento ou plano previamente combinado. Formato, duração, despesas e limites ficam claros antes.",
      "cta": {
        "href": "/portas/companhia",
        "text": "Quero Companhia"
      },
      "cta2": null
    },
    "companhia_conversa": {
      "title": "Não queres entretenimento. Queres presença sem performance.",
      "text": "Um café, passeio ou tempo partilhado pode ser exactamente isso. Entra na Companhia e vê os formatos.",
      "cta": {
        "href": "/portas/companhia",
        "text": "Descobrir Companhia"
      },
      "cta2": null
    },
    "companhia_afecto": {
      "title": "Queres proximidade. Então os limites precisam de ser ainda mais claros.",
      "text": "Vê o formato Boyfriend4Rent dentro da Companhia. É presença adulta combinada; não é serviço sexual nem promessa de relação.",
      "cta": {
        "href": "/portas/companhia",
        "text": "Ver Companhia"
      },
      "cta2": null
    },
    "companhia_continua": {
      "title": "Talvez não seja sobre este sábado.",
      "text": "Se o que pesa é continuar a atravessar tudo sozinho(a), o Acompanhamento pode fazer mais sentido do que preencher apenas um plano.",
      "cta": {
        "href": "/contacto/?interesse=acompanhamento",
        "text": "Acompanhamento · desde 170 €"
      },
      "cta2": {
        "href": "/portas/companhia",
        "text": "Hoje quero Companhia"
      }
    },
    "presente_casa": {
      "title": "Queres que a pessoa pense em ti quando entrar em casa.",
      "text": "A Vela Aromática maior é luz, aroma e presença. Se queres algo mais imediato e discreto, a Névoa muda o ar num gesto.",
      "cta": {
        "href": "/produtos/vela-vidro/",
        "text": "Vela Aromática · 14 €"
      },
      "cta2": {
        "href": "/produtos/nevoa/",
        "text": "Névoa · 6,50 €"
      }
    },
    "presente_corpo": {
      "title": "A mensagem é simples: pára um bocadinho.",
      "text": "O Óleo de Massagem oferece toque e pausa. Se queres um ritual de água e calor, escolhe o Escalda-Pés.",
      "cta": {
        "href": "/produtos/oleo-massagem/",
        "text": "Óleo de Massagem · 12,50 €"
      },
      "cta2": {
        "href": "/produtos/escalda-pes/",
        "text": "Escalda-Pés · 5 €"
      }
    },
    "presente_historia": {
      "title": "Há presentes que continuam depois de serem abertos.",
      "text": "Escolhe uma história que diga qualquer coisa sobre quem vai recebê-la. A Biblioteca cresce; deixa o livro certo aparecer lá dentro.",
      "cta": {
        "href": "/ebooks/",
        "text": "Escolher na Biblioteca"
      },
      "cta2": null
    },
    "presente_especial": {
      "title": "Então não escolhas da prateleira.",
      "text": "Explica-nos para quem é, o momento e o que queres que a pessoa sinta. Vemos se existe um pedido especial que a Maison consiga fazer sem inventar promessas.",
      "cta": {
        "href": "/contacto/?interesse=pedidos-especiais",
        "text": "Criar um pedido especial"
      },
      "cta2": null
    },
    "outro_ver": {
      "title": "Sem mapa. Só as portas.",
      "text": "Entra na Maison pelo que já sabes que queres: objecto, experiência, leitura ou serviço.",
      "cta": {
        "href": "/#explorar-maison",
        "text": "Explorar a Maison"
      },
      "cta2": null
    },
    "outro_falar": {
      "title": "Às vezes escolher começa por dizer a frase inteira.",
      "text": "Conta-nos o que se passa. Se a Maison tiver um caminho que faça sentido, mostramos-to. Se não tiver, não inventamos.",
      "cta": {
        "href": "/contacto/",
        "text": "Falar com a Maison"
      },
      "cta2": null
    }
  }
};

let currentStep=1;
let step1Choice=null;
let step2Choice=null;
const steps={
  1:document.getElementById('farolStep1'),
  2:document.getElementById('farolStep2'),
  3:document.getElementById('farolStep3')
};
const dots=document.querySelectorAll('.farol__progress-dot');
const q=document.getElementById('farolStep2Question');
const opts=document.getElementById('farolStep2Options');
const out=document.getElementById('farolResult');
const back2=document.getElementById('farolBack2');
const back3=document.getElementById('farolBack3');

function progress(step){
  dots.forEach((dot,i)=>dot.classList.toggle('farol__progress-dot--active',i<step));
}

function show(step){
  Object.values(steps).forEach(el=>el&&el.classList.remove('farol__step--active'));
  if(!steps[step])return;
  steps[step].classList.add('farol__step--active');
  currentStep=step;
  progress(step);
}

function build(key){
  const d=data.step1[key];
  if(!d||!q||!opts)return;
  step1Choice=key;
  track('farol_start',{theme:key,page_path:location.pathname});
  q.textContent=d.question;
  opts.innerHTML='';
  d.options.forEach(o=>{
    const b=document.createElement('button');
    b.className='farol__option';
    b.type='button';
    b.innerHTML=`<span class="farol__option-text">${o.label}</span><span aria-hidden="true">→</span>`;
    b.addEventListener('click',()=>choose(o.key));
    opts.appendChild(b);
  });
  show(2);
}

function choose(key){
  step2Choice=key;
  track('farol_refine',{theme:step1Choice,choice:key,page_path:location.pathname});
  const r=data.results[`${step1Choice}_${key}`];
  if(!r){
    render({
      title:'Não te vou inventar uma resposta.',
      text:'Explica-nos o que procuras. Se houver uma solução real, dizemos-te qual.',
      cta:{href:'/contacto/',text:'Falar com a Maison'},
      cta2:null
    });
    return;
  }
  render(r);
}

function render(r){
  if(!out)return;
  const external=h=>/^https?:/.test(h)?' target="_blank" rel="noopener"':'';
  out.innerHTML=`<h3 class="farol__result-title">${r.title}</h3><p class="farol__result-text">${r.text}</p><div class="farol__result-actions"><a href="${r.cta.href}" class="btn btn--primary"${external(r.cta.href)} data-farol-cta="primary">${r.cta.text}</a>${r.cta2?`<a href="${r.cta2.href}" class="btn btn--secondary"${external(r.cta2.href)} data-farol-cta="secondary">${r.cta2.text}</a>`:''}</div>`;
  track('farol_result',{
    theme:step1Choice||'unknown',
    choice:step2Choice||'unknown',
    destination:r.cta.href,
    page_path:location.pathname
  });
  show(3);
}

function reset(){
  track('farol_restart',{page_path:location.pathname});
  step1Choice=null;
  step2Choice=null;
  show(1);
}

if(steps[1]){
  steps[1].querySelectorAll('[data-farol]').forEach(b=>{
    b.addEventListener('click',()=>build(b.getAttribute('data-farol')));
  });
}
if(out){
  out.addEventListener('click',e=>{
    const a=e.target.closest('[data-farol-cta]');
    if(a){
      track('farol_cta_click',{
        theme:step1Choice||'unknown',
        choice:step2Choice||'unknown',
        cta_position:a.dataset.farolCta||'primary',
        destination:a.getAttribute('href')||'',
        page_path:location.pathname
      });
    }
  });
}
if(back2)back2.addEventListener('click',()=>show(1));
if(back3)back3.addEventListener('click',reset);

window.Farol={
  data,
  reset,
  getState:()=>({step:currentStep,step1:step1Choice,step2:step2Choice})
};
})();
