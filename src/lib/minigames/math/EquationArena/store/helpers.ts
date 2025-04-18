import { OperationType, GameStatus } from '../types';
import type { ArenaState } from './index';
import { getCrafterLevelConfig } from '../config/crafterLevels';

// Helper to get the correct config level based on mode, subMode, and CURRENT ENEMY
export const getConfigLookupLevel = (state: ArenaState): number => {
	let lookupLevel: number;
	if (state.gameMode === 'crafter' && state.crafterSubMode === 'challenge') {
		// Challenge mode: Use the original level of the CURRENT enemy for rules
		const enemyLevel = state.currentEnemyConfig?.level;
		lookupLevel = enemyLevel !== undefined ? enemyLevel : 1; // Fallback to 1 if undefined
		console.log(
			`[getConfigLookupLevel] Challenge Mode: Enemy=${state.currentEnemyId}, EnemyLevel=${enemyLevel}, Result=${lookupLevel}`
		);
	} else {
		// Normal mode: Use the direct level number
		lookupLevel = state.currentLevelNumber;
		console.log(
			`[getConfigLookupLevel] Normal Mode: CurrentLevel=${state.currentLevelNumber}, Result=${lookupLevel}`
		);
	}
	return lookupLevel;
};

// Maps level number (1-based) to OperationType for Solver mode
export const getOperationTypeForLevel = (level: number): OperationType => {
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

// Helper to generate equations for SOLVER mode
export const generateSolverEquation = (levelNumber: number): Partial<ArenaState> => {
	const operationType = getOperationTypeForLevel(levelNumber);
	let num1: number, num2: number, answer: number;
	let equationString = '';

	switch (operationType) {
		case OperationType.ADDITION:
			num1 = Math.floor(Math.random() * 9) + 1;
			num2 = Math.floor(Math.random() * 9) + 1;
			answer = num1 + num2;
			equationString = `${num1} + ${num2} = ?`;
			break;
		case OperationType.SUBTRACTION:
			num1 = Math.floor(Math.random() * 18) + 1;
			num2 = Math.floor(Math.random() * num1) + 1;
			answer = num1 - num2;
			equationString = `${num1} - ${num2} = ?`;
			break;
		case OperationType.MULTIPLICATION:
			num1 = Math.floor(Math.random() * 9) + 1;
			num2 = Math.floor(Math.random() * 9) + 1;
			answer = num1 * num2;
			equationString = `${num1} × ${num2} = ?`;
			break;
		case OperationType.DIVISION:
			answer = Math.floor(Math.random() * 9) + 1;
			num2 = Math.floor(Math.random() * 9) + 1;
			num1 = answer * num2;
			equationString = `${num1} ÷ ${num2} = ?`;
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
		playerInput: '',
		gameStatus: GameStatus.SOLVING,
		resultMessage: '',
		evaluationError: null
	};
};

// Helper function to prepare the next round
export const prepareNextRoundInternal = (state: ArenaState): ArenaState => {
	// Log the state received by this helper
	console.log('[prepareNextRoundInternal] Received state:', {
		gameMode: state.gameMode,
		subMode: state.crafterSubMode,
		currentLevel: state.currentLevelNumber,
		currentEnemyId: state.currentEnemyId,
		currentEnemyLevel: state.currentEnemyConfig?.level
	});

	// Clear timeouts for feedback
	if (state.feedbackTimeoutId) {
		clearTimeout(state.feedbackTimeoutId);
	}

	const baseNextRoundState: Partial<ArenaState> = {
		playerInput: '',
		selectedSpell: state.selectedSpell || 'FIRE',
		lastAnswerCorrect: null,
		lastSpellCast: null,
		lastPlayerInput: '',
		lastFullEquation: '',
		resultMessage: '',
		activeBonuses: [],
		evaluationError: null,
		showCrafterFeedback: false,
		crafterFeedbackDetails: null,
		crafterFeedbackTimeoutId: null,
		// Reset feedback state
		isFeedbackActive: false,
		feedbackTimeoutId: null
	};

	const nextStateBase = {
		...state,
		...baseNextRoundState
	};

	switch (state.gameMode) {
		case 'solver':
			return {
				...nextStateBase,
				...generateSolverEquation(state.currentLevelNumber)
			};
		case 'crafter': {
			// Get the appropriate level configuration for Crafter mode
			const configLevel = getConfigLookupLevel(state);
			console.log(`[prepareNextRoundInternal] Determined config lookup level: ${configLevel}`);
			const levelConfig = getCrafterLevelConfig(configLevel);

			if (!levelConfig) {
				console.error(
					`prepareNextRoundInternal: No level config found for Crafter lookup level ${configLevel} (actual level ${state.currentLevelNumber})`
				);
				// Fallback gracefully
				return {
					...nextStateBase,
					gameStatus: GameStatus.SOLVING,
					isCraftingPhase: true,
					craftedEquationString: '',
					allowedCrafterChars: [], // Empty fallback
					isCraftedEquationValidForLevel: false
				};
			}

			console.log(
				`[prepareNextRoundInternal] Setting allowedChars based on configLevel ${configLevel}:`,
				levelConfig.allowedChars
			);

			return {
				...nextStateBase,
				gameStatus: GameStatus.SOLVING,
				isCraftingPhase: true,
				craftedEquationString: '',
				allowedCrafterChars: levelConfig.allowedChars, // Set based on current enemy's rules
				isCraftedEquationValidForLevel: false
			};
		}
		default:
			console.error('Unknown game mode in prepareNextRoundInternal');
			return nextStateBase;
	}
};
