import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const RULE_VERSION = '2026-11-16-observed';

export const CARDS = {
  caocao: { name: '曹操', quality: 'red', army: 'shield', base: 6 },
  liubei: { name: '刘备', quality: 'red', army: 'shield', base: 6 },
  sunquan: { name: '孙权', quality: 'red', army: 'spear', base: 6 },
  lvbu: { name: '吕布', quality: 'red', army: 'cavalry', base: 6 },
  guanyu: { name: '关羽', quality: 'red', army: 'cavalry', base: 6 },
  zhangfei: { name: '张飞', quality: 'orange', army: 'spear', base: 3 },
  yuanshao: { name: '袁绍', quality: 'orange', army: 'bow', base: 3 },
  sunce: { name: '孙策', quality: 'orange', army: 'cavalry', base: 3 },
  zhouyu: { name: '周瑜', quality: 'orange', army: 'bow', base: 3 },
  huanggai: { name: '黄盖', quality: 'orange', army: 'spear', base: 3 },
  lvmeng: { name: '吕蒙', quality: 'orange', army: 'spear', base: 3 },
  bow: { name: '弓兵', quality: 'blue', army: 'bow', base: 1 },
  cavalry: { name: '骑兵', quality: 'blue', army: 'cavalry', base: 1 },
  spear: { name: '枪兵', quality: 'blue', army: 'spear', base: 1 },
  shield: { name: '盾兵', quality: 'blue', army: 'shield', base: 1 }
};

export const INITIAL_BUFFS = [
  'base', 'sameName', 'sameBow', 'sameShield', 'sameSpear', 'sameCavalry',
  'redQuality', 'orangeQuality', 'blueQuality', 'threeKingdoms'
];

export const BUFFS = {
  base: '基础点数', sameName: '同名增益', sameBow: '同弓兵增益',
  sameShield: '同盾兵增益', sameSpear: '同枪兵增益',
  sameCavalry: '同骑兵增益', redQuality: '红色品质增益',
  orangeQuality: '橙色品质增益', blueQuality: '蓝色品质增益',
  threeKingdoms: '三分天下', twinWall: '双壁成军',
  preciseSupply: '精算军需', fourRed: '四红天命',
  shuffleTactic: '洗牌谋略', shuVirtue: '蜀汉仁德',
  blueSea: '蓝海成势', royalCall: '王者征召',
  orangeDisciple: '橙宦门生', pursuit: '点名追击',
  warSpeed: '兵贵神速', ladder: '阶梯阵容',
  clanGuard: '族兵拥护', formation: '整军列阵',
  commandFormation: '点将成阵', lowStar: '低星逆袭',
  rareEcho: '稀有共鸣', fourArms: '四兵齐备'
};

const BUFF_ALIASES = {
  '王者诏召': 'royalCall',
  '橙府门生': 'orangeDisciple'
};
const ARMY_NAMES = { bow: '弓兵', shield: '盾兵', spear: '枪兵', cavalry: '骑兵' };
const CARD_KEYS = new Map(Object.entries(CARDS).flatMap(([key, card]) => [[key, key], [card.name, key]]));
const BUFF_KEYS = new Map([
  ...Object.entries(BUFFS).flatMap(([key, name]) => [[key, key], [name, key]]),
  ...Object.entries(BUFF_ALIASES)
]);

function knownKey(value, lookup, label) {
  if (typeof value !== 'string' || !lookup.has(value.trim())) {
    throw new Error(`Unknown or unsupported ${label}: ${JSON.stringify(value)}. Use --catalog.`);
  }
  return lookup.get(value.trim());
}

