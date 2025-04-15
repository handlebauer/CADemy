import { writable } from 'svelte/store';
import { GameStatus, type SpellType } from './types';
import { FIRE_DAMAGE, grades, enemies } from './config';
import { OperationType } from './types';
import type { GradeLevel, GameMode, EnemyConfig, BonusConfig } from './types';
import { evaluateEquation } from './utils/math';
import { getActiveBonuses } from './bonuses';

// 1. State shape
export interface ArenaState {
	playerHealth: number;
	enemyHealth: number;
	gameTime: number;
	startTime: number;
	currentEquation: string; // For Solver mode display
	expectedAnswer: number; // For Solver mode calculation
	playerInput: string; // Current numerical ANSWER input (both modes)
	selectedSpell: SpellType | null;
	gameStatus: GameStatus;
	resultMessage: string;
	lastAnswerCorrect: boolean | null;
	lastSpellCast: SpellType | null;
	lastPlayerInput: string; // Last numerical answer submitted
	lastFullEquation: string; // Last full equation displayed/solved
	equationsSolvedCorrectly: number;
	isShieldActive: boolean;
	currentOperationType: OperationType; // Specific to solver mode equation generation
	currentLevelNumber: number; // 1, 2, 3...

	// Grade/Mode Selection
	selectedGrade: GradeLevel | null;
	gameMode: GameMode | null;

	// Enemy State
	currentEnemyId: string | null;
	currentEnemyConfig: EnemyConfig | null;

	// Bonuses State
	activeBonuses: BonusConfig[];

	// --- Crafter Mode State ---
	craftedEquationString: string; // Equation being built by the player
	isCraftingPhase: boolean; // true: building equation, false: providing answer
	evaluationError: string | null; // Store potential evaluation error message

	// --- Tutorial State ---
	tutorialStep: number; // 0 = not started/done, 1, 2, 3 = active steps
	needsCrafterTutorial: boolean; // Flag to indicate if tutorial should run

	// New state for allowed crafter characters
	allowedCrafterChars: string[] | null;

	// New state for craft validation
	isCraftedEquationValidForLevel: boolean;
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
	currentOperationType: OperationType.ADDITION,
	currentLevelNumber: 1,

	// Grade/Mode Selection
	selectedGrade: null,
	gameMode: null,

	// Enemy State
	currentEnemyId: null,
	currentEnemyConfig: null,

	// Bonuses State
	activeBonuses: [],

	// Crafter Mode State
	craftedEquationString: '',
	isCraftingPhase: false,
	evaluationError: null,

	// Tutorial State
	tutorialStep: 0,
	needsCrafterTutorial: true,

	// Initialize allowed chars
	allowedCrafterChars: null,

	// Initialize craft validation
	isCraftedEquationValidForLevel: false
};

// --- Helper Functions ---

// Maps level number (1-based) to OperationType for Solver mode
const getOperationTypeForLevel = (level: number): OperationType => {
	switch (level) {
		case 1:
			return OperationType.ADDITION;
		case 2:
			return OperationType.SUBTRACTION;
		case 3:
			return OperationType.MULTIPLICATION;
		case 4:
			return OperationType.DIVISION;
		default:
			return OperationType.ADDITION;
	}
};

// Helper to get allowed characters for Crafter mode based on level
const getAllowedCharsForCrafterLevel = (level: number): string[] => {
	const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
	switch (level) {
		case 1: // Order of Operations
			return [...numbers, '+', '-', '×', '(', ')'];
		case 2: // Fractions (using /)
			return [...numbers, '+', '-', '/'];
		case 3: // Decimal Operations
			return [...numbers, '+', '-', '×', '.'];
		default: // Default to level 1 rules or a base set? Let's default to level 1 for safety.
			console.warn(`Unknown crafter level ${level} for allowed chars, defaulting.`);
			return [...numbers, '+', '-', '×', '(', ')'];
	}
};

