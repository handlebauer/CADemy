import { getCrafterLevelConfig } from '../config/crafterLevels';
import { grades, enemies, TIMER_FREEZE_DURATION_MS } from '../config/index';
import { evaluateEquation } from '../utils/math';
import { evaluate } from 'mathjs';
import { getActiveBonuses } from '../config/bonusLogic';

import { initialArenaState, type ArenaState } from './index';
import { generateSolverEquation, getConfigLookupLevel } from './helpers';

import { GameStatus } from '../types';

import type {
	SpellType,
	GradeLevel,
	GameMode,
	BonusConfig,
	GradeConfig,
	EnemyConfig
} from '../types';

type StoreUpdater = (updater: (state: ArenaState) => ArenaState) => void;
type StoreSetter = (value: ArenaState) => void;

// Helper type for setGameOverInternal
type SetGameOverInternalFn = (state: ArenaState, status: GameStatus, won?: boolean) => ArenaState;

const MAX_LEVEL = 3; // Define the maximum level for the game

// Scoring Constants
const SCORE_PER_EQUATION = 10;
const SCORE_BONUS_FIRST_USE = 25;
const SCORE_BONUS_REPEAT_USE = 10;
const SCORE_COMPLETION_BONUS = 50;

// Helper function to clear timer freeze state
function clearTimerFreezeState(_state: ArenaState): Partial<ArenaState> {
	return {
		isTimerFrozen: false,
		timerFreezeDurationRemaining: null
	};
}

// --- Action Creator Functions ---

export function createInputActions(update: StoreUpdater) {
	return {
		handleInput: (value: number | string) =>
			update((state) => {
				const char = value.toString();
				if (char === '.' && state.playerInput.includes('.')) {
					return state;
				}
				if (
					char === '/' &&
					state.gameMode === 'crafter' &&
					state.currentLevelNumber === 2 &&
					!state.isCraftingPhase
				) {
					if (
						state.playerInput.includes('/') ||
						state.playerInput.length === 0 ||
						state.playerInput.slice(-1) === '/'
					) {
						return state;
					}
				}
				if (state.playerInput.length >= 5) {
					return state;
				}
				return { ...state, playerInput: state.playerInput + char };
			}),
		clearInput: () => update((state) => ({ ...state, playerInput: '' })),
		handleBackspace: () =>
			update((state) => {
				if (state.playerInput.length > 0) {
					return { ...state, playerInput: state.playerInput.slice(0, -1) };
				}
				return state;
			})
	};
}

export function createCrafterActions(update: StoreUpdater) {
	const isOperator = (char: string): boolean => ['+', '-', '×', '÷', '/'].includes(char);

	return {
		appendToCraftedEquation: (char: string) =>
			update((state) => {
				if (!state.isCraftingPhase || state.gameStatus !== GameStatus.SOLVING) return state;
				if (state.allowedCrafterChars && !state.allowedCrafterChars.includes(char)) {
					console.log(`Character '${char}' not allowed for level ${state.currentLevelNumber}`);
					return state;
				}
				const currentEq = state.craftedEquationString;
				if (/\d/.test(char)) {
					const match = currentEq.match(/(\d+)$/);
					if (match && match[1].length >= 2) {
						return state;
					}
				}
				const newEquation = currentEq + char;

				const configLevel = getConfigLookupLevel(state);
				const levelConfig = getCrafterLevelConfig(configLevel);

				let isValid = false;
				if (levelConfig) {
					isValid = levelConfig.validate(newEquation);
				} else {
					console.warn(
						`No crafter config found for lookup level ${configLevel} (actual level ${state.currentLevelNumber}) during append.`
					);
				}
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

				const configLevel = getConfigLookupLevel(state);
				const levelConfig = getCrafterLevelConfig(configLevel);

				let isValid = false;
				if (levelConfig) {
					isValid = levelConfig.validate(newEquation);
				} else {
					console.warn(
						`No crafter config found for lookup level ${configLevel} (actual level ${state.currentLevelNumber}) during backspace.`
					);
				}
				return {
					...state,
					craftedEquationString: newEquation,
					isCraftedEquationValidForLevel: isValid
				};
			}),
		finalizeCrafting: () =>
			update((state) => {
				if (
					state.gameStatus !== GameStatus.SOLVING ||
					state.gameMode !== 'crafter' ||
					!state.isCraftingPhase
				)
					return state;
				const trimmedEquation = state.craftedEquationString.trim();
				// isOperator is defined within this function's scope now
				if (trimmedEquation === '' || isOperator(trimmedEquation.slice(-1))) {
					console.warn('Invalid equation submitted: Empty or ends with operator.');
					return { ...state, evaluationError: 'Equation cannot be empty or end with an operator.' };
				}
				const hasOperator = trimmedEquation.split('').some(isOperator);
				if (!hasOperator) {
					console.warn('Invalid equation submitted: Must contain at least one operator.');
					return { ...state, evaluationError: 'Equation must contain at least one operator.' };
				}

				const configLevel = getConfigLookupLevel(state);
				const levelConfig = getCrafterLevelConfig(configLevel);

				if (!state.isCraftedEquationValidForLevel) {
					console.warn(
						`Invalid equation submitted: Does not meet level requirements (Lookup Level: ${configLevel})`
					);
					const errorMsg = levelConfig?.description
						? `Equation does not meet level requirement: ${levelConfig.description}`
						: 'Equation does not meet level requirements.';
					return { ...state, evaluationError: errorMsg };
				}

				const isEquationUsed = state.usedCraftedEquations.has(trimmedEquation);
				if (isEquationUsed) {
					console.warn('Duplicate equation submitted during crafting!');
					if (state.feedbackTimeoutId) clearTimeout(state.feedbackTimeoutId); // Clear any existing feedback timer

					const DUPLICATE_FEEDBACK_DURATION = 2000;
					const newTimeoutId = setTimeout(() => {
						update((s) => {
							// Only reset if this specific feedback is still active
							if (s.isFeedbackActive && s.evaluationError === 'Equation already used!') {
								return {
									...s,
									isFeedbackActive: false,
									evaluationError: null,
									feedbackTimeoutId: null,
									craftedEquationString: '', // Reset equation
									isCraftedEquationValidForLevel: false // Reset validation
								};
							}
							return s; // Return unchanged state otherwise
						});
					}, DUPLICATE_FEEDBACK_DURATION);

					// Return the state with feedback active, preventing phase transition
					return {
						...state,
						gameStatus: GameStatus.SOLVING, // Stay solving (in crafting phase)
						isFeedbackActive: true,
						evaluationError: 'Equation already used!',
						feedbackTimeoutId: newTimeoutId as unknown as number,
						showCrafterFeedback: false, // No detailed feedback for this error
						crafterFeedbackDetails: null
						// Keep isCraftingPhase = true
					};
				}

				// If not duplicate and all other checks passed, transition to solving phase
				return { ...state, isCraftingPhase: false, playerInput: '', evaluationError: null };
			}),
		resetCrafterState: () =>
			update((state) => {
				// Only allow reset if in Crafter mode and currently in the answer phase
				if (
					state.gameMode !== 'crafter' ||
					state.isCraftingPhase ||
					state.gameStatus !== GameStatus.SOLVING
				)
					return state;

				return {
					...state,
					isCraftingPhase: true, // Go back to crafting phase
					craftedEquationString: '', // Clear the equation
					playerInput: '', // Clear the answer input
					evaluationError: null, // Clear any lingering errors
					isCraftedEquationValidForLevel: false // Reset validation state
				};
			})
	};
}

