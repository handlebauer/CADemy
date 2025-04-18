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
	attackTimeRemaining: number;
	maxAttackTime: number;
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
	isTimerFrozen: boolean;
	currentOperationType: OperationType;
	currentLevelNumber: number;
	selectedGrade: GradeLevel | null;
	gameMode: GameMode | null;
	crafterSubMode: 'normal' | 'challenge' | null;
	crafterNormalCompleted: boolean;
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
	timerFreezeDurationRemaining: number | null;
	usedCraftedEquations: Set<string>;
	currentLevelBonuses: BonusConfig[];
	totalBonusesApplied: BonusConfig[];
	isFeedbackActive: boolean;
	feedbackTimeoutId: number | null;
	levelStartTime: number | null;
	levelEndTime: number | null;
	currentLevelScore: number;
	totalGameScore: number;
	levelBonusesUsedThisLevel: Set<string>;
	completedLevelsData: Array<{ levelNumber: number; score: number; bonuses: BonusConfig[] }>;
	challengeEnemyScaling: Map<string, { healthScaleLevel: number; intervalScaleLevel: number }>;
}

export const initialArenaState: ArenaState = {
	playerHealth: 100,
	enemyHealth: 100,
	attackTimeRemaining: 20,
	maxAttackTime: 20,
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
	isTimerFrozen: false,
	currentOperationType: OperationType.ADDITION,
	currentLevelNumber: 1,
	selectedGrade: null,
	gameMode: null,
	crafterSubMode: null,
	crafterNormalCompleted: false,
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
	timerFreezeDurationRemaining: null,
	usedCraftedEquations: new Set<string>(),
	currentLevelBonuses: [],
	totalBonusesApplied: [],
	isFeedbackActive: false,
	feedbackTimeoutId: null,
	levelStartTime: null,
	levelEndTime: null,
	currentLevelScore: 0,
	totalGameScore: 0,
	levelBonusesUsedThisLevel: new Set<string>(),
	completedLevelsData: [],
	challengeEnemyScaling: new Map()
};

// --- Store Creation Logic ---
function createArenaStore() {
	const { subscribe, set, update } = writable<ArenaState>(initialArenaState);

	// Create action groups by calling the imported creators
	const inputActions = createInputActions(update);
	const crafterActions = createCrafterActions(update);
	const { setGameOverInternal, ...otherLifecycleActions } = createLifecycleActions(update, set);
	const lifecycleActions = otherLifecycleActions;

	const entityActions = createEntityActions(update, setGameOverInternal);
	const gameplayActions = createGameplayActions(
		update,
		prepareNextRoundInternal,
		setGameOverInternal
	);
	const tutorialActions = createTutorialActions(update);

	// Create a new action to set the initial completion status from localStorage
	const setInitialCompletionStatus = (status: boolean) =>
		update((state) => ({
			...state,
			crafterNormalCompleted: status
		}));

	// Assemble the final store object
	return {
		subscribe,
		// Spread actions from groups
		...lifecycleActions,
		...inputActions,
		...crafterActions,
		...entityActions,
		...gameplayActions,
		...tutorialActions,
		// Add the new action
		setInitialCompletionStatus
	};
}

// --- Export the Store Instance ---
export const arenaStore = createArenaStore();
