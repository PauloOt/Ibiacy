import type { WorldOptions } from '../core/worldgen';
import type { HeroId } from '../core/TeamState';

// Conteúdo do hub: missões do Ubiraçá, itens da lojinha, falas e habilidades.
// Nomes, preços e números são exemplos até o Paulo decidir (docs/herois.md).

export interface Missao {
  id: string;
  nome: string;
  lugar: string;
  meta: string;
  leva: string;
  recompensa: number;
  xp: number;
  seed: number;
  world: Omit<WorldOptions, 'seed'>;
  /** Missões que precisam estar feitas antes */
  precisa?: string[];
}

export const MISSOES: readonly Missao[] = [
  {
    id: 'queimada', nome: 'Queimada no vale', lugar: 'Serra do Mar', meta: 'apagar os focos de fogo', leva: 'Lontra',
    recompensa: 40, xp: 120, seed: 1101, world: { lakes: 3, queimadas: 2, acampamento: false, gruta: true },
  },
  {
    id: 'acampamento', nome: 'Acampamento de caçadores', lugar: 'Encosta', meta: 'quebrar as armadilhas', leva: 'Onça',
    recompensa: 35, xp: 120, seed: 2202, world: { lakes: 1, queimadas: 0, acampamento: true, gruta: false },
  },
  {
    id: 'maquina', nome: 'A máquina na encosta', lugar: 'Encosta', meta: 'limpar todas as ameaças', leva: 'Os três',
    recompensa: 80, xp: 200, seed: 3303, world: { lakes: 3, queimadas: 2, acampamento: true, gruta: true }, precisa: ['queimada', 'acampamento'],
  },
];

export interface Item {
  id: string;
  nome: string;
  efeito: string;
  preco: number;
}

export const LOJA: readonly Item[] = [
  { id: 'mel', nome: 'Mel de jataí', efeito: 'recupera 1 coração', preco: 15 },
  { id: 'bananeira', nome: 'Folha de bananeira', efeito: 'a lontra fica molhada 3 s a mais', preco: 25 },
  { id: 'harpia', nome: 'Pena de harpia', efeito: 'um pulo a mais pro mico, por missão', preco: 40 },
  { id: 'colar', nome: 'Colar de sementes', efeito: '+1 coração máximo', preco: 120 },
];

export const FALAS = {
  primeira: [
    'Então vocês são os três que a mata mandou. Eu sou Ubiraçá. Já andei por todo canto desta serra, devagar, e guardei os caminhos no casco.',
    'Lá fora tem fogo, laço de caçador e máquina comendo a encosta. Escolham uma trilha no meu casco e vão.',
  ],
  volta: [
    'Vocês três voltaram inteiros. Bom.',
    'Lá embaixo, no vale, a fumaça subiu de novo. Escolham uma trilha no meu casco: cada risco é um caminho que eu já andei.',
  ],
};

export const NOMES: Record<HeroId, string> = { mico: 'Mico-leão-dourado', onca: 'Onça-pintada', lontra: 'Lontra' };

/** Habilidades por tecla. Só a da onça tem exemplo; mico e lontra ainda estão em aberto. */
export const HABILIDADES: Record<HeroId, readonly [string, string][]> = {
  onca: [['Q', 'Investida'], ['E', 'Rugido'], ['R', 'Bote'], ['F', 'Faro'], ['X', 'Fúria da mata']],
  mico: [['Q', 'Pulo duplo'], ['E', '—'], ['R', '—'], ['F', '—'], ['X', '—']],
  lontra: [['Q', 'Mergulho'], ['E', '—'], ['R', '—'], ['F', '—'], ['X', '—']],
};

export const CREDITOS = [
  'Ibiacy é um jogo de plataforma sobre a fauna da Mata Atlântica. Feito por Paulo.',
  'Arte desenhada em código, com o Arperium como referência de estilo.',
  'Fontes: Pixelify Sans e Jacquard 12.',
  'Trilha com chamber rack flute (em produção).',
];
