import type { TweakpaneConfigBinding, GradeConfig, EnemyConfig, BonusConfig } from '../types';

// Import configuration data
import gradesData from './grades.json';
import enemiesData from './enemies.json';
import bonusesJsonData from './bonuses.json';

// --- Game Configs ---

// Define a type for the raw bonus data from JSON (without the check function)
type BonusData = Omit<BonusConfig, 'check'>;

// Assert types for imported JSON data, handling potential type mismatches
export const grades: GradeConfig[] = gradesData as GradeConfig[];
export const enemies: EnemyConfig[] = enemiesData as EnemyConfig[];

// Map raw bonus data to BonusConfig, adding the placeholder check function
export const bonuses: BonusConfig[] = (bonusesJsonData as BonusData[]).map((bonusData) => ({
	...bonusData,
	// Placeholder function - real logic will be implemented later
	check: (_equation: string, _answer: number): boolean => {
		console.warn(`Bonus check for '${bonusData.id}' not implemented.`);
		return false;
	}
}));

// --- Global Timing & Damage Settings (can be overridden by enemy/level config) ---

export const RESULT_DISPLAY_DELAY = 1_500; // ms delay before next round (correct answer)
export const INCORRECT_RESULT_DISPLAY_DELAY = 4_000; // ms delay for incorrect answer
export const CRAFTER_FEEDBACK_DISPLAY_DURATION = 4_000; // ms duration for crafter feedback overlay

// export const ENEMY_DAMAGE = 15; // Now defined per-enemy in enemies.json
export const FIRE_DAMAGE = 25; // Base damage inflicted by FIRE spell (can be modified by bonuses)
export const WRONG_ANSWER_HEALTH_PENALTY = 10; // Health penalty for wrong answer
export const WRONG_ANSWER_PENALTY_TOLERANCE = 0; // Number of wrong answers allowed before penalty
export const TIMER_FREEZE_DURATION_MS = 10_000; // Default duration for ICE timer freeze (10 seconds)

// --- Tweakpane Dev Config ---

// TODO: Update Tweakpane bindings later to reflect dynamic enemy configs
// Use the original type, but only include bindings for config values still defined here.
export const equationArenaTweakpaneBindings: TweakpaneConfigBinding[] = [
	{
		key: 'RESULT_DISPLAY_DELAY',
		options: { label: 'Result Delay (Correct, ms)', min: 100, max: 5000, step: 100 },
		folderTitle: 'Timings'
	},
	{
		key: 'INCORRECT_RESULT_DISPLAY_DELAY',
		options: { label: 'Result Delay (Incorrect, ms)', min: 100, max: 8000, step: 100 },
		folderTitle: 'Timings'
	},
	{
		key: 'CRAFTER_FEEDBACK_DISPLAY_DURATION',
		options: { label: 'Crafter Feedback Duration (ms)', min: 500, max: 8000, step: 100 },
		folderTitle: 'Timings'
	},
	{
		key: 'FIRE_DAMAGE',
		options: { label: 'Fire Damage', min: 5, max: 100, step: 5 },
		folderTitle: 'Damage'
	},
	{
		key: 'WRONG_ANSWER_HEALTH_PENALTY',
		options: { label: 'Wrong Answer Penalty', min: 0, max: 50, step: 1 },
		folderTitle: 'Damage'
	},
	{
		key: 'WRONG_ANSWER_PENALTY_TOLERANCE',
		options: { label: 'Wrong Answer Tolerance', min: 0, max: 10, step: 1 },
		folderTitle: 'Damage'
	},
	{
		key: 'TIMER_FREEZE_DURATION_MS',
		options: { label: 'Timer Freeze Duration (ms)', min: 1000, max: 30000, step: 500 },
		folderTitle: 'Timings'
	}
];
