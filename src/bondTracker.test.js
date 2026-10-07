import {
  calculateMaximumMissionXp,
  calculateMissionXp,
  calculatePairXp,
  createPairId,
  DEFAULT_OPERATORS,
  generatePairs,
  isMissionComplete,
  isPairComplete,
  setPairInteraction,
} from './bondTracker';

test.each([
  [2, 1, 40],
  [3, 3, 120],
  [4, 6, 240],
])('generates unique pairs and %i-operator XP caps', (operatorCount, pairCount, maximumXp) => {
  const pairs = generatePairs(DEFAULT_OPERATORS.slice(0, operatorCount));

  expect(pairs).toHaveLength(pairCount);
  expect(new Set(pairs.map((pair) => pair.id)).size).toBe(pairCount);
  expect(calculateMaximumMissionXp(pairs)).toBe(maximumXp);
});

test('keeps pair identity unordered and pair order aligned with the selected roster', () => {
  const [hawks, trick, telRea] = DEFAULT_OPERATORS;
  expect(createPairId(hawks, trick)).toBe(createPairId(trick, hawks));
  expect(generatePairs([hawks, trick, telRea]).map((pair) => pair.id)).toEqual([
    'hawks::trick',
    'hawks::tel-rea',
    'tel-rea::trick',
  ]);
});

test('supports cumulative capped Assist and Other XP checkboxes', () => {
  let [pair] = generatePairs(DEFAULT_OPERATORS.slice(0, 2));
  for (let index = 0; index < 2; index += 1) {
    pair = setPairInteraction(pair, 'assist', index, true);
  }
  const overCapAssist = setPairInteraction(pair, 'assist', 2, true);
  expect(overCapAssist).toBe(pair);
  expect(calculatePairXp(pair)).toBe(20);

  for (let index = 0; index < 5; index += 1) {
    pair = setPairInteraction(pair, 'other', index, true);
  }
  const overCapOther = setPairInteraction(pair, 'other', 5, true);
  expect(overCapOther).toBe(pair);
  expect(calculatePairXp(pair)).toBe(40);
  expect(calculateMissionXp([pair])).toBe(40);
  expect(isPairComplete(pair)).toBe(true);
  expect(isMissionComplete([pair])).toBe(true);
});

test('checking a later interaction selects preceding items; unchecking clears later items', () => {
  let [pair] = generatePairs(DEFAULT_OPERATORS.slice(0, 2));
  pair = setPairInteraction(pair, 'other', 3, true);
  expect(pair.otherActions).toEqual([true, true, true, true, false]);

  pair = setPairInteraction(pair, 'other', 1, false);
  expect(pair.otherActions).toEqual([true, false, false, false, false]);

  pair = setPairInteraction(pair, 'assist', 1, true);
  expect(pair.assists).toEqual([true, true]);
  pair = setPairInteraction(pair, 'assist', 0, false);
  expect(pair.assists).toEqual([false, false]);
  expect(calculatePairXp(pair)).toBe(4);
});
