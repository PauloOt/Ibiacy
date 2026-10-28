// Números de jogo num lugar só, pra afinar o "feel" sem caçar constante pelo código.

export const TILE = 32;
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const GRAVITY = 1400;
export const MAX_FALL_SPEED = 900;

// Truques do Celeste: pular logo depois de sair da borda e apertar pulo pouco antes de pousar
export const COYOTE_MS = 100;
export const JUMP_BUFFER_MS = 100;
// Soltou o Espaço ainda subindo: a velocidade vertical é multiplicada por isto (pulo variável)
export const JUMP_CUT = 0.45;

export const SWAP_COOLDOWN_MS = 300;
export const MAX_HEARTS = 3;
export const INVULNERABLE_MS = 1000;
export const TRAP_HOLD_MS = 2000;
// Herói que não nada e fica este tempo submerso se afoga (volta no checkpoint)
export const DROWN_MS = 600;
// Depois de sair da água a lontra fica molhada e apaga foco de fogo pequeno
export const WET_MS = 2000;
