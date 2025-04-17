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
			resultMessage: message,
			activeBonuses: [], // Clear active bonuses on game over
			usedCraftedEquations: new Set<string>() // Clear used equations
			// Keep totalBonusesApplied for final score/summary
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
					...initialArenaState,
					...shieldClearedState,
					needsCrafterTutorial: state.needsCrafterTutorial,
					// Ensure feedback state is reset
					isFeedbackActive: false,
					feedbackTimeoutId: null,
					crafterFeedbackTimeoutId: null, // Reset this too
					evaluationError: null,
					showCrafterFeedback: false,
					crafterFeedbackDetails: null,
					// Reset other state
					enemyJustDefeated: false,
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
					...initialArenaState,
					...shieldClearedState,
					enemyJustDefeated: false,
					usedCraftedEquations: new Set<string>(),
					currentLevelBonuses: [], // Reset
					totalBonusesApplied: [] // Reset
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
				if (state.gameStatus !== GameStatus.PRE_GAME && state.gameStatus !== GameStatus.GAME_OVER) {
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
				const baseStartState: Partial<ArenaState> = {
					...initialArenaState,
					selectedGrade: state.selectedGrade,
					gameMode: state.gameMode,
					currentLevelNumber: startingLevel,
					currentEnemyId: firstEnemy.id,
					currentEnemyConfig: firstEnemy,
					enemyHealth: firstEnemy.health,
					playerHealth: 100,
					attackTimeRemaining: firstEnemy.solveTimeSec,
					maxAttackTime: firstEnemy.solveTimeSec,
					selectedSpell: state.selectedSpell || 'FIRE',
					tutorialStep: 0,
					needsCrafterTutorial: state.needsCrafterTutorial,
					enemyJustDefeated: false,
					usedCraftedEquations: new Set<string>(),
					currentLevelBonuses: [], // Reset level bonuses
					totalBonusesApplied: [], // Reset total bonuses
					// Reset level timer
					levelStartTime: null,
					levelEndTime: null
				};
				switch (state.gameMode) {
					case 'solver': {
						const newState = {
							...(baseStartState as ArenaState),
							...generateSolverEquation(startingLevel),
							levelStartTime: Date.now() // Set start time when entering SOLVING
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
							currentLevelBonuses: [], // Reset level bonuses
							totalBonusesApplied: [], // Reset total bonuses
							// Reset level timer
							levelStartTime: startTutorial ? null : Date.now() // Set start time only if skipping tutorial
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
				// Set game status to GAME_OVER with victory message
				return {
					...state,
					gameStatus: GameStatus.GAME_OVER,
					resultMessage: 'Victory!'
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
				const nextEnemy = enemies.find(
					(e: EnemyConfig) => e.mode === state.gameMode && e.level === nextLevelNumber
				);
				if (!nextEnemy) {
					console.log(`All levels completed for mode ${state.gameMode}!`);
					return {
						...initialArenaState,
						selectedGrade: state.selectedGrade,
						gameMode: state.gameMode,
						gameStatus: GameStatus.PRE_GAME,
						resultMessage: `All levels completed for ${state.gameMode}!`,
						needsCrafterTutorial: state.needsCrafterTutorial,
						usedCraftedEquations: new Set<string>(),
						currentLevelBonuses: [] // Reset level bonuses
						// Don't reset totalBonusesApplied here
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
					attackTimeRemaining: nextEnemy.solveTimeSec,
					maxAttackTime: nextEnemy.solveTimeSec,
					selectedSpell: state.selectedSpell || 'FIRE',
					tutorialStep: 0,
					needsCrafterTutorial: state.needsCrafterTutorial,
					usedCraftedEquations: new Set<string>(),
					currentLevelBonuses: [], // Reset level bonuses for new level
					totalBonusesApplied: state.totalBonusesApplied, // IMPORTANT: Preserve total bonuses
					// Reset level timer for new level
					levelStartTime: null,
					levelEndTime: null
				};
				switch (state.gameMode) {
					case 'solver':
						return {
							...(baseNextLevelState as ArenaState),
							...generateSolverEquation(nextLevelNumber),
							levelStartTime: Date.now() // Set start time
						};
					case 'crafter': {
						const levelConfig = getCrafterLevelConfig(nextLevelNumber);
						if (!levelConfig) {
							console.error(`Crafter config for level ${nextLevelNumber} not found!`);
							return {
								...state,
								gameStatus: GameStatus.PRE_GAME,
								resultMessage: `Error: Level ${nextLevelNumber} config missing.`,
								usedCraftedEquations: new Set<string>(),
								currentLevelBonuses: [] // Reset level bonuses
								// Don't reset totalBonusesApplied here
							};
						}
						return {
							...(baseNextLevelState as ArenaState),
							gameStatus: GameStatus.SOLVING,
							isCraftingPhase: true,
							craftedEquationString: '',
							allowedCrafterChars: levelConfig.allowedChars,
							isCraftedEquationValidForLevel: false,
							currentLevelBonuses: [], // Reset level bonuses for new level
							levelStartTime: Date.now() // Set start time
						};
					}
					default:
						console.error('Unknown game mode during advanceLevelAndStart');
						return state;
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
			})
	};
}

export function createEntityActions(update: StoreUpdater, _setGameOver: (message: string) => void) {
	return {
		damageEnemy: (amount: number) =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING && state.gameStatus !== GameStatus.RESULT)
					return state;
				const newHealth = Math.max(0, state.enemyHealth - amount);
				const newState = { ...state, enemyHealth: newHealth, enemyJustDefeated: false };
				if (newHealth <= 0) {
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

					// Don't use setTimeout here to ensure immediate state change
					// The game over state needs to be set right away, not asynchronously
					return {
						...state,
						playerHealth: 0,
						gameStatus: GameStatus.GAME_OVER,
						resultMessage: 'Player Defeated!'
					};
				} else {
					return { ...state, playerHealth: newHealth };
				}
			}),
		activateShield: () =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING) return state;
				return { ...state, isShieldActive: true };
			}),
		deactivateShield: () => update((state) => ({ ...state, isShieldActive: false })),
		selectSpell: (spell: SpellType) => update((state) => ({ ...state, selectedSpell: spell }))
	};
}

