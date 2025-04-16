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
			activeBonuses: [] // Clear bonuses on game over
		};
	};

	return {
		reset: () =>
			update((state) => {
				// Clear shield timer on reset
				const shieldClearedState = clearShieldState(state);
				const newState = {
					...initialArenaState,
					...shieldClearedState,
					needsCrafterTutorial: state.needsCrafterTutorial,
					enemyJustDefeated: false
				};
				console.log(`Player HP Reset: ${newState.playerHealth}`);
				return newState;
			}),
		fullReset: () =>
			update((state) => {
				// Clear shield timer on full reset
				const shieldClearedState = clearShieldState(state);
				return { ...initialArenaState, ...shieldClearedState, enemyJustDefeated: false };
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
					gameTime: 90,
					startTime: 90,
					selectedSpell: state.selectedSpell || 'FIRE',
					tutorialStep: 0,
					needsCrafterTutorial: state.needsCrafterTutorial,
					enemyJustDefeated: false // Reset on start
				};
				switch (state.gameMode) {
					case 'solver': {
						const newState = {
							...(baseStartState as ArenaState),
							...generateSolverEquation(startingLevel)
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
							isCraftedEquationValidForLevel: false
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
		finalizeVictory: () => update((state) => setGameOverInternal(state, 'Victory!')),
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
						resultMessage: `All levels completed for ${state.gameMode}!`
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
						const levelConfig = getCrafterLevelConfig(nextLevelNumber);
						if (!levelConfig) {
							console.error(`Crafter config for level ${nextLevelNumber} not found!`);
							return {
								...state,
								gameStatus: GameStatus.PRE_GAME,
								resultMessage: `Error: Level ${nextLevelNumber} config missing.`
							};
						}
						return {
							...(baseNextLevelState as ArenaState),
							gameStatus: GameStatus.SOLVING,
							isCraftingPhase: true,
							craftedEquationString: '',
							allowedCrafterChars: levelConfig.allowedChars,
							isCraftedEquationValidForLevel: false
						};
					}
					default:
						console.error('Unknown game mode during advanceLevelAndStart');
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
					equationToEvaluate = state.craftedEquationString;
					evaluationResult = evaluateEquation(equationToEvaluate, state.currentLevelNumber);
					if (evaluationResult.error) {
						evaluationErrorMessage = evaluationResult.error;
						answerIsCorrect = false;
					} else {
						expected = evaluationResult.value; // Can be null
						answerIsCorrect = expected !== null && parseFloat(state.playerInput) === expected;
						evaluationErrorMessage = null;
					}
					fullEquation = `${state.craftedEquationString} = ${currentInput}`;
				}

				const initialStateForCast = { ...state };
				const intermediateState = { ...initialStateForCast };

				// --- Recalculate answerIsCorrect specifically for crafter mode with potential fraction input ---
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

					const tolerance = 1e-9; // Tolerance for float comparison
					answerIsCorrect =
						expected !== null &&
						playerAnswerValue !== null &&
						Math.abs(playerAnswerValue - expected) < tolerance;
				}
				// --- End Recalculation ---

				if (answerIsCorrect) {
					intermediateState.equationsSolvedCorrectly += 1;
					intermediateState.consecutiveWrongAnswers = 0; // Reset counter on correct answer

					// --- Bonus Calculation (Crafter Mode Only & Correct Answer & Valid Equation) ---
					if (intermediateState.gameMode === 'crafter' && expected !== null) {
						currentActiveBonuses = getActiveBonuses(
							intermediateState.craftedEquationString,
							intermediateState.playerInput,
							expected,
							intermediateState.currentLevelNumber,
							intermediateState.gameMode
						);
					} else {
						// Solver mode or evaluation error - no bonuses from crafting
						currentActiveBonuses = [];
					}
					// --- End Bonus Calculation ---

					if (initialStateForCast.selectedSpell === 'FIRE') {
						calculatedDamage = fireDamage; // Use passed-in fireDamage
						currentActiveBonuses.forEach((bonus) => {
							calculatedDamage *= bonus.powerMultiplier;
						});
						calculatedDamage = Math.round(calculatedDamage);
						const newHealth = Math.max(0, intermediateState.enemyHealth - calculatedDamage);
						intermediateState.enemyHealth = newHealth;
						if (newHealth <= 0) {
							intermediateState.enemyJustDefeated = true; // Set flag ONLY
						}
					} else if (initialStateForCast.selectedSpell === 'ICE') {
						// Clear existing shield timer before starting a new one
						if (state.shieldTimerIntervalId) {
							clearInterval(state.shieldTimerIntervalId);
						}
						// Activate shield and set initial duration
						intermediateState.isShieldActive = true;
						intermediateState.shieldDurationRemaining = SHIELD_DURATION_MS;
						intermediateState.shieldTimerIntervalId = null; // Will be set by the timeout action

						// Action to start the interval (called via setTimeout)
						const startShieldTimerAction = () => {
							update((currentState) => {
								// Double-check: shield might have been cleared between cast and timer start
								if (!currentState.isShieldActive || currentState.shieldTimerIntervalId !== null) {
									return currentState;
								}

								const intervalId = setInterval(() => {
									update((timerState) => {
										// If shield was deactivated externally or duration is null, clear interval
										if (!timerState.isShieldActive || timerState.shieldDurationRemaining === null) {
											clearInterval(intervalId);
											// Ensure state reflects cleared shield
											return { ...timerState, ...clearShieldState(timerState) };
										}

										const newRemaining =
											timerState.shieldDurationRemaining - SHIELD_TIMER_INTERVAL_MS;

										if (newRemaining <= 0) {
											// Shield expired, clear interval and state
											clearInterval(intervalId);
											return { ...timerState, ...clearShieldState(timerState) };
										} else {
											// Update remaining time
											return { ...timerState, shieldDurationRemaining: newRemaining };
										}
									});
								}, SHIELD_TIMER_INTERVAL_MS);

								// Store the interval ID in the state
								return { ...currentState, shieldTimerIntervalId: intervalId as unknown as number };
							});
						};

						// Use setTimeout to ensure the state update happens before the interval starts
						setTimeout(startShieldTimerAction, 0);
					}
				} else {
					// Incorrect answer
					currentActiveBonuses = []; // Reset bonuses
					intermediateState.consecutiveWrongAnswers += 1; // Increment counter

					// ---> CHANGE: Apply feedback logic for level 1, 2 or 3 <---
					if (
						intermediateState.gameMode === 'crafter' &&
						(intermediateState.currentLevelNumber === 1 ||
							intermediateState.currentLevelNumber === 2 ||
							intermediateState.currentLevelNumber === 3) && // Include level 3
						!evaluationResult.error
					) {
						const correctValue = expected; // Expected numeric value
						intermediateState.crafterFeedbackDetails = {
							incorrectEq: intermediateState.craftedEquationString,
							incorrectVal: currentInput,
							correctVal: correctValue,
							steps: evaluationResult.steps
						};
						intermediateState.showCrafterFeedback = true;

						// Clear previous timeout if any
						if (intermediateState.crafterFeedbackTimeoutId) {
							clearTimeout(intermediateState.crafterFeedbackTimeoutId);
						}

						// Set timeout to hide feedback
						intermediateState.crafterFeedbackTimeoutId = setTimeout(() => {
							update((s) => {
								// Check if feedback is still relevant before clearing
								if (
									s.showCrafterFeedback &&
									s.crafterFeedbackDetails?.incorrectEq ===
										intermediateState.crafterFeedbackDetails?.incorrectEq &&
									s.currentLevelNumber === intermediateState.currentLevelNumber
								) {
									return { ...s, showCrafterFeedback: false, crafterFeedbackTimeoutId: null };
								}
								return s;
							});
						}, crafterFeedbackDuration);
					} else {
						// Clear feedback if not level 1, 2 or 3 incorrect crafter
						intermediateState.showCrafterFeedback = false;
						intermediateState.crafterFeedbackDetails = null;
						if (intermediateState.crafterFeedbackTimeoutId) {
							clearTimeout(intermediateState.crafterFeedbackTimeoutId);
							intermediateState.crafterFeedbackTimeoutId = null;
						}
					}
					// ---> END CHANGE <---

					// Apply health penalty if tolerance exceeded
					if (intermediateState.consecutiveWrongAnswers > wrongAnswerTolerance) {
						const newPlayerHealth = Math.max(
							0,
							intermediateState.playerHealth - wrongAnswerPenalty
						);
						intermediateState.playerHealth = newPlayerHealth;
						if (newPlayerHealth <= 0) {
							// Player is defeated due to penalty
							setTimeout(() => setGameOver('Defeated by Mistakes!'), 0);
							console.log(`Player HP Updated: ${newPlayerHealth} (Defeated by Mistakes)`);
							intermediateState.gameStatus = GameStatus.GAME_OVER;
							intermediateState.resultMessage = 'Defeated by Mistakes!';
						}
					}
				}

				// Final state update
				const finalState = {
					...intermediateState,
					// Go to RESULT state even if enemy was defeated, component sequence handles next step
					gameStatus: GameStatus.RESULT,
					lastAnswerCorrect: answerIsCorrect,
					lastSpellCast: initialStateForCast.selectedSpell,
					lastPlayerInput: currentInput,
					lastFullEquation: fullEquation,
					activeBonuses: currentActiveBonuses,
					evaluationError: evaluationErrorMessage,
					// Clear input ONLY if enemy wasn't just defeated (allow seeing final input during animation)
					playerInput: intermediateState.enemyJustDefeated ? currentInput : '',
					// Pass feedback state through
					showCrafterFeedback: intermediateState.showCrafterFeedback,
					crafterFeedbackDetails: intermediateState.crafterFeedbackDetails,
					crafterFeedbackTimeoutId: intermediateState.crafterFeedbackTimeoutId
				};

				return finalState;
			}),
		tickTime: () =>
			update((state) => {
				if (state.gameStatus !== GameStatus.SOLVING) return state;
				const newTime = Math.max(0, state.gameTime - 1);
				const intermediateState = { ...state, gameTime: newTime };

				if (newTime <= 0) {
					setTimeout(() => setGameOver('Time Out!'), 0);
					const finalState = {
						...intermediateState,
						gameStatus: GameStatus.GAME_OVER,
						resultMessage: 'Time Out!'
					};
					return finalState;
				}
				return intermediateState;
			}),
		clearShieldState: () =>
			update((state) => {
				// Directly return the result of the helper function merged with the state
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
						gameStatus: GameStatus.SOLVING
					};
				} else {
					console.warn('skipTutorialAndStart called in unexpected state:', state);
					return state;
				}
			})
	};
}
