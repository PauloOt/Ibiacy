import type { HeroId } from '../core/TeamState';

// O jogo salvo: o herói escolhido no Novo jogo (um só), o nível e os atributos dele, as sementes,
// o que foi comprado e as missões feitas.
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
  v: 2;
  /** O bicho escolhido no Novo jogo: é com ele o jogo inteiro */
  heroi: HeroId;
  ficha: HeroSave;
  sementes: number;
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
export const ATTRS_INICIAIS: Record<HeroId, Partial<Record<Attr, number>>> = {
  mico: { velocidade: 3, astucia: 2 },
  onca: { forca: 3, vigor: 2 },
  lontra: { vigor: 2, inteligencia: 3 },
};

export function novoJogo(heroi: HeroId, agora = Date.now()): Save {
  return {
    v: 2,
    heroi,
    ficha: { nivel: 1, xp: 0, pontos: 0, attrs: attrs(ATTRS_INICIAIS[heroi]) },
    sementes: 0,
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

/** Formato antigo, do tempo do time de três bichos. */
interface SaveV1 extends Omit<Save, 'v' | 'heroi' | 'ficha'> {
  v: 1;
  herois: Record<HeroId, HeroSave>;
}

/** Lê o jogo salvo; null se não tem ou se está estragado. */
export function carregar(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Save | null {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Save | SaveV1;
    if (s.v === 2) return s.ficha && s.heroi ? s : null;
    // Jogo salvo antes da escolha de herói (time de três): vira jogo da onça
    if (s.v === 1 && s.herois?.onca) {
      const { herois, ...resto } = s;
      return { ...resto, v: 2, heroi: 'onca', ficha: herois.onca };
    }
    return null;
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
