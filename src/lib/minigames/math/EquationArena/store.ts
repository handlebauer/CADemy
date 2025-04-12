import { writable } from 'svelte/store';
import { GameStatus, type SpellType } from './types';
import { FIRE_DAMAGE } from './config';
import { OperationType } from './types';

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
	currentLevel: OperationType;
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
	isShieldActive: false,
	currentLevel: OperationType.ADDITION // Start with Addition
};

// 3. Store logic
function createArenaStore() {
	const { subscribe, set, update } = writable<ArenaState>(initialArenaState);

	// Helper to generate equations based on the current level
	const generateNewEquation = (level: OperationType): Partial<ArenaState> => {
		let num1: number, num2: number, answer: number;
		let equationString = '';

		switch (level) {
			case OperationType.ADDITION:
				num1 = Math.floor(Math.random() * 9) + 1; // 1-9
				num2 = Math.floor(Math.random() * 9) + 1; // 1-9
				answer = num1 + num2;
				equationString = `${num1} + ${num2} = ?`;
				break;
			case OperationType.SUBTRACTION:
				num1 = Math.floor(Math.random() * 18) + 1; // 1-18
				num2 = Math.floor(Math.random() * num1) + 1; // Ensure num2 <= num1 for non-negative result
				answer = num1 - num2;
				equationString = `${num1} - ${num2} = ?`;
				break;
			case OperationType.MULTIPLICATION:
				num1 = Math.floor(Math.random() * 9) + 1; // 1-9
				num2 = Math.floor(Math.random() * 9) + 1; // 1-9
				answer = num1 * num2;
				equationString = `${num1} × ${num2} = ?`; // Use multiplication symbol
				break;
			case OperationType.DIVISION:
				// Ensure integer division result
				answer = Math.floor(Math.random() * 9) + 1; // Result 1-9
				num2 = Math.floor(Math.random() * 9) + 1; // Divisor 1-9
				num1 = answer * num2;
				equationString = `${num1} ÷ ${num2} = ?`; // Use division symbol
				break;
			default:
				// Default to Addition if level is somehow invalid
				num1 = Math.floor(Math.random() * 9) + 1;
				num2 = Math.floor(Math.random() * 9) + 1;
				answer = num1 + num2;
				equationString = `${num1} + ${num2} = ?`;
				console.warn('Invalid level detected, defaulting to Addition.');
		}

		return {
			currentEquation: equationString,
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
				if (state.gameStatus !== GameStatus.PRE_GAME && state.gameStatus !== GameStatus.GAME_OVER)
					return state; // Allow restart from GAME_OVER

				// Reset core stats but keep level
				const resetState = {
					...initialArenaState,
					currentLevel:
						state.gameStatus === GameStatus.GAME_OVER ? OperationType.ADDITION : state.currentLevel // Reset level only if game over? Or keep progress? Keep progress for now. If restarting from GameOver, go to level 1.
				};

				return {
					...resetState,
					...generateNewEquation(resetState.currentLevel), // Use potentially reset level
					selectedSpell: state.selectedSpell || 'FIRE' // Keep selected spell if any, or default
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

		selectSpell: (spell: SpellType) => update((state) => ({ ...state, selectedSpell: spell })),

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
					selectedSpell: 'FIRE' as SpellType, // Default back to FIRE? Or keep selection? Let's default.
					lastAnswerCorrect: null,
					lastSpellCast: null,
					lastPlayerInput: ''
					// DO NOT ADVANCE LEVEL HERE - Wait for user action
				};
				return { ...tempState, ...generateNewEquation(state.currentLevel) }; // Generate based on current level
			}),

		advanceLevelAndStart: () =>
			update((state) => {
				// Only advance if victory occurred
				if (state.gameStatus !== GameStatus.GAME_OVER || state.playerHealth <= 0) {
					console.warn('Cannot advance level unless game was won.');
					return state;
				}

				const nextLevel = state.currentLevel + 1;

				// Check if there are more levels
				if (!OperationType[nextLevel]) {
					console.log('Max level reached!');
					// Optionally handle max level (e.g., stay on last level, show special message)
					// For now, let's just reset to level 1 or loop? Loop sounds more fun.
					const loopedLevel = OperationType.ADDITION;
					return {
						...initialArenaState, // Full reset like start game
						currentLevel: loopedLevel,
						...generateNewEquation(loopedLevel),
						selectedSpell: state.selectedSpell || 'FIRE'
					};
					// Or just stay on the last level:
					// return { ...state, resultMessage: "Max level reached! Play again?", gameStatus: GameStatus.PRE_GAME };
				}

				// Reset health, time for the new level, keep score? (Resetting all for now)
				const resetForNextLevel = {
					...initialArenaState,
					currentLevel: nextLevel,
					equationsSolvedCorrectly: state.equationsSolvedCorrectly // Keep score across levels? Yes.
				};

				return {
					...resetForNextLevel,
					...generateNewEquation(nextLevel),
					selectedSpell: state.selectedSpell || 'FIRE'
				};
			})
	};
}

export const arenaStore = createArenaStore();
