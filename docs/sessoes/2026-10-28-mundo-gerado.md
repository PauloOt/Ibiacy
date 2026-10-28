# 28/10/2026: Mundo gerado (mapa estilo Terraria)

O Paulo pediu mapas vastos, "tipo o Terraria". As decisões dele:

- **Origem:** o mundo é gerado por semente, com trechos fixos desenhados à mão carimbados no meio.
- **Camadas:** copas das árvores (o mico), superfície da mata, rios e lagos (a lontra), cavernas e subsolo.
- **Cavar:** só alguns bichos cavam; por enquanto só a onça. Terra sai, pedra não.
- **Objetivo:** aberto, com metas. As ameaças ficam espalhadas pelo mapa e a partida acaba quando o time limpa todas.

Depois ele pediu que os mapas virem missões escolhidas com o Ubiraçá num lobby novo, feito em outra sessão. Por isso o gerador recebe parâmetros por missão.

## O que foi feito

- **Gerador puro, sem Phaser** (`src/core/worldgen.ts`): `generateWorld({ seed, width, height, lakes, queimadas, acampamento, gruta })`. Sai no formato de texto do levelParser, que ganhou quatro caracteres novos:
  - `S` pedra;
  - `=` galho e `%` copa (dá pra subir por baixo);
  - `|` tronco (fundo, não colide).

  O padrão é 560 × 190 tiles, cerca de 18 telas de largura e 6 de altura.
- **Os passos do gerador:**
  1. Superfície por ruído, com degrau de no máximo 1 tile: a onça pula só uns 2 tiles.
  2. Começo plano.
  3. 3 lagos com margem plana.
  4. Terra por cima e pedra embaixo, com bolsões de terra na pedra.
  5. Cavernas: túneis estreitos e salões, mais abertos no fundo.
  6. Poços da superfície com cipó na parede, pro mico subir.
  7. Poças rasas no chão das cavernas, e a água sempre assenta: nunca fica água em cima de ar.
  8. Árvores com a copa numa mesma "linha das copas", que vira caminho pro mico, além de galhos e cipós pendurados.
  9. Checkpoints a cada ~100 tiles e umas 60 a 90 sementes.
- **Trechos fixos:**
  - **Começo:** P, checkpoint e sementes.
  - **Queimadas:** 3 focos de fogo na margem de 2 lagos, a até 7 tiles da água. A lontra fica molhada 2 s e anda ~9 tiles nesse tempo.
  - **Acampamento de caçadores no subsolo:** 3 armadilhas e um poço com cipó.
  - **Gruta:** uma poça e 2 focos de fogo.

  Com as opções padrão são 11 metas.
- **No Phaser** (`src/scenes/worldmap.ts`), o mundo é um Tilemap com duas camadas:
  - fundo: parede escura do subsolo e troncos;
  - frente: terra, pedra, copa e galho, com sombra por profundidade.

  Água, cipó e tufo continuam sprites animados. Cada camada do Tilemap cria um objeto por célula, então não dava pra pôr mais duas.

  Copa e galho só seguram por cima. O tileset é montado em código (`src/art/tileset.ts`), com arte nova de pedra com musgo, copa, galho, tronco e parede.
- **Cavar:**
  - a investida da onça atravessa terra cavando o que está na frente (não o chão embaixo dela);
  - ↓ + J cava pra baixo.

  A borda dos tiles em volta e a sombra se refazem na hora.
- **Metas:** a HUD mostra "x/11". Apagar fogo com a lontra molhada e quebrar armadilha com a investida da onça contam, inclusive armadilha que já tinha fechado.

  Limpou tudo: aparece o painel de madeira "A mata está protegida" com tempo e sementes, e o recorde (melhor tempo) vai pro `localStorage` (`ibiacy-recorde`), que o lobby já lê. ↑ volta pro lobby pela cortina de folhas.
- **Semente:** `?semente=N` fixa o mundo. Sem ela é aleatória, e o console mostra qual saiu. A `GameScene` também aceita `{ seed, world }` no `scene.start`, pra missão escolher.

## Decisões

- **A sala de teste saiu da fase.** O arquivo `src/levels/salaDeTeste.ts` fica, porque os testes do parser usam.
- **Água sem fluxo:** ela é posta já assentada. Cavar do lado de um lago não esvazia o lago.
- **Painel de fim em `src/ui/panel.ts`, separado do LobbyScene.** O lobby está sendo refeito em outra sessão.

## Como foi testado

- **Testes automáticos:** 46 no total, 10 novos.
  - Gerador:
    - determinístico por semente;
    - tamanho pedido;
    - o time nasce em pé no chão;
    - metas presentes;
    - todo fogo perto de água;
    - água assentada;
    - 20 sementes sem erro.
  - Tileset com cada grupo no índice certo.
- `tsc` e build limpos.
- **No navegador** (`?fase&semente=42`):
  - as copas formam caminho e o mico fica em pé nelas;
  - o acampamento aparece com as 3 armadilhas, o poço e o checkpoint;
  - a onça cava pra baixo e atravessa 3 tiles de terra na investida;
  - a lontra sai do lago e apaga 2 focos;
  - quebrar armadilha conta meta;
  - com as metas completas o painel aparece e grava o recorde.

## O que ficou aberto

- **Minimapa:** num mapa desse tamanho faz falta.
- **Auto-degrau:** o herói pula cada degrau de 1 tile; o Terraria sobe sozinho.
- **Missões no lobby novo:** chamar `scene.start('Game', { seed, world })` a partir do Ubiraçá.
- **Fogo que espalha** e máquina de desmatamento (etapa 3).
