import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { createInitialState, generatePairs, SESSION_STORAGE_KEY } from './bondTracker';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.confirm = jest.fn(() => true);
});

test('requires two operators and creates the selected pair', () => {
  render(<App />);

  expect(screen.getByRole('button', { name: /start mission/i })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Hawks'));
  fireEvent.click(screen.getByLabelText('Trick'));
  fireEvent.click(screen.getByRole('button', { name: /start mission/i }));

  expect(screen.getByRole('heading', { name: 'Hawks + Trick' })).toBeInTheDocument();
  expect(screen.queryByText('OPERATOR PAIR')).not.toBeInTheDocument();
  expect(screen.getByText('0', { selector: '.pair-xp strong' })).toBeInTheDocument();
  expect(screen.queryByText('MISSION IN PROGRESS')).not.toBeInTheDocument();
  expect(screen.queryByText('ACTIVE MISSION')).not.toBeInTheDocument();
  expect(screen.queryByText('Mission summary')).not.toBeInTheDocument();
  expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  expect(screen.getByRole('progressbar', { name: 'Overall mission Bond XP progress' })).toBeInTheDocument();
  expect(screen.queryByText(/PROGRESS STAYS ON THIS DEVICE/i)).not.toBeInTheDocument();
});

test('shows the pair cap by the total and hides category XP subtotals', () => {
  render(<App />);
  fireEvent.click(screen.getByLabelText('Hawks'));
  fireEvent.click(screen.getByLabelText('Trick'));
  fireEvent.click(screen.getByRole('button', { name: /start mission/i }));

  const pairCard = screen.getByRole('article');
  expect(within(pairCard).queryByText(/\/ 20 XP/)).not.toBeInTheDocument();
  expect(within(pairCard).queryByText(/XP remaining this mission/i)).not.toBeInTheDocument();
  expect(within(pairCard).queryByRole('contentinfo')).not.toBeInTheDocument();
  expect(within(pairCard).queryByLabelText('Pair XP cap reached')).not.toBeInTheDocument();

  [1, 2].forEach((index) => {
    fireEvent.click(screen.getByLabelText(`Hawks and Trick, Assist ${index}, plus 10 XP`));
  });
  [1, 2, 3, 4, 5].forEach((index) => {
    fireEvent.click(screen.getByLabelText(`Hawks and Trick, Buffs ${index}, plus 4 XP`));
  });

  expect(within(pairCard).getByText('40', { selector: '.pair-xp strong' })).toBeInTheDocument();
  expect(within(pairCard).getByLabelText('Pair XP cap reached')).toHaveTextContent('MAX');
});

test('checks earlier items and clears later items when toggled, without number labels', () => {
  render(<App />);
  fireEvent.click(screen.getByLabelText('Hawks'));
  fireEvent.click(screen.getByLabelText('Trick'));
  fireEvent.click(screen.getByRole('button', { name: /start mission/i }));

  const buffs = screen.getByRole('region', { name: 'Buffs' });
  fireEvent.click(within(buffs).getByLabelText('Hawks and Trick, Buffs 4, plus 4 XP'));
  [1, 2, 3, 4].forEach((index) => {
    expect(within(buffs).getByLabelText(`Hawks and Trick, Buffs ${index}, plus 4 XP`)).toBeChecked();
  });
  expect(within(buffs).getByLabelText('Hawks and Trick, Buffs 5, plus 4 XP')).not.toBeChecked();

  fireEvent.click(within(buffs).getByLabelText('Hawks and Trick, Buffs 2, plus 4 XP'));
  expect(within(buffs).getByLabelText('Hawks and Trick, Buffs 1, plus 4 XP')).toBeChecked();
  [2, 3, 4, 5].forEach((index) => {
    expect(within(buffs).getByLabelText(`Hawks and Trick, Buffs ${index}, plus 4 XP`)).not.toBeChecked();
  });
  expect(buffs.querySelector('.interaction-name')).toBeNull();
});

test('provides accessible help for qualifying Assist and support actions', () => {
  render(<App />);
  fireEvent.click(screen.getByLabelText('Hawks'));
  fireEvent.click(screen.getByLabelText('Trick'));
  fireEvent.click(screen.getByRole('button', { name: /start mission/i }));

  const assistHelp = screen.getByLabelText('About Assist Bond XP');
  fireEvent.click(assistHelp);
  expect(assistHelp).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText(/as soon as the Assist is requested/i)).toBeInTheDocument();
  expect(screen.getByText(/Scoundrel ultimate/i)).toBeInTheDocument();

  const otherHelp = screen.getByLabelText('About Buffs Bond XP');
  fireEvent.click(otherHelp);
  expect(otherHelp).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText(/Hawks’ PICO-5/i)).toBeInTheDocument();
  expect(screen.getByText(/Medic’s Morale Boost and an Astromech’s Coordinated Support/i)).toBeInTheDocument();
  expect(screen.getByText(/A–B, A–C, and A–D/i)).toBeInTheDocument();
  expect(screen.getByText(/grenade thrown at an ally does not count/i)).toBeInTheDocument();
});

