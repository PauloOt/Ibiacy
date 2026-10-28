# 28/10/2026: Lobby, visual e movimento

O Paulo pediu que o lobby fosse um lugar na fauna e um design system pra escolher. Depois pediu o laboratório de movimento.

## Entrevista

- **O lobby é um lugar que se anda,** não um menu parado.
- **O lugar:** uma clareira com ipê e uma toca. Jogar é a trilha, Recorde é o ipê, Créditos é a toca.
- **Referências:** Arperium, Soul Knight, Terraria e Stardew Valley.
- **Direção de movimento:** "a mata reage". A interface quase não se mexe; quem responde é o lugar.

## Laboratórios

Os dois ficam em `lab/`, fora do git (está no `.gitignore`), e usam a arte de verdade de `src/art`. Pra abrir, rode `npm run dev` e acesse:

- `/lab/lobby.html`: o lobby em 4 visuais com a mesma marcação.
  1. "Como é hoje", que é a HUD atual;
  2. Fim de tarde, com madeira;
  3. Noite na toca, com vaga-lumes;
  4. Corte do chão.
- `/lab/movimento.html`: 12 momentos com 3 ou 4 variações cada, 46 no total.
  - Tem o comportamento de hoje marcado em cada momento, a receita escrita embaixo de cada variação e o interruptor de movimento reduzido com três estados.
  - Também dá pra escolher no próprio card e copiar as escolhas.

## Escolhas

**Visual:** fim de tarde na clareira.

**Movimento:**

| Momento | Escolha |
| --- | --- |
| Placa perto | C · folhas caem e revelam |
| Painel | C · o ipê sacode |
| Trilha | B · a folhagem fecha |
| Troca de bicho | como hoje |
| Semente | como hoje |
| Coração | como hoje |
| Morte | B · folhas cobrem |
| Checkpoint | B · cresce devagar e chama pássaros |
| Retrato | como hoje |
| Semente esperando | como hoje |
| Ar da clareira | B · pétalas soltas |
| Pausa | C · a mata respira devagar |

**O achado:** tudo que acontece no meio da ação ficou como está. A mata reagindo ficou só nos momentos de passagem e de calma. Daí o princípio do guia de movimento.

## Resultado

- [docs/guia-visual.md](../guia-visual.md)
- [docs/guia-movimento.md](../guia-movimento.md)

Os dois guias listam o que foi escolhido e ainda não está no jogo.

## Lobby no jogo

Depois das escolhas, o lobby foi feito de verdade (`src/scenes/LobbyScene.ts`). O jogo abre nele; `?fase` pula direto pra fase.

- **O lugar:** um mapa de uma tela (`src/levels/lobby.ts`) com o mesmo chão e fundo da fase.
  - Pra isso a montagem do cenário saiu da `GameScene` pra `src/scenes/terrain.ts`, sem mudar o comportamento.
  - O ipê grande e a toca foram pra `src/art/lobby.ts`.
- **Placas:** apagadas a 35% de longe. Quando o bicho chega perto, caem 6 folhas e a placa acende em 3 degraus. ↑ entra.
- **Recorde:** a copa do ipê treme, caem 14 pétalas e o painel entra em fade.
  - Lê o recorde de `localStorage` (`ibiacy-recorde`).
  - Ainda não existe recorde gravado: a tela de final, que vai gravar, é da etapa 4.
- **Créditos:** não tinha variação no laboratório; usa a receita do Recorde com a toca no lugar do ipê.
- **Trilha:** a cortina de folhas (`src/ui/LeafCurtain.ts`) fecha, segura 200 ms e a fase começa com ela abrindo. A HUD só entra quando a cortina termina de abrir.
- **Luz da tarde e pétalas no ar:** como no guia.
  - Com `prefers-reduced-motion`, as pétalas e as folhas somem, o ipê não treme e a cortina vira fade pelo escuro.
- **Fichas dos guias:** em `src/ui/tokens.ts`; a tábua de madeira em `src/ui/wood.ts`.

### Decisões

- **Só o bicho ativo aparece no lobby,** como na fase. No laboratório os três ficavam parados na clareira, mas aí trocar de bicho faria um deles sumir de um lugar e aparecer em outro.
- **Título do painel em 40 px, não 30:** a Jersey 10 é estreita e ficava miúda.

### Como foi testado

- 36 testes (2 novos: arte do lobby e mapa); `tsc` e build limpos.
- No navegador, com teclas simuladas:
  - andar até o ipê acende a placa;
  - ↑ abre o Recorde e ↑ fecha;
  - a toca abre os Créditos;
  - na trilha, ↑ fecha a cortina e a fase começa com a HUD.
