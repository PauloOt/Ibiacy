import { describe, expect, it } from 'vitest';
import { TeamState } from './TeamState';

const time = () => new TeamState(['mico', 'onca', 'lontra']);

describe('TeamState: vida', () => {
  it('começa com 3 corações e o mico', () => {
    const t = time();
    expect(t.hearts).toBe(3);
    expect(t.active).toBe('mico');
  });

  it('dano tira 1 coração e dá 1 s de invulnerabilidade', () => {
    const t = time();
    expect(t.hurt(0)).toBe('hurt');
    expect(t.hearts).toBe(2);
    expect(t.hurt(999)).toBe('ignored');
    expect(t.hearts).toBe(2);
    expect(t.hurt(1000)).toBe('hurt');
    expect(t.hearts).toBe(1);
  });

  it('zerar os corações é morte', () => {
    const t = time();
    t.hurt(0);
    t.hurt(2000);
    expect(t.hurt(4000)).toBe('dead');
    expect(t.hearts).toBe(0);
  });

  it('respawn volta com vida cheia e perde as sementes depois do checkpoint', () => {
    const t = time();
    t.collectSeed();
    t.collectSeed();
    t.reachCheckpoint();
    t.collectSeed();
    t.hurt(0);
    t.respawn();
    expect(t.hearts).toBe(3);
    expect(t.seeds).toBe(2);
    expect(t.isInvulnerable(1)).toBe(false);
  });
});

describe('TeamState: troca', () => {
  it('troca direto e respeita o cooldown de 0,3 s', () => {
    const t = time();
    expect(t.swapTo(1, 1000)).toBe(true);
    expect(t.active).toBe('onca');
    expect(t.swapTo(2, 1299)).toBe(false);
    expect(t.swapTo(2, 1300)).toBe(true);
    expect(t.active).toBe('lontra');
  });

  it('trocar pro mesmo herói ou índice inválido não gasta o cooldown', () => {
    const t = time();
    expect(t.swapTo(0, 0)).toBe(false);
    expect(t.swapTo(3, 0)).toBe(false);
    expect(t.swapTo(1, 0)).toBe(true);
  });

  it('ciclo dá a volta nos dois sentidos', () => {
    const t = time();
    expect(t.cycle(-1, 1000)).toBe(true);
    expect(t.active).toBe('lontra');
    expect(t.cycle(1, 2000)).toBe(true);
    expect(t.active).toBe('mico');
  });

  it('time vazio não existe', () => {
    expect(() => new TeamState([])).toThrow();
  });
});
