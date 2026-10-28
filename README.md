# Ibiacy

Plataforma 2D de navegador com fauna brasileira. Você controla um time de animais e troca de herói na hora (até no meio do pulo) pra passar pelos obstáculos de cada bioma.

O MVP tem 1 bioma (Mata Atlântica), 3 heróis e 1 fase completa. Escopo em [docs/escopo-mvp.md](docs/escopo-mvp.md), andamento em [PROGRESSO.md](PROGRESSO.md).

> "Ibiacy" é nome provisório.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5180
npm test           # testes da lógica (Vitest)
npm run build      # checa tipos e gera dist/
```

O jogo abre no menu (Novo jogo, Carregar jogo, Créditos) e depois no hub: um salão dentro de uma árvore gigante, em pixel art visto de cima. Lá você fala com o Ubiraçá (E) pra escolher a missão, compra na lojinha do quati e abre a ficha do bicho (C) pra distribuir pontos. O jogo fica salvo no navegador.

A fase é um mundo grande gerado por semente, no estilo do Terraria: copas das árvores, superfície, lagos e cavernas. Os focos de fogo e as armadilhas espalhados são as metas; limpou todas, a mata está protegida.

`http://localhost:5180/?debug` mostra as caixas de colisão, `?galeria` mostra todas as animações dos heróis, `?fase` pula o lobby e `?semente=42` fixa o mundo.

## Controles

| Ação | Tecla |
| --- | --- |
| Andar | A / D ou setas |
| Pular (segurar = mais alto) | Espaço |
| Habilidade | J ou Shift |
| Cavar pra baixo (onça) | ↓ + J |
| Trocar herói direto | 1, 2, 3 |
| Trocar em ciclo | Q / E |
| Escalar / nadar | W / S ou setas |
| Pausa | Esc |

## Heróis

| Herói | Habilidade | Ponto fraco |
| --- | --- | --- |
| Mico-leão-dourado | Pulo duplo, agarra e escala cipó | Não quebra nada, afunda na água |
| Onça-pintada | Investida que quebra tronco podre e armadilha e cava terra | Pula baixo, não escala |
| Lontra-neotropical | Nada e mergulha; molhada, apaga foco de fogo | Lenta em terra |

## Stack

Phaser 3 (Arcade Physics) + TypeScript + Vite. Mapas no Tiled a partir da etapa 2; por enquanto a sala de teste é um mapa em texto (`src/levels/salaDeTeste.ts`).

## Arte

Guias da interface: [visual](docs/guia-visual.md) e [movimento](docs/guia-movimento.md).

Pixel art desenhada em código, com o [Arperium](https://arperium.app/) como referência de estilo: volume com luz quente em cima e sombra fria embaixo, contorno escuro, grão de textura, brilhos e partículas. Nada de imagem pronta: `src/art/` monta cada bicho com formas sombreadas, e cada frame de animação sai de uma pose (fase da passada, balanço da cauda, respiração). O Boot gera as texturas uma vez ao abrir o jogo. Fontes: Pixelify Sans e Jersey 10 (Google Fonts).

## Estrutura

```
src/
  config.ts          números do jogo (gravidade, coyote time, cooldowns)
  core/              lógica pura, sem Phaser, com testes: pulo, vida do time, leitura do mapa, gerador do mundo
  heroes/            Hero (base) + Mico, Onca, Lontra
  team/TeamManager   os 3 heróis, vida compartilhada e a troca
  scenes/            Boot, Hub (menu e salão), Game, Hud, Pause; terrain tem as camadas e o fundo, worldmap monta o mundo gerado (Tilemap)
  hub/               jogo salvo (nível, XP, atributos, loja) e o conteúdo: missões, itens, falas
  ui/                fichas do guia visual e de movimento, painel de casca, tábua de madeira, cortina de folhas
  art/               pixel art em código: raster com sombreado, heróis por pose, tiles, fundo
  levels/            mapas
```
