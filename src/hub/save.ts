import type { HeroId } from '../core/TeamState';

// O jogo salvo: sementes, nível e atributos de cada herói, o que foi comprado e as missões feitas.
// Lógica pura (sem Phaser); quem guarda e lê do localStorage é `carregar`/`salvar`.

export type Attr = 'forca' | 'vigor' | 'velocidade' | 'astucia' | 'inteligencia';

/** Os cinco atributos, na ordem da ficha. */
export const ATTRS: readonly { id: Attr; nome: string }[] = [
  { id: 'forca', nome: 'Força' },
  { id: 'vigor', nome: 'Vigor' },
  { id: 'velocidade', nome: 'Velocidade' },
  { id: 'astucia', nome: 'Astúcia' },
  { id: 'inteligencia', nome: 'Inteligência' },
];

export interface HeroSave {
  nivel: number;
  xp: number;
  /** Pontos ganhos ao subir de nível e ainda não distribuídos */
  pontos: number;
  attrs: Record<Attr, number>;
}

export interface Save {
  v: 1;
  sementes: number;
  herois: Record<HeroId, HeroSave>;
  /** Item da lojinha → quantos tem */
  inventario: Record<string, number>;
  /** Missão → quantas vezes completou */
  missoes: Record<string, number>;
  salvoEm: number;
}

/** Quanto ganha por nível. Exemplo até o Paulo decidir (docs/herois.md). */
export const PONTOS_POR_NIVEL = 2;
export const xpParaProximo = (nivel: number) => 100 + (nivel - 1) * 50;

const attrs = (o: Partial<Record<Attr, number>>): Record<Attr, number> => ({ forca: 1, vigor: 1, velocidade: 1, astucia: 1, inteligencia: 1, ...o });

/** Cada bicho começa puxado pro estilo dele (a onça é força). */
export function novoJogo(agora = Date.now()): Save {
  const heroi = (a: Partial<Record<Attr, number>>): HeroSave => ({ nivel: 1, xp: 0, pontos: 0, attrs: attrs(a) });
  return {
    v: 1,
    sementes: 0,
    herois: {
      mico: heroi({ velocidade: 3, astucia: 2 }),
      onca: heroi({ forca: 3, vigor: 2 }),
      lontra: heroi({ vigor: 2, inteligencia: 3 }),
    },
    inventario: {},
    missoes: {},
    salvoEm: agora,
  };
}

/** Soma XP e sobe quantos níveis couberem. Devolve quantos níveis subiu. */
export function ganharXp(h: HeroSave, xp: number): number {
  h.xp += xp;
  let subiu = 0;
  while (h.xp >= xpParaProximo(h.nivel)) {
    h.xp -= xpParaProximo(h.nivel);
    h.nivel++;
    h.pontos += PONTOS_POR_NIVEL;
    subiu++;
  }
  return subiu;
}

/** Gasta um ponto no atributo. false = não tinha ponto. */
export function distribuir(h: HeroSave, attr: Attr): boolean {
  if (h.pontos <= 0) return false;
  h.pontos--;
  h.attrs[attr]++;
  return true;
}

/** Compra um item. false = sementes não dão. */
export function comprar(s: Save, item: string, preco: number): boolean {
  if (s.sementes < preco) return false;
  s.sementes -= preco;
  s.inventario[item] = (s.inventario[item] ?? 0) + 1;
  return true;
}

const SAVE_KEY = 'ibiacy-save';

/** Lê o jogo salvo; null se não tem ou se está estragado. */
export function carregar(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Save | null {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Save;
    return s.v === 1 && s.herois?.onca ? s : null;
  } catch {
    return null;
  }
}

export function salvar(s: Save, storage: Pick<Storage, 'setItem'> | null = safeStorage(), agora = Date.now()): void {
  s.salvoEm = agora;
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // Sem localStorage (aba privada, bloqueado): o jogo segue, só não fica salvo
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
