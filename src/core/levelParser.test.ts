import { describe, expect, it } from 'vitest';
import { cellAt, connectedBreakables, parseLevel } from './levelParser';
import { salaDeTeste } from '../levels/salaDeTeste';

describe('parseLevel', () => {
  it('junta chão vizinho da mesma linha num retângulo só', () => {
    const l = parseLevel(['P...', '##.#']);
    expect(l.solids).toEqual([
      { tx: 0, ty: 1, w: 2, h: 1 },
      { tx: 3, ty: 1, w: 1, h: 1 },
    ]);
    expect(l.start).toEqual({ tx: 0, ty: 0 });
  });

  it('acha cada tipo de objeto', () => {
    const l = parseLevel(['P*CFTL']);
    expect(l.seeds).toEqual([{ tx: 1, ty: 0 }]);
    expect(l.checkpoints).toEqual([{ tx: 2, ty: 0 }]);
    expect(l.fires).toEqual([{ tx: 3, ty: 0 }]);
    expect(l.traps).toEqual([{ tx: 4, ty: 0 }]);
    expect(l.breakables).toEqual([{ tx: 5, ty: 0 }]);
  });

  it('semente submersa é semente e, no grid, água', () => {
    const l = parseLevel(['P~o~']);
    expect(l.seeds).toEqual([{ tx: 2, ty: 0 }]);
    expect(cellAt(l, 2, 0)).toBe('~');
  });

  it('completa linha curta com vazio', () => {
    const l = parseLevel(['P...', '#']);
    expect(l.grid[1]).toBe('#...');
  });

  it('reclama de mapa sem início, com dois inícios ou com caractere estranho', () => {
    expect(() => parseLevel(['....'])).toThrow(/não tem P/);
    expect(() => parseLevel(['P..P'])).toThrow(/mais de um P/);
    expect(() => parseLevel(['P.x.'])).toThrow(/desconhecido 'x'/);
  });

  it('fora do mapa: parede dos lados, vazio embaixo', () => {
    const l = parseLevel(['P.']);
    expect(cellAt(l, -1, 0)).toBe('#');
    expect(cellAt(l, 5, 0)).toBe('#');
    expect(cellAt(l, 0, 9)).toBe('.');
  });

  it('o tronco quebra inteiro, mas só os tiles grudados', () => {
    const l = parseLevel(['PL.L', '.L..']);
    const pedaços = connectedBreakables(l, { tx: 1, ty: 0 });
    expect(pedaços).toHaveLength(2);
    expect(pedaços).not.toContainEqual({ tx: 3, ty: 0 });
  });
});

describe('sala de teste', () => {
  const l = parseLevel(salaDeTeste);

  it('tem tudo que a etapa 1 precisa testar', () => {
    expect(l.breakables.length).toBeGreaterThan(0);
    expect(l.traps.length).toBeGreaterThan(0);
    expect(l.fires.length).toBeGreaterThan(0);
    expect(l.checkpoints).toHaveLength(3);
    expect(l.grid.join('')).toContain('~');
    expect(l.grid.join('')).toContain('V');
  });

  it('todas as linhas têm a mesma largura', () => {
    expect(new Set(salaDeTeste.map((r) => r.length)).size).toBe(1);
  });
});
