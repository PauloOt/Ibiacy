import { lontraArt } from './lontra';
import { micoArt } from './mico';
import { oncaArt } from './onca';
import type { HeroArt } from './types';

export function heroArts(): HeroArt[] {
  return [micoArt(), oncaArt(), lontraArt()];
}
