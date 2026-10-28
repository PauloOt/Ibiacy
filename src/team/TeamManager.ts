import Phaser from 'phaser';
import { TRAP_HOLD_MS } from '../config';
import { JumpAssist } from '../core/JumpAssist';
import { TeamState } from '../core/TeamState';
import type { AirState, Hero, LevelQuery } from '../heroes/Hero';
import type { InputFrame } from '../input/Controls';

export interface Spot {
  x: number;
  bottom: number;
}

export interface HudSnapshot {
  hearts: number;
  seeds: number;
  activeIndex: number;
  ids: string[];
  names: string[];
}

/**
 * Guarda os heróis, a vida compartilhada e faz a troca.
 * Só o herói ativo existe na física; na troca o novo nasce nos pés do antigo com a mesma velocidade.
 *
 * Eventos: 'changed' (HudSnapshot), 'swapped' (x, y), 'respawned'.
 */
export class TeamManager extends Phaser.Events.EventEmitter {
  readonly state: TeamState;
  readonly jump = new JumpAssist();
  readonly air: AirState = { doubleJumpUsed: false, dashUsed: false, canCut: false };

  private rootedUntil = -Infinity;
  private checkpoint: Spot;

  constructor(readonly heroes: Hero[], start: Spot) {
    super();
    this.state = new TeamState(heroes.map((h) => h.id));
    this.checkpoint = start;
    this.active.wake(start.x, start.bottom, 0, 0, 1);
  }

  get active(): Hero {
    return this.heroes[this.state.activeIndex];
  }

  update(input: InputFrame, now: number, dt: number, level: LevelQuery): void {
    if (input.swapTo !== null) this.swap(() => this.state.swapTo(input.swapTo!, now));
    else if (input.cycle !== 0) this.swap(() => this.state.cycle(input.cycle as 1 | -1, now));

    const hero = this.active;
    hero.tick({
      now,
      dt,
      input,
      jump: this.jump,
      air: this.air,
      level,
      rooted: now < this.rootedUntil,
      drown: () => this.respawn(),
    });

    // Pisca enquanto está invulnerável
    const blinking = this.state.isInvulnerable(now) && Math.floor(now / 80) % 2 === 0;
    hero.setAlpha(blinking ? 0.3 : 1);
  }

  hurt(now: number, fromX: number): void {
    const result = this.state.hurt(now);
    if (result === 'dead') return this.respawn();
    if (result === 'hurt') {
      const hero = this.active;
      hero.setVelocity(Math.sign(hero.x - fromX || 1) * 220, -320);
      this.air.canCut = false;
      this.emitChanged();
    }
  }

  /** Pisou no laço: perde 1 coração e fica preso 2 s. false = estava invulnerável, o laço não fechou. */
  trap(now: number, fromX: number): boolean {
    if (this.state.isInvulnerable(now)) return false;
    this.hurt(now, fromX);
    if (this.state.hearts > 0) {
      this.rootedUntil = now + TRAP_HOLD_MS;
      this.active.setVelocity(0, 0);
    }
    return true;
  }

  /** Abismo, afogamento ou corações zerados: volta no checkpoint com vida cheia. */
  respawn(): void {
    this.state.respawn();
    this.jump.reset();
    Object.assign(this.air, { doubleJumpUsed: false, dashUsed: false, canCut: false });
    this.rootedUntil = -Infinity;
    const hero = this.active;
    hero.sleep();
    hero.wake(this.checkpoint.x, this.checkpoint.bottom, 0, 0, 1);
    this.emit('respawned');
    this.emitChanged();
  }

  setCheckpoint(spot: Spot): void {
    this.checkpoint = spot;
    this.state.reachCheckpoint();
    this.emitChanged();
  }

  collectSeed(): void {
    this.state.collectSeed();
    this.emitChanged();
  }

  snapshot(): HudSnapshot {
    return {
      hearts: this.state.hearts,
      seeds: this.state.seeds,
      activeIndex: this.state.activeIndex,
      ids: this.heroes.map((h) => h.id),
      names: this.heroes.map((h) => h.stats.name),
    };
  }

  private swap(tryIt: () => boolean): void {
    const old = this.active;
    if (!tryIt()) return;
    const next = this.active;
    const { x, y } = old.body.velocity;
    next.wake(old.x, old.body.bottom, x, y, old.facing);
    old.sleep();
    this.emit('swapped', next.x, next.y);
    this.emitChanged();
  }

  private emitChanged(): void {
    this.emit('changed', this.snapshot());
  }
}
