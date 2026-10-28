import { describe, expect, it } from 'vitest';
import { MISSOES } from './data';
import { carregar, comprar, distribuir, ganharXp, novoJogo, PONTOS_POR_NIVEL, salvar, xpParaProximo } from './save';

describe('jogo salvo', () => {
  it('jogo novo: os três no nível 1, sem sementes, cada um puxado pro seu estilo', () => {
    const s = novoJogo(0);
    expect(s.sementes).toBe(0);
    for (const h of Object.values(s.herois)) expect([h.nivel, h.xp, h.pontos]).toEqual([1, 0, 0]);
    expect(s.herois.onca.attrs.forca).toBeGreaterThan(s.herois.onca.attrs.inteligencia);
  });

  it('XP sobe de nível, sobra pro próximo e dá pontos', () => {
    const h = novoJogo().herois.onca;
    expect(ganharXp(h, xpParaProximo(1) - 1)).toBe(0);
    expect(ganharXp(h, 1 + xpParaProximo(2) + 10)).toBe(2);
    expect([h.nivel, h.xp, h.pontos]).toEqual([3, 10, 2 * PONTOS_POR_NIVEL]);
  });

  it('distribuir gasta ponto; sem ponto não mexe', () => {
    const h = novoJogo().herois.onca;
    expect(distribuir(h, 'forca')).toBe(false);
    h.pontos = 1;
    expect(distribuir(h, 'forca')).toBe(true);
    expect([h.pontos, h.attrs.forca]).toEqual([0, 4]);
  });

  it('comprar desconta e guarda o item; sem sementes não compra', () => {
    const s = novoJogo();
    expect(comprar(s, 'mel', 15)).toBe(false);
    s.sementes = 20;
    expect(comprar(s, 'mel', 15)).toBe(true);
    expect([s.sementes, s.inventario.mel]).toEqual([5, 1]);
  });

  it('salva e carrega; jogo estragado vira null', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const s = novoJogo();
    s.sementes = 42;
    salvar(s, storage, 123);
    expect(carregar(storage)).toMatchObject({ sementes: 42, salvoEm: 123 });
    mem.set('ibiacy-save', '{quebrado');
    expect(carregar(storage)).toBeNull();
  });

  it('missão trancada só depende de missões que existem', () => {
    const ids = new Set(MISSOES.map((m) => m.id));
    for (const m of MISSOES) for (const p of m.precisa ?? []) expect(ids.has(p)).toBe(true);
  });
});
