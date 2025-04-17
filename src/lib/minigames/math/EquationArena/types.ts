export type SpellType = 'FIRE' | 'ICE';

export enum GameStatus {
	PRE_GAME = 'PRE_GAME',
	WAITING = 'WAITING',
	SOLVING = 'SOLVING',
	CASTING = 'CASTING',
	RESULT = 'RESULT',
	TUTORIAL = 'TUTORIAL',
	GAME_OVER = 'GAME_OVER',
	FINAL_SUMMARY = 'FINAL_SUMMARY'
}

export type ConfigKey =
	| 'RESULT_DISPLAY_DELAY'
	| 'INCORRECT_RESULT_DISPLAY_DELAY'
	| 'CRAFTER_FEEDBACK_DISPLAY_DURATION'
	| 'FIRE_DAMAGE'
	| 'WRONG_ANSWER_HEALTH_PENALTY'
	| 'WRONG_ANSWER_PENALTY_TOLERANCE'
	| 'TIMER_FREEZE_DURATION_MS';

export interface TweakpaneConfigBinding {
	key: ConfigKey;
	options: Record<string, unknown>;
	folderTitle: string;
}

export enum OperationType {
	ADDITION = 1,
	SUBTRACTION = 2,
	MULTIPLICATION = 3,
	DIVISION = 4
}

export type GameMode = 'solver' | 'crafter';

export type GradeLevel = 1 | 2 | 3 | 4 | 5;

export interface EnemyConfig {
	id: string;
	name: string;
	health: number;
	attackIntervalMs: number; // How frequently enemy attacks (milliseconds)
	damage: number;
	solveTimeSec: number; // Time in seconds player has to solve before damage
	sprite?: string; // Optional sprite path
	icon: string; // Add icon property
	color?: string; // Optional color for UI theming
	mode: GameMode;
	level: number;
}

export interface BonusConfig {
	id: string;
	name: string;
	description: string;
	// Placeholder check function signature for now
	check: (equation: string, answer: number) => boolean;
	powerMultiplier: number;
	mode: GameMode;
	level?: number; // Optional: Some bonuses might apply to all levels of a mode
}

export interface GradeConfig {
	grade: GradeLevel;
	mode: GameMode;
	// Potential future extensions:
	// equationTypes?: OperationType[];
	// numberRange?: [min: number, max: number];
}

export interface DisplaySegment {
	type: 'fraction' | 'operator' | 'number' | 'text' | 'placeholder' | 'paren_open' | 'paren_close';
	value?: string; // For operators, numbers, text, parens
	numerator?: string; // For fractions
	denominator?: string; // For fractions
}

export interface CrafterLevelConfig {
	level: number;
	allowedChars: string[];
	validate: (equation: string) => boolean;
	description: string; // Short description of the level's goal
}
