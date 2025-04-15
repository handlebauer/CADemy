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

export const RESULT_DISPLAY_DELAY = 1_500; // ms delay before next round

// export const ENEMY_DAMAGE = 15; // Now defined per-enemy in enemies.json
export const FIRE_DAMAGE = 25; // Base damage inflicted by FIRE spell (can be modified by bonuses)

// --- Tweakpane Dev Config ---

// TODO: Update Tweakpane bindings later to reflect dynamic enemy configs
// Use the original type, but only include bindings for config values still defined here.
export const equationArenaTweakpaneBindings: TweakpaneConfigBinding[] = [
	{
		key: 'RESULT_DISPLAY_DELAY',
		options: { label: 'Result Delay (ms)', min: 100, max: 5000, step: 100 },
		folderTitle: 'Timings'
	},
	{
		key: 'FIRE_DAMAGE',
		options: { label: 'Fire Damage', min: 5, max: 100, step: 5 },
		folderTitle: 'Damage'
	}
];