export function createLifecycleActions(update: StoreUpdater, _set: StoreSetter) {
	// Helper function to avoid duplicating setGameOver logic
	const setGameOverInternal = (state: ArenaState, status: GameStatus, won: boolean = false) => {
		// Ensure timers are implicitly stopped by changing the status
		// Clear timer freeze state explicitly
		const freezeClearedState = clearTimerFreezeState(state);

		let newCrafterNormalCompleted = state.crafterNormalCompleted; // Preserve existing status by default

		// Check if the player just won the Crafter Normal mode
		if (state.gameMode === 'crafter' && state.crafterSubMode === 'normal' && won) {
			newCrafterNormalCompleted = true; // Mark normal mode as completed
			try {
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem('equationArenaCrafterNormalCompleted', 'true');
					console.log('Crafter Normal Mode completed status saved to localStorage.');
				}
			} catch (e) {
				console.error('Failed to access localStorage:', e);
			}
		}

		// Important: preserve these state values from being reset
		const { gameMode, crafterSubMode } = state;

		const finalState = {
			...state,
			...freezeClearedState,
			gameStatus: status,
			gameMode, // Preserve the game mode
			crafterSubMode, // Preserve the sub-mode
			playerHealth: status === GameStatus.GAME_OVER ? 0 : state.playerHealth,
			resultMessage: won ? 'Victory!' : 'Player Defeated!',
			levelEndTime: Date.now(), // Set end time on game over
			activeBonuses: [],
			usedCraftedEquations: new Set<string>(),
			levelBonusesUsedThisLevel: new Set<string>(), // Reset on game over
			crafterNormalCompleted: newCrafterNormalCompleted // Update completion status
			// Keep score data until reset/fullReset
		};

		return finalState;
	};

	return {
		reset: () =>
			update((state) => {
				// Clear feedback timeout
				if (state.feedbackTimeoutId) {
					clearTimeout(state.feedbackTimeoutId);
				}
				// Reset to initial state but preserve grade/mode/tutorial state
				const newState = {
					...initialArenaState, // Resets score fields, timer freeze, etc.
					// Keep grade/mode selection
					selectedGrade: state.selectedGrade,
					gameMode: state.gameMode,
					// Keep subMode and completion status from *previous* state, not initial
					crafterSubMode: state.crafterSubMode,
					crafterNormalCompleted: state.crafterNormalCompleted,
					// Reset tutorial state based on mode
					needsCrafterTutorial: state.gameMode === 'crafter',
					tutorialStep: 0, // Always reset tutorial step on game reset
					challengeEnemyScaling: new Map() // Reset scaling map
					// Ensure feedback state is reset (covered by initialArenaState)
				};
				console.log(`Player HP Reset: ${newState.playerHealth}`); // Debug log
				return newState;
			}),
		fullReset: () =>
			update((state) => {
				// Clear timer freeze state on full reset
				const freezeClearedState = clearTimerFreezeState(state);
				return {
					...initialArenaState, // Resets score fields to initial values
					...freezeClearedState,
					enemyJustDefeated: false,
					challengeEnemyScaling: new Map() // Reset scaling map
					// Explicitly ensure scoring fields are reset by initialArenaState
				};
			}),
		setGrade: (grade: GradeLevel) =>
			update((state) => {
				const gradeConfig = grades.find((g: GradeConfig) => g.grade === grade);
				if (!gradeConfig) {
					console.error(`Configuration for grade ${grade} not found!`);
					return state;
				}
				return { ...state, selectedGrade: grade, gameMode: gradeConfig.mode };
			}),
		setGameMode: (mode: GameMode) => update((state) => ({ ...state, gameMode: mode })),
		setCurrentEnemy: (enemyId: string) =>
			update((state) => {
				const enemyConfig = enemies.find((e: EnemyConfig) => e.id === enemyId);
				if (!enemyConfig) {
					console.error(`Enemy config for ID ${enemyId} not found!`);
					return { ...state, currentEnemyId: null, currentEnemyConfig: null };
				}
				return { ...state, currentEnemyId: enemyId, currentEnemyConfig: enemyConfig };
			}),
		startGame: (mode?: GameMode, subMode?: 'normal' | 'challenge') =>
			update((state): ArenaState => {
				// Use provided mode or fallback to state's gameMode
				const gameMode = mode || state.gameMode;

				// If no gameMode is available (neither provided nor in state), can't start
				if (!gameMode) {
					console.error('Cannot start game: Mode not selected.');
					return state;
				}

				// Set crafterSubMode only if the game mode is 'crafter'
				const crafterSubMode = gameMode === 'crafter' ? subMode || null : null;

				// Always preserve the completion status
				const crafterNormalCompleted = state.crafterNormalCompleted;

				// Allow starting from PRE_GAME, GAME_OVER, or FINAL_SUMMARY
				if (
					![GameStatus.PRE_GAME, GameStatus.GAME_OVER, GameStatus.FINAL_SUMMARY].includes(
						state.gameStatus
					)
				) {
					console.warn('Game already in progress or invalid state for startGame');
					return state;
				}

				// --- Determine Starting Enemy and Level ---
				let startingLevel = 1;
				let firstEnemy: EnemyConfig | undefined;
				let initialConfigLookupLevel: number;

				if (gameMode === 'crafter' && crafterSubMode === 'challenge') {
					// --- Challenge Mode Start ---
					startingLevel = 4; // Challenge mode conceptually starts after level 3
					const availableCrafterEnemies = enemies.filter((e) => e.mode === 'crafter');
					if (availableCrafterEnemies.length === 0) {
						console.error('startGame: No crafter enemies found for challenge mode!');
						return initialArenaState; // Or handle error appropriately
					}
					const randomIndex = Math.floor(Math.random() * availableCrafterEnemies.length);
					firstEnemy = availableCrafterEnemies[randomIndex];
					initialConfigLookupLevel = firstEnemy.level; // Rules based on selected enemy
					console.log(
						`Starting Challenge Mode at level ${startingLevel}, randomly selected enemy: ${firstEnemy.id}, using rules from level ${initialConfigLookupLevel}`
					);
				} else {
					// --- Normal or Solver Mode Start ---
					startingLevel = 1;
					firstEnemy = enemies.find(
						(e: EnemyConfig) => e.mode === gameMode && e.level === startingLevel
					);
					if (!firstEnemy) {
						console.error(
							`startGame: Cannot find level ${startingLevel} enemy for mode ${gameMode}`
						);
						return initialArenaState;
					}
					initialConfigLookupLevel = startingLevel; // Rules based on starting level
				}

				// Resetting fully to initial state, but keeping selectedGrade, gameMode, etc.
				const baseStartState: Partial<ArenaState> = {
					...initialArenaState, // Resets scores, timers, challengeEnemyScaling
					selectedGrade: state.selectedGrade,
					gameMode: gameMode,
					crafterSubMode: crafterSubMode,
					crafterNormalCompleted: crafterNormalCompleted,
					needsCrafterTutorial: state.needsCrafterTutorial,
					// --- Game state for starting level ---
					currentLevelNumber: startingLevel, // Can be 1 or 4
					currentEnemyId: firstEnemy.id,
					currentEnemyConfig: firstEnemy, // Use the selected base config
					enemyHealth: firstEnemy.health,
					playerHealth: 100,
					attackTimeRemaining: firstEnemy.solveTimeSec,
					maxAttackTime: firstEnemy.solveTimeSec,
					selectedSpell: state.selectedSpell || 'FIRE'
				};

				switch (gameMode) {
					case 'solver': {
						const newState = {
							...(baseStartState as ArenaState),
							gameStatus: GameStatus.SOLVING,
							...generateSolverEquation(startingLevel),
							levelStartTime: Date.now()
						};
						return newState;
					}
					case 'crafter': {
						// Use the initialConfigLookupLevel determined above
						const levelConfig = getCrafterLevelConfig(initialConfigLookupLevel);
						if (!levelConfig) {
							console.error(
								`startGame: Crafter config for lookup level ${initialConfigLookupLevel} not found!`
							);
							return initialArenaState;
						}

						// Determine if tutorial should start (only for Normal mode level 1)
						const startTutorial = state.needsCrafterTutorial && crafterSubMode === 'normal';

						const newState = {
							...(baseStartState as ArenaState),
							gameStatus: startTutorial ? GameStatus.TUTORIAL : GameStatus.SOLVING,
							tutorialStep: startTutorial ? 1 : 0,
							isCraftingPhase: true,
							craftedEquationString: '',
							allowedCrafterChars: levelConfig.allowedChars, // Use rules matching enemy
							isCraftedEquationValidForLevel: false,
							levelStartTime: startTutorial ? null : Date.now()
						};
						return newState;
					}
					default:
						console.error('Unknown game mode');
						return initialArenaState;
				}
			}),
		setGameOver: () => update((state) => setGameOverInternal(state, GameStatus.GAME_OVER)),
		finalizeVictory: () => {
			update((state) => {
				// Apply completion bonus
				const finalLevelScore = state.currentLevelScore + SCORE_COMPLETION_BONUS;
				const newTotalScore = state.totalGameScore + finalLevelScore;
				const newCompletedData = [
					...state.completedLevelsData,
					{
						levelNumber: state.currentLevelNumber,
						score: finalLevelScore,
						bonuses: state.currentLevelBonuses
					}
				];

				// Check if this is truly the final level (considering mode)
				const isFinalLevelOfMode =
					(state.gameMode === 'solver' ||
						(state.gameMode === 'crafter' && state.crafterSubMode === 'normal')) &&
					state.currentLevelNumber >= MAX_LEVEL;

				// For normal mode completion, preserve the completion status
				let newCrafterNormalCompleted = state.crafterNormalCompleted;

				if (
					isFinalLevelOfMode &&
					state.gameMode === 'crafter' &&
					state.crafterSubMode === 'normal'
				) {
					newCrafterNormalCompleted = true;
					// Update localStorage
					try {
						if (typeof localStorage !== 'undefined') {
							localStorage.setItem('equationArenaCrafterNormalCompleted', 'true');
							console.log(
								'Crafter Normal Mode completed status saved to localStorage from finalizeVictory.'
							);
						}
					} catch (e) {
						console.error('Failed to access localStorage:', e);
					}
				}

				// Set game status to GAME_OVER (triggers ResultsScreen) or FINAL_SUMMARY
				const finalState = {
					...state,
					currentLevelScore: finalLevelScore, // Update score to include completion bonus for display
					totalGameScore: newTotalScore,
					completedLevelsData: newCompletedData,
					gameStatus: isFinalLevelOfMode ? GameStatus.FINAL_SUMMARY : GameStatus.GAME_OVER,
					resultMessage: isFinalLevelOfMode ? 'All Levels Cleared!' : 'Victory!',
					crafterNormalCompleted: newCrafterNormalCompleted
				};

				return finalState;
			});
		},
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

				// Special handling for crafter normal mode completion - Handled by finalizeVictory setting FINAL_SUMMARY now
				// if (state.gameMode === 'crafter' && state.crafterSubMode === 'normal') { ... }

				// --- Determine the next enemy configuration ---
				let nextEnemyBaseConfig: EnemyConfig | undefined;
				const newChallengeEnemyScaling = new Map(state.challengeEnemyScaling); // Copy map

				if (state.gameMode === 'crafter' && state.crafterSubMode === 'challenge') {
					// --- Challenge Mode Enemy Selection & Scaling ---
					const availableCrafterEnemies = enemies.filter((e) => e.mode === 'crafter');
					const possibleNextEnemies = availableCrafterEnemies.filter(
						(e) => e.id !== state.currentEnemyId
					);

					// If filtering leaves no options (e.g., only 1 enemy defined), use all available
					const enemyPool =
						possibleNextEnemies.length > 0 ? possibleNextEnemies : availableCrafterEnemies;

					if (enemyPool.length === 0) {
						console.error('advanceLevelAndStart: No crafter enemies found in config!');
						return {
							...state,
							gameStatus: GameStatus.PRE_GAME,
							resultMessage: 'Error: No enemies defined.'
						};
					}

					// Select a random enemy from the pool
					const randomIndex = Math.floor(Math.random() * enemyPool.length);
					nextEnemyBaseConfig = enemyPool[randomIndex];
					console.log(
						`Challenge mode: Randomly selected enemy ${nextEnemyBaseConfig.id} for level ${nextLevelNumber}`
					);

					// --- Calculate Scaled Stats ---
					const scalingInfo = state.challengeEnemyScaling.get(nextEnemyBaseConfig.id) || {
						healthScaleLevel: 0,
						intervalScaleLevel: 0
					};
					const { healthScaleLevel, intervalScaleLevel } = scalingInfo;

					// Check if we've seen this enemy before by checking if it's in the scaling map
					let effectiveHealthLevel = healthScaleLevel;
					const effectiveIntervalLevel = intervalScaleLevel;

					// If the current level is NOT the first challenge level (level 4) AND this enemy has no scaling yet,
					// it means we've seen other enemies but not this one yet - give it at least level 1 scaling
					if (state.currentLevelNumber > 4 && healthScaleLevel === 0 && intervalScaleLevel === 0) {
						if (!state.challengeEnemyScaling.has(nextEnemyBaseConfig.id)) {
							console.log(
								`First time seeing ${nextEnemyBaseConfig.id} in this Challenge run, starting at base level 1 scaling`
							);
							effectiveHealthLevel = 1; // Start at level 1 instead of 0 for repeat enemies after level 4
						}
					}

					// Example scaling: +10% base health per health level, -10% base interval per interval level
					const healthIncreaseFactor = 0.1;
					const intervalDecreaseFactor = 0.1;
					const minAttackIntervalMs = 2000; // Minimum attack interval

					const scaledHealth = Math.round(
						nextEnemyBaseConfig.health * (1 + effectiveHealthLevel * healthIncreaseFactor)
					);
					const scaledIntervalMs = Math.max(
						minAttackIntervalMs,
						Math.round(
							nextEnemyBaseConfig.attackIntervalMs *
								(1 - effectiveIntervalLevel * intervalDecreaseFactor)
						)
					);
					const scaledSolveTimeSec = Math.max(
						5,
						Math.round(
							nextEnemyBaseConfig.solveTimeSec *
								(1 - effectiveIntervalLevel * intervalDecreaseFactor)
						)
					); // Scale solve time with interval

					console.log(
						`Scaling for ${nextEnemyBaseConfig.id}: hLevel=${effectiveHealthLevel}, iLevel=${effectiveIntervalLevel}`
					);
					console.log(
						` Base: H=${nextEnemyBaseConfig.health}, I=${nextEnemyBaseConfig.attackIntervalMs}`
					);
					console.log(` Scaled: H=${scaledHealth}, I=${scaledIntervalMs}`);

					// Determine which stat to scale *next* time
					let nextHealthScaleLevel = effectiveHealthLevel; // Use the effective level
					let nextIntervalScaleLevel = effectiveIntervalLevel; // Use the effective level

					if (effectiveHealthLevel <= effectiveIntervalLevel) {
						nextHealthScaleLevel++;
						console.log(
							` -> Next scale for ${nextEnemyBaseConfig.id}: HEALTH (level ${nextHealthScaleLevel})`
						);
					} else {
						nextIntervalScaleLevel++;
						console.log(
							` -> Next scale for ${nextEnemyBaseConfig.id}: INTERVAL (level ${nextIntervalScaleLevel})`
						);
					}

					// Update the scaling map for the *next* encounter
					newChallengeEnemyScaling.set(nextEnemyBaseConfig.id, {
						healthScaleLevel: nextHealthScaleLevel,
						intervalScaleLevel: nextIntervalScaleLevel
					});

					// Create the enemy config object with the *current* scaled stats
					nextEnemyBaseConfig = {
						...nextEnemyBaseConfig,
						health: scaledHealth,
						attackIntervalMs: scaledIntervalMs,
						solveTimeSec: scaledSolveTimeSec // Use scaled solve time
					};
				} else {
					// --- Solver or Crafter Normal Mode ---
					nextEnemyBaseConfig = enemies.find(
						(e: EnemyConfig) => e.mode === state.gameMode && e.level === nextLevelNumber
					);
				}

				if (!nextEnemyBaseConfig) {
					console.error(`Cannot find level ${nextLevelNumber} enemy for mode ${state.gameMode}`);
					return initialArenaState;
				}

				// Prepare base state for the next level
				const baseNextLevelState: Partial<ArenaState> = {
					...initialArenaState,
					selectedGrade: state.selectedGrade,
					gameMode: state.gameMode,
					crafterSubMode: state.crafterSubMode,
					crafterNormalCompleted: state.crafterNormalCompleted,
					needsCrafterTutorial: state.needsCrafterTutorial,
					// --- Preserve Cross-Game State ---
					totalGameScore: state.totalGameScore,
					completedLevelsData: state.completedLevelsData,
					challengeEnemyScaling: newChallengeEnemyScaling, // Use the updated map
					// --- Set Next Level State ---
					currentLevelNumber: nextLevelNumber,
					currentEnemyId: nextEnemyBaseConfig.id,
					currentEnemyConfig: nextEnemyBaseConfig, // Use the (potentially scaled) config
					enemyHealth: nextEnemyBaseConfig.health, // Use health from the config
					playerHealth: 100,
					attackTimeRemaining: nextEnemyBaseConfig.solveTimeSec, // Use solve time from config
					maxAttackTime: nextEnemyBaseConfig.solveTimeSec,
					selectedSpell: state.selectedSpell || 'FIRE'
				};

				// Reset level-specific scoring fields explicitly
				baseNextLevelState.currentLevelScore = 0;
				baseNextLevelState.levelBonusesUsedThisLevel = new Set<string>();
				baseNextLevelState.currentLevelBonuses = [];

				// Set up based on game mode
				switch (state.gameMode) {
					case 'solver':
						return {
							...(baseNextLevelState as ArenaState),
							gameStatus: GameStatus.SOLVING,
							...generateSolverEquation(nextLevelNumber),
							levelStartTime: Date.now() // Set start time
						};
					case 'crafter': {
						// Determine which level's config to use based on the selected enemy
						let configLookupLevel: number;
						if (state.crafterSubMode === 'challenge') {
							// In challenge mode, the rules are tied to the chosen enemy's original level
							configLookupLevel = nextEnemyBaseConfig.level; // Use the enemy's original level
							console.log(
								`Challenge mode: Enemy ${nextEnemyBaseConfig.id} selected, using rules from level ${configLookupLevel}`
							);
						} else {
							// Normal mode: Rules match the current level number
							configLookupLevel = nextLevelNumber;
						}

						const levelConfig = getCrafterLevelConfig(configLookupLevel);

						if (!levelConfig) {
							console.error(
								`advanceLevelAndStart: Crafter config for lookup level ${configLookupLevel} (actual level ${nextLevelNumber}) not found!`
							);
							return {
								...state,
								gameStatus: GameStatus.PRE_GAME, // Go back to pre-game on error
								resultMessage: `Error: Level ${configLookupLevel} config missing.`,
								// Ensure scoring is reset
								currentLevelScore: 0,
								levelBonusesUsedThisLevel: new Set<string>(),
								currentLevelBonuses: []
							};
						}

						const nextLevelState = {
							...(baseNextLevelState as ArenaState),
							gameStatus: GameStatus.SOLVING,
							isCraftingPhase: true,
							craftedEquationString: '',
							allowedCrafterChars: levelConfig.allowedChars, // Use rules based on enemy's original level
							isCraftedEquationValidForLevel: false,
							levelStartTime: Date.now() // Set start time
						};

						return nextLevelState;
					}
					default:
						console.error('Unknown game mode during advanceLevelAndStart');
						return state; // Return current state on unknown mode
				}
			}),
		skipTutorialAndStart: () =>
			update((state): ArenaState => {
				if (state.gameMode === 'crafter' && state.needsCrafterTutorial && state.tutorialStep > 0) {
					console.log('Skipping tutorial and starting game.');
					return {
						...state,
						tutorialStep: 0,
						needsCrafterTutorial: false,
						gameStatus: GameStatus.SOLVING,
						levelStartTime: Date.now() // Set start time when skipping tutorial
					};
				} else {
					console.warn('skipTutorialAndStart called in unexpected state:', state);
					return state;
				}
			}),
		setGameOverInternal
	};
}

