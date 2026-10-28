# Guia visual

Saiu do laboratório do hub em 28/10/2026. Lá, o mesmo salão dentro da árvore gigante foi mostrado com a mesma interface em quatro visuais, e o Paulo escolheu **o oco aceso pelos fungos**.

Vale pro menu inicial, pro hub (lojinha, Ubiraçá, missões, ficha do herói) e pras telas por cima das missões. Ele substitui o guia do lobby da clareira (madeira, fim de tarde), que foi rejeitado: o problema era ser de lado e vazio.

## O princípio

**O hub é a casa à noite, por dentro do tronco. A luz vem dos fungos, e a cor da luz deles é a cor do que se pode usar.**

Toda decisão sai daí:
- a interface é casca entalhada, não caixa flutuando;
- o que acende quando o bicho chega perto é âmbar, porque é o que os fungos fazem;
- o resto fica no escuro quente da madeira.

## A cena

- **Pixel art em vista 3/4 de cima,** como Stardew e Soul Knight. O Paulo chegou a escolher "3D de verdade, pixelado", mas depois explicou que queria pixel art com profundidade, não 3D; o laboratório em Three.js ficou só como referência de luz e cor.
- **O lugar:** o corte do tronco visto de cima e de frente:
  - chão com os anéis da árvore numa elipse;
  - parede de casca no fundo, com a rampa em espiral subindo;
  - fungos de prateleira na parede e um nó da casca por onde entra um fio de luz;
  - o oco continua pra cima, no escuro: é onde a câmera começa no menu.
- **Quem mora lá:**
  - **Ubiraçá**, o jabuti ancião, sobre um monte de musgo, com as trilhas das missões gravadas em dourado no casco;
  - **o quati** atrás do balcão da lojinha, embaixo de um cogumelo de toldo, com potes em cima do tampo;
  - **a bica d'água** da lontra.
- **Os bichos** são os sprites de lado da fase, como no Soul Knight. O que está em casa fica parado: o mico em cima do toldo, a lontra na bica, a onça no meio.
- **Luz:**
  - a cena toda é multiplicada por `#6e5460` (noite);
  - somam-se brilhos âmbar em cada fungo, luz clara no nó da casca, o brilho dos potes e da trilha no casco;
  - o bicho ativo leva uma luz fraca junto, pra não perder as rosetas no escuro.
- **No ar:** vaga-lumes `#ffd070`, somados.
- **Profundidade:** quem tem o pé mais embaixo na tela passa na frente.

## Fichas

### Cores

| Nome | Hex | Uso |
| --- | --- | --- |
| `noite` | `#120a08` | fundo de tela e da cena |
| `casca` | `#2a1810` | corpo dos painéis |
| `veio` | `#6a4428` | borda dos painéis, trilho de barra, separador |
| `seiva` | `#f3e2c8` | texto |
| `cinza-casca` | `#b89878` | texto secundário (descrição, legenda) |
| `ambar` | `#ffa040` | o que se pode usar ou está perto: tecla, botão em foco, etiqueta acesa, barra de XP |
| `ambar-claro` | `#ffd070` | títulos e valores (preço, saldo, número de atributo) |

### Tipografia

- **Jacquard 12:** só títulos (nome do jogo, título de painel, nome de quem fala, nome de missão).
- **Pixelify Sans:** todo o resto.

| Papel | Fonte | Tamanho (tela 960×540) |
| --- | --- | --- |
| Logo | Jacquard 12 | 72 px, `ambar`, com brilho âmbar suave em volta |
| Título de painel | Jacquard 12 | 30 px, `ambar-claro` |
| Nome de quem fala, missão | Jacquard 12 | 22 a 26 px |
| Texto | Pixelify Sans | 16 px |
| Legenda, tecla | Pixelify Sans | 13 px |

### Forma

- **Raio:** 0, em tudo.
- **Painel:**
  - fundo de casca com veio vertical (faixas de 7 px `#2a1810` e 2 px `#26150e`);
  - borda de 3 px `veio`;
  - por dentro, um filete escuro de 2 px e um filete âmbar de 2 px a 35%.
- **Botão:**
  - normal: borda de 3 px `veio`, fundo transparente;
  - em foco: fundo `ambar` e texto `casca`.
- **Barra (XP, vida):** trilho `veio`, enchimento `ambar`.

## Regra de cor

1. **Âmbar só no que se pode usar agora:** tecla, botão em foco, etiqueta do morador que está perto, missão selecionada, barra de XP. Se uma coisa âmbar não faz nada quando você aperta E, está errada.
2. **Nada que machuca é âmbar.** O fogo das missões puxa pro vermelho (`#e8452a` pra baixo) e tem fumaça; o âmbar da interface nunca aparece em ameaça. É o risco desse visual: a cor da luz da casa é vizinha da cor da queimada.

## Receitas

| Componente | Receita |
| --- | --- |
| **Menu inicial** | Logo em cima; Novo jogo, Carregar jogo e Créditos em coluna. O botão em foco é âmbar. Embaixo, uma legenda com o jogo salvo (herói, nível, sementes, quando). |
| **Etiqueta de morador** | Painel pequeno preso no ponto 3D acima da cabeça dele, com tecla `E` e o nome da ação ("Falar com Ubiraçá", "Lojinha"). Longe: 50%. Perto: 100%, com borda âmbar. |
| **Conversa** | Retrato de quem fala à esquerda, nome em Jacquard 12, fala em Pixelify Sans e "E continuar" embaixo. |
| **Missões** ("Trilhas no casco") | Um cartão por missão, com nome, lugar, meta, quem leva e recompensa. A selecionada tem borda âmbar e o botão "Aceitar trilha". A trancada fica a 50% e diz o que falta. |
| **Lojinha do quati** | Uma linha por item: nome, efeito, preço em sementes e Comprar. Sem sementes: linha a 55% e botão "Falta". Saldo embaixo. |
| **Ficha do herói** | Nome e nível, barra de XP, os 5 atributos com `+` e as 5 habilidades (Q E R F X) com recarga. A recarga é um relógio varrendo. |

## O que não fazer

- **Caixa escura translúcida flutuando.** Painel é casca, opaco e com veio.
- **Âmbar enfeitando.** Ele quer dizer "dá pra usar".
- **Luz branca ou fria no hub.** Quebra a noite dentro do tronco; a cena só tem luz de fungo e de vaga-lume.
- **Sprite sem tint.** No escuro ele aparece "colado" por cima da cena.

## Escolhido e ainda não aplicado

- **As telas da fase ainda são de madeira:** o painel de fim de missão (`src/ui/panel.ts`), a HUD e a pausa. Passar elas pro visual do oco é o próximo passo de interface.
- **Os bichos não têm sprite de frente e de costas:** andam pra cima e pra baixo de lado, como no Soul Knight.

## Onde está no código

- Fichas: `src/ui/tokens.ts` (`OCO`, `FONT_HUB`).
- Painel de casca, botão e barra: `src/ui/bark.ts`.
- Arte do salão e dos moradores: `src/art/hub.ts`.
- A cena: `src/scenes/HubScene.ts`.
