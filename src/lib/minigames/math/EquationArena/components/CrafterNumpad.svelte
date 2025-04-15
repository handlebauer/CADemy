<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { GameStatus, type SpellType } from '../types'; // Import necessary types

	const dispatch = createEventDispatcher<{
		// Crafting events
		inputChar: string; // For numbers, operators, parentheses
		backspace: void; // Backspace for crafter
		clear: void; // Clear for crafter
		submitEquation: void; // For finishing crafting
		// Answer input events (when isCraftingPhase is false)
		inputNumber: number; // For answer numbers
		backspaceAnswer: void; // Backspace for answer
		clearAnswer: void; // Clear for answer
		castSpell: void; // For casting after crafting/answering
	}>();

	// Props needed for conditional button logic
	export let gameStatus: GameStatus;
	export let isCraftingPhase: boolean;
	export let playerInput: string;
	export let selectedSpell: SpellType | null;
	export let craftedEquationString: string;
</script>

<!-- Reworked layout to match iOS calculator style (4 columns) -->
<div class="crafter-numpad">
	<!-- Row 1 -->
	<button
		class="action-btn clear-btn"
		on:click={() => dispatch(isCraftingPhase ? 'clear' : 'clearAnswer')}>C</button
	>
	<div class="paren-buttons">
		<button
			class="op-btn special-btn"
			on:click={() => dispatch('inputChar', '(')}
			disabled={!isCraftingPhase}
			>(
		</button>
		<button
			class="op-btn special-btn"
			on:click={() => dispatch('inputChar', ')')}
			disabled={!isCraftingPhase}>)</button
		>
	</div>
	<button class="op-btn" on:click={() => dispatch('inputChar', '÷')} disabled={!isCraftingPhase}
		>÷</button
	>

	<!-- Row 2 -->
	<button
		class="num-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '7' : 7)}>7</button
	>
	<button
		class="num-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '8' : 8)}>8</button
	>
	<button
		class="num-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '9' : 9)}>9</button
	>
	<button class="op-btn" on:click={() => dispatch('inputChar', '×')} disabled={!isCraftingPhase}
		>×</button
	>

	<!-- Row 3 -->
	<button
		class="num-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '4' : 4)}>4</button
	>
	<button
		class="num-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '5' : 5)}>5</button
	>
	<button
		class="num-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '6' : 6)}>6</button
	>
	<button class="op-btn" on:click={() => dispatch('inputChar', '-')} disabled={!isCraftingPhase}
		>-</button
	>

	<!-- Row 4 -->
	<button
		class="num-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '1' : 1)}>1</button
	>
	<button
		class="num-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '2' : 2)}>2</button
	>
	<button
		class="num-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '3' : 3)}>3</button
	>
	<button class="op-btn" on:click={() => dispatch('inputChar', '+')} disabled={!isCraftingPhase}
		>+</button
	>

	<!-- Row 5 -->
	<button
		class="num-btn zero-btn"
		on:click={() =>
			dispatch(isCraftingPhase ? 'inputChar' : 'inputNumber', isCraftingPhase ? '0' : 0)}>0</button
	>
	<button
		class="action-btn backspace-btn wide-btn"
		on:click={() => dispatch(isCraftingPhase ? 'backspace' : 'backspaceAnswer')}
	>
		UNDO
	</button>

	<!-- Row 6: Conditional Submit/Cast button -->
	<button
		class="submit-btn"
		on:click={() => dispatch(isCraftingPhase ? 'submitEquation' : 'castSpell')}
		disabled={isCraftingPhase
			? gameStatus !== GameStatus.SOLVING || !craftedEquationString.trim()
			: gameStatus !== GameStatus.SOLVING || playerInput === '' || !selectedSpell}
		class:glow={!isCraftingPhase &&
			gameStatus === GameStatus.SOLVING &&
			playerInput !== '' &&
			!!selectedSpell}
	>
		{isCraftingPhase ? 'CRAFT' : 'CAST SPELL'}
	</button>
</div>

<style>
	.crafter-numpad {
		display: grid;
		grid-template-columns: repeat(4, 1fr); /* 4 columns */
		gap: 0.5rem;
		width: 90%;
		max-width: 320px;
	}

	/* --- Parentheses Wrapper Style --- */
	.paren-buttons {
		grid-column: span 2; /* Make the wrapper span 2 columns */
		display: flex;
		gap: 0.5rem;
	}
	.paren-buttons button {
		flex: 1; /* Make buttons fill the wrapper space */
	}

	/* General button style (kept from previous reversion) */
	button {
		padding: 0.75rem;
		font-size: 1.1em;
		border: 1px solid #ccc;
		border-radius: 8px;
		cursor: pointer;
		background-color: #fff;
		transition:
			background-color 0.2s,
			transform 0.15s ease-out;
		font-family: inherit;
		min-height: 45px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	button:hover:not(:disabled) {
		background-color: #eee;
		transform: scale(1.05);
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* --- Specific Button Layouts & Styles --- */

	.zero-btn {
		grid-column: 1 / 3; /* Span 2 columns */
	}

	.wide-btn {
		grid-column: span 2; /* Make DEL span 2 columns */
	}

	.submit-btn {
		grid-column: 1 / -1; /* Span all 4 columns */
		background-color: #d1e7dd; /* Light green */
		border-color: #badbcc;
		font-weight: bold;
		transition: all 0.2s ease;
		padding: 0.7rem 2rem;
		font-size: 1.1rem;
		color: #155724;
		box-shadow: 0 3px 8px rgba(30, 87, 51, 0.4);
	}
	.submit-btn:hover:not(:disabled) {
		background-color: #badbcc;
		transform: translateY(-1px);
		box-shadow: 0 5px 12px rgba(30, 87, 51, 0.5);
	}
	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 2px 5px rgba(30, 87, 51, 0.3);
	}
	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: #ccc;
		box-shadow: none;
	}

	.submit-btn.glow {
		background: linear-gradient(145deg, #f093fb, #f5576c); /* Pink/Red Gradient */
		color: white;
		box-shadow: 0 0 15px 5px rgba(245, 87, 108, 0.6); /* Glowing effect */
		animation: pulse-glow-cast 1.5s infinite ease-in-out;
	}

	@keyframes pulse-glow-cast {
		0% {
			box-shadow: 0 0 8px rgba(245, 87, 108, 0.5);
		}
		50% {
			box-shadow: 0 0 20px rgba(245, 87, 108, 0.9);
		}
		100% {
			box-shadow: 0 0 8px rgba(245, 87, 108, 0.5);
		}
	}

	/* Apply specific colors like before */
	.op-btn {
		background-color: #f8f9fa;
	}

	.action-btn {
		font-weight: bold;
	}

	.backspace-btn {
		background-color: #f8d7da; /* Light red */
		border-color: #f5c6cb;
	}
	.backspace-btn:hover:not(:disabled) {
		background-color: #f5c6cb;
	}

	.clear-btn {
		background-color: #fff3cd; /* Light yellow */
		border-color: #ffeeba;
	}
	.clear-btn:hover:not(:disabled) {
		background-color: #ffeeba;
	}
</style>
