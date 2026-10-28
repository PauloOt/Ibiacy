# Heróis: atributos e habilidades

O que o Paulo definiu em 28/10/2026 e o que ainda está em aberto.

## Definido

- **Cada herói tem um estilo de jogo próprio.** A onça é força.
- **Ao subir de nível, o jogador distribui pontos entre cinco atributos:**
  1. Força
  2. Vigor
  3. Velocidade
  4. Astúcia
  5. Inteligência
- **Cada herói tem habilidades nas teclas Q, E, R, F e X.**
- **O jogo começa por um menu (Novo jogo, Carregar jogo, Créditos)** e depois vai pro hub (feito em `src/scenes/HubScene.ts`). No hub você fala com o **Ubiraçá**, o líder, pra pegar missões (os mapas), e compra itens na lojinha.

## Exemplo usado nos laboratórios (não decidido)

| Tecla | Onça |
| --- | --- |
| Q | Investida (a que existe hoje: quebra tronco e armadilha, e agora cava terra) |
| E | Rugido |
| R | Bote |
| F | Faro |
| X | Fúria da mata (a habilidade mais forte, recarga longa) |

Os outros números também são exemplo:
- **Ficha da onça:** nível 3, 120/200 XP, Força 7, Vigor 5, Velocidade 4, Astúcia 3, Inteligência 2.
- **Missões, itens, preços e falas:** em `src/hub/data.ts`.

## Em aberto

- **Quantos pontos por nível.** No jogo está 2, como exemplo (`PONTOS_POR_NIVEL` em `src/hub/save.ts`), e o XP pro próximo nível é 100 + 50 por nível. E se o herói ganha algo sozinho no atributo dele (a onça "upa com força").
- **O que cada atributo faz no jogo.** Por exemplo: Força quebra mais coisa, Vigor dá corações, Velocidade dá corrida e pulo, Astúcia mexe com armadilha e esconderijo, Inteligência mexe na recarga das habilidades.
- **As habilidades do mico e da lontra.**
- **Hoje o jogo usa as teclas E e Q pra trocar de bicho em ciclo, e J/Shift pra habilidade.** Com habilidades em Q E R F X, a troca fica só no 1, 2 e 3, e a habilidade sai do J.
- **XP:** hoje vem só da missão completa, e os três ganham o mesmo XP. Falta decidir se metas e sementes também dão XP, e se cada bicho ganha só quando joga.
- **Salvar e carregar:** hoje fica no `localStorage` do navegador (`ibiacy-save`): sementes, nível, XP, pontos e atributos de cada bicho, itens comprados e missões feitas. Falta decidir se vale mais de um jogo salvo.
