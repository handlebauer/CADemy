<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { GameMode } from '../../types';

	// Receive gameMode as a prop
	export let gameMode: GameMode;

	// Local state to track if normal mode is completed
	let crafterNormalCompleted = false;

	// Define the event dispatcher with the updated event type
	const dispatch = createEventDispatcher<{
		startGame: { mode: GameMode; subMode?: 'normal' | 'challenge' };
	}>();

	// Check localStorage for normal mode completion status on mount
	onMount(() => {
		if (gameMode === 'crafter') {
			try {
				if (typeof localStorage !== 'undefined') {
					const storedStatus = localStorage.getItem('equationArenaCrafterNormalCompleted');
					if (storedStatus === 'true') {
						crafterNormalCompleted = true;
					}
				}
			} catch (e) {
				console.error('Failed to access localStorage on mount:', e);
			}
		}
	});

	// Handler for solver mode
	function handleStartSolver() {
		dispatch('startGame', { mode: 'solver' });
	}

	// Handler for crafter normal mode
	function handleStartNormal() {
		dispatch('startGame', { mode: 'crafter', subMode: 'normal' });
	}

	// Handler for crafter challenge mode
	function handleStartChallenge() {
		dispatch('startGame', { mode: 'crafter', subMode: 'challenge' });
	}
</script>

<div class="start-screen animate-fade-in">
	<h1 class="start-title animate-fade-in-staggered delay-1">🧙‍♂️ Equation Arena 🐉</h1>

	{#if gameMode === 'solver'}
		<p class="start-instructions animate-fade-in-staggered delay-2">
			Solve equations to defeat the enemy!
		</p>
		<button class="start-button animate-fade-in-staggered delay-3" on:click={handleStartSolver}>
			Start Game
		</button>
	{:else if gameMode === 'crafter'}
		<p class="start-instructions animate-fade-in-staggered delay-2">
			Craft and solve equations to defeat the enemy!
		</p>
		<div class="mode-buttons animate-fade-in-staggered delay-3">
			<button class="start-button normal-button" on:click={handleStartNormal}> Normal Mode </button>
			<button
				class="start-button challenge-button"
				on:click={handleStartChallenge}
				disabled={!crafterNormalCompleted}
			>
				Challenge Mode {!crafterNormalCompleted ? '🔒' : ''}
			</button>
		</div>
	{/if}
</div>

<style>
	.start-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem; /* Generous padding */
		background-color: #f0f4f8; /* Match game background */
		border-radius: 12px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08); /* Subtle shadow */
		text-align: center;
		font-family: sans-serif; /* Use consistent font */
		color: #333; /* Default dark text */
		width: 90%;
		max-width: 450px;
		overflow: hidden; /* Hide elements before slide-up */
	}

	.start-title {
		font-size: 2.4rem; /* Prominent but not huge */
		font-weight: 600; /* Semi-bold */
		color: #2c3e50; /* Dark slate blue */
		margin-bottom: 1rem;
		line-height: 1.2;
	}

	.start-instructions {
		font-size: 1.1rem;
		color: #555; /* Medium grey */
		margin-bottom: 1.5rem; /* Reduced margin */
		max-width: 90%;
		line-height: 1.6;
	}

	.mode-buttons {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		max-width: 280px;
	}

	.start-button {
		padding: 0.8rem 2rem; /* Standard padding */
		font-size: 1.1rem;
		font-weight: 500; /* Medium weight */
		border: none;
		border-radius: 8px; /* Moderate rounding */
		cursor: pointer;
		background-color: #3498db; /* Nice blue accent */
		color: #fff;
		transition: all 0.2s ease-in-out;
		box-shadow: 0 2px 5px rgba(52, 152, 219, 0.3);
		width: 100%;
	}

	.normal-button {
		background-color: #3498db; /* Blue */
	}

	.challenge-button {
		background-color: #e74c3c; /* Red */
	}

	.challenge-button:disabled {
		background-color: #bdc3c7; /* Gray */
		cursor: auto;
		opacity: 0.7;
	}

	.start-button:hover:not(:disabled) {
		background-color: #2980b9; /* Darker blue */
		box-shadow: 0 4px 8px rgba(52, 152, 219, 0.35);
		transform: translateY(-1px);
	}

	.normal-button:hover:not(:disabled) {
		background-color: #2980b9; /* Darker blue */
	}

	.challenge-button:hover:not(:disabled) {
		background-color: #c0392b; /* Darker red */
		box-shadow: 0 4px 8px rgba(231, 76, 60, 0.35);
	}

	.start-button:active:not(:disabled) {
		transform: translateY(0) scale(0.98); /* Slight press down */
		box-shadow: 0 1px 3px rgba(52, 152, 219, 0.2);
	}
</style>
