import test from 'node:test';
import assert from 'node:assert/strict';
import { bestPlay, calculatePlay, demoInput } from './adviser.mjs';

const contribution = (result, id) => result.events.filter(event => event.id === id).reduce((sum, event) => sum + event.value, 0);

test('final observed hand reproduces the 218-point preview', () => {
  const result = bestPlay(demoInput()).best;
  assert.deepEqual(result.indices, [1, 2, 3, 6, 7, 8]);
  assert.equal(result.total, 218);
  assert.equal(result.base, 21);
  assert.equal(contribution(result, 'rareEcho'), 16);
  assert.equal(contribution(result, 'commandFormation'), 0);
});

test('stage 8 reproduces 183, eliminating the two false formation bonuses', () => {
  const input = {
    hand: ['liubei', 'liubei', 'lvmeng', 'lvmeng', 'zhangfei', 'huanggai', 'bow', 'cavalry'],
    buffs: ['twinWall', 'preciseSupply', 'fourRed', 'shuffleTactic', 'shuVirtue', 'blueSea', 'royalCall', 'orangeDisciple', 'pursuit', 'warSpeed', 'ladder', 'clanGuard', 'formation', 'commandFormation', 'lowStar'],
    state: { pursuitArmed: false, armyTriggered: false }
  };
  const selected = calculatePlay(input, [1, 2, 3, 4, 5, 7]);
  assert.equal(selected.total, 183);
  assert.equal(bestPlay(input).best.total, 183);
  assert.equal(contribution(selected, 'commandFormation'), 0);
});

test('command formation starts at three and grows at four despite twinWall', () => {
  const input = { hand: ['spear', 'spear', 'spear', 'spear'], buffs: ['twinWall', 'commandFormation'] };
  assert.equal(contribution(calculatePlay(input, [1, 2]), 'commandFormation'), 0);
  assert.equal(contribution(calculatePlay(input, [1, 2, 3]), 'commandFormation'), 20);
  assert.equal(contribution(calculatePlay(input, [1, 2, 3, 4]), 'commandFormation'), 40);
  assert.equal(contribution(calculatePlay(input, [1, 2, 3]), 'sameName'), 10);
});

test('pursuit survives an intervening play without a same-name trigger', () => {
  const start = { hand: ['spear', 'spear'], buffs: ['twinWall', 'pursuit'], state: { pursuitArmed: false } };
  const first = calculatePlay(start, [1, 2]);
  assert.equal(contribution(first, 'pursuit'), 0);
  const middle = calculatePlay({ ...start, hand: ['caocao'], state: first.stateAfterPlay }, [1]);
  assert.equal(middle.stateAfterPlay.pursuitArmed, true);
  const last = calculatePlay({ ...start, state: middle.stateAfterPlay }, [1, 2]);
  assert.equal(contribution(last, 'pursuit'), 15);
});

test('rare echo counts baseline qualities, excluding ladder, lowStar and clanGuard', () => {
  const mixed = calculatePlay({
    hand: ['caocao', 'liubei', 'lvmeng', 'zhangfei', 'spear', 'spear'],
    buffs: ['rareEcho', 'ladder', 'clanGuard', 'twinWall']
  }, [1, 2, 3, 4, 5, 6]);
  assert.equal(contribution(mixed, 'ladder'), 20);
  assert.equal(contribution(mixed, 'clanGuard'), 10);
  assert.equal(contribution(mixed, 'rareEcho'), 0);
  const blue = calculatePlay({ hand: ['spear', 'spear', 'shield'], buffs: ['rareEcho', 'lowStar', 'clanGuard', 'twinWall'] }, [1, 2, 3]);
  assert.equal(contribution(blue, 'rareEcho'), 8);
  const orange = calculatePlay({ hand: ['sunce', 'lvmeng', 'zhangfei'], buffs: ['rareEcho', 'lowStar'] }, [1, 2, 3]);
  assert.equal(contribution(orange, 'rareEcho'), 8);
});

test('red and orange baseline qualities produce sixteen echo points', () => {
  const result = calculatePlay({ hand: ['caocao', 'liubei', 'guanyu', 'sunce', 'lvmeng', 'zhangfei'], buffs: ['rareEcho', 'fourRed'] }, [1, 2, 3, 4, 5, 6]);
  assert.equal(contribution(result, 'rareEcho'), 16);
});

test('war speed applies once per stage and formation once per card', () => {
  const input = { hand: ['spear', 'spear', 'spear', 'bow', 'bow', 'bow'], buffs: ['warSpeed', 'formation'], state: { armyTriggered: false } };
  const first = calculatePlay(input, [1, 2, 3, 4, 5, 6]);
  assert.equal(contribution(first, 'warSpeed'), 20);
  assert.equal(contribution(first, 'formation'), 12);
  const next = calculatePlay({ ...input, state: first.stateAfterPlay }, [1, 2, 3]);
  assert.equal(contribution(next, 'warSpeed'), 0);
});

test('blue sea replaces the original ten-point quality award', () => {
  const input = { hand: ['spear', 'cavalry', 'bow'], buffs: ['blueSea'] };
  assert.equal(contribution(calculatePlay(input, [1, 2, 3]), 'blueQuality'), 20);
});

test('reward and shuffle effects do not inflate hand damage', () => {
  const plain = { hand: ['caocao', 'liubei', 'sunquan'] };
  assert.equal(bestPlay({ ...plain, buffs: ['preciseSupply', 'shuffleTactic'] }).best.total, bestPlay(plain).best.total);
  assert.equal(bestPlay({ ...plain, buffs: ['preciseSupply', 'shuffleTactic'] }).outsideHandScoring.length, 2);
});

test('Chinese names and duplicate positions are supported', () => {
  const input = { hand: ['刘备', '刘备', '盾兵'], buffs: ['双壁成军', '蜀汉仁德', '王者诏召'] };
  const result = bestPlay(input).best;
  assert.deepEqual(result.indices, [1, 2, 3]);
  assert.equal(result.total, 75);
});

test('six-card limit, unknown effects and uncertain state are enforced', () => {
  assert.equal(bestPlay({ hand: Array(8).fill('caocao') }).best.indices.length, 6);
  assert.throws(() => bestPlay({ hand: ['caocao'], buffs: ['shieldWall'] }), /unsupported buff/);
  assert.throws(() => bestPlay({ hand: ['caocao'], buffs: ['pursuit'] }), /pursuitArmed/);
  assert.throws(() => bestPlay({ hand: ['caocao'], buffs: ['warSpeed'] }), /armyTriggered/);
  assert.throws(() => bestPlay({ hand: ['unknown'] }), /unsupported card/);
  assert.throws(() => calculatePlay({ hand: ['caocao'] }, [1, 1]), /unique integers/);
  assert.throws(() => calculatePlay({ hand: Array(8).fill('caocao') }, [1, 2, 3, 4, 5, 6, 7]), /between 1 and 6/);
});
