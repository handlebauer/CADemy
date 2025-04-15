<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { GameMode, BonusConfig, SpellType, EnemyConfig } from '../types';
	import { GameStatus } from '../types';

	// Import the numpad components
	import SolverNumpad from './SolverNumpad.svelte';
	import CrafterNumpad from './CrafterNumpad.svelte';

	// Update dispatcher types for new crafter events
	const dispatch = createEventDispatcher<{
		selectSpell: SpellType;
		// Solver/Answer input events
		handleInput: number;
		clearInput: void;
		handleBackspace: void;
		// Crafter equation building events
		inputChar: string;
		clearCrafted: void;
		backspaceCrafted: void;
		submitEquation: void;
		// General
		castSpell: void;
	}>();

	export let gameStatus: GameStatus;
	export let playerHealth: number;
	export let enemyHealth: number;
	export let currentEnemyConfig: EnemyConfig | null = null;
	export let isShieldActive: boolean;
	export let formattedTime: string;
	export let gameTime: number;
	export let enemyHit: boolean;
	export let enemyDefeatedAnimating: boolean;
	export let displayedDamage: number | null;
	export let selectedSpell: SpellType | null;
	export let lastAnswerCorrect: boolean | null;
	export let currentEquation: string; // Used by Solver mode
	export let playerInput: string; // Current *answer* input
	export let lastFullEquation: string;
	export let lastPlayerInput: string;
	export let gameMode: GameMode | null = null;

	// Crafter mode specific props
	export let craftedEquationString: string = '';
	export let isCraftingPhase: boolean = false;

	// Add props for bonuses and errors
	export let activeBonuses: BonusConfig[] = [];
	export let evaluationError: string | null = null;

	// --- Event Handlers ---

	// Spell Selection
	function handleSelectSpell(spell: SpellType) {
		dispatch('selectSpell', spell);
	}

	// Solver/Answer Input
	function handleAnswerInput(event: CustomEvent<number>) {
		dispatch('handleInput', event.detail);
	}
	function handleClearAnswerInput() {
		dispatch('clearInput');
	}
	function handleAnswerBackspace() {
		dispatch('handleBackspace');
	}

	// Crafter Equation Input
	function handleCrafterInputChar(event: CustomEvent<string>) {
		dispatch('inputChar', event.detail);
	}
	function handleClearCraftedEquation() {
		dispatch('clearCrafted');
	}
	function handleCrafterBackspace() {
		dispatch('backspaceCrafted');
	}
	function handleSubmitEquation() {
		dispatch('submitEquation');
	}

	// General Action
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
			{currentEnemyConfig?.icon || '🐉'}
		</div>
		<div class="enemy-label">{currentEnemyConfig?.name || 'Enemy'}</div>
		<progress class="enemy-health-bar" max={currentEnemyConfig?.health || 100} value={enemyHealth}
		></progress>
		<div class="enemy-health-text">{enemyHealth}/{currentEnemyConfig?.health || 100}</div>
		<!-- Damage & Bonus Display Area -->
		<div class="feedback-overlay">
			{#if displayedDamage !== null && lastAnswerCorrect}
				<span class="damage-dealt-text animate-damage">-{displayedDamage}</span>
			{/if}
			{#if gameStatus === GameStatus.RESULT && lastAnswerCorrect && activeBonuses.length > 0}
				<div class="bonus-display animate-bonus">
					{#each activeBonuses as bonus (bonus.id)}
						<span>{bonus.name} (+{Math.round((bonus.powerMultiplier - 1) * 100)}%)</span>
					{/each}
				</div>
			{/if}
		</div>
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
		id="equation-display"
		class="equation-display"
		class:correct={lastAnswerCorrect === true && gameStatus === GameStatus.RESULT}
		class:incorrect={lastAnswerCorrect === false && gameStatus === GameStatus.RESULT}
		class:eval-error={!!evaluationError && gameStatus === GameStatus.RESULT}
	>
		{#if gameMode === 'solver'}
			{#if gameStatus === GameStatus.SOLVING}
				<!-- Equation text -->
				<span class="equation-text">{currentEquation.replace('?', playerInput + '_')}</span>
			{:else if gameStatus === GameStatus.RESULT}
				<!-- Result equation -->
				<div class="result-equation">
					<span class="equation-content">{lastFullEquation.replace('?', lastPlayerInput)}</span>
				</div>
			{:else}
				<span class="info-text">Loading...</span>
			{/if}
		{:else if gameMode === 'crafter'}
			{#if gameStatus === GameStatus.SOLVING}
				{#if isCraftingPhase}
					<!-- Show equation being crafted -->
					<span class="equation-text">{craftedEquationString || '_'}</span>
				{:else}
					<!-- Show crafted equation for solving -->
					<span class="equation-text">{craftedEquationString.trim()} = {playerInput + '_'}</span>
				{/if}
			{:else if gameStatus === GameStatus.RESULT}
				<div class="result-equation">
					{#if evaluationError}
						<!-- Show evaluation error -->
						<span class="error-text">{evaluationError}</span>
					{:else}
						<!-- Show solved equation -->
						<span class="equation-content">{lastFullEquation.replace('?', lastPlayerInput)}</span>
					{/if}
				</div>
			{:else}
				<span class="info-text">1 + 1 = 2</span>
			{/if}
		{:else}
			<!-- Fallback if mode is null -->
			<span class="info-text">Select Mode...</span>
		{/if}
	</div>

	<!-- Conditional Numpad Rendering -->
	<div class="numpad-area">
		{#if gameMode === 'solver'}
			<SolverNumpad
				{gameStatus}
				{playerInput}
				on:handleInput={handleAnswerInput}
				on:clearInput={handleClearAnswerInput}
				on:handleBackspace={handleAnswerBackspace}
			/>
		{:else if gameMode === 'crafter'}
			<CrafterNumpad
				{gameStatus}
				{isCraftingPhase}
				{playerInput}
				{selectedSpell}
				{craftedEquationString}
				on:inputChar={handleCrafterInputChar}
				on:clear={handleClearCraftedEquation}
				on:backspace={handleCrafterBackspace}
				on:submitEquation={handleSubmitEquation}
				on:castSpell={handleCastSpell}
			/>
		{/if}
	</div>
</div>

<style>
	/* Game UI Styles will go here */
	.equation-arena-container {
		/* Styles from before, but maybe constrain max-width/height */
		max-width: 500px; /* Example max width */
		max-height: 800px; /* Example max height */
		width: 90%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start; /* Changed from space-between */
		padding: 1rem 1rem 0 1rem; /* Increased bottom padding */
		box-sizing: border-box;
		font-family: sans-serif;
		background-color: #f0f4f8;
		color: #333;
		border-radius: 10px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		overflow-y: auto; /* Add vertical scroll if content overflows */
	}

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
		/* flex-grow: 1; */ /* Removed flex-grow */
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		gap: 0.25rem; /* Add small gap between elements */
		position: relative; /* Make this the reference for absolute positioning */
		margin-bottom: 1rem; /* Added margin */
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
		/* Added margin-bottom back, as it was removed in prev screenshot */
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
		font-family: monospace; /* Better for equations */
		font-size: 1.6rem; /* Adjust size as needed */
		min-height: 50px; /* Ensure consistent height */
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

	.numpad-area {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.damage-dealt-text {
		position: absolute;
		top: 20%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 1.5rem;
		font-weight: bold;
		color: #e74c3c;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
		pointer-events: none;
		opacity: 0;
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

	/* Added styles for feedback overlay and bonuses */
	.feedback-overlay {
		position: absolute;
		top: 50%; /* Center vertically relative to enemy area */
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		pointer-events: none; /* Prevent interaction */
	}

	.damage-dealt-text {
		font-size: 1.8rem;
		font-weight: bold;
		color: #e74c3c;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
		opacity: 0;
	}

	.bonus-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		background-color: rgba(255, 215, 0, 0.8); /* Gold background */
		color: #4b3621; /* Dark brown text */
		padding: 5px 10px;
		border-radius: 5px;
		font-size: 0.9rem;
		font-weight: bold;
		text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.3);
		opacity: 0;
	}

	.animate-damage {
		animation: show-feedback 1s ease-out forwards;
	}
	.animate-bonus {
		animation: show-feedback 1.2s ease-out 0.1s forwards; /* Slight delay */
	}

	@keyframes show-feedback {
		0% {
			opacity: 0;
			transform: translateY(20px) scale(0.8);
		}
		20% {
			opacity: 1;
			transform: translateY(-5px) scale(1.1);
		}
		80% {
			opacity: 1;
			transform: translateY(-10px) scale(1);
		}
		100% {
			opacity: 0;
			transform: translateY(-20px) scale(0.9);
		}
	}

	.equation-display.eval-error {
		border-color: #e74c3c; /* Red border for error */
		background-color: #fadbd8;
	}

	.error-text {
		font-size: 1.2rem; /* Slightly smaller */
		color: #c0392b; /* Darker red */
		font-weight: bold;
	}
</style>
