import type { WorldOptions } from '../core/worldgen';
import type { HeroId } from '../core/TeamState';

// Conteúdo do hub: missões do Ubiraçá, itens da lojinha, falas e habilidades.
// Nomes, preços e números são exemplos até o Paulo decidir (docs/herois.md).

export interface Missao {
  id: string;
  nome: string;
  lugar: string;
  meta: string;
  recompensa: number;
  xp: number;
  seed: number;
  world: Omit<WorldOptions, 'seed'>;
  /** Missões que precisam estar feitas antes */
  precisa?: string[];
}

export const MISSOES: readonly Missao[] = [
  {
    id: 'queimada', nome: 'Queimada no vale', lugar: 'Serra do Mar', meta: 'apagar os focos de fogo e fugir da frente de fogo',
    recompensa: 40, xp: 120, seed: 1101, world: { lakes: 3, queimadas: 2, acampamento: false, gruta: true, rio: true, frente: true, maquinas: 0 },
  },
  {
    id: 'acampamento', nome: 'Acampamento de caçadores', lugar: 'Encosta', meta: 'desarmar os laços e parar a máquina',
    recompensa: 35, xp: 120, seed: 2202, world: { lakes: 1, queimadas: 0, acampamento: true, gruta: false, rio: false, frente: false, maquinas: 1 },
  },
  {
    id: 'maquina', nome: 'As máquinas na encosta', lugar: 'Encosta', meta: 'parar as máquinas e limpar todas as ameaças',
    recompensa: 80, xp: 200, seed: 3303, world: { lakes: 3, queimadas: 2, acampamento: true, gruta: true, rio: true, frente: true, maquinas: 4 }, precisa: ['queimada', 'acampamento'],
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
    'Então é você que a mata mandou. Eu sou Ubiraçá. Já andei por todo canto desta serra, devagar, e guardei os caminhos no casco.',
    'Lá fora tem fogo, laço de caçador e máquina comendo a encosta. Cada bicho passa do seu jeito. Escolha uma trilha no meu casco e vá.',
  ],
  volta: [
    'Voltou inteiro. Bom.',
    'Lá embaixo, no vale, a fumaça subiu de novo. Escolha uma trilha no meu casco: cada risco é um caminho que eu já andei.',
  ],
};

export const NOMES: Record<HeroId, string> = { mico: 'Mico-leão-dourado', onca: 'Onça-pintada', lontra: 'Lontra' };

/** O que aparece na escolha do herói: o estilo e como cada um passa pelas ameaças. */
export const ESTILOS: Record<HeroId, { estilo: string; jeito: string }> = {
  onca: { estilo: 'Força', jeito: 'Investida que quebra tronco, laço e máquina. Cava terra (até por baixo do rio) e abafa o fogo.' },
  mico: { estilo: 'Agilidade', jeito: 'Pulo duplo e escalada. Atravessa o rio pelos galhos altos e foge do fogo pelas copas.' },
  lontra: { estilo: 'Água', jeito: 'Nada contra a correnteza e mergulha. Saindo da água molhada, apaga fogo.' },
};

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
