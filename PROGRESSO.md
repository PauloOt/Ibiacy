# Progresso

Escopo completo em [docs/escopo-mvp.md](docs/escopo-mvp.md). Sessões em [docs/sessoes/](docs/sessoes/).

## Etapas

- [x] **1. Base** — Vite + Phaser + TS, `Hero` e os 3 heróis, `TeamManager` com troca no ar, vida compartilhada, checkpoints, sementes, sala de teste, HUD e pausa. ([sessão](docs/sessoes/2026-10-28-etapa-1-base.md))
- [x] **1b. Pixel art animada** — heróis, cenário, fundo em camadas, luz e partículas, no estilo do Arperium. ([sessão](docs/sessoes/2026-10-28-pixel-art.md))
- [x] **2. Mundo gerado** — no lugar da fase no Tiled: mundo grande por semente (copas, superfície, lagos, cavernas) com trechos fixos, a onça cava, metas espalhadas (queimadas, acampamento, gruta) e painel de fim que grava o recorde. ([sessão](docs/sessoes/2026-10-28-mundo-gerado.md))
- [x] **3. Ameaças completas** — máquina de desmatamento que patrulha (dano no contato; a investida da onça ou um pulo em cima desliga), frente de fogo que avança pela superfície depois do rio até o lago seguinte, e rio com correnteza. Junto veio o **herói único**: escolha no Novo jogo, sem troca, e cada bicho passa por tudo do seu jeito. ([sessão](docs/sessoes/2026-10-28-ameacas-e-heroi-unico.md))
- [ ] **4. Menu e hub** — o lobby da clareira foi rejeitado. Escolhido em laboratório: menu inicial (Novo jogo, Carregar jogo, Créditos) e um hub 3D pixelado dentro de uma árvore gigante, com o Ubiraçá (jabuti ancião, dá as missões), a lojinha do quati e a ficha do herói com 5 atributos e habilidades em Q E R F X. Seguir o [guia visual](docs/guia-visual.md), o [guia de movimento](docs/guia-movimento.md) e [heróis](docs/herois.md) ([sessão](docs/sessoes/2026-10-28-hub-3d.md)). Feito em pixel art 3/4 de cima (o 3D foi descartado: ele queria pixel art com profundidade): menu, entrada descendo pelo tronco, andar, conversa com zoom, missões que abrem a fase e devolvem recompensa e XP, lojinha e ficha com pontos. Falta: os itens fazerem efeito na fase, as habilidades Q E R F X, e a HUD, a pausa e o fim de missão no visual do oco.
- [ ] **5. Som** — efeitos e trilha com chamber rack flute.
- [ ] **6. Deploy** — GitHub Pages ou Vercel.

## Pendências

- Trilha sonora com chamber rack flute: falta definir como a trilha vai ser produzida e entregue.
- Armadilha não rearma no respawn.
- Habilidades em Q E R F X (a habilidade ainda é o J) e os itens da loja fazendo efeito na fase.
- A grande máquina do final do escopo (cada herói desliga uma parte): hoje as máquinas são patrulheiras simples.
- Tamanduá-bandeira como possível quarto herói (fora do escopo).
- Minimapa e auto-degrau no mundo gerado.
- Missões no lobby novo: escolher semente e tamanho do mundo com o Ubiraçá (`scene.start('Game', { seed, world })`).
- Opção de movimento reduzido (o jogo ainda não tem; o guia de movimento já define a versão reduzida de cada animação).
