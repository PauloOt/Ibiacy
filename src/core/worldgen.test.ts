import { describe, expect, it } from 'vitest';
import { cellAt, parseLevel } from './levelParser';
import { ACAMPAMENTO, generateWorld, GRUTA } from './worldgen';

describe('generateWorld', () => {
  const world = generateWorld({ seed: 42 });
  const level = parseLevel(world.rows);

  it('mesma semente, mesmo mundo; outra semente, outro', () => {
    expect(generateWorld({ seed: 42 }).rows).toEqual(world.rows);
    expect(generateWorld({ seed: 43 }).rows).not.toEqual(world.rows);
  });

  it('respeita o tamanho pedido', () => {
    expect(world.rows).toHaveLength(190);
    expect(new Set(world.rows.map((r) => r.length))).toEqual(new Set([560]));
    const small = generateWorld({ seed: 1, width: 300, height: 120, lakes: 1, queimadas: 1, acampamento: false, gruta: false });
    expect([small.rows[0].length, small.rows.length]).toEqual([300, 120]);
  });

  it('o time nasce em pé no chão, com ar em cima', () => {
    const { tx, ty } = level.start;
    expect(cellAt(level, tx, ty + 1)).toBe('#');
    expect(cellAt(level, tx, ty - 1)).toBe('.');
  });

  it('tem as metas: 2 queimadas, o acampamento, a gruta e 2 máquinas', () => {
    expect(level.fires.length).toBe(3 * 2 + 2);
    expect(level.traps.length).toBe(3);
    expect(level.machines.length).toBe(2);
    expect(world.metas).toBe(level.fires.length + level.traps.length + level.machines.length);
  });

  it('cada fogo fica a até 8 tiles da água (a lontra molhada anda ~9 em 2 s)', () => {
    const near = (tx: number, ty: number) => {
      for (let d = 1; d <= 8; d++) if (cellAt(level, tx - d, ty) === '~' || cellAt(level, tx - d, ty + 1) === '~') return true;
      return false;
    };
    for (const f of level.fires) expect(near(f.tx, f.ty)).toBe(true);
  });

  it('água sempre apoiada: nunca ar embaixo dela', () => {
    for (let y = 0; y < level.height - 1; y++) {
      for (let x = 0; x < level.width; x++) {
        if (level.grid[y][x] === '~') expect(level.grid[y + 1][x]).not.toBe('.');
      }
    }
  });

  it('sementes espalhadas e checkpoints pelo caminho', () => {
    expect(level.seeds.length).toBeGreaterThan(40);
    expect(level.checkpoints.length).toBeGreaterThanOrEqual(5);
  });

  it('os trechos fixos são retângulos', () => {
    for (const piece of [ACAMPAMENTO, GRUTA]) expect(new Set(piece.map((r) => r.length)).size).toBe(1);
  });

  it('funciona com várias sementes', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = generateWorld({ seed });
      const l = parseLevel(w.rows);
      expect(l.fires.length + l.traps.length + l.machines.length).toBe(w.metas);
      expect(cellAt(l, l.start.tx, l.start.ty + 1)).toBe('#');
    }
  });

  it('rio com correnteza pro oeste, largo demais pra pular, com galhos altos pro mico', () => {
    expect(world.correntes).toHaveLength(1);
    const c = world.correntes[0];
    expect(c.dir).toBe(-1);
    expect(c.x1 - c.x0).toBeGreaterThanOrEqual(20);
    expect(cellAt(level, Math.round((c.x0 + c.x1) / 2), c.y0)).toBe('~');
    let galhos = 0;
    for (let x = c.x0; x <= c.x1; x++) if (cellAt(level, x, c.y0 - 5) === '=') galhos++;
    expect(galhos).toBeGreaterThan(4);
  });

  it('frente de fogo nasce depois do rio e para antes do lago seguinte', () => {
    expect(world.frentes).toHaveLength(1);
    const f = world.frentes[0];
    expect(f.start).toBeGreaterThan(world.correntes[0].x1);
    expect(f.trigger).toBeGreaterThan(f.start);
    expect(f.stop).toBeGreaterThan(f.trigger);
    expect(cellAt(level, f.stop + 1, world.surface[f.stop + 1])).toBe('~');
  });

  it('máquina nasce em pé no chão da superfície', () => {
    for (const m of level.machines) expect('#S').toContain(cellAt(level, m.tx, m.ty + 1));
  });

  it('sem rio, sem frente e sem máquina quando a missão não pede', () => {
    const w = generateWorld({ seed: 5, rio: false, frente: false, maquinas: 0 });
    expect([w.correntes.length, w.frentes.length, parseLevel(w.rows).machines.length]).toEqual([0, 0, 0]);
  });
});
