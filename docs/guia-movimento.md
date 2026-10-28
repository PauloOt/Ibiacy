# Guia de movimento

Saiu de dois laboratórios em 28/10/2026:
- o da fase e do lobby da clareira (12 momentos, direção "a mata reage");
- o do hub dentro da árvore (9 momentos, em 3D).

O lobby da clareira foi trocado pelo hub; as escolhas da fase continuam valendo.

## O princípio

**Na ação, quem responde é o bicho e a HUD, na hora. Fora da ação, quem se mexe é a câmera e o lugar, e a interface só aparece.**

As escolhas que levam a ele:
- **Na fase:** o Paulo manteve todo feedback de ação como está (troca de bicho, semente, dano, retrato, semente esperando). Nos momentos de passagem e de calma (morte, checkpoint, pausa), escolheu a mata reagindo.
- **No hub, quem anima é a câmera:** ela desce pelo tronco na entrada, gira em volta do tronco enquanto o bicho anda e chega perto do Ubiraçá na conversa.
- **No hub, quem reage é o lugar:**
  - o jabuti levanta a cabeça quando o bicho chega;
  - a onça pula num anel de luz quando sobe de nível;
  - o ar tem vaga-lumes.
- **A interface fica parada:** a lista de missões só aparece e o saldo da lojinha só troca o número. Nenhum painel desliza ou quica.

A pergunta ao animar algo novo: **a pessoa está jogando quando isso acontece?** Se está, a resposta é imediata e fica perto do bicho ou da HUD. Se não está, a resposta pode levar meio segundo ou mais, e quem se mexe é a câmera, o morador ou a mata. Nunca o painel.

## Fichas

### Tempos

| Nome | Valor | Onde |
| --- | --- | --- |
| `D.ja` | 0 ms | resposta da ação; lista e saldo que aparecem |
| `D.curto` | 200 ms | fade de painel e etiqueta; pulso de número |
| `D.base` | 600 ms | câmera chegando perto; cortina de folhas |
| `D.longo` | 1000 ms | ipê crescendo |
| `D.camera` | 1600 ms | câmera descendo pelo tronco na entrada |
| `D.reduzido` | 150 ms | o fade que substitui tudo com movimento reduzido |

### Curvas

| Nome | Uso |
| --- | --- |
| `inOut` (cúbica) | toda câmera: entrada, conversa |
| `degraus(n)` | o que é de pixel: ipê em 6 quadros, cabeça do jabuti em 1 degrau |
| `Sine.InOut` | o que balança sem parar: pétala, capim, vaga-lume |
| `Back.Out` | só o pulo do coração na HUD, que já existe |

Não tem mola.

## Receitas

O spec de cada uma é o da variação escolhida no laboratório.

### Hub

| Momento | Receita |
| --- | --- |
| **Menu → hub, "Novo jogo"** (1B) | O menu some em `D.curto`. A câmera começa no alto do oco (no escuro, com os fungos) e desce até o salão em `D.camera` com `inOut`. |
| **Câmera enquanto o bicho anda** (2C, traduzido) | No 3D ela girava em volta do tronco; em 3/4 de cima não tem como girar, então ela segue o bicho com atraso (8% por quadro). Vale conferir jogando se o atraso agrada. |
| **Chegar perto do Ubiraçá** (3C) | O jabuti levanta a cabeça 1 px de arte (um degrau) e fica assim enquanto o bicho está perto. A etiqueta entra em fade de `D.curto` logo depois. |
| **Conversa com o Ubiraçá** (4C) | A câmera vai até ele e dá zoom de 1,6× em `D.base` (`inOut`); as barras de cinema entram junto (12% da altura cada). A caixa entra em fade de 150 ms e o texto vem a 40 letras/s; E pula pro fim. Na saída, tudo volta pelo mesmo caminho. |
| **Escolher a missão no casco** (5A) | Os cartões aparecem juntos, em fade de `D.curto`. |
| **Comprar na lojinha** (6A) | O saldo troca na hora; o número cresce 35% e volta em `D.curto`, como o contador de sementes da fase. |
| **Subir de nível** (7B) | A luz da cena pulsa uma vez (+120% por 250 ms). O bicho pula 4 px de arte. "+1 Força" (ou o atributo escolhido) sobe da cabeça em 800 ms e some. |
| **Habilidade recarregando** (8B) | Um setor escuro gira e vai abrindo a tecla, como relógio, durante a recarga. |
| **Ar do salão** (9B) | 70 vaga-lumes subindo devagar e balançando. |