function normalize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Input must be a JSON object.');
  }
  if (!Array.isArray(input.hand) || input.hand.length < 1 || input.hand.length > 8) {
    throw new Error('hand must contain between 1 and 8 cards.');
  }
  if (input.buffs !== undefined && !Array.isArray(input.buffs)) {
    throw new Error('buffs must be an array of owned buff keys or names.');
  }
  const hand = input.hand.map(value => knownKey(value, CARD_KEYS, 'card'));
  const buffs = new Set([
    ...INITIAL_BUFFS,
    ...(input.buffs ?? []).map(value => knownKey(value, BUFF_KEYS, 'buff'))
  ]);
  const state = input.state ?? {};
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('state must be an object.');
  }
  for (const key of Object.keys(state)) {
    if (!['pursuitArmed', 'armyTriggered'].includes(key)) {
      throw new Error(`Unsupported state key: ${key}`);
    }
  }
  for (const [key, buff] of [['pursuitArmed', 'pursuit'], ['armyTriggered', 'warSpeed']]) {
    if (state[key] !== undefined && typeof state[key] !== 'boolean') {
      throw new Error(`state.${key} must be boolean.`);
    }
    if (buffs.has(buff) && typeof state[key] !== 'boolean') {
      throw new Error(`Confirm state.${key} when ${buff} is owned; false means not yet triggered this stage.`);
    }
  }
  return {
    hand, buffs,
    state: { pursuitArmed: state.pursuitArmed ?? false, armyTriggered: state.armyTriggered ?? false }
  };
}

function validateIndices(indices, length) {
  if (!Array.isArray(indices) || indices.length < 1 || indices.length > 6) {
    throw new Error('Select between 1 and 6 one-based indices.');
  }
  if (new Set(indices).size !== indices.length || indices.some(i => !Number.isInteger(i) || i < 1 || i > length)) {
    throw new Error('Selected indices must be unique integers within the current hand.');
  }
}

function score(context, indices) {
  const { hand, buffs, state } = context;
  const cards = indices.map(index => ({ key: hand[index - 1], ...CARDS[hand[index - 1]] }));
  const names = {}, armies = {}, qualities = {};
  for (const card of cards) {
    names[card.key] = (names[card.key] ?? 0) + 1;
    armies[card.army] = (armies[card.army] ?? 0) + 1;
    qualities[card.quality] = (qualities[card.quality] ?? 0) + 1;
  }
  const events = [];
  const add = (id, value, detail) => events.push({ id, name: BUFFS[id], value, ...(detail ? { detail } : {}) });
  const base = cards.reduce((sum, card) => sum + card.base, 0);
  add('base', base);

  const sameGroups = Object.entries(names).filter(([, count]) => count >= (buffs.has('twinWall') ? 2 : 3));
  for (const [key, count] of sameGroups) {
    add('sameName', buffs.has('twinWall') ? 10 : 20, CARDS[key].name);
    // The observed three-card threshold is independent of twinWall.
    if (buffs.has('commandFormation') && count >= 3) add('commandFormation', 20 * (count - 2), CARDS[key].name);
    if (buffs.has('clanGuard') && CARDS[key].quality === 'blue') add('clanGuard', 10, CARDS[key].name);
    if (buffs.has('orangeDisciple') && CARDS[key].quality === 'orange') add('orangeDisciple', 15, CARDS[key].name);
  }
  if (buffs.has('pursuit') && sameGroups.length && state.pursuitArmed) add('pursuit', 15);

  if ((qualities.red ?? 0) >= 3) {
    add('redQuality', 30);
    if (buffs.has('fourRed')) add('fourRed', 20 + (qualities.red - 3) * 10);
  }
  if ((qualities.orange ?? 0) >= 3) add('orangeQuality', 20);
  if ((qualities.blue ?? 0) >= 3) add('blueQuality', buffs.has('blueSea') ? 20 : 10);
  if (buffs.has('lowStar') && !qualities.red) add('lowStar', cards.length * 2);
  if (buffs.has('ladder') && qualities.red && qualities.orange && qualities.blue) add('ladder', 20);
  if (buffs.has('rareEcho')) {
    const count = ['red', 'orange', 'blue'].filter(quality => (qualities[quality] ?? 0) >= 3).length;
    if (count) add('rareEcho', count * 8);
  }

  const armyTypes = Object.keys(armies).filter(army => armies[army] >= 3);
  const armyBuffs = { bow: 'sameBow', shield: 'sameShield', spear: 'sameSpear', cavalry: 'sameCavalry' };
  for (const army of armyTypes) add(armyBuffs[army], 10);
  if (armyTypes.length) {
    if (buffs.has('warSpeed') && !state.armyTriggered) add('warSpeed', 20);
    if (buffs.has('formation')) add('formation', cards.length * 2);
  }
  if (buffs.has('fourArms') && Object.keys(ARMY_NAMES).every(army => armies[army])) add('fourArms', 40);

  const hasLord = ['caocao', 'liubei', 'sunquan'].some(key => names[key]);
  if (names.caocao && names.liubei && names.sunquan) add('threeKingdoms', 80);
  if (buffs.has('royalCall') && hasLord) add('royalCall', cards.length * 4);
  if (buffs.has('shuVirtue') && names.liubei) add('shuVirtue', (armies.shield ?? 0) * 10);

  const total = events.reduce((sum, event) => sum + event.value, 0);
  return {
    indices: [...indices],
    cards: cards.map(card => ({ key: card.key, name: card.name })),
    base, bonus: total - base, total, events,
    sameNameGroups: sameGroups.map(([key, count]) => ({ key, count })),
    armyTypes,
    stateAfterPlay: {
      pursuitArmed: state.pursuitArmed || sameGroups.length > 0,
      armyTriggered: state.armyTriggered || armyTypes.length > 0
    }
  };
}

