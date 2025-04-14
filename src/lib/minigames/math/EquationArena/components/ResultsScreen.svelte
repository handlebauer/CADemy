<script lang="ts">
	// import { createEventDispatcher } from 'svelte'; // Removed
	import type { GradeLevel, GameMode } from '../types';

	// const dispatch = createEventDispatcher(); // Removed

	export let playerHealth: number;
	export let equationsSolvedCorrectly: number;
	export let formattedTimeTaken: string;
	export let selectedGrade: GradeLevel | null;
	export let gameMode: GameMode | null;

	export function handleExit() {
		// Logic can remain here, or be moved to the parent
		// In this case, the parent already handles the logic, so this function
		// essentially just serves as the prop name now.
		console.log('Exit clicked in ResultsScreen');
	}

	// Just serves as a prop name now
	export function handleNextLevel() {
		// console.log('Next Level clicked in ResultsScreen');
	}

	// Just serves as a prop name now
	export function handleTryAgain() {
		// console.log('Try Again clicked in ResultsScreen');
	}
</script>

<div class="results-screen">
	<div class="results-title {playerHealth > 0 ? 'victory' : 'defeat'}">
		{playerHealth > 0 ? '🏆 VICTORY!' : '☠️ DEFEAT!'}
		{#if playerHealth > 0}
			<span class="star">★</span>
			<span class="star">★</span>
			<span class="star">★</span>
			<span class="star">★</span>
			<span class="star">★</span>
			<span class="star">★</span>
		{/if}
	</div>
	<div class="results-stats">
		<p>Equations Solved: {equationsSolvedCorrectly}</p>
		<p>Time Taken: {formattedTimeTaken}</p>
		{#if selectedGrade}<p>Grade: {selectedGrade}</p>{/if}
		{#if gameMode}<p>Mode: {gameMode}</p>{/if}
		<!-- Add other stats here later -->
	</div>
	<div class="results-feedback-prompt">
		How was your experience?
		<div class="feedback-buttons">
			<button>🙁</button>
			<button>😐</button>
			<button>🙂</button>
		</div>
	</div>
	<div class="results-actions">
		<button class="exit-button" on:click={handleExit}>EXIT</button>
		<!-- Only show Next Level if the player won -->
		{#if playerHealth > 0}
			<button class="continue-button" on:click={handleNextLevel}> Next Level → </button>
		{/if}
		<!-- Optionally, add a "Try Again" button for defeat state -->
		{#if playerHealth <= 0}
			<button class="try-again-button" on:click={handleTryAgain}> Try Again? </button>
		{/if}
	</div>
</div>

<style>
	/* Results Screen Styles will go here */
	.results-screen {
		background-color: #fff;
		padding: 2rem 2.5rem;
		border-radius: 12px;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 1.5rem; /* Space between sections */
		font-family: sans-serif;
		width: 90%;
		max-width: 400px;
	}

	.results-title {
		font-size: 2rem;
		font-weight: bold;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		color: #fff;
		margin-bottom: 0.5rem;
		position: relative; /* Needed for absolute positioning of stars */
		overflow: hidden; /* Hide stars until they animate */
	}

	.results-title.victory {
		background-color: #ff9800; /* Orange for victory */
		animation: victory-pop 0.5s ease-out forwards; /* Add pop animation */
	}

	.results-title.defeat {
		background-color: #6c757d; /* Grey for defeat */
	}

	/* Star Styles */
	.star {
		position: absolute;
		top: 0; /* Start at the top */
		font-size: 10px; /* Adjust star size */
		color: #ffd700; /* Gold color */
		pointer-events: none; /* Don't interfere with clicks */
		opacity: 0; /* Start hidden */
		animation: fall-and-fade 1.5s ease-out infinite;
		transition:
			transform 0.1s ease-out,
			filter 0.1s ease-out; /* Transition for hit reaction */
	}

	/* Stagger star positions and delays */
	.star:nth-child(1) {
		left: 15%;
		animation-delay: 0s;
	}
	.star:nth-child(2) {
		left: 30%;
		animation-delay: 0.3s;
	}
	.star:nth-child(3) {
		left: 45%;
		animation-delay: 0.1s;
	}
	.star:nth-child(4) {
		left: 60%;
		animation-delay: 0.5s;
	}
	.star:nth-child(5) {
		left: 75%;
		animation-delay: 0.2s;
	}
	.star:nth-child(6) {
		left: 90%;
		animation-delay: 0.4s;
	}

	.results-stats p {
		margin: 0.5rem 0;
		font-size: 1.1rem;
		color: #333;
	}

	.results-feedback-prompt {
		margin-top: 1rem;
		font-size: 1rem;
		color: #555;
	}

	.feedback-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 0.75rem;
	}

	.feedback-buttons button {
		font-size: 1.5rem;
		padding: 0.5rem;
		border: 1px solid #ccc;
		background: #fff;
		border-radius: 50%;
		cursor: pointer;
		width: 50px;
		height: 50px;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: background-color 0.2s;
	}

	.feedback-buttons button:hover {
		background-color: #eee;
	}

	.results-actions {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.results-actions button {
		padding: 0.8rem 1.5rem;
		font-size: 1rem;
		font-weight: bold;
		border-radius: 6px;
		border: 2px solid;
		cursor: pointer;
		transition: all 0.2s;
	}

	.continue-button {
		background-color: #ff9800;
		border-color: #f57c00;
		color: #fff;
	}
	.continue-button:hover {
		background-color: #f57c00;
		border-color: #e65100;
	}

	.exit-button {
		background-color: #fff;
		border-color: #ccc;
		color: #555;
	}
	.exit-button:hover {
		background-color: #eee;
		border-color: #bbb;
	}

	.try-again-button {
		/* Add distinct styling if needed, otherwise inherits general button style */
		background-color: #e9ecef;
		border-color: #ced4da;
		color: #495057;
	}

	.try-again-button:hover {
		background-color: #dee2e6;
		border-color: #adb5bd;
	}

	.results-actions button:active {
		transform: scale(0.95); /* Depress */
	}
</style>
