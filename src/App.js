import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './App.css';
import {
  calculateMaximumMissionXp,
  calculateMissionXp,
  calculatePairXp,
  createInitialState,
  generatePairs,
  isPairComplete,
  isMissionComplete,
  isValidSavedState,
  setPairInteraction,
  SESSION_STORAGE_KEY,
} from './bondTracker';

function loadInitialState() {
  let saved;
  let legacyDataCleanupFailed = false;

  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    legacyDataCleanupFailed = true;
  }

  try {
    saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return {
      state: createInitialState(),
      persistenceAvailable: false,
      recoveredCorruptData: false,
      legacyDataCleanupFailed,
    };
  }

  if (saved === null) {
    return {
      state: createInitialState(),
      persistenceAvailable: true,
      recoveredCorruptData: false,
      legacyDataCleanupFailed,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return discardSavedState(legacyDataCleanupFailed);
  }

  if (!isValidSavedState(parsed)) {
    return discardSavedState(legacyDataCleanupFailed);
  }

  return {
    state: {
      ...parsed,
      mission: {
        selectedOperatorIds: parsed.mission.selectedOperatorIds,
        pairs: parsed.mission.pairs,
        started: parsed.mission.started,
      },
    },
    persistenceAvailable: true,
    recoveredCorruptData: false,
    legacyDataCleanupFailed,
  };
}

function discardSavedState(legacyDataCleanupFailed) {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return {
      state: createInitialState(),
      persistenceAvailable: true,
      recoveredCorruptData: true,
      legacyDataCleanupFailed,
    };
  } catch {
    return {
      state: createInitialState(),
      persistenceAvailable: false,
      recoveredCorruptData: true,
      legacyDataCleanupFailed,
    };
  }
}