export function createGameplayActions(
	update: StoreUpdater,
	prepareNextRoundInternal: (state: ArenaState) => ArenaState,
	setGameOver: (message: string) => void
) {
	return {
		selectSpell: (spell: SpellType) =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING) return state;
				return { ...state, selectedSpell: spell };
			}),
		prepareNextRound: () =>
			update((state) => {
				if (state.gameStatus === GameStatus.GAME_OVER) return state;
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

				if (state.gameMode === 'solver') {
					equationToEvaluate = state.currentEquation.replace('?', state.playerInput);
					expected = state.expectedAnswer;
					answerIsCorrect = parseFloat(state.playerInput) === state.expectedAnswer;
					fullEquation = state.currentEquation.replace('?', currentInput);
				} else if (state.gameMode === 'crafter') {
					const isEquationUsed = state.usedCraftedEquations.has(state.craftedEquationString);
					if (isEquationUsed) {
						console.warn('Duplicate equation submitted!');
						if (state.feedbackTimeoutId) clearTimeout(state.feedbackTimeoutId);
						const DUPLICATE_FEEDBACK_DURATION = 2000;
						const newTimeoutId = setTimeout(() => {
							update((s) => {
								if (s.isFeedbackActive && s.evaluationError === 'Equation already used!') {
									return {
										...s,
										isFeedbackActive: false,
										evaluationError: null,
										feedbackTimeoutId: null
									};
								}
								return s;
							});
						}, DUPLICATE_FEEDBACK_DURATION);
						return {
							...state,
							gameStatus: GameStatus.SOLVING,
							isFeedbackActive: true,
							evaluationError: 'Equation already used!',
							feedbackTimeoutId: newTimeoutId as unknown as number,
							playerInput: '',
							craftedEquationString: '',
							isCraftedEquationValidForLevel: false,
							isCraftingPhase: true,
							showCrafterFeedback: false,
							crafterFeedbackDetails: null
						};
					}
					equationToEvaluate = state.craftedEquationString;
					evaluationResult = evaluateEquation(equationToEvaluate, state.currentLevelNumber);
					if (evaluationResult.error) {
						evaluationErrorMessage = evaluationResult.error;
						answerIsCorrect = false;
					} else {
						expected = evaluationResult.value;
						answerIsCorrect = expected !== null && parseFloat(state.playerInput) === expected;
						evaluationErrorMessage = null;
					}
					fullEquation = `${state.craftedEquationString} = ${currentInput}`;
				}

				const initialStateForCast = { ...state };
				const intermediateState = { ...initialStateForCast };
				const newUsedEquations = new Set(state.usedCraftedEquations);

				if (state.gameMode === 'crafter') {
					let playerAnswerValue: number | null = null;
					try {
						const sanitizedPlayerInput = state.playerInput.replace(/×/g, '*').replace(/÷/g, '/');
						const evaluatedPlayerInput = evaluate(sanitizedPlayerInput);
						if (typeof evaluatedPlayerInput === 'number' && Number.isFinite(evaluatedPlayerInput)) {
							playerAnswerValue = evaluatedPlayerInput;
						}
					} catch (error) {
						console.error('Error evaluating player input:', error);
					}

					const tolerance = 1e-9;
					answerIsCorrect =
						expected !== null &&
						playerAnswerValue !== null &&
						Math.abs(playerAnswerValue - expected) < tolerance;
				}

				if (answerIsCorrect) {
					intermediateState.equationsSolvedCorrectly += 1;
					intermediateState.consecutiveWrongAnswers = 0;

					if (intermediateState.gameMode === 'crafter' && expected !== null) {
						newUsedEquations.add(intermediateState.craftedEquationString);
						currentActiveBonuses = getActiveBonuses(
							intermediateState.craftedEquationString,
							intermediateState.playerInput,
							expected,
							intermediateState.currentLevelNumber,
							intermediateState.gameMode
						);
						intermediateState.currentLevelBonuses = [
							...intermediateState.currentLevelBonuses,
							...currentActiveBonuses
						];
						intermediateState.totalBonusesApplied = [
							...intermediateState.totalBonusesApplied,
							...currentActiveBonuses
						];
					} else {
						currentActiveBonuses = [];
					}

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
					} else if (initialStateForCast.selectedSpell === 'ICE') {
						if (state.shieldTimerIntervalId) {
							clearInterval(state.shieldTimerIntervalId);
						}
						intermediateState.isShieldActive = true;
						intermediateState.shieldDurationRemaining = SHIELD_DURATION_MS;
						intermediateState.shieldTimerIntervalId = null;

						const startShieldTimerAction = () => {
							update((currentState) => {
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

								return { ...currentState, shieldTimerIntervalId: intervalId as unknown as number };
							});
						};

						setTimeout(startShieldTimerAction, 0);
					}

					const finalState = {
						...intermediateState,
						gameStatus: GameStatus.RESULT,
						lastAnswerCorrect: true,
						lastSpellCast: initialStateForCast.selectedSpell,
						lastPlayerInput: currentInput,
						lastFullEquation: fullEquation,
						activeBonuses: currentActiveBonuses,
						evaluationError: null,
						playerInput: intermediateState.enemyJustDefeated ? currentInput : '',
						showCrafterFeedback: false,
						crafterFeedbackDetails: null,
						feedbackTimeoutId: null,
						isFeedbackActive: false,
						usedCraftedEquations: newUsedEquations,
						levelEndTime: intermediateState.levelEndTime
					};
					return finalState;
				} else {
					currentActiveBonuses = [];
					intermediateState.consecutiveWrongAnswers += 1;

					const shouldShowDetailedFeedback =
						intermediateState.gameMode === 'crafter' &&
						intermediateState.currentLevelNumber <= 3 &&
						!evaluationResult.error;

					if (shouldShowDetailedFeedback) {
						console.log('Incorrect answer, showing detailed feedback.');
						intermediateState.crafterFeedbackDetails = {
							incorrectEq: intermediateState.craftedEquationString,
							incorrectVal: currentInput,
							correctVal: expected,
							steps: evaluationResult.steps
						};
						intermediateState.showCrafterFeedback = true;

						if (intermediateState.feedbackTimeoutId) {
							clearTimeout(intermediateState.feedbackTimeoutId);
						}

						const newTimeoutId = setTimeout(() => {
							update((s) => {
								if (s.isFeedbackActive && s.showCrafterFeedback) {
									return {
										...s,
										isFeedbackActive: false,
										showCrafterFeedback: false,
										crafterFeedbackDetails: null,
										feedbackTimeoutId: null,
										playerInput: '',
										craftedEquationString: '',
										isCraftedEquationValidForLevel: false,
										isCraftingPhase: true
									};
								}
								return s;
							});
						}, crafterFeedbackDuration);
						intermediateState.feedbackTimeoutId = newTimeoutId as unknown as number;
					} else {
						intermediateState.showCrafterFeedback = false;
						intermediateState.crafterFeedbackDetails = null;
						if (intermediateState.feedbackTimeoutId) {
							clearTimeout(intermediateState.feedbackTimeoutId);
							intermediateState.feedbackTimeoutId = null;
						}
					}

					// Apply health penalty if tolerance exceeded (only if not showing feedback that pauses game)
					if (
						intermediateState.consecutiveWrongAnswers > wrongAnswerTolerance &&
						!shouldShowDetailedFeedback
					) {
						const newPlayerHealth = Math.max(
							0,
							intermediateState.playerHealth - wrongAnswerPenalty
						);
						intermediateState.playerHealth = newPlayerHealth;
						if (newPlayerHealth <= 0) {
							setTimeout(() => setGameOver('Defeated by Mistakes!'), 0);
							console.log(`Player HP Updated: ${newPlayerHealth} (Defeated by Mistakes)`);
							intermediateState.gameStatus = GameStatus.GAME_OVER;
							intermediateState.resultMessage = 'Defeated by Mistakes!';
						}
					}

					const finalState = {
						...intermediateState,
						gameStatus: shouldShowDetailedFeedback ? GameStatus.SOLVING : GameStatus.RESULT,
						isFeedbackActive: shouldShowDetailedFeedback,
						lastAnswerCorrect: false,
						lastSpellCast: initialStateForCast.selectedSpell,
						lastPlayerInput: currentInput,
						lastFullEquation: fullEquation,
						activeBonuses: [],
						evaluationError: evaluationErrorMessage,
						playerInput: shouldShowDetailedFeedback ? currentInput : '',
						showCrafterFeedback: intermediateState.showCrafterFeedback,
						crafterFeedbackDetails: intermediateState.crafterFeedbackDetails,
						feedbackTimeoutId: intermediateState.feedbackTimeoutId,
						usedCraftedEquations: newUsedEquations,
						levelEndTime: intermediateState.levelEndTime
					};
					return finalState;
				}
			}),
		finalizeVictory: () => setGameOver('Victory!'),
		resetAttackTimer: (seconds: number) => {
			update((state) => ({
				...state,
				attackTimeRemaining: seconds,
				maxAttackTime: seconds
			}));
		},
		tickAttackTimer: () => {
			update((state) => {
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
					const newState = {
						...state,
						tutorialStep: 0,
						needsCrafterTutorial: false,
						gameStatus: GameStatus.SOLVING
					};
					return newState;
				} else {
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
						needsCrafterTutorial: false,
						gameStatus: GameStatus.SOLVING,
						levelStartTime: Date.now() // Set start time when skipping tutorial
					};
				} else {
					console.warn('skipTutorialAndStart called in unexpected state:', state);
					return state;
				}
			})
	};
}
