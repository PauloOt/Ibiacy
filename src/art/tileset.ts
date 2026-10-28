import type { Raster } from './raster';
import { branchFrames, canopyFrames, groundFrames, stoneFrames, trunkFrames, wallFrames } from './world';

/**
 * Tileset do mundo gerado: tudo que vira tile no Tilemap, numa imagem só.
 * Os números são o primeiro índice de cada grupo. Água, cipó e tufo ficam de fora (são sprites animados).
 */
export const TILESET = {
  dirt: 0, // 16 lados × 6 variações (groundFrame)
  stone: 96, // 16 lados × 3 variações (stoneFrame)
  canopy: 144, // ponta esq, meio, meio, ponta dir
  branch: 148, // ponta esq, meio, ponta dir
  trunk: 151, // 4 variações
  wallDirt: 155, // 4 variações
  wallStone: 159, // 4 variações
  count: 163,
  cols: 16,
} as const;

export function tilesetFrames(): Raster[] {
  return [...groundFrames(), ...stoneFrames(), ...canopyFrames(), ...branchFrames(), ...trunkFrames(), ...wallFrames()];
}
