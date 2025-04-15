<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { GameStatus } from '../../types';

	// Define dispatched events and their payloads
	const dispatch = createEventDispatcher<{
		handleInput: number;
		clearInput: void;
		handleBackspace: void;
	}>();

	// Props to control button state
	export let gameStatus: GameStatus;
	export let playerInput: string;

	// Functions to dispatch events
	function handleInput(num: number) {
		dispatch('handleInput', num);
	}

	function handleClearInput() {
		dispatch('clearInput');
	}

	function handleBackspace() {
		dispatch('handleBackspace');
	}
</script>

<div class="number-pad">
	{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num (num)}
		<button on:click={() => handleInput(num)} disabled={gameStatus !== GameStatus.SOLVING}>
			{num}
		</button>
	{/each}
	<button
		on:click={handleClearInput}
		disabled={gameStatus !== GameStatus.SOLVING}
		class="button-clear"
	>
		C
	</button>
	<button
		on:click={() => handleInput(0)}
		disabled={gameStatus !== GameStatus.SOLVING}
		class="button-zero"
	>
		0
	</button>
	<button
		on:click={handleBackspace}
		disabled={gameStatus !== GameStatus.SOLVING || playerInput.length === 0}
		class="button-backspace"
	>
		UNDO
	</button>
</div>

<style>
	.number-pad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin-bottom: 1rem;
		width: 70%; /* Adjust width slightly */
		max-width: 250px;
	}
	.number-pad button {
		padding: 1rem;
		font-size: 1.2rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		background-color: #fff;
		transition:
			background-color 0.2s,
			transform 0.15s ease-out; /* Add transform transition */
	}
	.number-pad button:hover:not(:disabled) {
		background-color: #eee;
		transform: scale(1.1); /* Scale up on hover */
	}
	.number-pad button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Position Clear (C), Zero (0), and Backspace buttons */
	.button-clear {
		grid-column: 1 / 2; /* First column */
	}
	.button-zero {
		grid-column: 2 / 3; /* Second column */
	}
	.button-backspace {
		grid-column: 3 / 4; /* Third column */
	}
</style>
