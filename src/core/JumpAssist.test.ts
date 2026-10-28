import { describe, expect, it } from 'vitest';
import { JumpAssist } from './JumpAssist';

describe('JumpAssist', () => {
  it('pula no chão quando aperta', () => {
    const j = new JumpAssist(100, 100);
    j.update(0, true);
    j.press(0);
    expect(j.tryGroundJump(0)).toBe(true);
  });

  it('coyote time: ainda pula 100 ms depois de sair da borda, não 101', () => {
    const j = new JumpAssist(100, 100);
    j.update(1000, true);
    j.press(1100);
    expect(j.tryGroundJump(1100)).toBe(true);

    const k = new JumpAssist(100, 100);
    k.update(1000, true);
    k.press(1101);
    expect(k.tryGroundJump(1101)).toBe(false);
  });

  it('jump buffer: aperto antes de pousar vira pulo ao pousar', () => {
    const j = new JumpAssist(100, 100);
    j.press(500);
    expect(j.tryGroundJump(500)).toBe(false); // ainda no ar
    j.update(580, true);
    expect(j.tryGroundJump(580)).toBe(true);
  });

  it('aperto velho demais não vale', () => {
    const j = new JumpAssist(100, 100);
    j.press(500);
    j.update(650, true);
    expect(j.tryGroundJump(650)).toBe(false);
  });

  it('um aperto só dá um pulo', () => {
    const j = new JumpAssist(100, 100);
    j.update(0, true);
    j.press(0);
    expect(j.tryGroundJump(0)).toBe(true);
    expect(j.tryGroundJump(16)).toBe(false);
  });

  it('consumePress tira o aperto do buffer', () => {
    const j = new JumpAssist(100, 100);
    j.press(0);
    j.consumePress();
    j.update(10, true);
    expect(j.tryGroundJump(10)).toBe(false);
  });
});
