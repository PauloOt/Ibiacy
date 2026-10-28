import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE } from '../config';
import { parseLevel } from '../core/levelParser';
import type { Hero, LevelQuery } from '../heroes/Hero';
import { Lontra } from '../heroes/Lontra';
import { Mico } from '../heroes/Mico';
import { Onca } from '../heroes/Onca';
import { Controls } from '../input/Controls';
import { lobby } from '../levels/lobby';
import { TeamManager } from '../team/TeamManager';
import { LeafCurtain } from '../ui/LeafCurtain';
import { css, D, FONT_TEXT, FONT_TITLE, N, reducedMotion, WOOD } from '../ui/tokens';
import { drawDashes, drawPlank } from '../ui/wood';
import { buildParallax, buildTerrain, DEPTH, tileCenter } from './terrain';

type SpotId = 'trilha' | 'ipe' | 'toca';

interface Spot {
  id: SpotId;
  label: string;
  detail?: string;
  /** Onde fica o poste da placa */
  signX: number;
  /** Faixa de x (centro do herói) em que o bicho está perto */
  from: number;
  to: number;
}

const GROUND = 13 * TILE;
const IPE_X = 480;
const TOCA_X = 680;

const SPOTS: Spot[] = [
  { id: 'trilha', label: 'Jogar', detail: 'Fase 1', signX: 170, from: -Infinity, to: 230 },
  { id: 'ipe', label: 'Recorde', signX: 604, from: 400, to: 640 },
  { id: 'toca', label: 'Créditos', signX: 792, from: 740, to: Infinity },
];

const RECORD_KEY = 'ibiacy-recorde';

interface Recorde {
  tempoMs: number;
  sementes: number;
  total: number;
}

function readRecord(): Recorde | null {
  try {
    const raw = localStorage.getItem(RECORD_KEY);
    return raw ? (JSON.parse(raw) as Recorde) : null;
  } catch {
    return null;
  }
}

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Placa fincada no chão. Longe fica apagada (35%); quando o bicho chega perto,
 * caem folhas da copa até ela e ela acende em 3 degraus (guia de movimento, 1C).
 */
class Sign {
  readonly root: Phaser.GameObjects.Container;
  private readonly detail?: Phaser.GameObjects.Text;
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor(private readonly scene: LobbyScene, readonly spot: Spot) {
    const text = (s: string, size: number) =>
      scene.add.text(0, 0, s, { fontFamily: FONT_TEXT, fontSize: `${size}px`, color: css(WOOD.cream) }).setOrigin(0, 0.5);
    const key = text('↑', 16).setColor(css(WOOD.dark));
    const label = text(spot.label, 16);
    this.detail = spot.detail ? text(spot.detail, 13) : undefined;

    // Tábua do tamanho do texto: tecla, nome e detalhe em linha
    const keyBox = 22;
    const gap = 8;
    const w = 16 + keyBox + gap + label.width + (this.detail ? gap + this.detail.width : 0) + 16;
    const h = 40;
    const post = 52;
    const g = scene.add.graphics();
    g.fillStyle(WOOD.dark).fillRect(-6, -post, 12, post);
    g.fillStyle(WOOD.shade).fillRect(-2, -post, 4, post);
    drawPlank(g, -w / 2, -post - h, w, h);
    g.fillStyle(WOOD.cream).fillRect(-w / 2 + 16, -post - h / 2 - keyBox / 2, keyBox, keyBox);

    const cy = -post - h / 2;
    key.setPosition(-w / 2 + 16 + keyBox / 2, cy).setOrigin(0.5);
    label.setPosition(-w / 2 + 16 + keyBox + gap, cy);
    this.detail?.setPosition(label.x + label.width + gap, cy + 1);
    this.root = scene.add.container(spot.signX, GROUND, [g, key, label, ...(this.detail ? [this.detail] : [])]).setDepth(DEPTH.ui);
    this.far();
  }

  get top(): number {
    return GROUND - 92;
  }

  approach(): void {
    this.cancel();
    if (reducedMotion()) {
      this.detail?.setVisible(true);
      this.scene.tweens.add({ targets: this.root, alpha: 1, duration: D.reduzido });
      return;
    }
    this.scene.leafFall(this.spot.signX, this.top - 170, 40, N.poucas);
    // Acende quando as folhas chegam: 35% → 57% → 78% → 100%, 100 ms cada degrau
    [0.57, 0.78, 1].forEach((alpha, i) => {
      this.timers.push(this.scene.time.delayedCall(D.base + i * 100, () => {
        this.root.setAlpha(alpha);
        if (i === 0) this.detail?.setVisible(true);
      }));
    });
  }

