import { OperationType, GameStatus } from '../types';
import type { ArenaState } from './index';

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
		case 'crafter': {
			return {
				...(state as ArenaState),
				...baseNextRoundState,
				gameStatus: GameStatus.SOLVING,
				isCraftingPhase: true,
				craftedEquationString: '',
				isCraftedEquationValidForLevel: false
			};
		}
		default:
			console.error('Unknown game mode in prepareNextRoundInternal');
			return state;
	}
};
