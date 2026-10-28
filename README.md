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

O jogo abre no lobby: a clareira do ipê, onde você anda com o time. A trilha da esquerda leva pra fase, o ipê mostra o recorde e a toca, os créditos (chegue perto e aperte ↑).

`http://localhost:5180/?debug` mostra as caixas de colisão, `?galeria` mostra todas as animações dos heróis e `?fase` pula o lobby.

## Controles

| Ação | Tecla |
| --- | --- |
| Andar | A / D ou setas |
| Pular (segurar = mais alto) | Espaço |
| Habilidade | J ou Shift |
| Trocar herói direto | 1, 2, 3 |
| Trocar em ciclo | Q / E |
| Escalar / nadar | W / S ou setas |
| Pausa | Esc |

## Heróis

| Herói | Habilidade | Ponto fraco |
| --- | --- | --- |
| Mico-leão-dourado | Pulo duplo, agarra e escala cipó | Não quebra nada, afunda na água |
| Onça-pintada | Investida que quebra tronco podre e armadilha | Pula baixo, não escala |
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
  core/              lógica pura, sem Phaser, com testes: pulo, vida do time, leitura do mapa
  heroes/            Hero (base) + Mico, Onca, Lontra
  team/TeamManager   os 3 heróis, vida compartilhada e a troca
  scenes/            Boot, Lobby, Game, Hud, Pause; terrain monta chão e fundo a partir do mapa
  ui/                fichas do guia visual e de movimento, tábua de madeira, cortina de folhas
  art/               pixel art em código: raster com sombreado, heróis por pose, tiles, fundo
  levels/            mapas
```