  far(): void {
    this.cancel();
    this.root.setAlpha(0.35);
    this.detail?.setVisible(false);
  }

  private cancel(): void {
    this.timers.forEach((t) => t.remove());
    this.timers = [];
    this.scene.tweens.killTweensOf(this.root);
  }
}

/** Lobby andável: a clareira do ipê com a toca do lado. */
export class LobbyScene extends Phaser.Scene implements LevelQuery {
  private team!: TeamManager;
  private controls!: Controls;
  private signs = new Map<SpotId, Sign>();
  private near: Spot | null = null;
  private wasUp = false;
  private panel: Phaser.GameObjects.Container | null = null;
  private busy = false;
  private ipe!: Phaser.GameObjects.Image;
  private leaves!: Phaser.GameObjects.Particles.ParticleEmitter;
  private petals!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('Lobby');
  }

  create(): void {
    this.signs.clear();
    this.near = null;
    this.panel = null;
    this.busy = false;
    this.wasUp = false;

    const level = parseLevel(lobby);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    buildParallax(this);
    this.buildPlace();
    const solids = buildTerrain(this, level);
    // Paredes invisíveis nas bordas da tela
    solids.add(this.add.zone(-TILE / 2, GAME_HEIGHT / 2, TILE, GAME_HEIGHT));
    solids.add(this.add.zone(GAME_WIDTH + TILE / 2, GAME_HEIGHT / 2, TILE, GAME_HEIGHT));
    this.buildEffects();
    this.buildLight();

    const heroes: Hero[] = [new Mico(this), new Onca(this), new Lontra(this)];
    heroes.forEach((h) => h.setDepth(DEPTH.hero));
    const start = tileCenter(level.start);
    this.team = new TeamManager(heroes, { x: start.x, bottom: (level.start.ty + 1) * TILE });
    this.physics.add.collider(heroes, solids);

    for (const spot of SPOTS) this.signs.set(spot.id, new Sign(this, spot));
    this.buildTitle();
    this.controls = new Controls(this);

    (window as unknown as { __ibiacy?: unknown }).__ibiacy = { scene: this, team: this.team };
  }

  update(time: number, delta: number): void {
    const input = this.controls.read();
    const upPressed = input.up && !this.wasUp;
    this.wasUp = input.up;

    if (this.panel) {
      if (upPressed || input.pausePressed || input.jumpPressed || input.abilityPressed) this.closePanel();
      return;
    }
    if (this.busy) return;

    this.team.update(input, time, Math.min(delta, 50), this);
    const x = this.team.active.centerX;
    const near = SPOTS.find((s) => x >= s.from && x <= s.to) ?? null;
    if (near !== this.near) {
      if (this.near) this.signs.get(this.near.id)!.far();
      if (near) this.signs.get(near.id)!.approach();
      this.near = near;
    }
    if (near && upPressed) this.enter(near.id);
  }

  isWater(): boolean {
    return false;
  }

  isVine(): boolean {
    return false;
  }

  /** Folhas caindo de (x, y) numa faixa de largura `w`; chegam embaixo em D.base. */
  leafFall(x: number, y: number, w: number, n: number): void {
    for (let i = 0; i < n; i++) this.leaves.emitParticleAt(x + Phaser.Math.Between(-w / 2, w / 2), y + Phaser.Math.Between(-12, 12));
  }

  // ---------- montagem ----------

  private buildPlace(): void {
    // Atrás do chão (que fica na profundidade 0) e na frente do fundo
    // Boca da trilha: arco de mata fechada na esquerda
    const g = this.add.graphics().setDepth(-1);
    g.fillStyle(0x16301c).fillEllipse(44, GROUND, 136, 176);
    g.fillStyle(0x0c1a10).fillEllipse(36, GROUND + 4, 72, 120);
    this.add.image(TOCA_X, GROUND, 'toca').setOrigin(0, 1).setDepth(-1);
    this.ipe = this.add.image(IPE_X, GROUND + 4, 'ipe-grande').setOrigin(0.5, 1).setDepth(-1);
  }

  private buildEffects(): void {
    this.leaves = this.add.particles(0, 0, 'p-leaf', {
      emitting: false,
      speedY: { min: 240, max: 290 },
      speedX: { min: -30, max: 30 },
      rotate: { min: 0, max: 360 },
      lifespan: D.base,
    }).setDepth(DEPTH.fx);
    this.petals = this.add.particles(0, 0, 'p-petal', {
      emitting: false,
      speedY: { min: 40, max: 90 },
      speedX: { min: -20, max: 20 },
      gravityY: 30,
      rotate: { min: 0, max: 360 },
      lifespan: 2400,
      deathZone: { type: 'onLeave', source: new Phaser.Geom.Rectangle(0, -100, GAME_WIDTH, GROUND + 100) },
    }).setDepth(DEPTH.fx);
    if (reducedMotion()) return;
    // O ar da clareira: umas 8 pétalas do ipê caindo devagar (11B)
    this.add.particles(0, 0, 'p-petal', {
      x: { min: 0, max: GAME_WIDTH },
      y: -8,
      speedY: { min: 22, max: 38 },
      speedX: { min: -14, max: 8 },
      rotate: { min: 0, max: 360 },
      lifespan: 16000,
      frequency: 1800,
      deathZone: { type: 'onLeave', source: new Phaser.Geom.Rectangle(0, -40, GAME_WIDTH, GROUND + 40) },
    }).setDepth(DEPTH.fx);
  }

  /** Luz de fim de tarde: laranja multiplicado na cena e brilho no ipê e no canto do sol. */
  private buildLight(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff9a5a, 0.32).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(DEPTH.light);
    this.add.image(IPE_X, GROUND - 172, 'glow').setTint(WOOD.ipe).setScale(2.5).setAlpha(0.28).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.light);
    this.add.image(0, 0, 'glow').setTint(0xffb070).setScale(5.6).setAlpha(0.2).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.light);
  }

  private buildTitle(): void {
    const cx = GAME_WIDTH / 2;
    const title = (color: number, dy: number) =>
      this.add.text(cx, 30 + dy, 'Ibiacy', { fontFamily: FONT_TITLE, fontSize: '86px', color: css(color) }).setOrigin(0.5, 0).setDepth(DEPTH.ui);
    title(WOOD.dark, 8);
    title(0x8a3a14, 5);
    title(WOOD.ipe, 0);

    const sub = this.add.text(cx, 126, 'Mata Atlântica', { fontFamily: FONT_TEXT, fontSize: '16px', color: css(WOOD.dark) }).setOrigin(0.5).setDepth(DEPTH.ui + 0.1);
    const g = this.add.graphics().setDepth(DEPTH.ui);
    g.fillStyle(WOOD.dark).fillRect(cx - sub.width / 2 - 14, 112, sub.width + 28, 28);
    g.fillStyle(WOOD.light).fillRect(cx - sub.width / 2 - 10, 116, sub.width + 20, 20);

    const hint = this.add.text(cx, GAME_HEIGHT - 22, '← → andar  ·  Espaço pular  ·  ↑ entrar  ·  1 2 3 trocar de bicho', {
      fontFamily: FONT_TEXT, fontSize: '14px', color: css(WOOD.dark),
    }).setOrigin(0.5).setDepth(DEPTH.ui + 0.1);
    this.add.rectangle(cx, hint.y, hint.width + 24, 24, WOOD.cream, 0.75).setDepth(DEPTH.ui);
  }

  // ---------- entrar nos lugares ----------

  private enter(id: SpotId): void {
    this.team.active.setVelocity(0, this.team.active.body.velocity.y);
    if (id === 'trilha') return this.leave();
    const reduced = reducedMotion();
    if (id === 'ipe' && !reduced) {
      // A copa treme ±4 px por 400 ms e caem pétalas (2C)
      this.tweens.addCounter({
        from: 0, to: 1, duration: 400,
        onUpdate: (tw) => {
          const v = tw.getValue() ?? 1;
          this.ipe.x = IPE_X + Math.round(Math.sin(v * 40) * 2 * (1 - v)) * 2;
        },
        onComplete: () => (this.ipe.x = IPE_X),
      });
      for (let i = 0; i < N.chuva; i++) this.petals.emitParticleAt(IPE_X + Phaser.Math.Between(-110, 110), GROUND - 230 + Phaser.Math.Between(-50, 50));
    }
    if (id === 'toca' && !reduced) this.leafFall(TOCA_X + 168, GROUND - 170, 60, N.poucas);
    this.busy = true;
    this.time.delayedCall(reduced ? 0 : 400, () => this.openPanel(id === 'ipe' ? this.recordPanel() : this.creditsPanel()));
  }

  private leave(): void {
    this.busy = true;
    const curtain = new LeafCurtain(this);
    curtain.close().then(() => this.time.delayedCall(D.curto, () => this.scene.start('Game', { curtain: true })));
  }

  private openPanel(panel: Phaser.GameObjects.Container): void {
    this.panel = panel.setAlpha(0);
    this.busy = false;
    this.tweens.add({ targets: panel, alpha: 1, duration: reducedMotion() ? D.reduzido : D.curto });
  }

  private closePanel(): void {
    const panel = this.panel!;
    this.panel = null;
    this.busy = true;
    this.tweens.add({
      targets: panel, alpha: 0, duration: reducedMotion() ? D.reduzido : D.curto,
      onComplete: () => {
        panel.destroy();
        this.busy = false;
      },
    });
  }

  /** Painel de tábua centrado: título, linhas e o botão de voltar. */
  private makePanel(title: string, body: (add: (o: Phaser.GameObjects.GameObject) => void, x: number, y: number, w: number) => number): Phaser.GameObjects.Container {
    const w = 460;
    const pad = 28;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const add = (o: Phaser.GameObjects.GameObject) => parts.push(o);
    const head = this.add.text(-w / 2 + pad, 0, title, { fontFamily: FONT_TITLE, fontSize: '40px', color: css(WOOD.ipeLight) });
    add(head);
    let y = head.height + 8;
    y = body(add, -w / 2 + pad, y, w - pad * 2);

    // Botão de voltar (em foco: ipê)
    const back = this.add.text(0, 0, '↑  Voltar', { fontFamily: FONT_TEXT, fontSize: '16px', color: css(WOOD.dark) }).setOrigin(0.5);
    const bw = back.width + 32;
    const by = y + 14;
    const btn = this.add.graphics();
    drawPlank(btn, w / 2 - pad - bw, by, bw, 36, { on: true });
    back.setPosition(w / 2 - pad - bw / 2, by + 18);
    add(btn);
    add(back);
    const h = by + 36 + pad;

    const g = this.add.graphics();
    drawPlank(g, -w / 2, -pad, w, h + pad, { drop: true });
    const c = this.add.container(GAME_WIDTH / 2, (GAME_HEIGHT - h) / 2 + 30, [g, ...parts]).setDepth(DEPTH.ui + 1);
    head.setY(0);
    return c;
  }

  private recordPanel(): Phaser.GameObjects.Container {
    const rec = readRecord();
    return this.makePanel('Recorde', (add, x, y, w) => {
      const rows: [string, string][] = [
        ['Melhor tempo', rec ? mmss(rec.tempoMs) : '—'],
        ['Sementes', rec ? `${rec.sementes} / ${rec.total}` : '—'],
      ];
      for (const [k, v] of rows) {
        add(this.add.text(x, y + 6, k, { fontFamily: FONT_TEXT, fontSize: '18px', color: css(WOOD.cream) }));
        add(this.add.text(x + w, y + 6, v, { fontFamily: FONT_TEXT, fontSize: '18px', color: css(WOOD.ipeLight) }).setOrigin(1, 0));
        const d = this.add.graphics();
        drawDashes(d, x, y + 36, w);
        add(d);
        y += 42;
      }
      if (!rec) {
        add(this.add.text(x, y + 10, 'Termine a Fase 1 pra marcar um recorde.', { fontFamily: FONT_TEXT, fontSize: '14px', color: css(WOOD.cream) }).setAlpha(0.8));
        y += 34;
      }
      return y;
    });
  }

  private creditsPanel(): Phaser.GameObjects.Container {
    const lines = [
      'Ibiacy é um jogo de plataforma sobre a fauna da Mata Atlântica. Feito por Paulo.',
      'Arte desenhada em código, com o Arperium como referência de estilo.',
      'Fontes: Pixelify Sans e Jersey 10.',
      'Trilha com chamber rack flute (em produção).',
    ];
    return this.makePanel('Créditos', (add, x, y, w) => {
      for (const line of lines) {
        const t = this.add.text(x, y + 4, line, { fontFamily: FONT_TEXT, fontSize: '16px', color: css(WOOD.cream), wordWrap: { width: w }, lineSpacing: 4 });
        add(t);
        y += t.height + 10;
      }
      return y;
    });
  }
}
