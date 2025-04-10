import type { SvelteComponent } from 'svelte';
import type { LessonNodeData } from './map';

/**
 * Enum representing the different available minigames.
 * The string values can be used as keys if needed, but the enum itself provides type safety.
 */
export enum Minigame {
	EquationArena = 'equationArena'
	// Add other minigame identifiers here as they are created
}

export interface MinigameState {
	selectedNode: LessonNodeData | null; // The minigame node the player is currently on
	isLoading: boolean;
	activeComponent: typeof SvelteComponent | null;
	error: string | null; // Store loading errors
}
