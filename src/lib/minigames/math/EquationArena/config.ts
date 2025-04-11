import type { TweakpaneConfigBinding } from './types';

export const ENEMY_ATTACK_INTERVAL = 8_000; // ms delay between enemy attacks
export const RESULT_DISPLAY_DELAY = 1_500; // ms delay before next round

export const ENEMY_DAMAGE = 15; // damage inflicted on player per attack
export const FIRE_DAMAGE = 50; // damage inflicted on enemy per spell cast

export const equationArenaTweakpaneBindings: TweakpaneConfigBinding[] = [
	{
		key: 'ENEMY_ATTACK_INTERVAL',
		options: { label: 'Enemy Attack (ms)', min: 500, max: 20000, step: 100 },
		folderTitle: 'Timings'
	},
	{
		key: 'RESULT_DISPLAY_DELAY',
		options: { label: 'Result Delay (ms)', min: 100, max: 5000, step: 100 },
		folderTitle: 'Timings'
	},
	{
		key: 'ENEMY_DAMAGE',
		options: { label: 'Enemy Damage', min: 1, max: 50, step: 1 },
		folderTitle: 'Damage'
	},
	{
		key: 'FIRE_DAMAGE',
		options: { label: 'Fire Damage', min: 5, max: 100, step: 5 },
		folderTitle: 'Damage'
	}
];