export function createEntityActions(
	update: StoreUpdater,
	setGameOverInternal: SetGameOverInternalFn
) {
	return {
		damageEnemy: (amount: number) =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING && state.gameStatus !== GameStatus.RESULT)
					return state;
				const newHealth = Math.max(0, state.enemyHealth - amount);
				const newState = { ...state, enemyHealth: newHealth, enemyJustDefeated: false };
				if (newHealth <= 0) {
					// Victory condition is now checked in finalizeVictory, triggered by caller
					return { ...newState, enemyJustDefeated: true };
				}
				return newState;
			}),
		receivePlayerDamage: (damageAmount: number) =>
			update((state) => {
				// Allow damage if solving OR if the game just entered the RESULT phase
				if (state.gameStatus !== GameStatus.SOLVING && state.gameStatus !== GameStatus.RESULT)
					return state;

				// Check if timer freeze is active *before* applying damage
				if (state.isTimerFrozen) {
					console.log('Timer freeze absorbed damage!');
					// Timer freeze blocks damage, playerHealth remains unchanged
					// Clear the timer freeze state
					const freezeClearedState = clearTimerFreezeState(state);
					return { ...state, ...freezeClearedState };
				}

				// Timer freeze is not active, apply damage normally
				const newHealth = Math.max(0, state.playerHealth - damageAmount);
				console.log(`Player HP Updated: ${newHealth}`); // Log HP on damage

				if (newHealth <= 0) {
					// Use setGameOverInternal directly to ensure immediate state change
					console.log(`Player HP Updated: ${newHealth} (Defeated)`); // Log HP on defeat
					return setGameOverInternal(state, GameStatus.GAME_OVER);
				} else {
					return { ...state, playerHealth: newHealth };
				}
			}),
		activateShield: () =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING) return state;
				// Prevent activating timer freeze if already active
				if (state.isTimerFrozen) return state;
				// Add logic to start the timer freeze (if not already handled elsewhere)
				// This assumes the timer start/management is handled by the caller or another action
				return { ...state, isTimerFrozen: true };
			}),
		deactivateShield: () => update((state) => ({ ...state, ...clearTimerFreezeState(state) })), // Use helper
		selectSpell: (spell: SpellType) =>
			update((state) => {
				// Allow spell selection even in RESULT phase for potential UI feedback
				if (
					state.gameStatus === GameStatus.GAME_OVER ||
					state.gameStatus === GameStatus.FINAL_SUMMARY
				)
					return state;
				return { ...state, selectedSpell: spell };
			})
	};
}

