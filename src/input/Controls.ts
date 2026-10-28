import Phaser from 'phaser';

/** Tudo que o jogador fez neste frame. "Pressed" = só no frame em que apertou. */
export interface InputFrame {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  abilityPressed: boolean;
  swapTo: number | null;
  cycle: -1 | 0 | 1;
  pausePressed: boolean;
}

type KeyName =
  | 'A' | 'D' | 'W' | 'S' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN'
  | 'SPACE' | 'J' | 'SHIFT' | 'ONE' | 'TWO' | 'THREE' | 'Q' | 'E' | 'ESC';

const KEY_NAMES: KeyName[] = [
  'A', 'D', 'W', 'S', 'LEFT', 'RIGHT', 'UP', 'DOWN',
  'SPACE', 'J', 'SHIFT', 'ONE', 'TWO', 'THREE', 'Q', 'E', 'ESC',
];

export class Controls {
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    this.keys = scene.input.keyboard!.addKeys(KEY_NAMES.join(',')) as Record<KeyName, Phaser.Input.Keyboard.Key>;
  }

  /** Ler uma vez por frame: o JustDown só responde true na primeira leitura. */
  read(): InputFrame {
    const k = this.keys;
    const just = Phaser.Input.Keyboard.JustDown;
    const swapTo = just(k.ONE) ? 0 : just(k.TWO) ? 1 : just(k.THREE) ? 2 : null;
    const qe = (just(k.E) ? 1 : 0) - (just(k.Q) ? 1 : 0);
    return {
      left: k.A.isDown || k.LEFT.isDown,
      right: k.D.isDown || k.RIGHT.isDown,
      up: k.W.isDown || k.UP.isDown,
      down: k.S.isDown || k.DOWN.isDown,
      jumpPressed: just(k.SPACE),
      jumpHeld: k.SPACE.isDown,
      abilityPressed: just(k.J) || just(k.SHIFT),
      swapTo,
      cycle: qe as -1 | 0 | 1,
      pausePressed: just(k.ESC),
    };
  }

  /** Solta tudo (depois da pausa, pra o Esc que despausou não pausar de novo). */
  reset(): void {
    Object.values(this.keys).forEach((key) => key.reset());
  }
}
