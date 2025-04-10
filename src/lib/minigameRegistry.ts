// src/lib/minigameRegistry.ts
import type { SvelteComponent } from 'svelte';
import { Minigame } from '$lib/types/minigames';

/**
 * A registry mapping Minigame enum values to functions that dynamically import
 * the corresponding Svelte component.
 *
 * Using dynamic imports ensures that minigame components are only loaded when needed,
 * improving initial application load time.
 */
export const minigameRegistry: Map<Minigame, () => Promise<typeof SvelteComponent>> = new Map([
	[
		Minigame.EquationArena,
		() =>
			import('$lib/minigames/math/EquationArena.svelte').then(
				(m) => m.default as unknown as typeof SvelteComponent
			)
	]
	// Add mappings for other minigames here
]);

/**
 * Helper function to get the component loader function for a given minigame.
 */
export function getMinigameComponentLoader(
	minigame: Minigame
): (() => Promise<typeof SvelteComponent>) | undefined {
	return minigameRegistry.get(minigame);
}
