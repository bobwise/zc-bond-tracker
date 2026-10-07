export const SESSION_STORAGE_KEY = 'zero-company-bond-tracker';

export const DEFAULT_OPERATORS = [
  { id: 'hawks', name: 'Hawks', isCustom: false },
  { id: 'trick', name: 'Trick', isCustom: false },
  { id: 'tel-rea', name: 'Tel-Rea', isCustom: false },
  { id: 'cly', name: 'Cly', isCustom: false },
  { id: 'luco', name: 'Luco', isCustom: false },
  { id: 'jae', name: 'Jae', isCustom: false },
  { id: 'kabb', name: 'Kabb', isCustom: false },
  { id: 'm-3vo', name: 'M-3VO', isCustom: false },
];

export function createInitialState() {
  return {
    version: 1,
    operators: DEFAULT_OPERATORS.map((operator) => ({ ...operator })),
    mission: {
      selectedOperatorIds: [],
      pairs: [],
      started: false,
    },
  };
}

export function createPairId(operatorA, operatorB) {
  return [operatorA.id, operatorB.id].sort().join('::');
}

export function generatePairs(operators) {
  const pairs = [];
  for (let first = 0; first < operators.length; first += 1) {
    for (let second = first + 1; second < operators.length; second += 1) {
      const operatorA = operators[first];
      const operatorB = operators[second];
      pairs.push({
        id: createPairId(operatorA, operatorB),
        operatorAId: operatorA.id,
        operatorBId: operatorB.id,
        assists: [false, false],
        otherActions: [false, false, false, false, false],
      });
    }
  }
  return pairs;
}

export function calculatePairInteractions(pair) {
  return pair.assists.filter(Boolean).length + pair.otherActions.filter(Boolean).length;
}

export function calculatePairXp(pair) {
  return pair.assists.filter(Boolean).length * 10 + pair.otherActions.filter(Boolean).length * 4;
}

export function calculateMissionXp(pairs) {
  return pairs.reduce((sum, pair) => sum + calculatePairXp(pair), 0);
}

export function calculateMaximumMissionXp(pairs) {
  return pairs.length * 40;
}

export function isPairComplete(pair) {
  return pair.assists.length === 2
    && pair.assists.every(Boolean)
    && pair.otherActions.length === 5
    && pair.otherActions.every(Boolean);
}

export function isMissionComplete(pairs) {
  return pairs.length > 0 && pairs.every(isPairComplete);
}

export function setPairInteraction(pair, kind, index, checked) {
  const field = kind === 'assist' ? 'assists' : kind === 'other' ? 'otherActions' : null;
  if (field === null || !Number.isInteger(index) || index < 0 || index >= pair[field].length) {
    return pair;
  }

  const nextValues = pair[field].map((value, itemIndex) => {
    if (checked && itemIndex <= index) return true;
    if (!checked && itemIndex >= index) return false;
    return value;
  });
  if (nextValues.every((value, itemIndex) => value === pair[field][itemIndex])) return pair;

  return {
    ...pair,
    [field]: nextValues,
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isOperator(value) {
  return isRecord(value)
    && typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && typeof value.isCustom === 'boolean';
}

function isPair(value) {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.operatorAId === 'string'
    && typeof value.operatorBId === 'string'
    && value.operatorAId !== value.operatorBId
    && value.id === [value.operatorAId, value.operatorBId].sort().join('::')
    && Array.isArray(value.assists)
    && value.assists.length === 2
    && value.assists.every((item) => typeof item === 'boolean')
    && Array.isArray(value.otherActions)
    && value.otherActions.length === 5
    && value.otherActions.every((item) => typeof item === 'boolean');
}

export function isValidSavedState(value) {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.operators) || !isRecord(value.mission)) {
    return false;
  }

  const { operators, mission } = value;
  if (!operators.every(isOperator)) return false;

  const operatorIds = operators.map((operator) => operator.id);
  const operatorNames = operators.map((operator) => operator.name.trim().toLocaleLowerCase());
  if (new Set(operatorIds).size !== operatorIds.length || new Set(operatorNames).size !== operatorNames.length) {
    return false;
  }

  if (!Array.isArray(mission.selectedOperatorIds)
    || mission.selectedOperatorIds.length > 4
    || !mission.selectedOperatorIds.every((id) => typeof id === 'string' && operatorIds.includes(id))
    || new Set(mission.selectedOperatorIds).size !== mission.selectedOperatorIds.length
    || typeof mission.started !== 'boolean'
    || !Array.isArray(mission.pairs)
    || !mission.pairs.every(isPair)) {
    return false;
  }

  if (!mission.started) return mission.pairs.length === 0;
  if (mission.selectedOperatorIds.length < 2) return false;

  const selectedOperators = mission.selectedOperatorIds.map((id) => operators.find((operator) => operator.id === id));
  const expectedPairs = generatePairs(selectedOperators);
  return mission.pairs.length === expectedPairs.length
    && mission.pairs.every((pair, index) => {
      const expected = expectedPairs[index];
      return pair.id === expected.id
        && pair.operatorAId === expected.operatorAId
        && pair.operatorBId === expected.operatorBId;
    });
}
