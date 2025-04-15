<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{ startGame: void }>();

	function handleStart() {
		dispatch('startGame');
	}
</script>

<div class="start-screen animate-fade-in">
	<h1 class="start-title animate-fade-in-staggered delay-1">🧙‍♂️ Equation Arena 🐉</h1>
	<p class="start-instructions animate-fade-in-staggered delay-2">
		Solve equations to defeat the enemy!
	</p>

	<button class="start-button animate-fade-in-staggered delay-3" on:click={handleStart}>
		Start Game
	</button>
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
		max-width: 80%;
		line-height: 1.6;
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
	}

	.start-button:hover {
		background-color: #2980b9; /* Darker blue */
		box-shadow: 0 4px 8px rgba(52, 152, 219, 0.35);
		transform: translateY(-1px);
	}

	.start-button:active {
		transform: translateY(0) scale(0.98); /* Slight press down */
		box-shadow: 0 1px 3px rgba(52, 152, 219, 0.2);
		background-color: #2471a3; /* Even darker blue */
	}
</style>
