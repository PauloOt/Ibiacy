import Phaser from 'phaser';
import { MAX_HEARTS, PIXEL_FONT } from '../config';
import type { HudSnapshot } from '../team/TeamManager';

const TEXT = { fontFamily: PIXEL_FONT, fontSize: '18px', color: '#fff6dc', stroke: '#1a0f14', strokeThickness: 4 };
const HERO_KEYS = ['mico', 'onca', 'lontra'];

interface Metas {
  done: number;
  total: number;
}

/** HUD por cima do jogo. Lê o snapshot que a GameScene põe no registry. */
export class HudScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private seeds!: Phaser.GameObjects.Text;
  private metas!: Phaser.GameObjects.Text;
  private slots: { frame: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }[] = [];
  private lastHearts = MAX_HEARTS;
  private lastSeeds = 0;

  constructor() {
    super('Hud');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.image(0, 0, 'vignette').setOrigin(0);

    for (let i = 0; i < MAX_HEARTS; i++) this.hearts.push(this.add.image(24 + i * 26, 24, 'heart', 0));
    this.add.sprite(26, 56, 'seed', 0).setScale(0.9);
    this.seeds = this.add.text(42, 45, '0', TEXT);
    // Metas: focos de fogo e armadilhas que faltam
    this.add.sprite(26, 88, 'fire', 0).setScale(0.75);
    this.metas = this.add.text(42, 77, '', TEXT);

    // Retratos dos heróis, da direita pra esquerda
    let x = width - 16;
    for (let i = HERO_KEYS.length - 1; i >= 0; i--) {
      const w = 74;
      const frame = this.add.rectangle(x - w / 2, 30, w, 42, 0x1a0f14, 0.55).setStrokeStyle(2, 0x6b5a3a);
      const icon = this.add.sprite(x - w / 2 + 6, 32, HERO_KEYS[i], 0).setScale(0.75);
      const label = this.add.text(x - w + 6, 14, `${i + 1}`, { ...TEXT, fontSize: '14px' });
      this.slots[i] = { frame, icon, label };
      x -= w + 8;
    }

    const help = 'A/D andar  ·  Espaço pular  ·  J habilidade  ·  ↓+J onça cava  ·  1 2 3 ou Q/E trocar  ·  Esc pausa';
    this.add.text(width / 2, height - 10, help, { ...TEXT, fontSize: '13px', strokeThickness: 3 }).setOrigin(0.5, 1).setAlpha(0.85);

    this.registry.events.on('changedata-hud', (_p: unknown, snap: HudSnapshot) => this.render(snap));
    this.registry.events.on('changedata-metas', (_p: unknown, m: Metas) => this.renderMetas(m));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-hud');
      this.registry.events.off('changedata-metas');
    });
    this.renderMetas(this.registry.get('metas'));
    this.render(this.registry.get('hud'));
  }

  private renderMetas(m: Metas | undefined): void {
    if (!m) return;
    const changed = this.metas.text !== '' && !this.metas.text.startsWith(`${m.done}/`);
    this.metas.setText(`${m.done}/${m.total}`);
    if (changed) this.tweens.add({ targets: this.metas, scale: { from: 1.35, to: 1 }, duration: 200 });
  }

  private render(snap: HudSnapshot | undefined): void {
    if (!snap) return;
    this.hearts.forEach((h, i) => {
      const full = i < snap.hearts;
      h.setFrame(full ? 0 : 1);
      // Coração que acabou de ser perdido dá um tremido
      if (!full && i < this.lastHearts) this.tweens.add({ targets: h, scale: { from: 1.6, to: 1 }, duration: 260, ease: 'Back.Out' });
    });
    this.lastHearts = snap.hearts;

    this.seeds.setText(String(snap.seeds));
    if (snap.seeds > this.lastSeeds) this.tweens.add({ targets: this.seeds, scale: { from: 1.35, to: 1 }, duration: 200 });
    this.lastSeeds = snap.seeds;

    this.slots.forEach(({ frame, icon }, i) => {
      const on = i === snap.activeIndex;
      frame.setStrokeStyle(2, on ? 0xf5c542 : 0x6b5a3a).setFillStyle(on ? 0x3a2a14 : 0x1a0f14, on ? 0.8 : 0.5);
      icon.setAlpha(on ? 1 : 0.55);
      if (on) icon.play(`${HERO_KEYS[i]}-idle`, true);
      else icon.stop().setFrame(0);
    });
  }
}