export function createGameplayActions(
	update: StoreUpdater,
	prepareNextRoundInternal: (state: ArenaState) => ArenaState,
	setGameOverInternal: SetGameOverInternalFn
) {
	return {
		selectSpell: (spell: SpellType) =>
			update((state) => {
				if (
					state.gameStatus === GameStatus.GAME_OVER ||
					state.gameStatus === GameStatus.FINAL_SUMMARY
				)
					return state;
				return { ...state, selectedSpell: spell };
			}),
		prepareNextRound: () =>
			update((state) => {
				if (state.gameStatus !== GameStatus.RESULT) return state;

				// Clear feedback if active
				if (state.isFeedbackActive && state.feedbackTimeoutId) {
					clearTimeout(state.feedbackTimeoutId);
				}

				const nextRoundState = prepareNextRoundInternal(state);

				// Don't clear timer freeze here, let it persist into the next round if active

				return {
					...nextRoundState,
					gameStatus: GameStatus.SOLVING,
					resultMessage: '',
					lastAnswerCorrect: null,
					lastSpellCast: null,
					lastPlayerInput: '',
					lastFullEquation: '',
					activeBonuses: [],
					isFeedbackActive: false, // Ensure feedback is cleared
					feedbackTimeoutId: null,
					showCrafterFeedback: false,
					crafterFeedbackDetails: null,
					enemyJustDefeated: false
				};
			}),
		castSpell: (
			wrongAnswerTolerance: number,
			wrongAnswerPenalty: number,
			fireDamage: number,
			crafterFeedbackDuration: number
		) =>
			update((state): ArenaState => {
				if (
					state.gameStatus !== GameStatus.SOLVING ||
					!state.selectedSpell ||
					(state.gameMode === 'solver' && state.playerInput === '') ||
					(state.gameMode === 'crafter' && state.isCraftingPhase)
				) {
					return state;
				}

				let answerIsCorrect: boolean | null = null;
				let calculatedDamage = 0;
				let currentActiveBonuses: BonusConfig[] = [];
				let evaluationErrorMessage: string | null = null;
				let equationToEvaluate = '';
				let expected: number | null = null;
				let evaluationResult: { value: number | null; error: string | null; steps: string[] } = {
					value: null,
					error: null,
					steps: []
				};

				const currentInput = state.playerInput;
				let fullEquation = '';

				// --- Equation Validation & Evaluation ---
				if (state.gameMode === 'solver') {
					equationToEvaluate = state.currentEquation.replace('?', state.playerInput);
					expected = state.expectedAnswer;
					// Use tolerance for float comparison
					const tolerance = 1e-9;
					answerIsCorrect =
						Math.abs(parseFloat(state.playerInput) - state.expectedAnswer) < tolerance;
					fullEquation = state.currentEquation.replace('?', currentInput);
				} else if (state.gameMode === 'crafter') {
					equationToEvaluate = state.craftedEquationString;
					evaluationResult = evaluateEquation(equationToEvaluate, state.currentLevelNumber);

					if (evaluationResult.error) {
						evaluationErrorMessage = evaluationResult.error;
						answerIsCorrect = false;
					} else {
						expected = evaluationResult.value;
						// Evaluate player's answer string (e.g., "1/2" becomes 0.5) for comparison
						let playerAnswerValue: number | null = null;
						try {
							const sanitizedPlayerInput = state.playerInput.replace(/×/g, '*').replace(/÷/g, '/');
							const evaluatedPlayerInput = evaluate(sanitizedPlayerInput);
							if (
								typeof evaluatedPlayerInput === 'number' &&
								Number.isFinite(evaluatedPlayerInput)
							) {
								playerAnswerValue = evaluatedPlayerInput;
							}
						} catch (error) {
							console.error('Error evaluating player input for comparison:', error);
						}
						const tolerance = 1e-9;
						answerIsCorrect =
							expected !== null &&
							playerAnswerValue !== null &&
							Math.abs(playerAnswerValue - expected) < tolerance;
						evaluationErrorMessage = null; // Clear error if evaluation succeeds
					}
					fullEquation = `${state.craftedEquationString} = ${currentInput}`;
				}

				// --- State Update Logic ---
				const initialStateForCast = { ...state };
				let intermediateState = { ...initialStateForCast }; // Use let for modification
				const newUsedEquations = new Set(state.usedCraftedEquations);
				let scoreDelta = 0; // Track score changes for this cast

				if (answerIsCorrect) {
					// --- Correct Answer ---
					intermediateState.equationsSolvedCorrectly += 1;
					intermediateState.consecutiveWrongAnswers = 0;
					scoreDelta += SCORE_PER_EQUATION; // Add score for correct equation

					// --- Handle Bonuses (Crafter Mode Only) ---
					if (intermediateState.gameMode === 'crafter' && expected !== null) {
						newUsedEquations.add(intermediateState.craftedEquationString);
						const configLevelForBonuses = getConfigLookupLevel(intermediateState);
						currentActiveBonuses = getActiveBonuses(
							intermediateState.craftedEquationString,
							intermediateState.playerInput,
							expected,
							configLevelForBonuses,
							intermediateState.gameMode
						);

						// Calculate Bonus Score & Update Level Bonuses Used
						const newLevelBonusesUsed = new Set(intermediateState.levelBonusesUsedThisLevel);
						currentActiveBonuses.forEach((bonus) => {
							if (!intermediateState.levelBonusesUsedThisLevel.has(bonus.id)) {
								scoreDelta += SCORE_BONUS_FIRST_USE;
								newLevelBonusesUsed.add(bonus.id);
							} else {
								scoreDelta += SCORE_BONUS_REPEAT_USE;
							}
						});
						intermediateState.levelBonusesUsedThisLevel = newLevelBonusesUsed;

						// Update lists of applied bonuses
						intermediateState.currentLevelBonuses = [
							...intermediateState.currentLevelBonuses,
							...currentActiveBonuses
						];
						intermediateState.totalBonusesApplied = [
							...intermediateState.totalBonusesApplied,
							...currentActiveBonuses
						];
					} else {
						currentActiveBonuses = []; // No bonuses in solver mode yet
					}

					// --- Handle Spell Effect ---
					if (initialStateForCast.selectedSpell === 'FIRE') {
						calculatedDamage = fireDamage;
						currentActiveBonuses.forEach((bonus) => {
							calculatedDamage *= bonus.powerMultiplier;
						});
						calculatedDamage = Math.round(calculatedDamage);
						const newHealth = Math.max(0, intermediateState.enemyHealth - calculatedDamage);
						intermediateState.enemyHealth = newHealth;
						if (newHealth <= 0) {
							intermediateState.enemyJustDefeated = true;
							intermediateState.levelEndTime = Date.now();
						}

						// >> NEW: Check if timer was frozen and reset if FIRE is cast <<
						if (intermediateState.isTimerFrozen && intermediateState.currentEnemyConfig) {
							intermediateState = {
								...intermediateState,
								...clearTimerFreezeState(intermediateState) // Apply cleared state
								// Timer reset will happen in handleNextRoundSequence via startAttackTimer
							};
						}
					} else if (initialStateForCast.selectedSpell === 'ICE') {
						if (intermediateState.isTimerFrozen) {
							console.log('Timer freeze absorbed damage!');
							// Timer freeze blocks damage, playerHealth remains unchanged
							// Clear the timer freeze state
							const freezeClearedState = clearTimerFreezeState(intermediateState);
							intermediateState = { ...intermediateState, ...freezeClearedState };
						} else {
							intermediateState.isTimerFrozen = true;
							intermediateState.timerFreezeDurationRemaining = TIMER_FREEZE_DURATION_MS;
						}
					}

					// --- Final State Update (Correct Answer) ---
					intermediateState = {
						...intermediateState,
						currentLevelScore: intermediateState.currentLevelScore + scoreDelta, // Update level score
						gameStatus: GameStatus.RESULT,
						lastAnswerCorrect: true,
						lastSpellCast: initialStateForCast.selectedSpell,
						lastPlayerInput: currentInput,
						lastFullEquation: fullEquation,
						activeBonuses: currentActiveBonuses, // Show bonuses applied this turn
						evaluationError: null,
						playerInput: '', // Clear input for next round
						craftedEquationString:
							intermediateState.gameMode === 'crafter' ? '' : state.craftedEquationString, // Clear crafted eq only
						isCraftingPhase:
							intermediateState.gameMode === 'crafter' ? true : state.isCraftingPhase, // Back to crafting
						isCraftedEquationValidForLevel: false, // Reset validation
						showCrafterFeedback: false,
						crafterFeedbackDetails: null,
						feedbackTimeoutId: null,
						isFeedbackActive: false,
						usedCraftedEquations: newUsedEquations,
						levelEndTime: intermediateState.levelEndTime // Set if enemy defeated
						// Keep levelBonusesUsedThisLevel
					};
				} else {
					// --- Incorrect Answer ---
					currentActiveBonuses = []; // No bonuses for incorrect answer
					intermediateState.consecutiveWrongAnswers += 1;

					const shouldShowDetailedFeedback =
						intermediateState.gameMode === 'crafter' &&
						!evaluationResult.error && // Only if the crafted equation was valid math
						expected !== null; // Only if we had a valid target value

					if (shouldShowDetailedFeedback) {
						intermediateState.crafterFeedbackDetails = {
							incorrectEq: intermediateState.craftedEquationString,
							incorrectVal: currentInput,
							correctVal: expected, // Show the correct value
							steps: evaluationResult.steps
						};
						intermediateState.showCrafterFeedback = true;
						intermediateState.isFeedbackActive = true; // Pause game for feedback

						if (intermediateState.feedbackTimeoutId) {
							clearTimeout(intermediateState.feedbackTimeoutId);
						}

						const newTimeoutId = setTimeout(() => {
							update((s) => {
								// Check if feedback is still active before clearing
								if (s.isFeedbackActive && s.showCrafterFeedback) {
									return {
										...s,
										isFeedbackActive: false, // Resume game
										showCrafterFeedback: false, // Hide feedback overlay
										crafterFeedbackDetails: null,
										feedbackTimeoutId: null,
										// Reset to crafting phase
										playerInput: '',
										craftedEquationString: '',
										isCraftedEquationValidForLevel: false,
										isCraftingPhase: true
									};
								}
								return s; // Return unchanged state if feedback was already cleared
							});
						}, crafterFeedbackDuration);
						intermediateState.feedbackTimeoutId = newTimeoutId as unknown as number;
					} else {
						// No detailed feedback (or error in crafted eq)
						intermediateState.showCrafterFeedback = false;
						intermediateState.crafterFeedbackDetails = null;
						intermediateState.isFeedbackActive = false; // Ensure game is not paused
						if (intermediateState.feedbackTimeoutId) {
							clearTimeout(intermediateState.feedbackTimeoutId);
							intermediateState.feedbackTimeoutId = null;
						}
					}

					// Apply health penalty if tolerance exceeded AND feedback isn't active
					if (
						intermediateState.consecutiveWrongAnswers > wrongAnswerTolerance &&
						!intermediateState.isFeedbackActive // Don't penalize if showing feedback
					) {
						const newPlayerHealth = Math.max(
							0,
							intermediateState.playerHealth - wrongAnswerPenalty
						);
						intermediateState.playerHealth = newPlayerHealth;
						if (newPlayerHealth <= 0) {
							// Use setGameOverInternal to handle game over logic
							intermediateState = setGameOverInternal(intermediateState, GameStatus.GAME_OVER);
							console.log(`Player HP Updated: ${newPlayerHealth} (Defeated by Mistakes)`);
						}
					}

					// --- Final State Update (Incorrect Answer) ---
					// Only transition to RESULT if not showing feedback and not already Game Over
					const nextStatus = intermediateState.isFeedbackActive
						? GameStatus.SOLVING // Stay SOLVING if feedback is active
						: intermediateState.gameStatus === GameStatus.GAME_OVER
							? GameStatus.GAME_OVER // Remain GAME_OVER if health penalty caused it
							: GameStatus.RESULT; // Otherwise, go to RESULT

					intermediateState = {
						...intermediateState,
						gameStatus: nextStatus,
						isFeedbackActive: intermediateState.isFeedbackActive, // Keep feedback status
						lastAnswerCorrect: false,
						lastSpellCast: initialStateForCast.selectedSpell,
						lastPlayerInput: currentInput,
						lastFullEquation: fullEquation,
						activeBonuses: [], // No bonuses active
						evaluationError: evaluationErrorMessage, // Show math error if any
						// Clear inputs only if transitioning to RESULT, not if showing feedback
						playerInput: nextStatus === GameStatus.RESULT ? '' : currentInput,
						craftedEquationString:
							nextStatus === GameStatus.RESULT && intermediateState.gameMode === 'crafter'
								? ''
								: intermediateState.craftedEquationString,
						isCraftingPhase:
							nextStatus === GameStatus.RESULT && intermediateState.gameMode === 'crafter'
								? true
								: intermediateState.isCraftingPhase,
						isCraftedEquationValidForLevel:
							nextStatus === GameStatus.RESULT
								? false
								: intermediateState.isCraftedEquationValidForLevel,
						// Keep feedback details if active
						showCrafterFeedback: intermediateState.showCrafterFeedback,
						crafterFeedbackDetails: intermediateState.crafterFeedbackDetails,
						feedbackTimeoutId: intermediateState.feedbackTimeoutId
						// Keep score, used equations, level bonuses used etc. unchanged
					};
				}

				return intermediateState; // Return the final calculated state
			}),
		// finalizeVictory is now in lifecycleActions to handle score update before status change
		resetAttackTimer: (seconds: number) => {
			update((state) => ({
				...state,
				attackTimeRemaining: seconds,
				maxAttackTime: seconds
			}));
		},
		tickAttackTimer: () => {
			update((state) => {
				// Prevent ticking if timer is frozen, game not solving, or feedback active
				if (
					state.isTimerFrozen ||
					state.gameStatus !== GameStatus.SOLVING ||
					state.isFeedbackActive
				) {
					return state;
				}
				const newAttackTimeRemaining = Math.max(0, state.attackTimeRemaining - 0.1);
				return {
					...state,
					attackTimeRemaining: newAttackTimeRemaining
				};
			});
		},
		clearShieldState: () =>
			update((state) => {
				return { ...state, ...clearTimerFreezeState(state) };
			}),
		// New action to tick the freeze timer
		tickTimerFreeze: (timeElapsedMs: number) =>
			update((state) => {
				if (!state.isTimerFrozen || state.timerFreezeDurationRemaining === null) {
					return state;
				}

				const newDuration = state.timerFreezeDurationRemaining - timeElapsedMs;

				if (newDuration <= 0) {
					return {
						...state,
						isTimerFrozen: false,
						timerFreezeDurationRemaining: null
					};
				} else {
					return {
						...state,
						timerFreezeDurationRemaining: newDuration
					};
				}
			})
	};
}

