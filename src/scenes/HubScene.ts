import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { HeroId } from '../core/TeamState';
import { FLOOR_E, HUB_FUNGI, KNOT } from '../art/hub';
import { CREDITOS, ESTILOS, FALAS, HABILIDADES, LOJA, MISSOES, NOMES, type Missao } from '../hub/data';
import { ATTRS, ATTRS_INICIAIS, carregar, comprar, distribuir, ganharXp, novoJogo, salvar, xpParaProximo, type Save } from '../hub/save';
import { drawBar, drawBark, drawButton } from '../ui/bark';
import { LeafCurtain } from '../ui/LeafCurtain';
import { css, D, D_CAMERA, FONT_HUB, FONT_TEXT, OCO, reducedMotion } from '../ui/tokens';

// O hub: menu inicial e o salão dentro da árvore, em vista 3/4 de cima.
// Guias: docs/guia-visual.md (o oco aceso pelos fungos) e docs/guia-movimento.md (fora da ação
// mexem a câmera e os moradores; a interface só aparece).

type Estado = 'menu' | 'escolha' | 'creditos' | 'entrando' | 'livre' | 'conversa' | 'missoes' | 'loja' | 'ficha' | 'saindo';

export interface HubData {
  /** Voltou de uma missão completa */
  resultado?: { missao?: string; sementes: number };
}

/** Tudo em pixels do mundo (o fundo é a arte × 2). */
const S = 2;
const FLOOR = { cx: FLOOR_E.cx * S, cy: FLOOR_E.cy * S, rx: FLOOR_E.rx * S - 24, ry: FLOOR_E.ry * S - 18 };
/** Onde o bicho aparece no salão. */
const HOME: [number, number] = [480, 860];
const HEROIS: readonly HeroId[] = ['mico', 'onca', 'lontra'];
const SPEED: Record<HeroId, number> = { onca: 170, mico: 160, lontra: 110 };
const SPOTS = {
  ubiraca: { x: 720, y: 740, r: 90, tag: [720, 590] as const, label: 'Falar com Ubiraçá' },
  loja: { x: 250, y: 800, r: 80, tag: [250, 590] as const, label: 'Lojinha' },
};
type SpotId = keyof typeof SPOTS;
/** Onde o pé não entra (x0, y0, x1, y1). */
const BLOCKS: [number, number, number, number][] = [
  [166, 700, 334, 764], // balcão
  [634, 662, 806, 706], // monte do Ubiraçá
  [370, 574, 490, 614], // bica
];
const BAR_H = 65;

