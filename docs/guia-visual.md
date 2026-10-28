# Guia visual da interface

Saiu do laboratório do lobby em 28/10/2026, onde o mesmo lugar foi mostrado em quatro visuais e o Paulo escolheu o **fim de tarde na clareira**. Vale pro lobby, pras telas (Recorde, Créditos, pausa, final) e pras placas que aparecem na fase.

## O princípio

**A interface é feita da madeira do próprio lugar.** Placa pregada, tábua com veio, poste fincado no chão: nada de caixa flutuando. Se um elemento de interface não pudesse existir pendurado numa árvore da clareira, ele está errado.

O lobby é o único lugar com luz de fim de tarde. A fase começa de manhã, então entrar na trilha é "o dia seguinte".

## Fichas

Os números estão em pixels da tela do jogo (960×540). A arte é desenhada em pixels de 2×2, então toda espessura é par.

### Cores

| Nome | Hex | Uso |
| --- | --- | --- |
| `madeira-escura` | `#3b2414` | contorno de toda placa, texto sobre placa clara |
| `madeira` | `#8a5a32` | corpo da placa e do painel |
| `madeira-clara` | `#c98e4a` | luz no topo da tábua, botão, placa ativa |
| `madeira-sombra` | `#5e3a1e` | sombra na base da tábua, poste, linha tracejada |
| `creme` | `#fbe7c0` | texto sobre madeira |
| `ipe` | `#f2c230` | o que está ativo ou perto |
| `ipe-claro` | `#ffe27a` | títulos e valores (tempo, sementes) |

A luz da tarde vale só no lobby:
- laranja `#ff9a5a` multiplicado a 32% sobre a cena;
- brilho somado `#f2c230` a 28% em volta do ipê;
- `#ffb070` a 20% no canto do sol.

### Tipografia

- **Jersey 10:** só títulos (o nome do jogo, o título de painel e o "Pausado").
- **Pixelify Sans:** todo o resto.

| Papel | Fonte | Tamanho |
| --- | --- | --- |
| Logo | Jersey 10 | 86 px, com 2 sombras duras pra baixo (`#8a3a14`, `#3b2414`) |
| Título de painel | Jersey 10 | 40 px, `ipe-claro` (30 px ficava miúdo: a Jersey é estreita) |
| Texto | Pixelify Sans | 18 px, `creme` |
| Etiqueta e dica | Pixelify Sans | 16 px |
| Detalhe (Fase 1, tecla) | Pixelify Sans | 13 px |

### Forma

- **Raio:** 0, em tudo.
- **Contorno:** 4 px `madeira-escura`.
- **Volume da tábua:**
  - filete de 4 px `madeira-clara` por dentro, no topo;
  - filete de 4 px `madeira-sombra` por dentro, na base;
  - sombra dura de 6 px pra baixo (`#2a180c`) em painel grande.
- **Separador de linha:** tracejado de 2 px em `madeira-sombra`.

## Regra de cor

1. **Amarelo-ipê só marca duas coisas:** o que está ativo ou perto (placa acesa, retrato do bicho atual, botão em foco) e valor (título, tempo, sementes). Se o amarelo está num enfeite, ele deixou de significar "isto aqui".
2. **Laranja e vermelho nunca são cor de interface.** O fogo é a ameaça do jogo, e o laranja da tarde já está perto dele. A luz da tarde fica na cena, nunca numa placa ou botão.

## Receitas

### Placa (etiqueta do lobby)

É uma tábua com poste, fincada no chão ao lado do lugar que ela abre.
- **Tábua:** padding 8×16 px, com tecla, nome e detalhe em linha. A tecla é um quadrado `creme` com o símbolo em `madeira-escura`.
- **Poste:** 8 px de largura, `madeira-sombra` com contorno, descendo até o chão.
- **Estados:** longe, a placa fica a 35% de opacidade e esconde o detalhe; perto, 100%. A transição está no [guia de movimento](guia-movimento.md).

### Painel (Recorde, Créditos)

Tábua grande, centrada, com cerca de metade da largura da tela.
- Título em Jersey 10.
- Linhas rótulo/valor separadas pelo tracejado.
- Botões embaixo:
  - normal: `madeira-clara` com contorno e sombra interna de 4 px;
  - em foco: `ipe`.

### Retrato do bicho (HUD)

Tábua pequena com o bicho dentro.
- **Ativo:** fundo `madeira-clara` e filete do topo em `ipe`.
- **Inativo:** `madeira`, com o bicho a 65%.

## O que não fazer

- **Caixa escura translúcida.** É o visual de hoje da HUD e some em cima do céu claro; a madeira é opaca.
- **Arredondar canto.** Pixel art com raio vira outro jogo.
- **Uma terceira fonte.** Jersey 10 pra título, Pixelify pro resto.
- **Placa sem contorno.** Sem os 4 px escuros ela se mistura com o tronco do ipê, que tem a mesma cor.

## Onde está no código

- Fichas: `src/ui/tokens.ts` (`WOOD`, `FONT_TITLE`, `FONT_TEXT`).
- Tábua e tracejado: `src/ui/wood.ts`.
- Placa, painel, título e luz da tarde: `src/scenes/LobbyScene.ts`.
- Ipê grande e toca: `src/art/lobby.ts`.

## Escolhido e ainda não aplicado

- **A HUD e a pausa continuam com a caixa escura.** Passar elas pra madeira é uma decisão à parte: a madeira ocupa mais espaço em cima da fase.
