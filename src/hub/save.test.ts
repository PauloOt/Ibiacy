import { describe, expect, it } from 'vitest';
import { MISSOES } from './data';
import { carregar, comprar, distribuir, ganharXp, novoJogo, PONTOS_POR_NIVEL, salvar, xpParaProximo } from './save';

describe('jogo salvo', () => {
  it('jogo novo: o bicho escolhido no nível 1, sem sementes, puxado pro seu estilo', () => {
    const s = novoJogo('onca', 0);
    expect([s.heroi, s.sementes, s.ficha.nivel, s.ficha.xp, s.ficha.pontos]).toEqual(['onca', 0, 1, 0, 0]);
    expect(s.ficha.attrs.forca).toBeGreaterThan(s.ficha.attrs.inteligencia);
    expect(novoJogo('mico').ficha.attrs.velocidade).toBeGreaterThan(novoJogo('mico').ficha.attrs.forca);
  });

  it('XP sobe de nível, sobra pro próximo e dá pontos', () => {
    const h = novoJogo('onca').ficha;
    expect(ganharXp(h, xpParaProximo(1) - 1)).toBe(0);
    expect(ganharXp(h, 1 + xpParaProximo(2) + 10)).toBe(2);
    expect([h.nivel, h.xp, h.pontos]).toEqual([3, 10, 2 * PONTOS_POR_NIVEL]);
  });

  it('distribuir gasta ponto; sem ponto não mexe', () => {
    const h = novoJogo('onca').ficha;
    expect(distribuir(h, 'forca')).toBe(false);
    h.pontos = 1;
    expect(distribuir(h, 'forca')).toBe(true);
    expect([h.pontos, h.attrs.forca]).toEqual([0, 4]);
  });

  it('comprar desconta e guarda o item; sem sementes não compra', () => {
    const s = novoJogo('lontra');
    expect(comprar(s, 'mel', 15)).toBe(false);
    s.sementes = 20;
    expect(comprar(s, 'mel', 15)).toBe(true);
    expect([s.sementes, s.inventario.mel]).toEqual([5, 1]);
  });

  it('salva e carrega; jogo estragado vira null', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const s = novoJogo('mico');
    s.sementes = 42;
    salvar(s, storage, 123);
    expect(carregar(storage)).toMatchObject({ sementes: 42, salvoEm: 123 });
    expect(carregar(storage)?.heroi).toBe('mico');
    // Jogo salvo do tempo do time vira jogo da onça
    mem.set('ibiacy-save', JSON.stringify({ v: 1, sementes: 9, herois: { onca: { nivel: 2, xp: 0, pontos: 1, attrs: {} } }, inventario: {}, missoes: {}, salvoEm: 1 }));
    expect(carregar(storage)).toMatchObject({ v: 2, heroi: 'onca', sementes: 9, ficha: { nivel: 2 } });
    mem.set('ibiacy-save', '{quebrado');
    expect(carregar(storage)).toBeNull();
  });

  it('missão trancada só depende de missões que existem', () => {
    const ids = new Set(MISSOES.map((m) => m.id));
    for (const m of MISSOES) for (const p of m.precisa ?? []) expect(ids.has(p)).toBe(true);
  });
});
