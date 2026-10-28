import Phaser from 'phaser';
import { MAX_HEARTS } from '../config';
import type { HudSnapshot } from '../team/TeamManager';

const FONT = { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#1b2e1f' };

/** HUD por cima do jogo. Lê o snapshot que a GameScene põe no registry. */
export class HudScene extends Phaser.Scene {
  private hearts!: Phaser.GameObjects.Text;
  private seeds!: Phaser.GameObjects.Text;
  private slots: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Hud');
  }

  create(): void {
    this.hearts = this.add.text(16, 12, '', { ...FONT, fontSize: '26px', color: '#c62828' });
    this.seeds = this.add.text(16, 46, '', FONT);

    const help = 'A/D andar · Espaço pular · J habilidade · 1 2 3 ou Q/E trocar · Esc pausa';
    this.add.text(this.scale.width / 2, this.scale.height - 14, help, { ...FONT, fontSize: '14px' }).setOrigin(0.5, 1);

    this.registry.events.on('changedata-hud', (_p: unknown, snap: HudSnapshot) => this.render(snap));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.registry.events.off('changedata-hud'));
    this.render(this.registry.get('hud'));
  }

  private render(snap: HudSnapshot | undefined): void {
    if (!snap) return;
    this.hearts.setText('♥'.repeat(snap.hearts) + '♡'.repeat(MAX_HEARTS - snap.hearts));
    this.seeds.setText(`Sementes: ${snap.seeds}`);

    if (this.slots.length === 0) {
      let x = this.scale.width - 16;
      for (let i = snap.names.length - 1; i >= 0; i--) {
        const t = this.add.text(x, 14, `${i + 1} ${snap.names[i].split('-')[0]}`, FONT).setOrigin(1, 0);
        t.setPadding(8, 4, 8, 4);
        this.slots[i] = t;
        x -= t.width + 8;
      }
    }
    this.slots.forEach((t, i) => {
      const on = i === snap.activeIndex;
      t.setBackgroundColor(on ? '#f5c542' : '#ffffff88').setColor(on ? '#1b2e1f' : '#4a5a4d');
    });
  }
}
