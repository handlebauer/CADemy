export type SpellType = 'FIRE' | 'ICE';

export enum GameStatus {
	PRE_GAME = 'PRE_GAME',
	WAITING = 'WAITING',
	SOLVING = 'SOLVING',
	CASTING = 'CASTING',
	RESULT = 'RESULT',
	GAME_OVER = 'GAME_OVER'
}

export interface TweakpaneConfigBinding {
	key: 'ENEMY_ATTACK_INTERVAL' | 'RESULT_DISPLAY_DELAY' | 'ENEMY_DAMAGE' | 'FIRE_DAMAGE';
	options: Record<string, unknown>;
	folderTitle: string;
}

export enum OperationType {
	ADDITION = 1,
	SUBTRACTION = 2,
	MULTIPLICATION = 3,
	DIVISION = 4
}