// Helper to validate crafted equation against level rules
const validateCraftedEquationForLevel = (equation: string, level: number): boolean => {
	const trimmedEquation = equation.trim();
	if (trimmedEquation === '') return false; // Always invalid if empty

	switch (level) {
		case 1: // Order of Operations: Must contain parentheses
			return trimmedEquation.includes('(') && trimmedEquation.includes(')');
		case 2: // Fractions: Must contain division symbol (/)
			return trimmedEquation.includes('/');
		case 3: // Decimal Operations: Must contain decimal point
			return trimmedEquation.includes('.');
		default:
			console.warn(`Unknown crafter level ${level} for validation, assuming valid.`);
			return true; // Allow submission for unknown levels?
	}
};

// Helper to generate equations for SOLVER mode
const generateSolverEquation = (levelNumber: number): Partial<ArenaState> => {
	const operationType = getOperationTypeForLevel(levelNumber);
	let num1: number, num2: number, answer: number;
	let equationString = '';

	switch (operationType) {
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
			answer = Math.floor(Math.random() * 9) + 1; // Result 1-9
			num2 = Math.floor(Math.random() * 9) + 1; // Divisor 1-9
			num1 = answer * num2;
			equationString = `${num1} ÷ ${num2} = ?`; // Use division symbol
			break;
		default:
			num1 = Math.floor(Math.random() * 9) + 1;
			num2 = Math.floor(Math.random() * 9) + 1;
			answer = num1 + num2;
			equationString = `${num1} + ${num2} = ?`;
			console.warn('Invalid operation type in generateSolverEquation');
	}

	return {
		currentOperationType: operationType,
		currentEquation: equationString,
		expectedAnswer: answer,
		playerInput: '', // Reset answer input
		gameStatus: GameStatus.SOLVING,
		resultMessage: '',
		evaluationError: null
	};
};

