import { writable } from 'svelte/store';
import { GameStatus, type SpellType } from './types';
import { FIRE_DAMAGE } from './config';

// 1. State shape
export interface ArenaState {
	playerHealth: number;
	enemyHealth: number;
	gameTime: number;
	startTime: number;
	currentEquation: string;
	expectedAnswer: number;
	playerInput: string;
	selectedSpell: SpellType | null;
	gameStatus: GameStatus;
	resultMessage: string;
	lastAnswerCorrect: boolean | null;
	lastSpellCast: SpellType | null;
	lastPlayerInput: string;
	lastFullEquation: string;
	equationsSolvedCorrectly: number;
	isShieldActive: boolean;
}

// 2. Initial state
const initialArenaState: ArenaState = {
	playerHealth: 100,
	enemyHealth: 100,
	gameTime: 90,
	startTime: 90,
	currentEquation: '',
	expectedAnswer: 0,
	playerInput: '',
	selectedSpell: null,
	gameStatus: GameStatus.PRE_GAME,
	resultMessage: '',
	lastAnswerCorrect: null,
	lastSpellCast: null,
	lastPlayerInput: '',
	lastFullEquation: '',
	equationsSolvedCorrectly: 0,
	isShieldActive: false
};

// 3. Store logic
function createArenaStore() {
	const { subscribe, set, update } = writable<ArenaState>(initialArenaState);

	// Helper to generate equations (could be expanded based on level/difficulty)
	const generateNewEquation = (): Partial<ArenaState> => {
		// Level 1: Addition only (numbers 1-9)
		const num1 = Math.floor(Math.random() * 9) + 1;
		const num2 = Math.floor(Math.random() * 9) + 1;
		const answer = num1 + num2;
		return {
			currentEquation: `${num1} + ${num2} = ?`,
			expectedAnswer: answer,
			playerInput: '', // Reset input
			gameStatus: GameStatus.SOLVING,
			resultMessage: '' // Clear previous result
		};
	};

	return {
		subscribe,
		// --- Actions ---
		reset: () => set(initialArenaState),

		startGame: () =>
			update((state) => {
				if (state.gameStatus !== GameStatus.PRE_GAME) return state;

				return {
					...initialArenaState,
					...generateNewEquation(),
					selectedSpell: state.selectedSpell || 'FIRE'
				};
			}),

		tickTime: () =>
			update((state) => ({
				...state,
				gameTime: Math.max(0, state.gameTime - 1)
			})),

		setGameOver: (message: string) =>
			update((state) => ({
				...state,
				gameStatus: GameStatus.GAME_OVER,
				resultMessage: message
			})),

		damagePlayer: (amount: number) =>
			update((state) => {
				if (state.isShieldActive) {
					return { ...state, isShieldActive: false };
				} else {
					return {
						...state,
						playerHealth: Math.max(0, state.playerHealth - amount)
					};
				}
			}),

		selectSpell: (spell: SpellType) =>
			update((state) => {
				const newState = { ...state, selectedSpell: spell };
				if (state.gameStatus === GameStatus.RESULT) {
					return { ...newState, ...generateNewEquation() };
				}
				return newState;
			}),

		handleInput: (digit: number) =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING) return state;
				return { ...state, playerInput: state.playerInput + digit.toString() };
			}),

		clearInput: () =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING) return state;
				return { ...state, playerInput: '' };
			}),

		handleBackspace: () =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING || state.playerInput.length === 0) return state;
				return { ...state, playerInput: state.playerInput.slice(0, -1) };
			}),

		castSpell: () =>
			update((state) => {
				if (
					state.gameStatus !== GameStatus.SOLVING ||
					state.playerInput === '' ||
					!state.selectedSpell
				) {
					return state;
				}

				const isCorrect = parseInt(state.playerInput, 10) === state.expectedAnswer;
				let newEnemyHealth = state.enemyHealth;
				let message = '';
				let solvedCount = state.equationsSolvedCorrectly;
				let shieldActivated = state.isShieldActive;

				if (isCorrect) {
					message = 'Correct!';
					solvedCount++;
					if (state.selectedSpell === 'FIRE') {
						newEnemyHealth = Math.max(0, state.enemyHealth - FIRE_DAMAGE);
					} else if (state.selectedSpell === 'ICE') {
						shieldActivated = true;
					}
				} else {
					message = `Incorrect! (${state.expectedAnswer})`;
				}

				return {
					...state,
					enemyHealth: newEnemyHealth,
					gameStatus: GameStatus.RESULT,
					lastAnswerCorrect: isCorrect,
					lastSpellCast: state.selectedSpell,
					lastPlayerInput: state.playerInput,
					lastFullEquation: state.currentEquation,
					resultMessage: message,
					equationsSolvedCorrectly: solvedCount,
					isShieldActive: shieldActivated
				};
			}),

		prepareNextRound: () =>
			update((state) => {
				if (state.gameStatus !== GameStatus.RESULT) return state;
				const tempState = {
					...state,
					selectedSpell: 'FIRE' as SpellType,
					lastAnswerCorrect: null,
					lastSpellCast: null,
					lastPlayerInput: ''
				};
				return { ...tempState, ...generateNewEquation() };
			})
	};
}

export const arenaStore = createArenaStore();
