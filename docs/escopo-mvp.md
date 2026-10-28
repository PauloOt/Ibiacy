# Escopo do MVP

Resumo do documento "Jogo Biomas BR — Escopo do MVP" (28/10/2026). O nome provisório do jogo é **Ibiacy**.

## O que mudou desde o documento (28/10/2026)

O resto deste arquivo é o escopo original. Estas decisões do Paulo, tomadas durante o desenvolvimento, valem por cima dele:

- **Um herói só, escolhido no Novo jogo.** Não existe mais troca de bicho nem time: você joga o jogo inteiro com o mico, a onça ou a lontra. O pilar "a troca de herói é o coração do jogo" caiu.
- **Toda missão dá pra fazer com qualquer herói; cada um passa do seu jeito** (tabela em [herois.md](herois.md)).
- **A fase virou um mundo grande gerado por semente**, no estilo do Terraria (copas, superfície, lagos, rio, cavernas), com metas espalhadas no lugar dos 5 trechos fixos no Tiled.
- **Entraram:** menu inicial, hub andável dentro de uma árvore (Ubiraçá dá as missões), lojinha, ficha do herói com 5 atributos e jogo salvo. No documento eles estavam fora ("save", "loja e upgrades", "diálogos").

## Visão geral

Plataforma 2D de navegador em que o jogador controla um time de animais brasileiros e troca de herói na hora pra vencer os obstáculos de cada bioma. O MVP tem 1 bioma (Mata Atlântica), 3 heróis e 1 fase completa, jogável do começo ao fim.

Pitch: Celeste com fauna brasileira. Cada bicho tem um poder, e a fase só passa se você souber quem usar e quando.

## Pilares

- **A troca de herói é o coração do jogo.** Todo obstáculo foi pensado pra uma habilidade, e os melhores trechos pedem troca no meio do pulo.
- **Fauna e ameaças reais.** Animais, plantas e ameaças existem no bioma. Educa sem virar aula.
- **Pequeno e polido.** Uma fase curta e caprichada vale mais que cinco fases cruas.

Plataforma: navegador desktop, teclado. Controle e celular ficam pra depois.

## Pronto quando

Alguém abre o link, joga a Fase 1 inteira em 5 a 10 minutos usando os 3 heróis e vê a tela de final.

**Entra:** Mata Atlântica; 3 heróis com troca instantânea; 1 fase com tutorial embutido, 3 checkpoints e final; vida compartilhada (3 corações), morte e respawn no checkpoint; sementes nativas (contador na HUD); 3 ameaças (fogo, armadilha, máquina de desmatamento); menu inicial, pausa e tela de final com tempo e sementes; deploy público (GitHub Pages ou Vercel).

**Fica de fora:** os outros 5 biomas; controle, celular e touch; save, contas e ranking; cutscenes e diálogos; loja e upgrades; multiplayer.

## Heróis

| Herói | Papel | Habilidade | Resolve | Ponto fraco |
| --- | --- | --- | --- | --- |
| Mico-leão-dourado | Agilidade | Pulo duplo + agarrar e escalar cipós e troncos | Abismos, paredes altas, copa | Não quebra nada, afunda na água |
| Onça-pintada | Força | Investida que quebra tronco podre e pedra rachada | Caminhos bloqueados, máquinas | Pulo baixo, não escala |
| Lontra-neotropical | Água | Nada e mergulha sem perder vida, nada contra a correnteza | Rios, alagados, passagens submersas | Lenta em terra, pulo médio |

Extra se sobrar tempo: tucano-de-bico-verde, que plana.

## Regras

- Troca instantânea, inclusive no ar: o herói novo herda posição e velocidade. Cooldown de 0,3 s e efeito de folhas.
- Vida: 3 corações do time. Dano dá 1 s de invulnerabilidade piscando.
- Morte (corações zerados ou abismo): volta no último checkpoint com vida cheia; sementes pegas depois dele se perdem.
- Checkpoints: 3 mudas de árvore que brotam quando você passa.
- Feel do Celeste: coyote time (~100 ms), jump buffer (~100 ms), pulo variável.

## Fase 1: Mata Atlântica

1. **Abertura (só o mico):** andar, pular, pulo duplo, escalar cipó. Checkpoint 1.
2. **Encontro com a onça:** tronco bloqueia o caminho e a onça está presa numa armadilha. O jogador solta ela e aprende a investida. Checkpoint 2.
3. **Rio:** a lontra entra no time. Correnteza, mergulho, passagens submersas.
4. **Trecho misto:** queimada avançando, troca rápida (pular de mico, onça no ar, cair no rio de lontra). Checkpoint 3.
5. **Final:** a máquina de desmatamento, um trecho em que cada herói desliga uma parte dela. Tela de final.

## Ameaças

| Ameaça | Comportamento | Quem resolve |
| --- | --- | --- |
| Fogo | Blocos fixos e uma frente que avança no trecho 4 | Desviar; a lontra molhada apaga foco pequeno |
| Armadilha de caçador | Laço no chão, prende 2 s e tira 1 coração | A onça quebra; os outros pulam |
| Máquina de desmatamento | Patrulha e dá dano no contato | A investida da onça desliga |

Coletáveis: ~30 sementes nativas (ipê, jequitibá, pau-brasil), algumas em rotas que só um herói alcança.

## Trilha sonora

As trilhas do jogo vão usar **chamber rack flute** (pedido de 28/10/2026). Fora do escopo da etapa 1, que não tem áudio.

## Stack

Phaser 3 (Arcade Physics) + TypeScript + Vite, mapas no Tiled, deploy no GitHub Pages ou Vercel. Classe base `Hero` (movimento, pulo, coyote time) com uma subclasse por animal que sobrescreve `useAbility()` e os atributos; `TeamManager` guarda os 3 heróis, a vida compartilhada e faz a troca.
