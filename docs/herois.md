# Heróis: atributos e habilidades

O que o Paulo definiu em 28/10/2026 e o que ainda está em aberto.

## Definido

- **Um herói só, escolhido no Novo jogo** (mico, onça ou lontra, os do escopo). Sem troca de bicho na fase.
- **Cada herói tem um estilo de jogo próprio.** A onça é força.
- **Toda missão dá pra fazer com qualquer herói: cada um passa do seu jeito.**

| Obstáculo | Mico (agilidade) | Onça (força) | Lontra (água) |
| --- | --- | --- | --- |
| Foco de fogo | molhado apaga: um mergulho na beira rasa do lago | molhado apaga, ou abafa com a investida | molhado apaga (sai da água e corre) |
| Laço de caçador | segurar ↓ 1 s do lado: desarma | investida quebra (ou desarma igual) | segurar ↓ 1 s do lado: desarma |
| Máquina de desmatamento | pula em cima: desliga | investida desliga (ou pula em cima) | pula em cima: desliga |
| Rio com correnteza | galhos altos sobre o rio, só no pulo duplo | cava por baixo do rio | nada contra a correnteza |
| Frente de fogo | corre, ou sobe nas copas | corre | corre (é a mais lenta: 150 contra 120 px/s do fogo) |

Molhar vale pra todo bicho: qualquer um que sai da água fica molhado 2 s. A beira do lago tem 1 tile de fundura, e ali ninguém se afoga.
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
- **Teclas:** a habilidade ainda é o J. Sem troca de bicho, Q e E ficaram livres; falta passar as habilidades pra Q E R F X.
- **O tamanduá-bandeira** apareceu como exemplo de herói, mas não está no escopo. Pode entrar depois como quarto bicho (garras, cava cupinzeiro).
- **XP:** hoje vem só da missão completa, e os três ganham o mesmo XP. Falta decidir se metas e sementes também dão XP, e se cada bicho ganha só quando joga.
- **Salvar e carregar:** hoje fica no `localStorage` do navegador (`ibiacy-save`): sementes, nível, XP, pontos e atributos de cada bicho, itens comprados e missões feitas. Falta decidir se vale mais de um jogo salvo.