### Fase, momentos raros

| Momento | Receita |
| --- | --- |
| **Morrer e voltar** (7B) | Cortina de folhas fecha em 500 ms; o time vai pro checkpoint escondido; abre em 500 ms. É a mesma peça da entrada na trilha. |
| **Checkpoint** (8B) | 6 quadros de crescimento a 6 fps (`D.longo`), 16 pétalas e 2 pássaros pousando na copa. Os pássaros ficam pousados até sair da tela. |
| **Pausa** (12C) | Os bichos param; o capim e as pétalas seguem a 1/4 da velocidade; o fundo escurece a 45%; o título "Pausado" fica parado. |

### Fase, na ação (fica como é hoje)

| Momento | Receita |
| --- | --- |
| **Troca de bicho** | não existe mais: o jogo virou herói único (as folhas da troca ficaram no código, sem uso) |
| **Pegar semente** | 8 brilhos em 450 ms; o contador cresce 35% e volta em 200 ms |
| **Perder coração** | câmera treme 140 ms; o coração cresce 60% e volta com `Back.Out` em 260 ms; o bicho pisca por 1 s |
| **Retrato ativo** | idle em loop, moldura dourada |
| **Semente esperando** | sobe e desce 3 px a cada 900 ms, brilho a 8 fps, halo pulsando |

## Movimento reduzido

Toda receita tem a versão reduzida:
- sem partícula, sem vaga-lume, sem pássaro e sem tremor;
- câmera não viaja: corta pro destino com um fade de `D.reduzido`;
- as barras de cinema entram direto;
- o texto da conversa aparece inteiro;
- a cortina e o ipê crescendo pulam pro estado final;
- o pulo e o pulso de luz do nível somem; o "+1" aparece parado.

## O que não fazer

- **Painel que desliza, quica ou cresce.** No hub, as variações em que os cartões subiam ou o item pulava perderam; a lista aparece e o número troca.
- **Câmera brusca.** Toda viagem de câmera é `inOut`, nunca linear, e nunca mais rápida que `D.base`.
- **Pôr a mata ou a câmera pra reagir no meio da ação.** Na missão, a resposta é do bicho e da HUD, sem atraso.
- **Trocar o feedback da ação sem voltar ao laboratório.** Foi escolhido manter, não esquecido.
- **Partícula laranja ou âmbar como recompensa na missão.** Laranja é fogo, e âmbar é a cor de "dá pra usar" da interface.

## Checklist de PR

- [ ] Quem se mexe é a câmera, o morador ou o bicho, não o painel?
- [ ] A pessoa está jogando quando isso acontece? Se sim, a resposta é imediata.
- [ ] Os tempos e as curvas vêm das fichas deste guia?
- [ ] Tem a versão de movimento reduzido?
- [ ] Se mexeu em troca, semente, coração ou retrato, voltou ao laboratório antes?

## Onde está no código

- Fichas da fase: `src/ui/tokens.ts` (`D`, `N`, `reducedMotion()`).
- Cortina de folhas: `src/ui/LeafCurtain.ts`.
- Hub: `src/scenes/HubScene.ts` (`D_CAMERA` em `src/ui/tokens.ts`). Os laboratórios ficaram em `lab/hub.html` e `lab/movimento3d.html`, fora do git: são em 3D, então servem pro ritmo, não pro desenho.

## Escolhido e ainda não aplicado

- **Habilidade recarregando (8B, relógio varrendo):** as habilidades Q E R F X ainda não existem na fase.
- **Morrer e voltar com a cortina (7B):** a peça já existe, mas a morte ainda volta na hora.
- **Checkpoint mais lento e com pássaros (8B):** ainda está a 12 fps no jogo.
- **Pausa com a mata respirando (12C):** hoje a PauseScene congela tudo e o título balança.
- **Opção de movimento reduzido no menu:** o jogo só segue o `prefers-reduced-motion` do sistema.