test('tracks reversible interactions in the current tab session', () => {
  const view = render(<App />);
  fireEvent.click(screen.getByLabelText('Hawks'));
  fireEvent.click(screen.getByLabelText('Trick'));
  fireEvent.click(screen.getByRole('button', { name: /start mission/i }));

  fireEvent.click(screen.getByLabelText('Hawks and Trick, Assist 1, plus 10 XP'));
  fireEvent.click(screen.getByLabelText('Hawks and Trick, Buffs 3, plus 4 XP'));

  const pairCard = screen.getByRole('article');
  expect(within(pairCard).getByText('22', { selector: '.pair-xp strong' })).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Hawks and Trick, Assist 1, plus 10 XP'));
  expect(within(pairCard).getByText('12', { selector: '.pair-xp strong' })).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Hawks and Trick, Assist 1, plus 10 XP'));

  expect(screen.getByLabelText('Hawks and Trick, Assist 1, plus 10 XP')).toBeChecked();

  view.unmount();
  render(<App />);
  expect(screen.getByLabelText('Hawks and Trick, Assist 1, plus 10 XP')).toBeChecked();
  expect(JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).mission.pairs[0].otherActions[2]).toBe(true);
  expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  expect(screen.queryByText('MISSION TURN')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /next turn/i })).not.toBeInTheDocument();
});

test('allows custom operators and rejects duplicate names', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /custom operator/i }));
  fireEvent.change(screen.getByLabelText('Operator name'), { target: { value: 'Hawks' } });
  fireEvent.click(screen.getByRole('button', { name: /add operator/i }));
  expect(screen.getByRole('alert')).toHaveTextContent('An operator with this name already exists.');

  fireEvent.change(screen.getByLabelText('Operator name'), { target: { value: 'Echo' } });
  fireEvent.click(screen.getByRole('button', { name: /add operator/i }));
  expect(screen.getByLabelText(/^Echo/)).toBeInTheDocument();
  expect(screen.getByLabelText(/^Echo/)).toBeChecked();
});

test('starting a new mission resets interactions and keeps the selected operators', () => {
  render(<App />);
  fireEvent.click(screen.getByLabelText('Hawks'));
  fireEvent.click(screen.getByLabelText('Trick'));
  fireEvent.click(screen.getByRole('button', { name: /start mission/i }));
  fireEvent.click(screen.getByLabelText('Hawks and Trick, Assist 1, plus 10 XP'));
  fireEvent.click(screen.getByRole('button', { name: /new mission/i }));

  expect(window.confirm).toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'Hawks + Trick' })).toBeInTheDocument();
  expect(screen.getByLabelText('Hawks and Trick, Assist 1, plus 10 XP')).not.toBeChecked();
  expect(screen.getByText('0', { selector: '.pair-xp strong' })).toBeInTheDocument();
});

test('discards corrupted saved data and starts from a clean selection', () => {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: 1, operators: 'invalid' }));
  render(<App />);

  expect(screen.getByRole('status')).toHaveTextContent('Unreadable saved mission data was cleared.');
  expect(screen.getByRole('button', { name: /start mission/i })).toBeDisabled();
});

test('clears previous persistent progress instead of restoring it', () => {
  const previousState = createInitialState();
  previousState.mission = {
    selectedOperatorIds: ['hawks', 'trick'],
    pairs: generatePairs(previousState.operators.slice(0, 2)).map((pair) => ({
      ...pair,
      assists: [true, false],
    })),
    started: true,
  };
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(previousState));

  render(<App />);

  expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  expect(screen.getByRole('button', { name: /start mission/i })).toBeDisabled();
  expect(screen.queryByRole('heading', { name: 'Hawks + Trick' })).not.toBeInTheDocument();
});

test('keeps saved mission progress while dropping legacy turn data', () => {
  const previousState = createInitialState();
  const selectedOperatorIds = ['hawks', 'trick'];
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    ...previousState,
    mission: {
      turn: 4,
      selectedOperatorIds,
      pairs: generatePairs(previousState.operators.slice(0, 2)).map((pair) => ({
        ...pair,
        assists: [true, false],
      })),
      started: true,
    },
  }));

  render(<App />);

  const savedMission = JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).mission;
  expect(savedMission.turn).toBeUndefined();
  expect(savedMission.pairs[0].assists).toEqual([true, false]);
  expect(screen.queryByText('MISSION TURN')).not.toBeInTheDocument();
});

test('continues working in memory when session storage cannot save', async () => {
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage unavailable');
  });

  render(<App />);
  expect(await screen.findByText('Progress cannot be kept for this tab session in this browser.')).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Hawks'));
  fireEvent.click(screen.getByLabelText('Trick'));
  fireEvent.click(screen.getByRole('button', { name: /start mission/i }));
  expect(screen.getByRole('heading', { name: 'Hawks + Trick' })).toBeInTheDocument();
  setItem.mockRestore();
});
