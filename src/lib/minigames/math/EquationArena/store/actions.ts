import { getCrafterLevelConfig } from '../config/crafterLevels';
import { grades, enemies, SHIELD_DURATION_MS } from '../config/index';
import { evaluateEquation } from '../utils/math';
import { evaluate } from 'mathjs';
import { getActiveBonuses } from '../config/bonusLogic';

import { initialArenaState, type ArenaState } from './index';
import { generateSolverEquation } from './helpers';

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
type SetGameOverInternalFn = (state: ArenaState, message: string) => ArenaState;

const SHIELD_TIMER_INTERVAL_MS = 100; // Update timer every 100ms
const MAX_LEVEL = 3; // Define the maximum level for the game

// Scoring Constants
const SCORE_PER_EQUATION = 10;
const SCORE_BONUS_FIRST_USE = 25;
const SCORE_BONUS_REPEAT_USE = 10;
const SCORE_COMPLETION_BONUS = 50;

// Helper function to clear shield state and timer
function clearShieldState(state: ArenaState): Partial<ArenaState> {
	if (state.shieldTimerIntervalId) {
		clearInterval(state.shieldTimerIntervalId);
	}
	return {
		isShieldActive: false,
		shieldDurationRemaining: null,
		shieldTimerIntervalId: null
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
				const levelConfig = getCrafterLevelConfig(state.currentLevelNumber);
				let isValid = false;
				if (levelConfig) {
					isValid = levelConfig.validate(newEquation);
				} else {
					console.warn(
						`No crafter config found for level ${state.currentLevelNumber} during append.`
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
				const levelConfig = getCrafterLevelConfig(state.currentLevelNumber);
				let isValid = false;
				if (levelConfig) {
					isValid = levelConfig.validate(newEquation);
				} else {
					console.warn(
						`No crafter config found for level ${state.currentLevelNumber} during backspace.`
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
				if (!state.isCraftedEquationValidForLevel) {
					console.warn('Invalid equation submitted: Does not meet level requirements.');
					const levelConfig = getCrafterLevelConfig(state.currentLevelNumber);
					const errorMsg = levelConfig?.description
						? `Equation does not meet level requirement: ${levelConfig.description}`
						: 'Equation does not meet level requirements.';
					return { ...state, evaluationError: errorMsg };
				}

				// --- New Duplicate Check ---
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
									// Keep isCraftingPhase = true
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
				// --- End New Duplicate Check ---

				// If not duplicate and all other checks passed, transition to solving phase
				return { ...state, isCraftingPhase: false, playerInput: '', evaluationError: null };
			})
	};
}

export function createLifecycleActions(update: StoreUpdater, _set: StoreSetter) {
	// Helper function to avoid duplicating setGameOver logic
	const setGameOverInternal: SetGameOverInternalFn = (state, message) => {
		// Ensure timers are implicitly stopped by changing the status
		// Clear shield timer explicitly
		const shieldClearedState = clearShieldState(state);
		return {
			...state,
			...shieldClearedState,
			gameStatus: GameStatus.GAME_OVER,
			playerHealth: 0,
			resultMessage: message,
			levelEndTime: Date.now(), // Set end time on game over
			activeBonuses: [],
			usedCraftedEquations: new Set<string>(),
			levelBonusesUsedThisLevel: new Set<string>() // Reset on game over
			// Keep score data until reset/fullReset
		};
	};

	return {
		reset: () =>
			update((state) => {
				// Clear shield timer on reset
				const shieldClearedState = clearShieldState(state);
				// Clear feedback timeout
				if (state.feedbackTimeoutId) {
					clearTimeout(state.feedbackTimeoutId);
				}
				// Also clear the old crafter feedback timeout just in case
				if (state.crafterFeedbackTimeoutId) {
					clearTimeout(state.crafterFeedbackTimeoutId);
				}
				const newState = {
					...initialArenaState, // Resets score fields to initial values
					...shieldClearedState,
					needsCrafterTutorial: state.needsCrafterTutorial,
					// Ensure feedback state is reset
					isFeedbackActive: false,
					feedbackTimeoutId: null,
					crafterFeedbackTimeoutId: null,
					evaluationError: null,
					showCrafterFeedback: false,
					crafterFeedbackDetails: null,
					enemyJustDefeated: false,
					// Explicitly ensure scoring fields are reset by initialArenaState
					usedCraftedEquations: new Set<string>(),
					currentLevelBonuses: [],
					totalBonusesApplied: []
				};
				console.log(`Player HP Reset: ${newState.playerHealth}`);
				return newState;
			}),
		fullReset: () =>
			update((state) => {
				// Clear shield timer on full reset
				const shieldClearedState = clearShieldState(state);
				return {
					...initialArenaState, // Resets score fields to initial values
					...shieldClearedState,
					enemyJustDefeated: false
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
		startGame: () =>
			update((state): ArenaState => {
				if (!state.selectedGrade || !state.gameMode) {
					console.error('Cannot start game: Grade and Mode not selected.');
					return state;
				}
				// Allow starting from PRE_GAME, GAME_OVER, or FINAL_SUMMARY
				if (
					![GameStatus.PRE_GAME, GameStatus.GAME_OVER, GameStatus.FINAL_SUMMARY].includes(
						state.gameStatus
					)
				) {
					console.warn('Game already in progress or invalid state for startGame');
					return state;
				}
				const startingLevel = 1;
				const firstEnemy = enemies.find(
					(e: EnemyConfig) => e.mode === state.gameMode && e.level === startingLevel
				);
				if (!firstEnemy) {
					console.error(`Cannot find level ${startingLevel} enemy for mode ${state.gameMode}`);
					return initialArenaState;
				}
				// Resetting fully to initial state, but keeping selectedGrade, gameMode, needsCrafterTutorial
				const baseStartState: Partial<ArenaState> = {
					...initialArenaState, // This will reset score fields
					selectedGrade: state.selectedGrade,
					gameMode: state.gameMode,
					needsCrafterTutorial: state.needsCrafterTutorial,
					// --- Game state for level 1 ---
					currentLevelNumber: startingLevel,
					currentEnemyId: firstEnemy.id,
					currentEnemyConfig: firstEnemy,
					enemyHealth: firstEnemy.health,
					playerHealth: 100, // Reset player health
					attackTimeRemaining: firstEnemy.solveTimeSec,
					maxAttackTime: firstEnemy.solveTimeSec,
					selectedSpell: state.selectedSpell || 'FIRE' // Keep last selected spell or default
				};
				switch (state.gameMode) {
					case 'solver': {
						const newState = {
							...(baseStartState as ArenaState),
							gameStatus: GameStatus.SOLVING, // Directly to solving
							...generateSolverEquation(startingLevel),
							levelStartTime: Date.now()
						};
						console.log(`Player HP Started (Solver): ${newState.playerHealth}`);
						return newState;
					}
					case 'crafter': {
						const startTutorial = state.needsCrafterTutorial;
						const levelConfig = getCrafterLevelConfig(startingLevel);
						if (!levelConfig) {
							console.error(`Crafter config for level ${startingLevel} not found!`);
							return initialArenaState;
						}
						const newState = {
							...(baseStartState as ArenaState),
							gameStatus: startTutorial ? GameStatus.TUTORIAL : GameStatus.SOLVING,
							tutorialStep: startTutorial ? 1 : 0,
							isCraftingPhase: true,
							craftedEquationString: '',
							allowedCrafterChars: levelConfig.allowedChars,
							isCraftedEquationValidForLevel: false,
							levelStartTime: startTutorial ? null : Date.now()
						};
						console.log(`Player HP Started (Crafter): ${newState.playerHealth}`);
						return newState;
					}
					default:
						console.error('Unknown game mode');
						return initialArenaState;
				}
			}),
		setGameOver: (message: string) => update((state) => setGameOverInternal(state, message)),
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

				// Check if this was the last level
				const isLastLevel = state.currentLevelNumber >= MAX_LEVEL;

				// Set game status to GAME_OVER (will be shown by ResultsScreen) or FINAL_SUMMARY
				return {
					...state,
					currentLevelScore: finalLevelScore, // Update score to include completion bonus for display
					totalGameScore: newTotalScore,
					completedLevelsData: newCompletedData,
					gameStatus: isLastLevel ? GameStatus.FINAL_SUMMARY : GameStatus.GAME_OVER,
					resultMessage: isLastLevel ? 'All Levels Cleared!' : 'Victory!'
				};
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

				// Check if next level exceeds max level AFTER victory is finalized
				// Note: finalizeVictory handles the transition to FINAL_SUMMARY if needed.
				// This action should only be called if the game isn't over yet.

				const nextEnemy = enemies.find(
					(e: EnemyConfig) => e.mode === state.gameMode && e.level === nextLevelNumber
				);
				if (!nextEnemy) {
					// This case should ideally be handled by finalizeVictory setting FINAL_SUMMARY
					console.error(
						`Unexpected: advanceLevelAndStart called but no next enemy found (level ${nextLevelNumber}). Should have gone to FINAL_SUMMARY.`
					);
					return {
						...state, // Keep existing state, but maybe go PRE_GAME?
						gameStatus: GameStatus.PRE_GAME,
						resultMessage: 'Error: Could not find next level.'
					};
				}

				// Prepare base state for the next level
				const baseNextLevelState: Partial<ArenaState> = {
					// Reset most state to initial, but preserve some
					...initialArenaState,
					selectedGrade: state.selectedGrade,
					gameMode: state.gameMode,
					needsCrafterTutorial: state.needsCrafterTutorial, // Persist tutorial completion status
					// --- Preserve Cross-Game State ---
					totalGameScore: state.totalGameScore, // Keep the accumulated score
					completedLevelsData: state.completedLevelsData, // Keep completed level data
					// --- Set Next Level State ---
					currentLevelNumber: nextLevelNumber,
					currentEnemyId: nextEnemy.id,
					currentEnemyConfig: nextEnemy,
					enemyHealth: nextEnemy.health,
					playerHealth: 100, // Reset player health for new level
					attackTimeRemaining: nextEnemy.solveTimeSec,
					maxAttackTime: nextEnemy.solveTimeSec,
					selectedSpell: state.selectedSpell || 'FIRE' // Keep last selected spell or default
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
						const levelConfig = getCrafterLevelConfig(nextLevelNumber);
						if (!levelConfig) {
							console.error(`Crafter config for level ${nextLevelNumber} not found!`);
							return {
								...state,
								gameStatus: GameStatus.PRE_GAME, // Go back to pre-game on error
								resultMessage: `Error: Level ${nextLevelNumber} config missing.`,
								// Ensure scoring is reset
								currentLevelScore: 0,
								levelBonusesUsedThisLevel: new Set<string>(),
								currentLevelBonuses: []
							};
						}
						return {
							...(baseNextLevelState as ArenaState),
							gameStatus: GameStatus.SOLVING,
							isCraftingPhase: true,
							craftedEquationString: '',
							allowedCrafterChars: levelConfig.allowedChars,
							isCraftedEquationValidForLevel: false,
							levelStartTime: Date.now() // Set start time
						};
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

				// Check if shield is active *before* applying damage
				if (state.isShieldActive) {
					console.log('Shield absorbed damage!');
					// Shield blocks damage, playerHealth remains unchanged
					// Clear the shield state and timer
					const shieldClearedState = clearShieldState(state);
					return { ...state, ...shieldClearedState };
				}

				// Shield is not active, apply damage normally
				const newHealth = Math.max(0, state.playerHealth - damageAmount);
				console.log(`Player HP Updated: ${newHealth}`); // Log HP on damage

				if (newHealth <= 0) {
					// Use setGameOverInternal directly to ensure immediate state change
					console.log(`Player HP Updated: ${newHealth} (Defeated)`); // Log HP on defeat
					return setGameOverInternal(state, 'Player Defeated!');
				} else {
					return { ...state, playerHealth: newHealth };
				}
			}),
		activateShield: () =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING) return state;
				// Prevent activating shield if already active
				if (state.isShieldActive) return state;
				// Add logic to start the shield timer (if not already handled elsewhere)
				// This assumes the timer start/management is handled by the caller or another action
				return { ...state, isShieldActive: true };
			}),
		deactivateShield: () => update((state) => ({ ...state, ...clearShieldState(state) })), // Use helper
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
				if (
					state.gameStatus === GameStatus.GAME_OVER ||
					state.gameStatus === GameStatus.FINAL_SUMMARY
				)
					return state;
				// Call the passed-in helper function
				return prepareNextRoundInternal(state);
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
						currentActiveBonuses = getActiveBonuses(
							intermediateState.craftedEquationString,
							intermediateState.playerInput,
							expected,
							intermediateState.currentLevelNumber,
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
							// Victory finalization (including score update) happens in finalizeVictory action
						}
					} else if (initialStateForCast.selectedSpell === 'ICE') {
						if (intermediateState.shieldTimerIntervalId) {
							clearInterval(intermediateState.shieldTimerIntervalId);
						}
						intermediateState.isShieldActive = true;
						intermediateState.shieldDurationRemaining = SHIELD_DURATION_MS;
						intermediateState.shieldTimerIntervalId = null; // Will be set by the timer start function

						const startShieldTimerAction = () => {
							update((currentState) => {
								// Check again inside the timeout to prevent race conditions
								if (!currentState.isShieldActive || currentState.shieldTimerIntervalId !== null) {
									return currentState;
								}

								const intervalId = setInterval(() => {
									update((timerState) => {
										if (!timerState.isShieldActive || timerState.shieldDurationRemaining === null) {
											clearInterval(intervalId);
											return { ...timerState, ...clearShieldState(timerState) };
										}

										const newRemaining =
											timerState.shieldDurationRemaining - SHIELD_TIMER_INTERVAL_MS;

										if (newRemaining <= 0) {
											clearInterval(intervalId);
											return { ...timerState, ...clearShieldState(timerState) };
										} else {
											return { ...timerState, shieldDurationRemaining: newRemaining };
										}
									});
								}, SHIELD_TIMER_INTERVAL_MS);
								// Set the interval ID in the state
								return { ...currentState, shieldTimerIntervalId: intervalId as unknown as number };
							});
						};
						// Use setTimeout to ensure the timer starts after the current update cycle
						setTimeout(startShieldTimerAction, 0);
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
						intermediateState.currentLevelNumber <= 3 && // Only for early levels
						!evaluationResult.error && // Only if the crafted equation was valid math
						expected !== null; // Only if we had a valid target value

					if (shouldShowDetailedFeedback) {
						console.log('Incorrect answer, showing detailed feedback.');
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
							intermediateState = setGameOverInternal(intermediateState, 'Defeated by Mistakes!');
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
				// Prevent ticking if game not solving or feedback active
				if (state.gameStatus !== GameStatus.SOLVING || state.isFeedbackActive) {
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
				return { ...state, ...clearShieldState(state) };
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
