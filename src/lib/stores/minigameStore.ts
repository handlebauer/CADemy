// src/lib/stores/minigameStore.ts
import { writable, get } from 'svelte/store';
import type { LessonNodeData } from '$lib/types/map';
import { getMinigameComponentLoader } from '$lib/minigameRegistry';
import type { MinigameState } from '$lib/types/minigames';

function createMinigameStore() {
	const { subscribe, update } = writable<MinigameState>({
		selectedNode: null,
		isLoading: false,
		activeComponent: null,
		error: null
	});

	// Action to select a node when the player lands on it
	// This is called from the page component's interaction handler
	function selectNode(node: LessonNodeData | null) {
		update((state) => {
			// Only update if it's actually a minigame node or null
			if (node?.minigame || node === null) {
				// If a different node is selected while one is loading/active, perhaps close first?
				// For now, just update the selection. Errors clear on new selection.
				return { ...state, selectedNode: node, error: null };
			}
			// If the node selected is not a minigame node, ensure selection is null
			return { ...state, selectedNode: null, error: null };
		});
	}

	// Action to attempt loading the currently selected minigame node
	async function loadSelectedMinigame() {
		// Get current state synchronously
		const currentState = get(minigameStore); // Use get helper
		const nodeToLoad = currentState.selectedNode;

		// Perform checks before updating state
		if (
			!nodeToLoad ||
			!nodeToLoad.minigame ||
			currentState.isLoading ||
			currentState.activeComponent
		) {
			return; // Exit if conditions not met
		}

		// Set loading state
		update((state) => ({ ...state, isLoading: true, error: null }));

		// Proceed with loading (nodeToLoad is now known to be valid LessonNodeData with a minigame)
		const loader = getMinigameComponentLoader(nodeToLoad.minigame);

		if (loader) {
			try {
				const component = await loader();
				update((state) => ({
					...state,
					isLoading: false,
					activeComponent: component
				}));
			} catch (error) {
				console.error(`Error loading minigame component for ${nodeToLoad.name}:`, error);
				update((state) => ({
					...state,
					isLoading: false,
					error: 'Error loading minigame.'
				}));
			}
		} else {
			console.error(`No loader found for minigame: ${nodeToLoad.minigame}`);
			update((state) => ({
				...state,
				isLoading: false,
				error: 'Minigame not found.'
			}));
		}
	}

	// Action to close the currently active minigame
	// This is typically called when the user presses Escape
	function closeActiveMinigame() {
		update((state) => {
			if (state.activeComponent) {
				return {
					...state,
					isLoading: false, // Ensure loading is false
					activeComponent: null,
					error: null
					// selectedNode remains, user is still on that node
				};
			}
			return state;
		});
	}

	return {
		subscribe,
		selectNode,
		loadSelectedMinigame,
		closeActiveMinigame
	};
}

export const minigameStore = createMinigameStore();
