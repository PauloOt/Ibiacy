/**
 * Fase em texto, um caractere por tile. É o rascunho até a Fase 1 ir pro Tiled.
 *
 *   #  chão/parede          L  tronco podre (a onça quebra)
 *   V  cipó (o mico escala) ~  água
 *   F  fogo                 T  armadilha de caçador
 *   *  semente              o  semente dentro d'água
 *   C  checkpoint (muda)    P  início
 *   .  vazio
 *
 * Do mundo gerado (src/core/worldgen.ts):
 *
 *   S  pedra (não cava)      =  galho (dá pra subir por baixo)
 *   %  copa (idem)           |  tronco (fundo, não colide)
 *   #  aqui é terra: a onça cava
 *   M  máquina de desmatamento
 */

export interface TilePos { tx: number; ty: number }
/** Retângulo em tiles. Chão vizinho na mesma linha vira um corpo só, pra não enganchar na emenda. */
export interface TileRect extends TilePos { w: number; h: number }

export interface ParsedLevel {
  width: number;
  height: number;
  grid: string[];
  solids: TileRect[];
  breakables: TilePos[];
  fires: TilePos[];
  traps: TilePos[];
  seeds: TilePos[];
  checkpoints: TilePos[];
  /** Máquinas de desmatamento (patrulham; a investida da onça desliga) */
  machines: TilePos[];
  start: TilePos;
}

const KNOWN = new Set('#LV~FT*oCP.S=%|M'.split(''));

export function parseLevel(rows: readonly string[]): ParsedLevel {
  if (rows.length === 0) throw new Error('Fase vazia');
  const width = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => r.padEnd(width, '.'));
  // No grid a semente submersa é água: o que importa pra física é o terreno embaixo dela
  const grid = padded.map((r) => r.replaceAll('o', '~'));

  const solids: TileRect[] = [];
  const breakables: TilePos[] = [];
  const fires: TilePos[] = [];
  const traps: TilePos[] = [];
  const seeds: TilePos[] = [];
  const checkpoints: TilePos[] = [];
  const machines: TilePos[] = [];
  let start: TilePos | undefined;

  padded.forEach((row, ty) => {
    let runStart = -1;
    for (let tx = 0; tx <= width; tx++) {
      const ch = tx < width ? row[tx] : '.';
      if (!KNOWN.has(ch)) throw new Error(`Caractere desconhecido '${ch}' em (${tx}, ${ty})`);

      if (ch === '#') {
        if (runStart < 0) runStart = tx;
      } else if (runStart >= 0) {
        solids.push({ tx: runStart, ty, w: tx - runStart, h: 1 });
        runStart = -1;
      }

      const pos = { tx, ty };
      if (ch === 'L') breakables.push(pos);
      else if (ch === 'F') fires.push(pos);
      else if (ch === 'T') traps.push(pos);
      else if (ch === '*' || ch === 'o') seeds.push(pos);
      else if (ch === 'C') checkpoints.push(pos);
      else if (ch === 'M') machines.push(pos);
      else if (ch === 'P') {
        if (start) throw new Error('A fase tem mais de um P');
        start = pos;
      }
    }
  });

  if (!start) throw new Error('A fase não tem P (início)');
  return { width, height: grid.length, grid, solids, breakables, fires, traps, seeds, checkpoints, machines, start };
}

/** Caractere do tile; fora do mapa é parede nas laterais e vazio acima/abaixo (dá pra cair no abismo). */
export function cellAt(level: ParsedLevel, tx: number, ty: number): string {
  if (tx < 0 || tx >= level.width) return '#';
  if (ty < 0 || ty >= level.height) return '.';
  return level.grid[ty][tx];
}

/** Os tiles 'L' grudados neste: a onça quebra o tronco inteiro de uma vez. */
export function connectedBreakables(level: ParsedLevel, start: TilePos): TilePos[] {
  const seen = new Set<string>();
  const out: TilePos[] = [];
  const stack = [start];
  while (stack.length) {
    const p = stack.pop()!;
    const key = `${p.tx},${p.ty}`;
    if (seen.has(key) || cellAt(level, p.tx, p.ty) !== 'L') continue;
    seen.add(key);
    out.push(p);
    stack.push(
      { tx: p.tx + 1, ty: p.ty },
      { tx: p.tx - 1, ty: p.ty },
      { tx: p.tx, ty: p.ty + 1 },
      { tx: p.tx, ty: p.ty - 1 },
    );
  }
  return out;
}
