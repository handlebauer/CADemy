<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { SpellType } from '../../types';

	const dispatch = createEventDispatcher<{ selectSpell: SpellType }>();

	export let selectedSpell: SpellType | null = null;

	function handleSelect(spell: SpellType) {
		dispatch('selectSpell', spell);
	}
</script>

<div class="spell-selection">
	<!-- Spell buttons -->
	<button on:click={() => handleSelect('FIRE')} class:selected={selectedSpell === 'FIRE'}>
		🔥 FIRE
	</button>

	<button on:click={() => handleSelect('ICE')} class:selected={selectedSpell === 'ICE'}>
		🧊 ICE
	</button>
</div>

<style>
	.spell-selection {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		width: 100%;
		margin-bottom: 1.5rem;
	}

	/* Base styles for both button and shield display */
	.spell-selection button {
		min-width: 6rem;
		padding: 0.55rem 1.1rem;
		border: 2px solid #ccc;
		border-radius: 6px;
		font-size: 1.1rem;
		background-color: #fff;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.spell-selection button:hover:not(:disabled) {
		background-color: #eef;
	}

	.spell-selection button.selected {
		border-color: #3498db;
		background-color: #d6eaf8;
	}

	.spell-selection button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spell-selection button:active {
		transform: scale(0.95);
	}
</style>