// 3. Store logic
function createArenaStore() {
	const { subscribe, set, update } = writable<ArenaState>(initialArenaState);

	// --- Basic Validation Helpers for Crafter Input ---
	const isOperator = (char: string): boolean => ['+', '-', '×', '÷'].includes(char);

	// Helper function to prepare the next round (used by advanceTutorial)
	const prepareNextRoundInternal = (state: ArenaState): ArenaState => {
		const baseNextRoundState: Partial<ArenaState> = {
			playerInput: '',
			selectedSpell: state.selectedSpell || 'FIRE',
			lastAnswerCorrect: null,
			lastSpellCast: null,
			lastPlayerInput: '',
			lastFullEquation: '',
			resultMessage: '',
			activeBonuses: [],
			evaluationError: null
		};
		switch (state.gameMode) {
			case 'solver':
				return {
					...(state as ArenaState),
					...baseNextRoundState,
					...generateSolverEquation(state.currentLevelNumber)
				};
			case 'crafter':
				return {
					...(state as ArenaState),
					...baseNextRoundState,
					gameStatus: GameStatus.SOLVING,
					isCraftingPhase: true,
					craftedEquationString: ''
					// No need to update allowedChars here, it's set at level start
				};
			default:
				console.error('Unknown game mode');
				return state;
		}
	};

	return {
		subscribe,
		// --- Actions ---

		reset: () =>
			update((state) => ({
				...initialArenaState,
				needsCrafterTutorial: state.needsCrafterTutorial,
				allowedCrafterChars: null, // Reset allowed chars
				isCraftedEquationValidForLevel: false // Reset validation
			})), // Keep tutorial flag on simple reset
		fullReset: () => set(initialArenaState), // Add a way to fully reset including tutorial flag

		setGrade: (grade: GradeLevel) =>
			update((state) => {
				const gradeConfig = grades.find((g) => g.grade === grade);
				if (!gradeConfig) {
					console.error(`Configuration for grade ${grade} not found!`);
					return state;
				}
				return { ...state, selectedGrade: grade, gameMode: gradeConfig.mode };
			}),

		setGameMode: (mode: GameMode) => update((state) => ({ ...state, gameMode: mode })),

		setCurrentEnemy: (enemyId: string) =>
			update((state) => {
				const enemyConfig = enemies.find((e) => e.id === enemyId);
				if (!enemyConfig) {
					console.error(`Enemy config for ID ${enemyId} not found!`);
					return { ...state, currentEnemyId: null, currentEnemyConfig: null };
				}
				return { ...state, currentEnemyId: enemyId, currentEnemyConfig: enemyConfig };
			}),

		startGame: () =>
			update((state): ArenaState => {
				if (!state.selectedGrade || !state.gameMode) {
					console.error('Cannot start game: Grade and Mode not selected.');
					return state;
				}
				if (state.gameStatus !== GameStatus.PRE_GAME && state.gameStatus !== GameStatus.GAME_OVER) {
					console.warn('Game already in progress or invalid state for startGame');
					return state;
				}

				const startingLevel = 1;
				const firstEnemy = enemies.find(
					(e) => e.mode === state.gameMode && e.level === startingLevel
				);

				if (!firstEnemy) {
					console.error(`Cannot find level ${startingLevel} enemy for mode ${state.gameMode}`);
					return initialArenaState;
				}

				const baseStartState: Partial<ArenaState> = {
					...initialArenaState,
					selectedGrade: state.selectedGrade,
					gameMode: state.gameMode,
					currentLevelNumber: startingLevel,
					currentEnemyId: firstEnemy.id,
					currentEnemyConfig: firstEnemy,
					enemyHealth: firstEnemy.health,
					playerHealth: 100,
					gameTime: 90,
					startTime: 90,
					selectedSpell: state.selectedSpell || 'FIRE',
					tutorialStep: 0,
					needsCrafterTutorial: state.needsCrafterTutorial
				};

				switch (state.gameMode) {
					case 'solver':
						return { ...(baseStartState as ArenaState), ...generateSolverEquation(startingLevel) };
					case 'crafter': {
						// If tutorial needed, start it, otherwise start normally
						const startTutorial = state.needsCrafterTutorial;
						const allowedChars = getAllowedCharsForCrafterLevel(startingLevel);
						return {
							...(baseStartState as ArenaState),
							gameStatus: startTutorial ? GameStatus.TUTORIAL : GameStatus.SOLVING, // Use TUTORIAL status
							tutorialStep: startTutorial ? 1 : 0,
							isCraftingPhase: true,
							craftedEquationString: '',
							allowedCrafterChars: allowedChars, // Set allowed chars for level 1
							isCraftedEquationValidForLevel: false // Initial validation state
						};
					}
					default:
						console.error('Unknown game mode');
						return initialArenaState;
				}
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
				resultMessage: message,
				activeBonuses: [],
				isCraftingPhase: false, // Ensure not in crafting phase on game over
				evaluationError: null,
				tutorialStep: 0 /* End tutorial on game over */
			})),

		receivePlayerDamage: (amount: number) =>
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

		damageEnemy: (damageAmount: number) =>
			update((state) => {
				if (!state.currentEnemyConfig) return state;
				return {
					...state,
					enemyHealth: Math.max(0, state.enemyHealth - damageAmount)
				};
			}),

		selectSpell: (spell: SpellType) => update((state) => ({ ...state, selectedSpell: spell })),

		// --- Input Handling (Handles BOTH modes, dispatched appropriately from UI) ---
		// For Crafter mode, these handle the ANSWER input phase
		handleInput: (
			value: number | string // Accept number or string
		) =>
			update((state) => {
				const char = value.toString();

				// Basic decimal validation: prevent multiple decimals
				if (char === '.' && state.playerInput.includes('.')) {
					return state; // Do nothing if decimal already exists
				}

				// Validate / input for Crafter Level 2 Answer Phase
				if (
					char === '/' &&
					state.gameMode === 'crafter' &&
					state.currentLevelNumber === 2 &&
					!state.isCraftingPhase
				) {
					// Allow / only if:
					// 1. It's not already present in the input
					// 2. The input is not empty (cannot start with /)
					// 3. The previous character isn't already '/' (belt and suspenders)
					if (
						state.playerInput.includes('/') ||
						state.playerInput.length === 0 ||
						state.playerInput.slice(-1) === '/'
					) {
						return state; // Invalid / input
					}
				}

				// Limit answer input length (e.g., 5 characters including decimal/slash)
				if (state.playerInput.length >= 5) {
					return state;
				}
				return { ...state, playerInput: state.playerInput + char }; // Append string value
			}),

		clearInput: () => update((state) => ({ ...state, playerInput: '' })),
		handleBackspace: () =>
			update((state) => {
				if (state.playerInput.length > 0) {
					return { ...state, playerInput: state.playerInput.slice(0, -1) };
				}
				return state;
			}),

		// --- Crafter Mode Equation Input Actions ---
		appendToCraftedEquation: (char: string) =>
			update((state) => {
				// Ignore if not in crafting phase
				if (!state.isCraftingPhase || state.gameStatus !== GameStatus.SOLVING) return state;

				// Check if character is allowed for the current level
				if (state.allowedCrafterChars && !state.allowedCrafterChars.includes(char)) {
					console.log(`Character '${char}' not allowed for level ${state.currentLevelNumber}`);
					return state; // Disallow character
				}

				const currentEq = state.craftedEquationString;

				// Limit numbers within the equation to 2 digits
				if (/\d/.test(char)) {
					// Check if the input character is a digit
					const match = currentEq.match(/(\d+)$/); // Find the last sequence of digits
					if (match && match[1].length >= 2) {
						return state; // Do not append if the last number is already 2 digits or more
					}
				}

				// TODO: Add more validation here? (e.g., prevent consecutive operators, leading zeros?)

				const newEquation = currentEq + char;
				const isValid = validateCraftedEquationForLevel(newEquation, state.currentLevelNumber);

				return {
					...state,
					craftedEquationString: newEquation,
					isCraftedEquationValidForLevel: isValid
				};
			}),

		clearCraftedEquation: () =>
			update((state) => {
				if (
					state.gameStatus !== GameStatus.SOLVING ||
					state.gameMode !== 'crafter' ||
					!state.isCraftingPhase
				)
					return state;
				// Clear equation and reset validation
				return { ...state, craftedEquationString: '', isCraftedEquationValidForLevel: false };
			}),

		backspaceCraftedEquation: () =>
			update((state) => {
				if (
					state.gameStatus !== GameStatus.SOLVING ||
					state.gameMode !== 'crafter' ||
					!state.isCraftingPhase ||
					state.craftedEquationString.length === 0
				)
					return state;

				const newEquation = state.craftedEquationString.slice(0, -1);
				const isValid = validateCraftedEquationForLevel(newEquation, state.currentLevelNumber);

				return {
					...state,
					craftedEquationString: newEquation,
					isCraftedEquationValidForLevel: isValid
				};
			}),

		// Transition from crafting phase to answering phase
		finalizeCrafting: () =>
			update((state) => {
				if (
					state.gameStatus !== GameStatus.SOLVING ||
					state.gameMode !== 'crafter' ||
					!state.isCraftingPhase
				)
					return state;

				// Basic validation: Ensure equation isn't empty and doesn't end with an operator
				const trimmedEquation = state.craftedEquationString.trim(); // Trim whitespace
				if (trimmedEquation === '' || isOperator(trimmedEquation.slice(-1))) {
					console.warn('Invalid equation submitted for crafting: Empty or ends with operator.'); // TODO: Provide UI feedback
					// TODO: Set an evaluationError maybe?
					return state;
				}

				// New validation: Ensure at least one operator is present
				const hasOperator = trimmedEquation.split('').some(isOperator);
				if (!hasOperator) {
					console.warn(
						'Invalid equation submitted for crafting: Must contain at least one operator.'
					); // TODO: Provide UI feedback
					// TODO: Set an evaluationError maybe?
					return state;
				}

				// Final level-specific validation check (belt and suspenders)
				if (!state.isCraftedEquationValidForLevel) {
					console.warn('Invalid equation submitted: Does not meet level requirements.');
					// TODO: Set an evaluationError maybe?
					return state;
				}

				// TODO: More robust validation (parentheses, structure) before finalizing?

				return { ...state, isCraftingPhase: false, playerInput: '', evaluationError: null }; // Switch phase, clear answer input
			}),

		// --- Spell Casting ---
		castSpell: () =>
			update((state) => {
				// Guard: Must be SOLVING state and have a spell selected
				if (state.gameStatus !== GameStatus.SOLVING || !state.selectedSpell) return state;

				const currentLevel = state.currentLevelNumber;
				let isCorrect = false;
				let message = '';
				let solvedCount = state.equationsSolvedCorrectly;
				let shieldActivated = state.isShieldActive;
				let damageDealt = 0;
				let calculatedBonuses: BonusConfig[] = [];
				let finalEnemyHealth = state.enemyHealth;
				let evalError: string | null = null;

				switch (state.gameMode) {
					case 'solver': {
						// Solver mode: Check playerInput (answer) against expectedAnswer
						if (state.playerInput === '') return state; // Need an answer

						isCorrect = parseInt(state.playerInput, 10) === state.expectedAnswer;
						if (isCorrect) {
							message = 'Correct!';
							solvedCount++;
							if (state.selectedSpell === 'FIRE') {
								damageDealt = FIRE_DAMAGE; // Base damage
							} else if (state.selectedSpell === 'ICE') {
								shieldActivated = true;
							}
						} else {
							message = `Incorrect! (${state.expectedAnswer})`;
						}
						finalEnemyHealth = Math.max(0, state.enemyHealth - damageDealt);
						break;
					}
					case 'crafter': {
						// Crafter mode: Check playerInput (answer) against the EVALUATED craftedEquationString
						// Evaluation and bonus logic happens in Phase 4
						if (state.isCraftingPhase || state.playerInput === '') {
							// Cannot cast spell during crafting phase or without an answer
							return state;
						}

						console.log(
							`Casting spell in Crafter mode... ` +
								`Equation: ${state.craftedEquationString}, ` +
								`Answer Input: ${state.playerInput}`
						);

						const evaluation = evaluateEquation(state.craftedEquationString);
						if (evaluation.error || evaluation.value === null) {
							message = evaluation.error || 'Invalid Equation';
							isCorrect = false;
							evalError = message; // Store the error message
						} else {
							const expectedAnswer = evaluation.value;

							// Parse player input, allowing for fractions like "2/3"
							let playerAnswerValue: number | null = null;
							if (state.currentLevelNumber === 2 && state.playerInput.includes('/')) {
								const playerEval = evaluateEquation(state.playerInput);
								if (playerEval.error === null) {
									playerAnswerValue = playerEval.value;
								}
							} else {
								// Attempt standard float parsing for non-fraction inputs or other levels
								const parsed = parseFloat(state.playerInput);
								if (!isNaN(parsed)) {
									playerAnswerValue = parsed;
								}
							}

							// Use tolerance for float comparison if player answer is valid
							isCorrect =
								playerAnswerValue !== null && Math.abs(playerAnswerValue - expectedAnswer) < 1e-9;

							if (isCorrect) {
								message = 'Correct!';
								solvedCount++;
								calculatedBonuses = getActiveBonuses(
									state.craftedEquationString,
									expectedAnswer,
									currentLevel,
									'crafter'
								);

								if (state.selectedSpell === 'FIRE') {
									damageDealt = FIRE_DAMAGE;
									// Apply bonus multipliers
									calculatedBonuses.forEach((bonus) => {
										damageDealt *= bonus.powerMultiplier;
									});
									damageDealt = Math.round(damageDealt); // Round damage
								} else if (state.selectedSpell === 'ICE') {
									shieldActivated = true;
								}
							} else {
								message = `Incorrect! Expected: ${expectedAnswer}`; // Show expected answer
							}
						}
						finalEnemyHealth = Math.max(0, state.enemyHealth - damageDealt);
						break;
					}
					default:
						return state;
				}

				// Common state updates after mode-specific logic
				return {
					...state,
					enemyHealth: finalEnemyHealth,
					gameStatus: GameStatus.RESULT,
					lastAnswerCorrect: isCorrect,
					lastSpellCast: state.selectedSpell,
					lastPlayerInput: state.playerInput,
					lastFullEquation:
						state.gameMode === 'solver'
							? state.currentEquation // Keep solver equation as is (e.g., "5 + 3 = ?")
							: `${state.craftedEquationString} = ${state.playerInput}`, // Show crafted eq + submitted answer
					resultMessage: message,
					equationsSolvedCorrectly: solvedCount,
					isShieldActive: shieldActivated,
					activeBonuses: calculatedBonuses,
					evaluationError: evalError // Store potential error from crafter mode
				};
			}),

		// --- Round/Level Progression ---

		prepareNextRound: () =>
			update((state): ArenaState => {
				if (state.gameStatus !== GameStatus.RESULT) return state;
				return prepareNextRoundInternal(state); // Use internal helper
			}),

		advanceLevelAndStart: () =>
			update((state): ArenaState => {
				if (state.gameStatus !== GameStatus.GAME_OVER || state.resultMessage !== 'Victory!') {
					console.warn('Cannot advance level unless previous level was won.');
					return state;
				}
				if (!state.gameMode) {
					console.error('Cannot advance level: Game mode not set.');
					return state;
				}

				const nextLevelNumber = state.currentLevelNumber + 1;
				const nextEnemy = enemies.find(
					(e) => e.mode === state.gameMode && e.level === nextLevelNumber
				);

				if (!nextEnemy) {
					console.log(`All levels completed for mode ${state.gameMode}!`);
					return {
						...initialArenaState,
						selectedGrade: state.selectedGrade,
						gameMode: state.gameMode,
						tutorialStep: 0
					};
				}

				const baseNextLevelState: Partial<ArenaState> = {
					...initialArenaState,
					selectedGrade: state.selectedGrade,
					gameMode: state.gameMode,
					currentLevelNumber: nextLevelNumber,
					currentEnemyId: nextEnemy.id,
					currentEnemyConfig: nextEnemy,
					enemyHealth: nextEnemy.health,
					playerHealth: 100,
					gameTime: 90,
					startTime: 90,
					selectedSpell: state.selectedSpell || 'FIRE',
					tutorialStep: 0,
					needsCrafterTutorial: state.needsCrafterTutorial
				};

				switch (state.gameMode) {
					case 'solver':
						return {
							...(baseNextLevelState as ArenaState),
							...generateSolverEquation(nextLevelNumber)
						};
					case 'crafter': {
						const allowedChars = getAllowedCharsForCrafterLevel(nextLevelNumber);
						return {
							...(baseNextLevelState as ArenaState),
							gameStatus: GameStatus.SOLVING,
							isCraftingPhase: true, // Start crafting phase for new level
							craftedEquationString: '',
							allowedCrafterChars: allowedChars, // Set allowed chars for the new level
							isCraftedEquationValidForLevel: false // Reset validation for new level
						};
					}
					default:
						console.error('Unknown game mode during advanceLevelAndStart');
						return state;
				}
			}),

		// --- Tutorial Action ---
		advanceTutorial: () =>
			update((state): ArenaState => {
				if (
					!state.gameMode ||
					state.gameMode !== 'crafter' ||
					state.tutorialStep < 1 ||
					state.tutorialStep > 3
				) {
					// Only advance during active crafter tutorial steps (1, 2, 3)
					return state;
				}

				console.log({ gameMode: state.gameMode, tutorialStep: state.tutorialStep });
				const nextStep = state.tutorialStep + 1;
				if (nextStep > 3) {
					// Tutorial finished, mark as complete and change status to SOLVING
					const newState = {
						...state,
						tutorialStep: 0,
						needsCrafterTutorial: false,
						gameStatus: GameStatus.SOLVING // Start the game!
					};
					return newState;
				} else {
					// Advance to the next step
					return { ...state, tutorialStep: nextStep };
				}
			}),

		skipTutorialAndStart: () =>
			update((state): ArenaState => {
				if (state.gameMode === 'crafter' && state.needsCrafterTutorial && state.tutorialStep > 0) {
					console.log('Skipping tutorial and starting game.');
					return {
						...state,
						tutorialStep: 0,
						needsCrafterTutorial: false, // Mark tutorial as no longer needed
						gameStatus: GameStatus.SOLVING // Ensure game starts
					};
				} else {
					console.warn('skipTutorialAndStart called in unexpected state:', state);
					return state; // Don't change state if called inappropriately
				}
			})
	};
}

export const arenaStore = createArenaStore();
