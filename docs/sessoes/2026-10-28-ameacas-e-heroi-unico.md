# 28/10/2026: Ameaças completas e herói único

A etapa 3 do PROGRESSO trazia a frente de fogo que avança, a máquina de desmatamento e a correnteza.

No meio dela, o Paulo mudou a base do jogo. Agora, ao criar um jogo, você escolhe **um** herói e joga com ele.

## Decisões

- **A troca de bicho acaba.** Cada jogo é de um herói só, escolhido no Novo jogo.
- **Heróis:** os do escopo (mico, onça e lontra). O tamanduá foi citado como exemplo, mas não está no escopo; ficou anotado como possível quarto herói.
- **Toda missão dá pra fazer com qualquer herói, e cada um passa do seu jeito.** As regras que saíram disso estão na tabela de [herois.md](../herois.md):
  - **Molhar vale pra todo bicho.** A beira do lago, com 1 tile de fundura, é rasa: ninguém se afoga ali.
  - **Fogo:** a onça também abafa com a investida.
  - **Laço:** qualquer bicho desarma segurando ↓ por 1 s do lado dele (é a astúcia).
  - **Máquina:** qualquer bicho desliga pulando em cima; a onça desliga também com a investida.
  - **Rio:** tem galhos altos que só o pulo duplo do mico alcança; a onça cava por baixo e a lontra nada contra a correnteza.

## O que foi feito

### Gerador do mundo (`src/core/worldgen.ts`)

Três opções novas, todas ligadas por padrão: `rio`, `frente` e `maquinas` (2 por padrão, até 4).

- **Rio:**
  - 27 tiles de largura e 4 de fundo, no leito chato entre o primeiro lago e o acampamento;
  - correnteza pro oeste;
  - galhos `=` a cada 5 tiles, 5 acima da água.
- **Frente de fogo:** nasce 6 tiles depois do rio, liga quando o bicho passa 16 tiles além disso e para na margem do lago seguinte.
- **Máquinas:** `M` em chão livre da metade leste.
- **Metas:** agora contam fogos, laços e máquinas.
- **O `World` devolve** `correntes` e `frentes`; o leitor de mapa ganhou o `M` e a lista `machines`.

### Fase (`src/scenes/GameScene.ts`)

- **Máquina:**
  - patrulha a 70 px/s e vira na parede, na beira do chão e antes da água;
  - o contato dá dano;
  - desligada, fica cinza e parada, sem a serra.
- **Frente de fogo:**
  - anda a 120 px/s com chamas seguindo o relevo e deixa a grama queimada (`WorldMap.burn`);
  - machuca só quem está perto do chão;
  - no respawn volta pro começo.
- **Correnteza:** arrasta a lontra a 60 px/s e os outros a 170 px/s, com riscos de água correndo na superfície do rio.
- **Desarmar:** segurar ↓ por 1 s do lado do laço.
- **Arte nova:** a máquina de desmatamento (`src/art/ameacas.ts`), com esteira e serra girando e um quadro desligada.

### Herói único

- **`src/hub/save.ts`:**
  - o jogo salvo é v2, com `heroi` e uma `ficha` só;
  - jogo salvo v1 (o do time) vira jogo da onça.
- **Hub (`src/scenes/HubScene.ts`):**
  - o Novo jogo abre "Escolha seu bicho": três cartões com o bicho andando, o estilo, como ele passa pelas ameaças e os atributos de começo;
  - no salão só aparece o seu bicho;
  - não tem mais 1, 2 e 3;
  - as falas do Ubiraçá ficaram no singular.
- **Fase:** recebe `heroi` do hub (ou `?heroi=` na URL) e cria só aquele bicho.
- **HUD:** mostra só o retrato dele, e a dica de teclas troca a troca de bicho pelo desarmar.
- **Missões:** dizem o que tem em cada uma em vez de "Leva: Onça". A primeira tem rio e frente de fogo; a segunda, laços e 1 máquina; a terceira, 4 máquinas e tudo junto.

## Como foi testado

- 56 testes (5 novos do gerador, mais a migração do jogo salvo); build limpo.
- No navegador:
  - **Menu → Novo jogo:** a escolha do bicho aparece; escolher o mico leva pro salão com ele.
  - **Onça (`?fase&heroi=onca&semente=42`):**
    - a investida desliga a máquina, conta a meta e não tira coração;
    - no rio a correnteza leva a ~190 px/s pro oeste;
    - a frente liga ao passar do gatilho e anda ~124 px/s queimando a grama.
  - **Mico:**
    - cair em cima da máquina desliga;
    - segurar ↓ do lado do laço desarma;
    - na beira rasa do lago ele não se afoga, pula pra margem molhado e apaga os 3 focos da queimada sem perder coração.

## Problemas no caminho

- **Na beira de 1 tile o mico se afogava:** nenhum bicho tem 32 px de altura, então a cabeça ficava embaixo d'água. O raso agora é medido pela fundura (1 tile), não pela cabeça.

## Ficou de fora

- **Habilidades em Q E R F X:** a habilidade ainda é o J.
- **Itens da loja:** ainda não fazem efeito.
- **A grande máquina do final do escopo,** em que cada herói desliga uma parte.
- **Ninguém jogou a missão inteira** de ponta a ponta com cada bicho; os testes foram por trecho.
