<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { GameStatus, type SpellType } from '../types'; // Assuming types are colocated or adjust path

	const dispatch = createEventDispatcher();

	export let gameStatus: GameStatus;
	export let playerHealth: number;
	export let enemyHealth: number;
	export let isShieldActive: boolean;
	export let formattedTime: string; // Pass pre-formatted time
	export let gameTime: number;
	export let enemyHit: boolean;
	export let enemyDefeatedAnimating: boolean;
	export let displayedDamage: number | null;
	export let selectedSpell: SpellType | null;
	export let lastAnswerCorrect: boolean | null;
	export let currentEquation: string;
	export let playerInput: string;
	export let lastFullEquation: string;
	export let lastPlayerInput: string;

	function handleSelectSpell(spell: SpellType) {
		dispatch('selectSpell', spell);
	}

	function handleInput(num: number) {
		dispatch('handleInput', num);
	}

	function handleClearInput() {
		dispatch('clearInput');
	}

	function handleBackspace() {
		dispatch('handleBackspace');
	}

	function handleCastSpell() {
		dispatch('castSpell');
	}
</script>

<!-- Game UI Markup will go here -->
<div class="equation-arena-container" class:shake={false} class:shake-shield={false}>
	<!-- Remove playerHit and shieldHit from class list here, managed by parent wrapper -->
	<!-- Top Bar -->
	<div class="top-bar">
		<div class="health-player">
			<span>❤️</span>
			<!-- Replace progress with divs -->
			<div class="player-health-bar-container" class:shield-active={isShieldActive}>
				<div class="player-health-bar-fill" style="width: {playerHealth}%;"></div>
			</div>
			<span class="player-health-value">{playerHealth}/100</span>
		</div>
		<div class="timer" class:low-time={gameTime > 0 && gameTime < 10}>
			⏱️ {formattedTime.replace('Time: ', '')}
		</div>
	</div>

	<!-- Enemy Area -->
	<div class="enemy-area">
		<!-- Direct children for enemy display -->
		<div class="enemy-icon" class:hit-reaction={enemyHit} class:defeated={enemyDefeatedAnimating}>
			🐉
		</div>
		<div class="enemy-label">Enemy</div>
		<progress class="enemy-health-bar" max="100" value={enemyHealth}></progress>
		<div class="enemy-health-text">{enemyHealth}/100</div>
		<!-- Damage Display Text -->
		{#if displayedDamage !== null}
			<span class="damage-dealt-text animate-damage">-{displayedDamage}</span>
		{/if}
	</div>

	<!-- Spell Selection -->
	<div class="spell-selection">
		<!-- Spell buttons -->
		<button on:click={() => handleSelectSpell('FIRE')} class:selected={selectedSpell === 'FIRE'}>
			🔥 FIRE
		</button>
		<!-- No :active needed for spell selection, only visual state change -->
		<button on:click={() => handleSelectSpell('ICE')} class:selected={selectedSpell === 'ICE'}>
			🧊 ICE
		</button>
	</div>

	<!-- Equation Display -->
	<div
		class="equation-display"
		class:correct={lastAnswerCorrect === true && gameStatus === GameStatus.RESULT}
		class:incorrect={lastAnswerCorrect === false && gameStatus === GameStatus.RESULT}
	>
		{#if gameStatus === GameStatus.SOLVING}
			<!-- Equation text -->
			<span class="equation-text">{currentEquation.replace('?', playerInput + '_')}</span>
		{:else if gameStatus === GameStatus.WAITING}
			<span class="info-text">Waiting for spell selection...</span>
		{:else if gameStatus === GameStatus.RESULT}
			<!-- Result equation -->
			<div class="result-equation">
				<span class="equation-content">{lastFullEquation.replace('?', lastPlayerInput)}</span>
			</div>
		{/if}
	</div>

	<!-- Number Pad -->
	<div class="number-pad">
		<!-- Number buttons -->
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
			DEL
		</button>
	</div>

	<!-- Cast Button -->
	<div class="cast-area">
		<!-- Cast button -->
		<button
			on:click={handleCastSpell}
			disabled={gameStatus !== GameStatus.SOLVING || playerInput === '' || !selectedSpell}
			class:glow={gameStatus === GameStatus.SOLVING && playerInput !== '' && !!selectedSpell}
		>
			CAST SPELL
		</button>
	</div>
</div>

<style>
	/* Game UI Styles will go here */
	.equation-arena-container {
		/* Styles from before, but maybe constrain max-width/height */
		max-width: 500px; /* Example max width */
		max-height: 800px; /* Example max height */
		width: 90%;
		height: 95%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		box-sizing: border-box;
		font-family: sans-serif;
		background-color: #f0f4f8;
		color: #333;
		border-radius: 10px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
	}

	/* Add shake animation for player hit */
	/* These shake animations are now controlled by the parent via arena-wrapper */
	/* .equation-arena-container.shake {
		animation: shake-player-hit 0.2s ease-in-out;
	}

	.equation-arena-container.shake-shield {
		animation: shake-shield-block 0.3s ease-in-out;
	} */

	/* --- Existing Styles below (make sure they don't conflict) --- */
	.top-bar {
		display: flex;
		justify-content: space-between; /* Space out items */
		align-items: center; /* Vertically align items */
		width: 100%;
		padding: 0.5rem 1rem; /* Add some padding */
		box-sizing: border-box;
	}

	.health-player {
		color: #e74c3c;
		font-size: 1.5rem; /* Larger font */
		font-weight: bold;
		background-color: rgba(231, 76, 60, 0.1); /* Light red background */
		padding: 0.5rem 1rem;
		border-radius: 6px;
		display: flex; /* Use flexbox to arrange items */
		align-items: center; /* Center items vertically */
		gap: 0.5rem; /* Add space between icon, bar, text */
		min-width: 180px; /* Adjust width */
	}

	/* New div-based health bar styles */
	.player-health-bar-container {
		width: 80px; /* Match previous width */
		height: 10px; /* Match previous height */
		border: 2px solid #e74c3c; /* Always have a 2px border, but transparent */
		border-radius: 3px; /* Apply radius to container */
		overflow: hidden; /* Crucial for clipping the inner div */
		background-color: #f8d7da; /* Track background */
		position: relative; /* Needed if adding inner elements later */
		transition: border-color 0.3s ease; /* Smooth color transition */
	}

	.player-health-bar-fill {
		height: 100%;
		background-color: #e74c3c; /* Fill color */
		border-radius: 0; /* Fill div does NOT need radius */
		transition: width 0.3s ease-in-out; /* Animate width changes */
	}

	.player-health-value {
		font-size: 0.9em; /* Slightly smaller than the main text */
		font-weight: bold; /* Keep it bold */
		color: #e74c3c;
		line-height: 1; /* Adjust line height */
	}

	.timer {
		color: #3498db;
		font-size: 1.5rem; /* Larger font */
		font-weight: bold;
		background-color: rgba(52, 152, 219, 0.1); /* Light blue background */
		padding: 0.5rem 1rem;
		border-radius: 6px;
		margin: 0; /* Remove margin */
		min-width: 100px; /* Ensure minimum width */
		text-align: center;
	}

	.enemy-area {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		gap: 0.25rem; /* Add small gap between elements */
		position: relative; /* Make this the reference for absolute positioning */
	}

	.enemy-icon {
		font-size: 3rem;
	}

	.enemy-label {
		font-weight: bold;
		font-size: 1.1rem;
	}

	.enemy-health-bar {
		width: 100px; /* Fixed width for health bar */
		height: 12px;
		appearance: none; /* Override default appearance */
		border: 1px solid #bdc3c7;
		border-radius: 6px;
		overflow: hidden; /* Ensure inner bar respects border-radius */
	}

	/* Styling the progress bar fill */
	.enemy-health-bar::-webkit-progress-bar {
		/* Background */
		background-color: #eee;
		border-radius: 6px;
	}
	.enemy-health-bar::-webkit-progress-value {
		/* Fill */
		background-color: #e74c3c; /* Red color for health */
		border-radius: 6px;
		transition: width 0.3s ease-in-out;
	}
	.enemy-health-bar::-moz-progress-bar {
		/* Firefox Fill */
		background-color: #e74c3c;
		border-radius: 6px;
		transition: width 0.3s ease-in-out;
	}

	.enemy-health-text {
		font-size: 0.9rem;
		color: #555;
	}

	.spell-selection {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.spell-selection button {
		padding: 0.8rem 1.5rem;
		font-size: 1rem;
		border: 2px solid #ccc;
		border-radius: 6px;
		cursor: pointer;
		background-color: #fff;
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

	.equation-display {
		background-color: #fff9e6;
		border: 1px solid #f1c40f;
		color: #333;
		padding: 1rem 1.5rem;
		width: 300px;
		min-height: auto;
		border-radius: 8px;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		transition: background-color 0.1s ease-in-out;
		margin-bottom: 1rem; /* Add spacing below the equation */
	}

	.equation-display.correct {
		background-color: #e6f4ea;
		border-color: #b7e4c7;
		animation: pulse-correct 0.4s ease-in-out;
	}

	.equation-display.incorrect {
		background-color: #f8d7da;
		border-color: #f5c6cb;
		animation: shake-incorrect 0.4s ease-in-out;
	}

	.equation-text,
	.result-equation,
	.info-text {
		font-size: 1.8rem;
		font-weight: bold;
		line-height: 1.2;
	}

	.result-equation {
		/* Styles specific to the solved equation display */
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

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

	.cast-area {
		width: 100%;
		display: flex;
		justify-content: center;
	}
	.cast-area button {
		padding: 1rem 2.5rem;
		font-size: 1.2rem;
		font-weight: bold;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		background-color: #bdc3c7; /* Default grey */
		color: #fff;
		transition: all 0.2s ease;
	}
	.cast-area button:not(:disabled) {
		background-color: #2ecc71; /* Green when active */
	}
	.cast-area button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.cast-area button.glow:not(:disabled) {
		animation: pulse-glow 1.5s infinite ease-in-out; /* Pulsing glow animation */
	}

	/* Added styles for damage text */
	.damage-dealt-text {
		position: absolute; /* Position relative to the enemy area */
		top: 20%; /* Position near the top of the enemy area */
		left: 50%; /* Center horizontally within the enemy area */
		transform: translate(-50%, -50%);
		font-size: 1.5rem; /* Make it noticeable */
		font-weight: bold;
		color: #e74c3c; /* Red for damage */
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); /* Add some contrast */
		pointer-events: none; /* Prevent interaction */
		opacity: 0; /* Start invisible for animation */
	}

	.animate-damage {
		animation: show-damage 1s ease-out forwards;
	}

	/* Add styles for low-time timer */
	.timer.low-time {
		color: #e74c3c; /* Red color */
		animation: low-time-pulse 1s infinite;
	}

	@keyframes low-time-pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.8;
		}
	}

	/* Enemy Hit Reaction Style */
	.enemy-icon.hit-reaction {
		animation: enemy-hit-react 0.2s ease-out;
	}

	@keyframes enemy-hit-react {
		0% {
			transform: scale(1);
			filter: brightness(1);
		}
		50% {
			transform: scale(1.1);
			filter: brightness(1.8);
		}
		100% {
			transform: scale(1);
			filter: brightness(1);
		}
	}

	.spell-selection button {
		/* ... existing styles ... */
		transition: all 0.2s ease;
	}
	.spell-selection button:active {
		transform: scale(0.95); /* Slightly depress */
	}

	.number-pad button {
		/* ... existing styles ... */
		transition:
			background-color 0.2s,
			transform 0.15s ease-out;
	}
	.number-pad button:hover:not(:disabled) {
		background-color: #eee;
		transform: scale(1.1);
	}
	.number-pad button:active:not(:disabled) {
		transform: scale(1); /* Scale down slightly more than hover */
		background-color: #ddd; /* Darken slightly */
	}

	.cast-area button {
		/* ... existing styles ... */
		transition: all 0.2s ease;
	}
	.cast-area button:active:not(:disabled) {
		transform: scale(0.95); /* Depress */
	}
	.cast-area button.glow:not(:disabled) {
		animation: pulse-glow 1.5s infinite ease-in-out; /* Pulsing glow animation */
	}

	@keyframes pulse-glow {
		0% {
			box-shadow: 0 0 8px rgba(46, 204, 113, 0.5);
		}
		50% {
			box-shadow: 0 0 20px rgba(46, 204, 113, 0.9);
		}
		100% {
			box-shadow: 0 0 8px rgba(46, 204, 113, 0.5);
		}
	}

	/* Player Health Bar Shield Active State */
	.player-health-bar-container.shield-active {
		border-color: #3498db; /* Blue border */
		box-shadow: 0 0 6px rgba(52, 152, 219, 0.6); /* Subtle blue glow */
		animation: pulse-shield-bar 1.5s infinite ease-in-out;
	}

	.enemy-icon.defeated {
		animation: enemy-defeat 0.6s ease-in forwards;
	}
</style>
