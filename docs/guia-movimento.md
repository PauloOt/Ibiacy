# Guia de movimento

Saiu do laboratório de movimento em 28/10/2026, onde 12 momentos do jogo foram mostrados com 3 ou 4 jeitos de animar. A direção proposta foi **"a mata reage"**: a interface quase não se mexe, quem responde é o lugar.

## O princípio

**Na ação, quem responde é o bicho e a HUD, na hora. Na passagem e na calma, quem responde é a mata, devagar.**

Ele saiu das escolhas, não da direção proposta. Nos momentos de passagem e de calma o Paulo escolheu a mata reagindo em todos:
- a placa e o painel do lobby;
- a entrada na trilha;
- morrer e voltar;
- o checkpoint;
- o ar da clareira;
- a pausa.

Nos momentos de ação, ele manteve o que o jogo já faz em todos: a troca de bicho, pegar semente, perder coração, o retrato ativo e a semente esperando no chão. Essa exceção é a regra de verdade.

A pergunta ao animar algo novo: **a pessoa está pulando quando isso acontece?** Se está, a resposta é imediata e fica perto do bicho ou da HUD. Se não está, a resposta pode levar meio segundo, e quem se mexe é a folha, a pétala, o pássaro.

## Fichas

### Tempos

| Nome | Valor | Onde |
| --- | --- | --- |
| `D.ja` | 0 ms | resposta da ação: dano, troca, coleta |
| `D.curto` | 200 ms | fade de painel, placa acendendo, segurar a cortina fechada |
| `D.base` | 600 ms | cortina de folhas fechando ou abrindo, folhas até a placa |
| `D.longo` | 1000 ms | ipê crescendo |
| `D.reduzido` | 150 ms | o fade que substitui tudo com movimento reduzido |

### Curvas

| Nome | Uso |
| --- | --- |
| `degraus(n)` | o que é da interface: acende em n quadros, não desliza (placa em 3 degraus, ipê em 6 quadros) |
| `Sine.InOut` | o que balança sem parar: pétala, capim, flutuar da semente |
| `Back.Out` | só o pulo do coração na HUD, que já existe |

Não tem mola. Interface de madeira não quica.

### Quantidades

| Nome | Valor |
| --- | --- |
| `N.poucas` | 6 (folhas até a placa) |
| `N.chuva` | 14 a 16 (pétalas do ipê) |
| `N.ar` | 8 (pétalas soltas no lobby) |

## Receitas

O spec de cada uma é o da variação escolhida no laboratório.

### Lobby

| Momento | Receita |
| --- | --- |
| **Placa acende quando o bicho chega perto** (1C) | `N.poucas` folhas caem da copa até a placa em `D.base`; a placa vai de 35% a 100% em 3 degraus de 100 ms, começando quando as folhas chegam. Ao se afastar, apaga direto pra 35%. |
| **Painel de Recorde abre** (2C) | A copa do ipê treme ±2 px (4 px no jogo) por 400 ms, caem 14 pétalas, e o painel entra em fade de `D.curto` depois do tremor. |
| **Entrar na trilha** (3B) | Cortina de folhas fecha das bordas pro meio em `D.base`, segura `D.curto` e a cena troca escondida. Abre em `D.base` já na fase. |
| **Painel de Créditos** | Não estava no laboratório; segue a receita do Recorde com a toca no lugar do ipê: `N.poucas` folhas caem do barranco sobre a boca da toca e o painel entra em fade de `D.curto` depois de 400 ms. |
| **Ar da clareira** (11B) | 8 pétalas do ipê caindo devagar, em loop. Sem poeira de luz no lobby. |

### Fase, momentos raros

| Momento | Receita |
| --- | --- |
| **Morrer e voltar** (7B) | A mesma cortina da trilha: fecha em 500 ms; o time vai pro checkpoint escondido; abre em 500 ms. É a mesma peça, um componente só. |
| **Checkpoint** (8B) | 6 quadros de crescimento a 6 fps (`D.longo`), 16 pétalas e 2 pássaros pousando na copa. Os pássaros ficam pousados até sair da tela. |
| **Pausa** (12C) | Os bichos param; o capim e as pétalas seguem a 1/4 da velocidade; o fundo escurece a 45%; o título "Pausado" fica parado. |

### Fase, na ação (fica como é hoje)

| Momento | Receita |
| --- | --- |
| **Troca de bicho** | 14 folhas, 60–180 px/s, 600 ms, com gravidade |
| **Pegar semente** | 8 brilhos em 450 ms; o contador cresce 35% e volta em 200 ms |
| **Perder coração** | câmera treme 140 ms; o coração cresce 60% e volta com `Back.Out` em 260 ms; o bicho pisca por 1 s |
| **Retrato ativo** | idle em loop, moldura dourada |
| **Semente esperando** | sobe e desce 3 px a cada 900 ms, brilho a 8 fps, halo pulsando |

## Movimento reduzido

Toda receita tem a versão reduzida:
- sem partícula, sem pássaro e sem tremor;
- toda transição vira um fade de `D.reduzido` passando pelo escuro;
- a placa acende num fade de `D.reduzido`;
- a cortina e o ipê crescendo pulam pro estado final;
- as pétalas do ar somem.

## O que não fazer

- **Mexer a interface pra dar resposta.** Placa e painel não deslizam, não quicam, não crescem. Quem se mexe é a folha. No laboratório, as variações em que a placa subia ou o painel descia no cipó perderam.
- **Pôr a mata pra reagir no meio da ação.** Capim curvando na troca, flor abrindo na semente e pássaro fugindo no dano foram recusados: na hora do pulo a resposta tem que estar no bicho, sem atraso.
- **Trocar o feedback da ação sem voltar ao laboratório.** Foi escolhido manter, não esquecido.
- **Cortina diferente pra trilha e pra morte.** É a mesma peça.
- **Partícula laranja como recompensa.** Laranja é fogo.

## Checklist de PR

- [ ] O que se mexe é a mata ou o bicho, não a placa?
- [ ] A pessoa está pulando quando isso acontece? Se sim, a resposta é imediata.
- [ ] Os tempos e as quantidades vêm das fichas deste guia?
- [ ] Tem a versão de movimento reduzido?
- [ ] Se mexeu em troca, semente, coração ou retrato, voltou ao laboratório antes?

## Onde está no código

- Fichas: `src/ui/tokens.ts` (`D`, `N`, `reducedMotion()`).
- Cortina de folhas: `src/ui/LeafCurtain.ts`.
- Placa, painel e o ar da clareira: `src/scenes/LobbyScene.ts`.

## Escolhido e ainda não aplicado

- **Morrer e voltar com a cortina (7B):** a peça já existe (`LeafCurtain`), mas a morte ainda volta na hora.
- **Checkpoint mais lento e com pássaros (8B):** ainda está a 12 fps no jogo.
- **Pausa com a mata respirando (12C):** hoje a PauseScene congela tudo e o título balança.
- **Opção de movimento reduzido no menu:** o lobby e a cortina já respeitam o `prefers-reduced-motion` do sistema, mas o jogo ainda não tem a opção própria.
