import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { rng } from '../art/rng';
import { D, reducedMotion } from './tokens';

const COLS = 10;
const ROWS = 7;
const TONES = [0x2f6a2c, 0x3f8a3a, 0x25542a, 0x4f9a3a];

/**
 * Cortina de folhas: fecha das bordas pro meio e abre do meio pras bordas.
 * É a mesma peça na entrada da trilha e na morte (guia de movimento).
 * Com movimento reduzido vira um fade pelo escuro.
 */
export class LeafCurtain {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly leaves: { x: number; y: number; at: number; tone: number }[] = [];
  private p = 0;

  constructor(private readonly scene: Phaser.Scene, depth = 100) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    const rand = rng(31);
    const cw = GAME_WIDTH / COLS;
    const ch = GAME_HEIGHT / ROWS;
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      // Quanto mais perto da borda, mais cedo a folha entra
      const edge = Math.min(i, COLS - 1 - i) / ((COLS - 1) / 2);
      this.leaves.push({
        x: (i + 0.5) * cw + (rand() - 0.5) * 30,
        y: (j + 0.5) * ch + (rand() - 0.5) * 30,
        at: edge * 0.6 + rand() * 0.1,
        tone: TONES[(i * 3 + j) % TONES.length],
      });
    }
  }

  /** Cobre a tela na hora (a cena que recebe a transição começa assim). */
  cover(): this {
    this.draw(1);
    return this;
  }

  close(ms: number = D.base): Promise<void> {
    return this.to(1, ms);
  }

  open(ms: number = D.base): Promise<void> {
    return this.to(0, ms);
  }

  private to(target: number, ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.addCounter({
        from: this.p,
        to: target,
        duration: reducedMotion() ? D.reduzido : ms,
        onUpdate: (tw) => this.draw(tw.getValue() ?? target),
        onComplete: () => {
          this.draw(target);
          resolve();
        },
      });
    });
  }

  private draw(p: number): void {
    this.p = p;
    const g = this.g.clear();
    if (p <= 0) return;
    if (reducedMotion()) {
      g.fillStyle(0x120a08, p).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      return;
    }
    // Fundo escuro só no fim, pra não sobrar fresta entre as folhas
    g.fillStyle(0x16301c, Phaser.Math.Clamp((p - 0.8) / 0.2, 0, 1)).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (const l of this.leaves) {
      const s = Phaser.Math.Clamp((p - l.at) / 0.3, 0, 1);
      if (s <= 0) continue;
      const rx = 78 * s;
      const ry = rx * 0.62;
      g.fillStyle(l.tone).fillEllipse(Math.round(l.x), Math.round(l.y), rx * 2, ry * 2);
      // Nervura
      g.fillStyle(0x1c3a1e).fillRect(Math.round(l.x - rx * 0.6), Math.round(l.y), Math.round(rx * 1.2), 2);
    }
  }
}