export function calculatePlay(input, indices) {
  const context = normalize(input);
  validateIndices(indices, context.hand.length);
  return score(context, indices);
}

export function bestPlay(input) {
  const context = normalize(input);
  let best = null;
  for (let mask = 1; mask < 2 ** context.hand.length; mask++) {
    const indices = [];
    for (let i = 0; i < context.hand.length; i++) if (mask & (1 << i)) indices.push(i + 1);
    if (indices.length > 6) continue;
    const candidate = score(context, indices);
    if (!best || candidate.total > best.total ||
      (candidate.total === best.total && candidate.indices.length < best.indices.length)) best = candidate;
  }
  const outsideHandScoring = [];
  if (context.buffs.has('shuffleTactic')) outsideHandScoring.push({ id: 'shuffleTactic', note: 'Track reshuffles separately: 50, 100, 150, ... damage per stage.' });
  if (context.buffs.has('preciseSupply')) outsideHandScoring.push({ id: 'preciseSupply', note: 'First-play quarter-target condition awards ink, not hand damage.' });
  const output = {
    ruleVersion: RULE_VERSION,
    scope: 'Immediate hand damage only; no redraw probabilities, future plays or reshuffle damage.',
    buffs: [...context.buffs], state: context.state, best, outsideHandScoring
  };
  if (input.selectedIndices !== undefined) {
    validateIndices(input.selectedIndices, context.hand.length);
    output.selected = score(context, input.selectedIndices);
  }
  return output;
}

export function demoInput() {
  return {
    hand: ['caocao', 'liubei', 'guanyu', 'zhangfei', 'lvmeng', 'spear', 'spear', 'shield'],
    buffs: Object.keys(BUFFS).filter(key => !INITIAL_BUFFS.includes(key)),
    state: { pursuitArmed: true, armyTriggered: true }
  };
}

function main(args) {
  let output;
  if (args.length === 1 && args[0] === '--demo') output = bestPlay(demoInput());
  else if (args.length === 1 && args[0] === '--catalog') output = { ruleVersion: RULE_VERSION, cards: CARDS, buffs: BUFFS, aliases: BUFF_ALIASES, initialBuffs: INITIAL_BUFFS };
  else if (args.length === 2 && args[0] === '--input') output = bestPlay(JSON.parse(readFileSync(args[1], 'utf8').replace(/^\uFEFF/, '')));
  else if (!args.length || (args.length === 1 && args[0] === '--help')) {
    console.log('Usage: node adviser.mjs --input state.json | --demo | --catalog');
    return;
  } else throw new Error('Invalid arguments. Use --help.');
  console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