export function createTutorialActions(update: StoreUpdater) {
	return {
		advanceTutorial: () =>
			update((state): ArenaState => {
				if (
					!state.gameMode ||
					state.gameMode !== 'crafter' ||
					state.tutorialStep < 1 ||
					state.tutorialStep > 3
				) {
					return state;
				}
				console.log({ gameMode: state.gameMode, tutorialStep: state.tutorialStep });
				const nextStep = state.tutorialStep + 1;
				if (nextStep > 3) {
					// Tutorial finished, transition to solving
					const newState = {
						...state,
						tutorialStep: 0,
						needsCrafterTutorial: false, // Mark tutorial as completed
						gameStatus: GameStatus.SOLVING,
						levelStartTime: Date.now() // Start level timer now
					};
					return newState;
				} else {
					// Advance to next tutorial step
					return { ...state, tutorialStep: nextStep };
				}
			}),
		skipTutorialAndStart: () =>
			update((state): ArenaState => {
				// Allow skipping only if in tutorial mode
				if (state.gameStatus === GameStatus.TUTORIAL && state.tutorialStep > 0) {
					console.log('Skipping tutorial and starting game.');
					return {
						...state,
						tutorialStep: 0,
						needsCrafterTutorial: false, // Mark as completed
						gameStatus: GameStatus.SOLVING,
						levelStartTime: Date.now() // Start level timer now
					};
				} else {
					console.warn('skipTutorialAndStart called in unexpected state:', state);
					return state;
				}
			})
	};
}