function ProgressBar({ value, max, label }) {
  const percentage = max === 0 ? 0 : Math.round((value / max) * 100);

  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max} XP, ${percentage}%`}
    >
      <span className="progress-fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}

function CategoryHelp({ kind, pairId }) {
  const isAssist = kind === 'assist';
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const tooltipId = `help-${pairId}-${kind}`;
  const buttonRef = useRef(null);

  const positionTooltip = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonBounds = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(280, Math.max(0, window.innerWidth - 32));
    const left = Math.max(16, Math.min(buttonBounds.left, window.innerWidth - tooltipWidth - 16));
    setTooltipPosition({ left, top: buttonBounds.bottom + 7 });
  }, []);

  useLayoutEffect(() => {
    if (isOpen) positionTooltip();
  }, [isOpen, positionTooltip]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!(event.target instanceof Node)) return;
      if (!event.target.closest('.category-help')) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    function handleViewportChange() {
      if (isOpen) positionTooltip();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, positionTooltip]);

  return (
    <div className={`category-help${isOpen ? ' category-help--open' : ''}`}>
      <button
        ref={buttonRef}
        className="category-help-button"
        type="button"
        aria-label={`About ${isAssist ? 'Assist' : 'Buffs'} Bond XP`}
        aria-expanded={isOpen}
        aria-controls={tooltipId}
        aria-describedby={tooltipId}
        title={`About ${isAssist ? 'Assist' : 'Buffs'} Bond XP`}
        onMouseEnter={positionTooltip}
        onFocus={positionTooltip}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true">?</span>
      </button>
      <div
        id={tooltipId}
        className="category-tooltip"
        role="tooltip"
        style={tooltipPosition ? {
          left: `${tooltipPosition.left}px`,
          top: `${tooltipPosition.top}px`,
        } : undefined}
      >
        {isAssist ? (
          <>
            <p className="tooltip-kicker">ASSIST · +10 XP</p>
            <p>Request another Operator assist your next attack. Both Operators get 10 Bond XP as soon as the Assist is requested. Each pair can earn this twice per mission.</p>
          </>
        ) : (
          <>
            <p className="tooltip-kicker">BUFFS · +4 XP EACH</p>
            <p>Healing Stims, Combat Stims, Hawks’ PICO-5, and Astromech’s Built-In Commlink.</p>
            <div className="buff-tooltip-icons" aria-label="Buff examples">
              <div className="buff-tooltip-icon">
                <img src={`${process.env.PUBLIC_URL}/operator-profiles/healing-stim.png`} alt="" />
                <span>Healing Stim</span>
              </div>
              <div className="buff-tooltip-icon">
                <img src={`${process.env.PUBLIC_URL}/operator-profiles/combat-stim.png`} alt="" />
                <span>Combat Stim</span>
              </div>
              <div className="buff-tooltip-icon">
                <img src={`${process.env.PUBLIC_URL}/operator-profiles/pico-5.png`} alt="" />
                <span>PICO-5</span>
              </div>
              <div className="buff-tooltip-icon">
                <img src={`${process.env.PUBLIC_URL}/operator-profiles/commlink.png`} alt="" />
                <span>Built-In Commlink</span>
              </div>
            </div>
            <p><strong>Class ultimates:</strong> Medic’s Morale Boost and Astromech’s Coordinated Support grant XP to every ally who receives the buff.</p>
            <div className="buff-tooltip-icons" aria-label="Buff examples">
              <div className="buff-tooltip-icon">
                <img src={`${process.env.PUBLIC_URL}/operator-profiles/morale-boost.png`} alt="" />
                <span>Morale Boost</span>
              </div>
              <div className="buff-tooltip-icon">
                <img src={`${process.env.PUBLIC_URL}/operator-profiles/coordinated-support.png`} alt="" />
                <span>Coordinated Support</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InteractionGroup({ pair, kind, title, xpPerAction, checkedItems, onToggle }) {
  return (
    <section className="interaction-group" aria-label={title}>
      <div className="category-heading">
        <div className="category-title">
          {kind === 'assist' && (
            <img
              className="assist-symbol"
              src={`${process.env.PUBLIC_URL}/operator-profiles/assist-symbol.svg`}
              alt=""
              aria-hidden="true"
            />
          )}
          <h3>{title}</h3>
          <CategoryHelp kind={kind} pairId={pair.id} />
        </div>
      </div>
      <div className="interaction-list">
        {checkedItems.map((checked, index) => (
          <label className="interaction-option" key={`${kind}-${index}`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onToggle(pair, kind, index, event.target.checked)}
              aria-label={`${pair.operatorAName} and ${pair.operatorBName}, ${title} ${index + 1}, plus ${xpPerAction} XP`}
            />
            <span className="custom-checkbox" aria-hidden="true" />
            <span className="interaction-xp">+{xpPerAction} XP</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function PairCard({ pair, onToggle }) {
  const totalXp = calculatePairXp(pair);
  const complete = isPairComplete(pair);

  return (
    <article className={`pair-card${complete ? ' pair-card--complete' : ''}`}>
      <div className="pair-heading">
        <div>
          <h2 className="pair-operators" aria-label={`${pair.operatorAName} + ${pair.operatorBName}`}>
            <span className="pair-operator">
              {pair.operatorAProfileImage && <img src={pair.operatorAProfileImage} alt="" />}
              <span>{pair.operatorAName}</span>
            </span>
            <span className="pair-operator-separator" aria-hidden="true">+</span>
            <span className="pair-operator">
              {pair.operatorBProfileImage && <img src={pair.operatorBProfileImage} alt="" />}
              <span>{pair.operatorBName}</span>
            </span>
          </h2>
        </div>
        <div className="pair-xp">
          <strong>{totalXp}</strong>
          <span>/ 40 XP</span>
          {complete && <span className="cap-label" aria-label="Pair XP cap reached">MAX</span>}
        </div>
      </div>

      <InteractionGroup
        pair={pair}
        kind="assist"
        title="Assist"
        xpPerAction={10}
        checkedItems={pair.assists}
        onToggle={onToggle}
      />

      <InteractionGroup
        pair={pair}
        kind="other"
        title="Buffs"
        xpPerAction={4}
        checkedItems={pair.otherActions}
        onToggle={onToggle}
      />

    </article>
  );
}

const OPERATOR_PROFILE_IMAGES = {
  hawks: `${process.env.PUBLIC_URL}/operator-profiles/hawks.png`,
  kabb: `${process.env.PUBLIC_URL}/operator-profiles/kabb.png`,
  cly: `${process.env.PUBLIC_URL}/operator-profiles/cly.png`,
  luco: `${process.env.PUBLIC_URL}/operator-profiles/luco.png`,
  trick: `${process.env.PUBLIC_URL}/operator-profiles/trick.png`,
  jae: `${process.env.PUBLIC_URL}/operator-profiles/jae.png`,
  'm-3vo': `${process.env.PUBLIC_URL}/operator-profiles/m-3vo.png`,
  'tel-rea': `${process.env.PUBLIC_URL}/operator-profiles/tel-rea.png`,
};

function getOperatorProfileImage(operatorId) {
  return OPERATOR_PROFILE_IMAGES[operatorId]
    || (operatorId.startsWith('custom-') ? `${process.env.PUBLIC_URL}/operator-profiles/custom.svg` : null);
}

function OperatorSelector({ operators, selectedIds, onSelectionChange, onStart, onAddOperator }) {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState('');

  function toggleOperator(operatorId) {
    if (selectedIds.includes(operatorId)) {
      onSelectionChange(selectedIds.filter((id) => id !== operatorId));
    } else if (selectedIds.length < 4) {
      onSelectionChange([...selectedIds, operatorId]);
    }
  }

  function addCustomOperator(event) {
    event.preventDefault();
    const name = customName.trim();

    if (!name) {
      setCustomError('Enter an operator name.');
      return;
    }

    if (operators.some((operator) => operator.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setCustomError('An operator with this name already exists.');
      return;
    }

    const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    onAddOperator({ id, name, isCustom: true });
    setCustomName('');
    setCustomError('');
    setIsAddingCustom(false);
  }

  return (
    <main className="selection-layout">
      <section className="selection-panel">
        <div className="section-intro">
          <p className="eyebrow">MISSION SETUP</p>
          <h1>Select your operators</h1>
        </div>

        <div className="selection-status" aria-live="polite">
          <span>{selectedIds.length < 2 ? 'Select at least 2 to begin' : `${selectedIds.length * (selectedIds.length - 1) / 2} ${selectedIds.length === 2 ? 'pair' : 'pairs'} to track`}</span>
        </div>

        <div className="operator-list" role="group" aria-label="Available operators">
          {operators.map((operator) => {
            const selected = selectedIds.includes(operator.id);
            const disabled = !selected && selectedIds.length >= 4;
            const profileImage = getOperatorProfileImage(operator.id);

            return (
              <label className={`operator-option${selected ? ' operator-option--selected' : ''}${disabled ? ' operator-option--disabled' : ''}`} key={operator.id}>
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={disabled}
                  onChange={() => toggleOperator(operator.id)}
                />
                <span className="custom-checkbox" aria-hidden="true" />
                {profileImage && <img className="operator-avatar" src={profileImage} alt="" />}
                <span className="operator-name">{operator.name}</span>
                {operator.isCustom && <span className="custom-tag">CUSTOM</span>}
                {selected && <span className="selected-mark" aria-hidden="true">✓</span>}
              </label>
            );
          })}
        </div>

        {isAddingCustom ? (
          <form className="custom-operator-form" onSubmit={addCustomOperator}>
            <label htmlFor="custom-operator-name">Operator name</label>
            <input
              id="custom-operator-name"
              value={customName}
              onChange={(event) => {
                setCustomName(event.target.value);
                setCustomError('');
              }}
              maxLength={32}
              autoFocus
            />
            {customError && <p className="field-error" role="alert">{customError}</p>}
            <div className="form-actions">
              <button className="button button--quiet" type="button" onClick={() => {
                setIsAddingCustom(false);
                setCustomName('');
                setCustomError('');
              }}>Cancel</button>
              <button className="button button--secondary" type="submit">Add operator</button>
            </div>
          </form>
        ) : (
          <button className="add-custom-button" type="button" onClick={() => setIsAddingCustom(true)}>
            <span aria-hidden="true">＋</span> Custom operator
          </button>
        )}

        <button className="button button--primary start-button" type="button" disabled={selectedIds.length < 2} onClick={onStart}>
          Start mission <span aria-hidden="true">→</span>
        </button>
      </section>
    </main>
  );
}

function App() {
  const [loaded] = useState(loadInitialState);
  const [appState, setAppState] = useState(loaded.state);
  const [persistenceAvailable, setPersistenceAvailable] = useState(loaded.persistenceAvailable);
  const [announcement, setAnnouncement] = useState('');
  const { operators, mission } = appState;

  useEffect(() => {
    let available = true;
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(appState));
    } catch {
      available = false;
    }
    setPersistenceAvailable((current) => current === available ? current : available);
  }, [appState]);

  const operatorById = new Map(operators.map((operator) => [operator.id, operator]));
  const selectedOperators = mission.selectedOperatorIds.map((id) => operatorById.get(id)).filter(Boolean);
  const pairs = mission.pairs.map((pair) => ({
    ...pair,
    operatorAName: operatorById.get(pair.operatorAId)?.name || 'Unknown operator',
    operatorBName: operatorById.get(pair.operatorBId)?.name || 'Unknown operator',
    operatorAProfileImage: getOperatorProfileImage(pair.operatorAId),
    operatorBProfileImage: getOperatorProfileImage(pair.operatorBId),
  }));
  const xp = calculateMissionXp(pairs);
  const maxXp = calculateMaximumMissionXp(pairs);
  const complete = isMissionComplete(pairs);
  const progress = maxXp === 0 ? 0 : Math.round((xp / maxXp) * 100);

  function updateMission(nextMission) {
    setAppState((current) => ({ ...current, mission: nextMission }));
  }

  function updateSelectedOperators(selectedOperatorIds) {
    updateMission({ ...mission, selectedOperatorIds });
  }

  function addOperator(operator) {
    setAppState((current) => {
      const selectedOperatorIds = current.mission.selectedOperatorIds.length < 4
        ? [...current.mission.selectedOperatorIds, operator.id]
        : current.mission.selectedOperatorIds;
      return {
        ...current,
        operators: [...current.operators, operator],
        mission: { ...current.mission, selectedOperatorIds },
      };
    });
  }

  function startMission() {
    if (mission.selectedOperatorIds.length < 2 || mission.selectedOperatorIds.length > 4) return;
    const selected = mission.selectedOperatorIds.map((id) => operatorById.get(id)).filter(Boolean);
    if (selected.length !== mission.selectedOperatorIds.length) return;
    updateMission({
      selectedOperatorIds: mission.selectedOperatorIds,
      pairs: generatePairs(selected),
      started: true,
    });
    setAnnouncement(`Mission started with ${generatePairs(selected).length} operator pairs.`);
  }

  function toggleInteraction(pair, kind, index, checked) {
    const sourcePair = mission.pairs.find((item) => item.id === pair.id);
    if (!sourcePair) return;

    const updatedPair = setPairInteraction(sourcePair, kind, index, checked);
    if (updatedPair === sourcePair) return;

    const nextPairs = mission.pairs.map((item) => item.id === pair.id ? updatedPair : item);
    updateMission({
      ...mission,
      pairs: nextPairs,
    });

    const currentXp = calculatePairXp(updatedPair);
    const remaining = 40 - currentXp;
    if (isMissionComplete(nextPairs)) {
      setAnnouncement(`All Bond XP opportunities have been completed. ${calculateMissionXp(nextPairs)} of ${calculateMaximumMissionXp(nextPairs)} XP tracked.`);
    } else {
      setAnnouncement(`${pair.operatorAName} and ${pair.operatorBName}: ${kind === 'assist' ? 'Assist' : 'Other action'} ${index + 1} ${checked ? 'completed' : 'unchecked'}. ${currentXp} of 40 mission XP tracked; ${remaining} XP remaining.`);
    }
  }

  function startNewMission() {
    if (!window.confirm('Start a new mission? All Bond XP tracking for this mission will be cleared.')) return;
    const selected = mission.selectedOperatorIds.map((id) => operatorById.get(id)).filter(Boolean);
    updateMission({
      selectedOperatorIds: mission.selectedOperatorIds,
      pairs: generatePairs(selected),
      started: true,
    });
    setAnnouncement('New mission started. Your operator selection has been kept.');
  }

  function editOperators() {
    if (!window.confirm('Change operators? Changing operators will start a new mission tracker and clear the current Bond XP progress.')) return;
    updateMission({
      selectedOperatorIds: mission.selectedOperatorIds,
      pairs: [],
      started: false,
    });
    setAnnouncement('Operator selection ready. Starting a mission will clear the previous progress.');
  }

  if (!mission.started) {
    return (
      <div className="app-shell">
        <div className="page-frame">
          <header className="brand-header">
            <a className="brand" href="/" aria-label="Zero Company Bond XP Tracker home">
              <span className="brand-symbol" aria-hidden="true">ZC</span>
              <span><strong>ZERO COMPANY</strong><small>BOND XP TRACKER</small></span>
            </a>
          </header>
          {!persistenceAvailable && <p className="storage-notice" role="status">Progress cannot be kept in this browser.</p>}
          {loaded.recoveredCorruptData && <p className="storage-notice" role="status">Unreadable saved mission data was cleared. You can start a fresh mission.</p>}
          {loaded.legacyDataCleanupFailed && <p className="storage-notice" role="status">Previous persistent mission data could not be removed from this browser.</p>}
          <OperatorSelector
            operators={operators}
            selectedIds={mission.selectedOperatorIds}
            onSelectionChange={updateSelectedOperators}
            onStart={startMission}
            onAddOperator={addOperator}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="page-frame page-frame--tracker">
        <header className="brand-header">
          <a className="brand" href="/" aria-label="Zero Company Bond XP Tracker home">
            <span className="brand-symbol" aria-hidden="true">ZC</span>
            <span><strong>ZERO COMPANY</strong><small>BOND XP TRACKER</small></span>
          </a>
        </header>

        {!persistenceAvailable && <p className="storage-notice" role="status">Progress cannot be kept in this browser.</p>}
        {loaded.legacyDataCleanupFailed && <p className="storage-notice" role="status">Previous persistent mission data could not be removed from this browser.</p>}

        <main>
          <section className="mission-overview" aria-label="Mission progress">
            <div className="overview-top">
              <div>
                <h1>{complete ? 'All Bond XP tracked' : 'Mission Bond Experience Tracker'}</h1>
                <p className="squad-line">{selectedOperators.map((operator) => operator.name).join('  ·  ')}</p>
              </div>
              <div className="mission-xp">
                <strong>{xp}<span> / {maxXp}</span></strong>
                <span>BOND XP THIS MISSION</span>
              </div>
            </div>
            <ProgressBar value={xp} max={maxXp} label="Overall mission Bond XP progress" />
            <div className="overview-bottom">
              <span className={`progress-percentage${complete ? ' progress-percentage--complete' : ''}`}>
                {progress}%<span className="progress-percentage-label">complete</span>
              </span>
              <div className="mission-actions">
                <button className="button button--quiet" type="button" onClick={editOperators}>Change operators</button>
                <button className="button button--secondary" type="button" onClick={startNewMission}>New mission <span className="new-mission-icon" aria-hidden="true">↻</span></button>
              </div>
            </div>
          </section>

          <div className="pair-grid">
            {pairs.map((pair) => <PairCard key={pair.id} pair={pair} onToggle={toggleInteraction} />)}
          </div>

        </main>

        <div className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>
      </div>
    </div>
  );
}

export default App;
