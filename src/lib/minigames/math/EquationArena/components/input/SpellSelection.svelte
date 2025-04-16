<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { SpellType } from '../../types';

	const dispatch = createEventDispatcher<{ selectSpell: SpellType }>();

	export let selectedSpell: SpellType | null = null;
	export let isShieldActive: boolean = false;
	export let shieldTimeRemaining: number | null = null;

	function handleSelect(spell: SpellType) {
		dispatch('selectSpell', spell);
	}
</script>

<div class="spell-selection">
	<!-- Spell buttons -->
	<button on:click={() => handleSelect('FIRE')} class:selected={selectedSpell === 'FIRE'}>
		🔥 FIRE
	</button>

	{#if !isShieldActive}
		<button on:click={() => handleSelect('ICE')} class:selected={selectedSpell === 'ICE'}>
			🧊 ICE
		</button>
	{:else}
		<div class="shield-status-display">
			<div class="shield-icon-timer">
				{#if shieldTimeRemaining !== null}
					<span class="shield-timer">{Math.ceil(shieldTimeRemaining / 1000)}s</span>
				{/if}
			</div>
			<span class="shield-label">Shield</span>
		</div>
	{/if}
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
	.spell-selection button,
	.shield-status-display {
		min-width: 6rem;
		padding: 0.55rem 1.1rem;
		border: 2px solid #ccc;
		border-radius: 6px;
		font-size: 1.1rem;
		background-color: #fff;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Button-specific styles */
	.spell-selection button {
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

	/* Shield display styles */
	.shield-status-display {
		border-color: #3498db;
		background-color: #eaf2f8;
	}

	.shield-icon-timer {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background-color: #3498db;
		color: white;
		flex-shrink: 0;
	}

	.shield-timer {
		font-size: 0.8rem;
		font-weight: bold;
		line-height: 1;
	}

	.shield-label {
		font-size: 1.1rem;
		font-weight: bold;
		color: #2980b9;
	}
</style>
