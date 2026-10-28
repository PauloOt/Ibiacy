import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { css, FONT_TEXT, FONT_TITLE, WOOD } from './tokens';
import { drawDashes, drawPlank } from './wood';

/**
 * Painel de tábua centrado na tela (guia visual): título em Jersey 10, linhas rótulo/valor
 * separadas pelo tracejado e um botão em foco embaixo. Fica parado na câmera.
 */
export function woodPanel(
  scene: Phaser.Scene,
  o: { title: string; rows?: [string, string][]; note?: string; button: string; depth?: number },
): Phaser.GameObjects.Container {
  const w = 460;
  const pad = 28;
  const parts: Phaser.GameObjects.GameObject[] = [];
  const head = scene.add.text(-w / 2 + pad, 0, o.title, { fontFamily: FONT_TITLE, fontSize: '40px', color: css(WOOD.ipeLight) });
  parts.push(head);
  let y = head.height + 8;
  const inner = w - pad * 2;
  for (const [k, v] of o.rows ?? []) {
    parts.push(scene.add.text(-w / 2 + pad, y + 6, k, { fontFamily: FONT_TEXT, fontSize: '18px', color: css(WOOD.cream) }));
    parts.push(scene.add.text(w / 2 - pad, y + 6, v, { fontFamily: FONT_TEXT, fontSize: '18px', color: css(WOOD.ipeLight) }).setOrigin(1, 0));
    const d = scene.add.graphics();
    drawDashes(d, -w / 2 + pad, y + 36, inner);
    parts.push(d);
    y += 42;
  }
  if (o.note) {
    const t = scene.add.text(-w / 2 + pad, y + 10, o.note, { fontFamily: FONT_TEXT, fontSize: '14px', color: css(WOOD.cream), wordWrap: { width: inner } }).setAlpha(0.85);
    parts.push(t);
    y += t.height + 16;
  }

  const label = scene.add.text(0, 0, o.button, { fontFamily: FONT_TEXT, fontSize: '16px', color: css(WOOD.dark) }).setOrigin(0.5);
  const bw = label.width + 32;
  const by = y + 14;
  const btn = scene.add.graphics();
  drawPlank(btn, w / 2 - pad - bw, by, bw, 36, { on: true });
  label.setPosition(w / 2 - pad - bw / 2, by + 18);
  parts.push(btn, label);
  const h = by + 36 + pad;

  const g = scene.add.graphics();
  drawPlank(g, -w / 2, -pad, w, h + pad, { drop: true });
  return scene.add.container(GAME_WIDTH / 2, (GAME_HEIGHT - h) / 2 + 20, [g, ...parts]).setScrollFactor(0).setDepth(o.depth ?? 50);
}

export const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