export class HubScene extends Phaser.Scene {
  private save: Save | null = null;
  private estado: Estado = 'menu';
  private worldL!: Phaser.GameObjects.Layer;
  private uiL!: Phaser.GameObjects.Layer;
  /** O bicho escolhido no Novo jogo (um só) */
  private player: Phaser.GameObjects.Sprite | null = null;
  private escolha: { root: Phaser.GameObjects.Container; sel: number } | null = null;
  private jabuti!: Phaser.GameObjects.Sprite;
  private tags = new Map<SpotId, { root: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; w: number; near: boolean }>();
  private near: SpotId | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: Phaser.GameObjects.Container;
  private hudParts!: { g: Phaser.GameObjects.Graphics; nome: Phaser.GameObjects.Text; nivel: Phaser.GameObjects.Text; sementes: Phaser.GameObjects.Text; dica: Phaser.GameObjects.Text };
  private panel: Phaser.GameObjects.Container | null = null;
  private bars: Phaser.GameObjects.Rectangle[] = [];
  private fade!: Phaser.GameObjects.Rectangle;
  private menu: { root: Phaser.GameObjects.Container; sel: number; confirmar: boolean } | null = null;
  private conversa: { linhas: string[]; i: number; shown: number; text: Phaser.GameObjects.Text; timer?: Phaser.Time.TimerEvent } | null = null;
  private sel = 0;
  private playerGlow!: Phaser.GameObjects.Image;
  private glows: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Hub');
  }

  create(data: HubData = {}): void {
    this.estado = 'menu';
    this.panel = null;
    this.menu = null;
    this.conversa = null;
    this.near = null;
    this.tags.clear();
    this.glows = [];
    this.save = carregar();
    this.player = null;
    this.escolha = null;

    this.worldL = this.add.layer().setDepth(0);
    this.uiL = this.add.layer().setDepth(50);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GAME_WIDTH, this.textures.get('hub-sala').getSourceImage().height);
    cam.ignore(this.uiL);
    const uiCam = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
    uiCam.ignore(this.worldL);

    this.buildRoom();
    this.buildLight();
    this.buildTags();
    this.buildHud();
    // Barras de cinema da conversa: altura cheia, abrem e fecham pela escala
    this.bars = [0, 1].map((i) => this.ui(this.add.rectangle(0, i ? GAME_HEIGHT : 0, GAME_WIDTH, BAR_H, 0x000000).setOrigin(0, i ? 1 : 0).setScale(1, 0)));
    this.fade = this.ui(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setOrigin(0).setAlpha(0));

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,ENTER,SPACE,ESC,C') as Record<string, Phaser.Input.Keyboard.Key>;

    if (data.resultado && this.save) {
      // Voltou da missão: direto pro salão, com a cortina abrindo e a recompensa
      this.enterHub(true);
      new LeafCurtain(this, 100).cover().open().then(() => this.reward(data.resultado!));
    } else {
      cam.setScroll(0, 0);
      this.openMenu();
    }
    (window as unknown as { __ibiacy?: unknown }).__ibiacy = { scene: this };
  }

  update(_time: number, delta: number): void {
    const k = this.keys;
    const just = Phaser.Input.Keyboard.JustDown;
    const act = just(k.E) || just(k.ENTER) || just(k.SPACE);
    const up = just(k.UP) || just(k.W);
    const down = just(k.DOWN) || just(k.S);
    const left = just(k.LEFT) || just(k.A);
    const right = just(k.RIGHT) || just(k.D);
    const esc = just(k.ESC);

    this.jabuti.setFrame(this.near === 'ubiraca' || this.estado === 'conversa' || this.estado === 'missoes' ? 1 : 0);

    switch (this.estado) {
      case 'menu':
        if (up || down) this.moveMenu(up ? -1 : 1);
        if (act) this.chooseMenu();
        break;
      case 'escolha':
        if (left || right) this.moveHeroSelect(left ? -1 : 1);
        if (act) this.chooseHero();
        else if (esc) this.closeHeroSelect();
        break;
      case 'creditos':
        if (act || esc) this.closePanel(() => this.openMenu());
        break;
      case 'livre':
        this.walk(delta);
        if (act && this.near === 'ubiraca') this.talk();
        else if (act && this.near === 'loja') this.openShop();
        else if (just(k.C)) this.openSheet();
        else if (esc) this.backToMenu();
        break;
      case 'conversa':
        if (act) this.nextLine();
        else if (esc) this.endTalk();
        break;
      case 'missoes':
        if (left || right) this.selectMission(left ? -1 : 1);
        if (act) this.acceptMission();
        else if (esc) this.endTalk();
        break;
      case 'loja':
        if (up || down) this.selectRow(up ? -1 : 1, LOJA.length, () => this.openShop(this.sel));
        if (act) this.buy();
        else if (esc) this.closePanel();
        break;
      case 'ficha':
        if (up || down) this.selectRow(up ? -1 : 1, ATTRS.length, () => this.openSheet(this.sel));
        if (act || right) this.assignPoint();
        else if (esc || just(k.C)) this.closePanel();
        break;
      default:
        break;
    }
  }

  // ---------- montagem ----------

  private world<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.worldL.add(o);
    return o;
  }

  private ui<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.uiL.add(o);
    return o;
  }

  private buildRoom(): void {
    this.world(this.add.image(0, 0, 'hub-sala').setOrigin(0).setDepth(-1));
    this.world(this.add.image(250, 764, 'hub-loja').setOrigin(0.5, 1).setDepth(764));
    this.world(this.add.sprite(268, 706, 'quati').setOrigin(0.5, 1).setDepth(700).setFlipX(true).play('quati-idle'));
    this.world(this.add.image(720, 708, 'hub-monte').setOrigin(0.5, 1).setDepth(708));
    this.jabuti = this.world(this.add.sprite(724, 694, 'jabuti', 0).setOrigin(0.5, 1).setDepth(709));
    this.world(this.add.image(430, 616, 'hub-bica').setOrigin(0.5, 1).setDepth(616));

    if (this.save) this.spawnPlayer();
  }

  /** O bicho do jogo salvo aparece no meio do salão. */
  private spawnPlayer(): void {
    this.player?.destroy();
    const id = this.save!.heroi;
    this.player = this.world(this.add.sprite(HOME[0], HOME[1], id, 0).setOrigin(0.5, 1).setDepth(HOME[1]).play(`${id}-idle`));
  }

  /** Noite dentro do tronco: escurece tudo e soma a luz dos fungos, do nó da casca e dos potes. */
  private buildLight(): void {
    const h = this.textures.get('hub-sala').getSourceImage().height;
    this.world(this.add.rectangle(0, 0, GAME_WIDTH, h, 0x6e5460).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(5000));
    const glow = (x: number, y: number, color: number, scale: number, alpha: number) => {
      const g = this.world(this.add.image(x, y, 'glow').setTint(color).setScale(scale).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(5001));
      this.glows.push(g);
      return g;
    };
    for (const [x, y] of HUB_FUNGI) glow(x * S, y * S, OCO.ambar, 0.9, 0.55);
    glow(KNOT[0] * S, KNOT[1] * S, 0xffe0a0, 1.4, 0.55);
    glow(250, 690, 0xf2a830, 1.3, 0.45);
    glow(720, 660, 0xf2c230, 1.1, 0.3);
    glow(430, 596, 0x3f8ec0, 0.9, 0.35);
    // O bicho leva uma luz fraca junto: no escuro a onça perdia as rosetas
    this.playerGlow = glow(0, 0, 0xffd0a0, 1.6, 0.32);
    if (!reducedMotion()) {
      this.world(this.add.particles(0, 0, 'p-mote', {
        x: { min: 40, max: GAME_WIDTH - 40 },
        y: { min: 120, max: h - 80 },
        lifespan: 7000,
        speedX: { min: -6, max: 6 },
        speedY: { min: -10, max: -3 },
        alpha: { start: 1, end: 0, ease: 'Sine.In' },
        tint: 0xffd070,
        scale: 2,
        frequency: 140,
        blendMode: Phaser.BlendModes.ADD,
      }).setDepth(5002));
    }
  }

  private buildTags(): void {
    for (const [id, spot] of Object.entries(SPOTS) as [SpotId, (typeof SPOTS)[SpotId]][]) {
      const key = this.add.text(0, 0, 'E', { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.casca) }).setOrigin(0.5);
      const label = this.add.text(0, 0, spot.label, { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.seiva) }).setOrigin(0, 0.5);
      const w = 14 + 18 + 8 + label.width + 14;
      const g = this.add.graphics();
      key.setPosition(-w / 2 + 14 + 9, 0);
      label.setPosition(-w / 2 + 14 + 18 + 8, 0);
      const root = this.world(this.add.container(spot.tag[0], spot.tag[1], [g, key, label]).setDepth(6000).setAlpha(0.5));
      this.tags.set(id, { root, g, w, near: false });
      this.drawTag(id);
    }
  }

  private drawTag(id: SpotId): void {
    const t = this.tags.get(id)!;
    t.g.clear();
    drawBark(t.g, -t.w / 2, -16, t.w, 32, { focus: t.near });
    t.g.fillStyle(OCO.ambar).fillRect(-t.w / 2 + 14, -9, 18, 18);
  }

  private buildHud(): void {
    const g = this.add.graphics();
    const nome = this.add.text(30, 26, '', { fontFamily: FONT_TEXT, fontSize: '16px', color: css(OCO.seiva) });
    const nivel = this.add.text(0, 27, '', { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza) });
    const sementes = this.add.text(0, 26, '', { fontFamily: FONT_TEXT, fontSize: '16px', color: css(OCO.ambarClaro) });
    const dica = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, '', { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza) }).setOrigin(0.5);
    this.hud = this.ui(this.add.container(0, 0, [g, nome, nivel, sementes, dica]).setVisible(false));
    this.hudParts = { g, nome, nivel, sementes, dica };
  }

  private renderHud(pulse = false): void {
    if (!this.save) return;
    const { g, nome, nivel, sementes, dica } = this.hudParts;
    const h = this.save.ficha;
    nome.setText(NOMES[this.save.heroi]);
    nivel.setText(`Nv ${h.nivel}`).setX(nome.x + nome.width + 10);
    const barX = nivel.x + nivel.width + 12;
    const w1 = barX + 110 + 16 - 14;
    sementes.setText(`Sementes ${this.save.sementes}`).setX(w1 + 14 + 14 + 6);
    g.clear();
    drawBark(g, 14, 14, w1, 40);
    drawBar(g, barX, 28, 110, 12, h.xp / xpParaProximo(h.nivel));
    drawBark(g, w1 + 14 + 6, 14, sementes.width + 28, 40);
    const pontos = h.pontos > 0 ? ` (${h.pontos} ${h.pontos === 1 ? 'ponto' : 'pontos'})` : '';
    dica.setText(`WASD andar  ·  E falar  ·  C ficha${pontos}  ·  1 2 3 trocar de bicho  ·  Esc menu`);
    if (pulse && !reducedMotion()) {
      sementes.setOrigin(0, 0);
      this.tweens.add({ targets: sementes, scale: { from: 1.35, to: 1 }, duration: D.curto });
    }
  }

  // ---------- menu inicial ----------

  private openMenu(): void {
    this.estado = 'menu';
    this.hud.setVisible(false);
    const cx = GAME_WIDTH / 2;
    const parts: Phaser.GameObjects.GameObject[] = [this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, OCO.noite, 0.55).setOrigin(0)];
    const logo = this.add.text(cx, 104, 'Ibiacy', { fontFamily: FONT_HUB, fontSize: '96px', color: css(OCO.ambar) }).setOrigin(0.5);
    logo.setShadow(0, 0, css(OCO.ambar), 18, false, true);
    parts.push(logo);
    const opts = ['Novo jogo', 'Carregar jogo', 'Créditos'];
    const g = this.add.graphics();
    parts.push(g);
    const labels = opts.map((o, i) => this.add.text(cx - 110 + 18, 214 + i * 54 + 22, o, { fontFamily: FONT_TEXT, fontSize: '18px', color: css(OCO.seiva) }).setOrigin(0, 0.5));
    parts.push(...labels);
    const legenda = this.add.text(cx, 392, '', { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza), align: 'center' }).setOrigin(0.5, 0);
    parts.push(legenda);
    const root = this.ui(this.add.container(0, 0, parts));
    this.menu = { root, sel: this.save ? 1 : 0, confirmar: false };
    // Mouse também: passar por cima escolhe, clicar entra
    labels.forEach((_, i) => {
      const z = this.add.zone(cx, 214 + i * 54 + 22, 220, 44).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => this.moveMenu(i - (this.menu?.sel ?? 0)));
      z.on('pointerdown', () => this.chooseMenu());
      root.add(z);
    });
    this.paintMenu();
  }

  private paintMenu(): void {
    const m = this.menu!;
    const [, logo, g, ...rest] = m.root.list as Phaser.GameObjects.GameObject[];
    void logo;
    const labels = rest.slice(0, 3) as Phaser.GameObjects.Text[];
    const legenda = rest[3] as Phaser.GameObjects.Text;
    (g as Phaser.GameObjects.Graphics).clear();
    labels.forEach((t, i) => {
      const on = i === m.sel;
      const off = i === 1 && !this.save;
      drawButton(g as Phaser.GameObjects.Graphics, GAME_WIDTH / 2 - 110, 214 + i * 54, 220, 44, on && !off);
      t.setColor(css(on && !off ? OCO.casca : OCO.seiva)).setAlpha(off ? 0.45 : 1);
    });
    const s = this.save;
    legenda.setText(m.confirmar
      ? 'Isso apaga o jogo salvo. Aperte de novo pra confirmar.'
      : s
        ? `Jogo salvo: ${NOMES[s.heroi]}, nível ${s.ficha.nivel} · ${s.sementes} sementes · ${quando(s.salvoEm)}`
        : 'Nenhum jogo salvo ainda.');
  }

  private moveMenu(d: number): void {
    const m = this.menu!;
    m.sel = (m.sel + d + 3) % 3;
    m.confirmar = false;
    this.paintMenu();
  }

  private chooseMenu(): void {
    const m = this.menu!;
    if (m.sel === 0) {
      if (this.save && !m.confirmar) {
        m.confirmar = true;
        return this.paintMenu();
      }
      return this.openHeroSelect();
    }
    if (m.sel === 1) {
      if (!this.save) return;
      if (!this.player) this.spawnPlayer();
      return this.startFromMenu(false);
    }
    m.root.destroy();
    this.menu = null;
    this.estado = 'creditos';
    this.showPanel(this.textPanel('Créditos', CREDITOS));
  }

  /** Entrada (1B): o menu some e a câmera desce pelo tronco até o salão. */
  private startFromMenu(primeira: boolean): void {
    const root = (this.menu ?? this.escolha)!.root;
    this.menu = null;
    this.escolha = null;
    this.estado = 'entrando';
    this.tweens.add({ targets: root, alpha: 0, duration: D.curto, onComplete: () => root.destroy() });
    const player = this.player!;
    const cam = this.cameras.main;
    const targetY = Phaser.Math.Clamp(player.y - GAME_HEIGHT / 2 - 20, 0, cam.getBounds().height - GAME_HEIGHT);
    const done = () => {
      this.enterHub(false);
      if (primeira) this.time.delayedCall(300, () => this.talk(true));
    };
    if (reducedMotion()) {
      this.fadeThrough(() => cam.setScroll(0, targetY), done);
      return;
    }
    this.tweens.add({ targets: cam, scrollY: targetY, duration: D_CAMERA, delay: D.curto, ease: 'Cubic.easeInOut', onComplete: done });
  }

  /** Salão no controle do jogador: câmera segue o bicho com atraso (guia: 2C traduzido pro 2D). */
  private enterHub(snap: boolean): void {
    this.estado = 'livre';
    const player = this.player!;
    this.cameras.main.startFollow(player, true, 0.08, 0.08, 0, 40);
    if (snap) this.cameras.main.centerOn(player.x, player.y - 40);
    this.hud.setVisible(true);
    this.renderHud();
  }

  private backToMenu(): void {
    if (this.save) salvar(this.save);
    this.cameras.main.stopFollow();
    this.estado = 'entrando';
    const cam = this.cameras.main;
    const go = () => this.openMenu();
    if (reducedMotion()) return this.fadeThrough(() => cam.setScroll(0, 0), go);
    this.hud.setVisible(false);
    this.tweens.add({ targets: cam, scrollY: 0, duration: D.base, ease: 'Cubic.easeInOut', onComplete: go });
  }

  // ---------- escolha do herói (Novo jogo) ----------

  private openHeroSelect(): void {
    this.menu?.root.destroy();
    this.menu = null;
    this.estado = 'escolha';
    this.escolha = { root: this.ui(this.add.container(0, 0)), sel: 1 };
    this.paintHeroSelect();
  }

  /** Três cartões lado a lado: o bicho, o estilo, como ele passa pelas ameaças e os atributos de começo. */
  private paintHeroSelect(): void {
    const e = this.escolha!;
    e.root.removeAll(true);
    const w = 284;
    const gap = 16;
    const x0 = (GAME_WIDTH - (w * 3 + gap * 2)) / 2;
    const y = 96;
    const parts: Phaser.GameObjects.GameObject[] = [
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, OCO.noite, 0.7).setOrigin(0),
      this.add.text(GAME_WIDTH / 2, 50, 'Escolha seu bicho', { fontFamily: FONT_HUB, fontSize: '40px', color: css(OCO.ambarClaro) }).setOrigin(0.5),
    ];
    HEROIS.forEach((id, i) => {
      const x = x0 + i * (w + gap);
      const on = i === e.sel;
      const g = this.add.graphics();
      drawBark(g, x, y, w, 390, { focus: on });
      const base = ATTRS_INICIAIS[id];
      const attrs = ATTRS.map((a) => `${a.nome} ${base[a.id] ?? 1}`).join('   ');
      const t = (s: string, dy: number, o: Phaser.Types.GameObjects.Text.TextStyle) =>
        this.add.text(x + 18, y + dy, s, { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.seiva), wordWrap: { width: w - 36 }, lineSpacing: 3, ...o });
      parts.push(
        g,
        this.add.sprite(x + w / 2, y + 128, id, 0).setOrigin(0.5, 1).setScale(3).play(on ? `${id}-run` : `${id}-idle`).setAlpha(on ? 1 : 0.6),
        t(NOMES[id], 146, { fontFamily: FONT_HUB, fontSize: '26px', color: css(OCO.ambarClaro) }),
        t(ESTILOS[id].estilo, 182, { fontSize: '16px', color: css(OCO.ambar) }),
        t(ESTILOS[id].jeito, 210, {}),
        t(attrs, 304, { color: css(OCO.cinza), fontSize: '12px' }),
      );
    });
    parts.push(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '← → escolher  ·  E começar  ·  Esc voltar', { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza) }).setOrigin(0.5));
    e.root.add(parts);
  }

  private moveHeroSelect(d: number): void {
    const e = this.escolha!;
    e.sel = (e.sel + d + HEROIS.length) % HEROIS.length;
    this.paintHeroSelect();
  }

  private chooseHero(): void {
    this.save = novoJogo(HEROIS[this.escolha!.sel]);
    salvar(this.save);
    this.spawnPlayer();
    this.startFromMenu(true);
  }

  private closeHeroSelect(): void {
    this.escolha?.root.destroy();
    this.escolha = null;
    this.openMenu();
  }

  // ---------- andar ----------

  private walk(delta: number): void {
    const k = this.keys;
    let dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const p = this.player!;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      const step = (SPEED[this.save!.heroi] * Math.min(delta, 50)) / 1000;
      // Um eixo de cada vez: dá pra deslizar encostado na parede ou no balcão
      if (this.free(p.x + dx * step, p.y)) p.x += dx * step;
      if (this.free(p.x, p.y + dy * step)) p.y += dy * step;
      if (dx) p.setFlipX(dx < 0);
      p.play(`${this.save!.heroi}-run`, true);
    } else {
      p.play(`${this.save!.heroi}-idle`, true);
    }
    p.setDepth(p.y);
    this.playerGlow.setPosition(p.x, p.y - 20);

    // Quem está perto
    let near: SpotId | null = null;
    for (const [id, s] of Object.entries(SPOTS) as [SpotId, (typeof SPOTS)[SpotId]][]) {
      if (Math.hypot(p.x - s.x, p.y - s.y) < s.r) near = id;
    }
    if (near !== this.near) this.setNear(near);
  }

  private free(x: number, y: number): boolean {
    if (((x - FLOOR.cx) / FLOOR.rx) ** 2 + ((y - FLOOR.cy) / FLOOR.ry) ** 2 > 1) return false;
    return !BLOCKS.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1);
  }

  /** Chegar perto (3C): o jabuti levanta a cabeça na hora; a etiqueta acende em fade logo depois. */
  private setNear(near: SpotId | null): void {
    for (const [id, t] of this.tags) {
      const on = id === near;
      if (t.near === on) continue;
      t.near = on;
      this.drawTag(id);
      this.tweens.killTweensOf(t.root);
      if (on) this.tweens.add({ targets: t.root, alpha: 1, duration: reducedMotion() ? D.reduzido : D.curto, delay: reducedMotion() ? 0 : 150 });
      else t.root.setAlpha(0.5);
    }
    this.near = near;
  }

  // ---------- Ubiraçá ----------

  /** Conversa (4C): a câmera chega perto do Ubiraçá, entram as barras de cinema e o texto vem letra a letra. */
  private talk(primeira = false): void {
    if (!this.save) return;
    this.estado = 'conversa';
    this.setNear(null);
    this.tags.forEach((t) => t.root.setVisible(false));
    this.hud.setVisible(false);
    const cam = this.cameras.main;
    cam.stopFollow();
    const reduced = reducedMotion();
    const dur = reduced ? 0 : D.base;
    const go = () => {
      cam.pan(700, 724, dur, 'Cubic.easeInOut');
      cam.zoomTo(1.6, dur, 'Cubic.easeInOut');
      this.bars.forEach((b) => this.tweens.add({ targets: b, scaleY: 1, duration: dur, ease: 'Cubic.easeInOut' }));
    };
    if (reduced) this.fadeThrough(go, () => this.dialog(primeira));
    else {
      go();
      this.time.delayedCall(dur, () => this.dialog(primeira));
    }
  }

  private dialog(primeira: boolean): void {
    const linhas = primeira || !Object.keys(this.save!.missoes).length ? FALAS.primeira : FALAS.volta;
    const g = this.add.graphics();
    const x = 40;
    const y = GAME_HEIGHT - BAR_H - 128;
    const w = GAME_WIDTH - 80;
    drawBark(g, x, y, w, 118);
    const retrato = this.add.image(x + 20, y + 22, 'jabuti', 1).setOrigin(0).setScale(1);
    const nome = this.add.text(x + 132, y + 14, 'Ubiraçá', { fontFamily: FONT_HUB, fontSize: '28px', color: css(OCO.ambarClaro) });
    const text = this.add.text(x + 132, y + 48, '', { fontFamily: FONT_TEXT, fontSize: '16px', color: css(OCO.seiva), wordWrap: { width: w - 160 }, lineSpacing: 4 });
    const cont = this.add.text(x + w - 18, y + 118 - 14, 'E continuar', { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza) }).setOrigin(1, 1);
    const root = this.ui(this.add.container(0, 0, [g, retrato, nome, text, cont]).setAlpha(0));
    this.panel = root;
    this.tweens.add({ targets: root, alpha: 1, duration: D.reduzido });
    this.conversa = { linhas, i: 0, shown: 0, text };
    this.typeLine();
  }

  /** 40 letras por segundo; com movimento reduzido, a linha inteira. */
  private typeLine(): void {
    const c = this.conversa!;
    const full = c.linhas[c.i];
    c.timer?.remove();
    if (reducedMotion()) {
      c.shown = full.length;
      c.text.setText(full);
      return;
    }
    c.shown = 0;
    c.text.setText('');
    c.timer = this.time.addEvent({
      delay: 25,
      repeat: full.length - 1,
      callback: () => {
        c.shown++;
        c.text.setText(full.slice(0, c.shown));
      },
    });
  }

  private nextLine(): void {
    const c = this.conversa!;
    const full = c.linhas[c.i];
    if (c.shown < full.length) {
      // E pula pro fim da linha
      c.timer?.remove();
      c.shown = full.length;
      c.text.setText(full);
      return;
    }
    if (c.i < c.linhas.length - 1) {
      c.i++;
      this.typeLine();
      return;
    }
    c.timer?.remove();
    this.conversa = null;
    this.panel?.destroy();
    this.panel = null;
    this.sel = Math.max(0, MISSOES.findIndex((m) => this.unlocked(m) && !this.save!.missoes[m.id]));
    this.showMissions();
  }

  /** Trilhas no casco (5A): os cartões aparecem juntos, em fade curto. */
  private showMissions(): void {
    this.estado = 'missoes';
    const cw = 276;
    const gap = 16;
    const x0 = (GAME_WIDTH - (cw * 3 + gap * 2)) / 2;
    const y = GAME_HEIGHT - BAR_H - 196;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const head = this.add.text(x0, y - 44, 'Trilhas no casco', { fontFamily: FONT_HUB, fontSize: '30px', color: css(OCO.ambarClaro) });
    parts.push(head);
    MISSOES.forEach((m, i) => {
      const x = x0 + i * (cw + gap);
      const on = i === this.sel;
      const open = this.unlocked(m);
      const g = this.add.graphics();
      drawBark(g, x, y, cw, 180, { focus: on && open });
      const t = (s: string, dy: number, o: Phaser.Types.GameObjects.Text.TextStyle) => this.add.text(x + 16, y + dy, s, { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza), wordWrap: { width: cw - 32 }, ...o });
      const feitas = this.save!.missoes[m.id] ?? 0;
      const items = [
        g,
        t(m.nome, 14, { fontFamily: FONT_HUB, fontSize: '24px', color: css(OCO.ambarClaro) }),
        t(open ? `${m.lugar} · ${m.meta}` : `Trancada · termine ${m.precisa!.map((p) => MISSOES.find((x) => x.id === p)!.nome).join(' e ')}`, 48, {}),
      ];
      if (open) {
        items.push(
          t(`Recompensa: ${m.recompensa} sementes · ${m.xp} XP`, 104, { color: css(OCO.seiva) }),
          t(feitas ? `Feita ${feitas}×` : on ? 'E  aceitar trilha' : '', 146, { color: css(on ? OCO.ambar : OCO.cinza) }),
        );
      }
      const card = this.add.container(0, 0, items).setAlpha(open ? 1 : 0.5);
      parts.push(card);
    });
    const root = this.ui(this.add.container(0, 0, parts).setAlpha(0));
    this.panel?.destroy();
    this.panel = root;
    this.tweens.add({ targets: root, alpha: 1, duration: reducedMotion() ? D.reduzido : D.curto });
  }

  private unlocked(m: Missao): boolean {
    return (m.precisa ?? []).every((p) => (this.save!.missoes[p] ?? 0) > 0);
  }

  private selectMission(d: number): void {
    this.sel = (this.sel + d + MISSOES.length) % MISSOES.length;
    this.showMissionsInPlace();
  }

  private showMissionsInPlace(): void {
    // Troca o destaque sem fade: a lista já está na tela
    const old = this.panel;
    this.showMissions();
    old?.destroy();
    this.panel!.setAlpha(1);
    this.tweens.killTweensOf(this.panel!);
  }

  private acceptMission(): void {
    const m = MISSOES[this.sel];
    if (!this.unlocked(m)) return;
    this.estado = 'saindo';
    salvar(this.save!);
    new LeafCurtain(this, 100).close().then(() =>
      this.time.delayedCall(D.curto, () => this.scene.start('Game', { curtain: true, missao: m.id, heroi: this.save!.heroi, seed: m.seed, world: m.world })));
  }

  private endTalk(): void {
    this.conversa?.timer?.remove();
    this.conversa = null;
    this.panel?.destroy();
    this.panel = null;
    const cam = this.cameras.main;
    const player = this.player!;
    const reduced = reducedMotion();
    const dur = reduced ? 0 : D.base;
    const back = () => {
      cam.zoomTo(1, dur, 'Cubic.easeInOut');
      cam.pan(player.x, player.y - 40, dur, 'Cubic.easeInOut');
      this.bars.forEach((b) => this.tweens.add({ targets: b, scaleY: 0, duration: dur, ease: 'Cubic.easeInOut' }));
    };
    const done = () => {
      this.tags.forEach((t) => t.root.setVisible(true));
      this.enterHub(false);
    };
    this.estado = 'entrando';
    if (reduced) this.fadeThrough(back, done);
    else {
      back();
      this.time.delayedCall(dur, done);
    }
  }

  // ---------- lojinha ----------

  private openShop(sel = 0): void {
    if (!this.save) return;
    this.sel = sel;
    const first = this.estado !== 'loja';
    this.estado = 'loja';
    const w = 520;
    const rows = LOJA.length;
    const h = 92 + rows * 56 + 50;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    const g = this.add.graphics();
    drawBark(g, x, y, w, h);
    const parts: Phaser.GameObjects.GameObject[] = [g, this.add.text(x + 24, y + 18, 'Lojinha do Quati', { fontFamily: FONT_HUB, fontSize: '30px', color: css(OCO.ambarClaro) })];
    LOJA.forEach((it, i) => {
      const ry = y + 70 + i * 56;
      const can = this.save!.sementes >= it.preco;
      const on = i === sel;
      const tem = this.save!.inventario[it.id] ?? 0;
      parts.push(
        this.add.text(x + 24, ry + 4, it.nome + (tem ? `  (tem ${tem})` : ''), { fontFamily: FONT_TEXT, fontSize: '16px', color: css(OCO.seiva) }).setAlpha(can ? 1 : 0.55),
        this.add.text(x + 24, ry + 26, it.efeito, { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza) }).setAlpha(can ? 1 : 0.55),
        this.add.text(x + w - 150, ry + 14, String(it.preco), { fontFamily: FONT_TEXT, fontSize: '18px', color: css(OCO.ambarClaro) }).setOrigin(1, 0).setAlpha(can ? 1 : 0.55),
      );
      const bg = this.add.graphics();
      drawButton(bg, x + w - 130, ry + 6, 106, 36, on && can);
      parts.push(bg, this.add.text(x + w - 77, ry + 24, can ? 'Comprar' : 'Falta', { fontFamily: FONT_TEXT, fontSize: '14px', color: css(on && can ? OCO.casca : OCO.seiva) }).setOrigin(0.5));
      const sep = this.add.graphics();
      sep.fillStyle(OCO.veio);
      for (let dx = 0; dx < w - 48; dx += 8) sep.fillRect(x + 24 + dx, ry + 50, 4, 2);
      parts.push(sep);
    });
    const saldo = this.add.text(x + 24, y + h - 36, `Você tem ${this.save.sementes} sementes`, { fontFamily: FONT_TEXT, fontSize: '16px', color: css(OCO.seiva) });
    parts.push(saldo, this.add.text(x + w - 24, y + h - 36, 'E comprar  ·  Esc sair', { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza) }).setOrigin(1, 0));
    const root = this.ui(this.add.container(0, 0, parts));
    if (first) this.showPanel(root);
    else {
      this.panel?.destroy();
      this.panel = root;
    }
  }

  /** Comprar (6A): o saldo troca na hora, com o pulso do número. */
  private buy(): void {
    const it = LOJA[this.sel];
    if (!comprar(this.save!, it.id, it.preco)) return;
    salvar(this.save!);
    this.openShop(this.sel);
    this.renderHud(true);
  }

  // ---------- ficha do herói ----------

  private openSheet(sel = 0): void {
    if (!this.save) return;
    this.sel = sel;
    const first = this.estado !== 'ficha';
    this.estado = 'ficha';
    const h = this.save.ficha;
    const w = 420;
    const x = GAME_WIDTH - w - 24;
    const y = 74;
    const ph = 400;
    const g = this.add.graphics();
    drawBark(g, x, y, w, ph);
    const parts: Phaser.GameObjects.GameObject[] = [
      g,
      this.add.text(x + 22, y + 16, NOMES[this.save.heroi], { fontFamily: FONT_HUB, fontSize: '30px', color: css(OCO.ambarClaro) }),
      this.add.text(x + w - 22, y + 24, `Nível ${h.nivel}`, { fontFamily: FONT_TEXT, fontSize: '16px', color: css(OCO.seiva) }).setOrigin(1, 0),
    ];
    const bar = this.add.graphics();
    drawBar(bar, x + 22, y + 60, w - 44, 16, h.xp / xpParaProximo(h.nivel));
    parts.push(bar, this.add.text(x + w - 28, y + 61, `${h.xp} / ${xpParaProximo(h.nivel)} XP`, { fontFamily: FONT_TEXT, fontSize: '12px', color: css(OCO.seiva) }).setOrigin(1, 0));
    ATTRS.forEach((a, i) => {
      const ry = y + 92 + i * 34;
      const on = i === sel;
      parts.push(
        this.add.text(x + 22, ry, a.nome, { fontFamily: FONT_TEXT, fontSize: '16px', color: css(on ? OCO.ambar : OCO.seiva) }),
        this.add.text(x + w - 80, ry, String(h.attrs[a.id]), { fontFamily: FONT_TEXT, fontSize: '18px', color: css(OCO.ambarClaro) }).setOrigin(1, 0),
      );
      const b = this.add.graphics();
      drawButton(b, x + w - 62, ry - 3, 40, 26, on && h.pontos > 0);
      parts.push(b, this.add.text(x + w - 42, ry + 10, '+', { fontFamily: FONT_TEXT, fontSize: '16px', color: css(on && h.pontos > 0 ? OCO.casca : OCO.seiva) }).setOrigin(0.5).setAlpha(h.pontos > 0 ? 1 : 0.4));
    });
    parts.push(this.add.text(x + 22, y + 266, h.pontos > 0 ? `${h.pontos} ${h.pontos === 1 ? 'ponto' : 'pontos'} pra distribuir  ·  E ou → soma` : 'Sem pontos: suba de nível nas missões', { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza) }));
    HABILIDADES[this.save.heroi].forEach(([key, nome], i) => {
      const cx = x + 22 + i * 76;
      const sg = this.add.graphics();
      drawBark(sg, cx, y + 298, 68, 80);
      sg.fillStyle(OCO.ambar).fillRect(cx + 24, y + 310, 20, 20);
      parts.push(sg,
        this.add.text(cx + 34, y + 320, key, { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.casca) }).setOrigin(0.5),
        this.add.text(cx + 34, y + 340, nome, { fontFamily: FONT_TEXT, fontSize: '11px', color: css(OCO.seiva), align: 'center', wordWrap: { width: 60 } }).setOrigin(0.5, 0));
    });
    const root = this.ui(this.add.container(0, 0, parts));
    if (first) this.showPanel(root);
    else {
      this.panel?.destroy();
      this.panel = root;
    }
  }

  private assignPoint(): void {
    const a = ATTRS[this.sel];
    if (!distribuir(this.save!.ficha, a.id)) return;
    salvar(this.save!);
    this.openSheet(this.sel);
    this.renderHud();
    this.floatText(`+1 ${a.nome}`);
  }

  // ---------- recompensa ----------

  /** Volta da missão: sementes e XP; quem subiu de nível ganha o anel de luz e o pulinho (7B). */
  private reward(r: { missao?: string; sementes: number }): void {
    const s = this.save!;
    const m = MISSOES.find((x) => x.id === r.missao);
    s.sementes += r.sementes + (m?.recompensa ?? 0);
    let subiu = 0;
    if (m) {
      s.missoes[m.id] = (s.missoes[m.id] ?? 0) + 1;
      subiu = ganharXp(s.ficha, m.xp);
    }
    salvar(s);
    this.renderHud(true);
    const msg = m ? `${m.nome}: +${r.sementes + m.recompensa} sementes · +${m.xp} XP` : `+${r.sementes} sementes`;
    this.toast(msg);
    if (subiu) this.levelUp(s.ficha.nivel);
  }

  private levelUp(nivel: number): void {
    this.floatText(`Nível ${nivel}!`);
    if (reducedMotion()) return;
    const p = this.player!;
    // Pulinho de 4 px de arte e a luz do salão pulsando uma vez
    this.tweens.add({ targets: p, y: p.y - 8, duration: 125, yoyo: true, ease: 'Sine.Out' });
    for (const g of this.glows) {
      const a = g.alpha;
      this.tweens.add({ targets: g, alpha: Math.min(1, a * 2.2), duration: 125, yoyo: true, onComplete: () => g.setAlpha(a) });
    }
  }

  /** Texto que sobe da cabeça do bicho e some em 800 ms. */
  private floatText(s: string): void {
    const p = this.player!;
    const t = this.world(this.add.text(p.x, p.y - 44, s, { fontFamily: FONT_HUB, fontSize: '22px', color: css(OCO.ambar) }).setOrigin(0.5, 1).setDepth(6001));
    t.setShadow(0, 2, css(OCO.noite), 0, false, true);
    if (reducedMotion()) {
      this.time.delayedCall(1000, () => t.destroy());
      return;
    }
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 800, ease: 'Sine.In', onComplete: () => t.destroy() });
  }

  private toast(s: string): void {
    const t = this.add.text(GAME_WIDTH / 2, 80, s, { fontFamily: FONT_TEXT, fontSize: '16px', color: css(OCO.ambarClaro) }).setOrigin(0.5);
    const g = this.add.graphics();
    drawBark(g, GAME_WIDTH / 2 - t.width / 2 - 20, 60, t.width + 40, 40);
    const root = this.ui(this.add.container(0, 0, [g, t]).setAlpha(0));
    this.tweens.add({ targets: root, alpha: 1, duration: D.curto, hold: 2600, yoyo: true, onComplete: () => root.destroy() });
  }

  // ---------- painéis ----------

  private textPanel(title: string, lines: readonly string[]): Phaser.GameObjects.Container {
    const w = 520;
    const x = (GAME_WIDTH - w) / 2;
    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = 22;
    parts.push(this.add.text(x + 24, y, title, { fontFamily: FONT_HUB, fontSize: '30px', color: css(OCO.ambarClaro) }));
    y += 50;
    for (const l of lines) {
      const t = this.add.text(x + 24, y, l, { fontFamily: FONT_TEXT, fontSize: '16px', color: css(OCO.seiva), wordWrap: { width: w - 48 }, lineSpacing: 4 });
      parts.push(t);
      y += t.height + 10;
    }
    parts.push(this.add.text(x + w - 24, y + 6, 'E voltar', { fontFamily: FONT_TEXT, fontSize: '13px', color: css(OCO.cinza) }).setOrigin(1, 0));
    const h = y + 36;
    const g = this.add.graphics();
    drawBark(g, x, 0, w, h);
    return this.ui(this.add.container(0, (GAME_HEIGHT - h) / 2, [g, ...parts]));
  }

  /** Painel entra em fade curto (a interface não desliza). */
  private showPanel(root: Phaser.GameObjects.Container): void {
    this.panel?.destroy();
    this.panel = root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: reducedMotion() ? D.reduzido : D.curto });
  }

  private closePanel(then?: () => void): void {
    const p = this.panel;
    this.panel = null;
    this.estado = 'entrando';
    if (!p) return void (then ? then() : this.enterHub(false));
    this.tweens.add({
      targets: p, alpha: 0, duration: reducedMotion() ? D.reduzido : D.curto,
      onComplete: () => {
        p.destroy();
        if (then) then();
        else this.enterHub(false);
      },
    });
  }

  private selectRow(d: number, n: number, redraw: () => void): void {
    this.sel = (this.sel + d + n) % n;
    redraw();
  }

  /** Movimento reduzido: em vez de viajar, escurece, troca e clareia (150 ms). */
  private fadeThrough(swap: () => void, done: () => void): void {
    this.tweens.add({
      targets: this.fade, alpha: 1, duration: D.reduzido,
      onComplete: () => {
        swap();
        this.tweens.add({ targets: this.fade, alpha: 0, duration: D.reduzido, onComplete: done });
      },
    });
  }
}

function quando(t: number): string {
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}
