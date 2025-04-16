import { writable } from 'svelte/store';
import { GameStatus, OperationType } from '../types';
import type { GradeLevel, GameMode, EnemyConfig, BonusConfig, SpellType } from '../types';

// Import action creators and helpers
import {
	createInputActions,
	createCrafterActions,
	createLifecycleActions,
	createEntityActions,
	createGameplayActions,
	createTutorialActions
} from './actions';
import { prepareNextRoundInternal } from './helpers';

// --- State Definition ---
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
	currentOperationType: OperationType;
	currentLevelNumber: number;
	selectedGrade: GradeLevel | null;
	gameMode: GameMode | null;
	currentEnemyId: string | null;
	currentEnemyConfig: EnemyConfig | null;
	activeBonuses: BonusConfig[];
	craftedEquationString: string;
	isCraftingPhase: boolean;
	evaluationError: string | null;
	tutorialStep: number;
	needsCrafterTutorial: boolean;
	allowedCrafterChars: string[] | null;
	isCraftedEquationValidForLevel: boolean;
	enemyJustDefeated: boolean;
	consecutiveWrongAnswers: number;
	showCrafterFeedback: boolean;
	crafterFeedbackDetails: {
		incorrectEq: string;
		incorrectVal: string;
		correctVal: number | null;
		steps: string[];
	} | null;
	crafterFeedbackTimeoutId: number | null;
	shieldDurationRemaining: number | null;
	shieldTimerIntervalId: number | null;
	usedCraftedEquations: Set<string>;
	currentLevelBonuses: BonusConfig[];
	totalBonusesApplied: BonusConfig[];
}

export const initialArenaState: ArenaState = {
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
	selectedGrade: null,
	gameMode: null,
	currentEnemyId: null,
	currentEnemyConfig: null,
	activeBonuses: [],
	craftedEquationString: '',
	isCraftingPhase: false,
	evaluationError: null,
	tutorialStep: 0,
	needsCrafterTutorial: true,
	allowedCrafterChars: null,
	isCraftedEquationValidForLevel: false,
	enemyJustDefeated: false,
	consecutiveWrongAnswers: 0,
	showCrafterFeedback: false,
	crafterFeedbackDetails: null,
	crafterFeedbackTimeoutId: null,
	shieldDurationRemaining: null,
	shieldTimerIntervalId: null,
	usedCraftedEquations: new Set<string>(),
	currentLevelBonuses: [],
	totalBonusesApplied: []
};

// --- Store Creation Logic ---
function createArenaStore() {
	const { subscribe, set, update } = writable<ArenaState>(initialArenaState);

	// Create action groups by calling the imported creators
	const inputActions = createInputActions(update);
	const crafterActions = createCrafterActions(update);
	const lifecycleActions = createLifecycleActions(update, set);
	const entityActions = createEntityActions(update, lifecycleActions.setGameOver);
	const gameplayActions = createGameplayActions(
		update,
		prepareNextRoundInternal,
		lifecycleActions.setGameOver
	);
	const tutorialActions = createTutorialActions(update);

	// Assemble the final store object
	return {
		subscribe,
		// Spread actions from groups
		...lifecycleActions,
		...inputActions,
		...crafterActions,
		...entityActions,
		...gameplayActions,
		...tutorialActions
	};
}

// --- Export the Store Instance ---
export const arenaStore = createArenaStore();
