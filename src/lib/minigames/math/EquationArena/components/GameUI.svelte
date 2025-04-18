<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { GameMode, BonusConfig, SpellType, EnemyConfig } from '../types';
	import { GameStatus } from '../types';

	import { parseEquationForDisplay } from '../utils/display';

	import SolverNumpad from './input/SolverNumpad.svelte';
	import CrafterNumpad from './input/CrafterNumpad.svelte';
	import EnemyDisplay from './display/EnemyDisplay.svelte';
	import EquationDisplay from './display/EquationDisplay.svelte';
	import SpellSelection from './input/SpellSelection.svelte';
	import TopBar from './display/TopBar.svelte';
	import FeedbackOverlay from './FeedbackOverlay.svelte';

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
		// Level start event
		startLevel: void;
		// Reset Crafter back to crafting phase
		resetCrafter: void;
	}>();

	// --- Exported Props ---
	export let gameStatus: GameStatus;
	export let playerHealth: number;
	export let enemyHealth: number;
	export let currentEnemyConfig: EnemyConfig | null = null;
	export let formattedTime: string;
	export let attackTimeRemaining: number; // Changed from gameTime
	export let maxAttackTime: number; // Add maxAttackTime for progress indicator
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
	export let crafterSubMode: 'normal' | 'challenge' | null = null;
	export let craftedEquationString: string = '';
	export let isCraftingPhase: boolean = false;
	export let crafterLevelDescription: string | null = null;
	export let activeBonuses: BonusConfig[] = [];
	export let evaluationError: string | null = null;
	export let allowedChars: string[] | null = null;
	export let isCraftedEquationValidForLevel: boolean = true;
	export let currentLevelNumber: number = 1;
	export let effectiveRuleLevel: number; // <<< ADDED: Effective level for rules/parsing
	export let showCrafterFeedback: boolean = false;
	export let crafterFeedbackDetails: {
		incorrectEq: string;
		incorrectVal: string;
		correctVal: number | null;
		steps: string[];
	} | null = null;
	export let damageTaken: number | null = null;
	export let isEnemyTelegraphing: boolean = false;
	export let isFeedbackActive: boolean = false;
	export let waitingForPlayerStart: boolean = true;
	export let isTimerFrozen: boolean = false;
	export let scaledHealthBonus: number | null = null;
	export let scaledTimeBonusSeconds: number | null = null; // ---> ADDITION: Time bonus prop

	// --- Event Handlers ---
	// Bubble up the selectSpell event from the child component
	function handleSelectSpellEvent(event: CustomEvent<SpellType>) {
		dispatch('selectSpell', event.detail);
	}
	// Other handlers remain the same
	function handleAnswerInput(event: CustomEvent<number>) {
		dispatch('handleInput', event.detail);
	}
	function handleClearAnswerInput() {
		dispatch('clearInput');
	}
	function handleAnswerBackspace() {
		dispatch('handleBackspace');
	}
	function handleCastSpell() {
		dispatch('castSpell');
	}
	function handleStartLevel() {
		dispatch('startLevel');
	}

	// ADDED: Handler for the reset event from CrafterNumpad
	function handleResetToCrafting() {
		dispatch('resetCrafter'); // Dispatch a new event upwards
	}

	// --- Reactive Segment Calculations ---
	// (These still need to happen here as they depend on multiple props)
	$: solverSolvingSegments = parseEquationForDisplay(
		currentEquation.replace('?', playerInput + '_'),
		effectiveRuleLevel // Use effective level
	);
	$: solverResultSegments = parseEquationForDisplay(
		lastFullEquation.replace('?', lastPlayerInput) + '_',
		effectiveRuleLevel // Use effective level
	);
	$: crafterCraftingSegments = parseEquationForDisplay(
		(craftedEquationString || '') + '_',
		effectiveRuleLevel // Use effective level
	);
	$: crafterSolvingEqSegments = parseEquationForDisplay(craftedEquationString, effectiveRuleLevel); // Use effective level
	$: crafterSolvingInputSegments = parseEquationForDisplay(playerInput + '_', effectiveRuleLevel); // Use effective level
	$: crafterResultSegments = parseEquationForDisplay(
		lastFullEquation.replace('?', lastPlayerInput) + '_',
		effectiveRuleLevel // Use effective level
	);

	// ---> ADDITION: Parse feedback strings into segments <--- */
	$: incorrectAttemptSegments = crafterFeedbackDetails
		? parseEquationForDisplay(
				`${crafterFeedbackDetails.incorrectEq} = ${crafterFeedbackDetails.incorrectVal}`,
				effectiveRuleLevel // Use effective level
			)
		: [];

	$: correctSequenceSegments = crafterFeedbackDetails?.steps
		? parseEquationForDisplay(crafterFeedbackDetails.steps.join(' = '), effectiveRuleLevel) // Use effective level
		: [];
	// ---> END ADDITION <--- */
</script>

<!-- Game UI Layout -->
<div class="equation-arena-container" class:shake={false} class:shake-shield={false}>
	<!-- Use the new TopBar component -->
	<TopBar
		{playerHealth}
		{attackTimeRemaining}
		{maxAttackTime}
		{formattedTime}
		{damageTaken}
		{waitingForPlayerStart}
		{isTimerFrozen}
		{gameMode}
		{crafterSubMode}
		{scaledTimeBonusSeconds}
	/>

	<!-- Enemy Display Component -->
	<EnemyDisplay
		{currentEnemyConfig}
		{enemyHealth}
		{enemyHit}
		{enemyDefeatedAnimating}
		{displayedDamage}
		{lastAnswerCorrect}
		{activeBonuses}
		{gameStatus}
		{isEnemyTelegraphing}
		{gameMode}
		{crafterSubMode}
		{scaledHealthBonus}
	/>

	<!-- Use the new SpellSelection component -->
	<SpellSelection {selectedSpell} on:selectSpell={handleSelectSpellEvent} />

	<!-- Equation Display Wrapper -->
	<div
		id="equation-display-wrapper"
		class="equation-display-wrapper"
		class:shake={false}
		class:shake-shield={false}
	>
		<div class="equation-display">
			<EquationDisplay
				{gameMode}
				{gameStatus}
				{isCraftingPhase}
				{solverSolvingSegments}
				{solverResultSegments}
				{crafterCraftingSegments}
				{crafterSolvingEqSegments}
				{crafterSolvingInputSegments}
				{crafterResultSegments}
				{evaluationError}
				{isFeedbackActive}
				{showCrafterFeedback}
				{crafterFeedbackDetails}
				{crafterLevelDescription}
				{currentLevelNumber}
				{waitingForPlayerStart}
				{lastAnswerCorrect}
				on:startLevel={handleStartLevel}
			/>
		</div>

		{#if showCrafterFeedback && crafterFeedbackDetails}
			<FeedbackOverlay
				{incorrectAttemptSegments}
				{correctSequenceSegments}
				correctVal={crafterFeedbackDetails.correctVal}
			/>
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
				{allowedChars}
				{isCraftedEquationValidForLevel}
				{waitingForPlayerStart}
				{currentLevelNumber}
				on:inputChar={(e: CustomEvent<string>) => dispatch('inputChar', e.detail)}
				on:backspace={() => dispatch('backspaceCrafted')}
				on:clear={() => dispatch('clearCrafted')}
				on:submitEquation={() => dispatch('submitEquation')}
				on:castSpell={handleCastSpell}
				on:inputNumber={handleAnswerInput}
				on:backspaceAnswer={handleAnswerBackspace}
				on:clearAnswer={handleClearAnswerInput}
				on:resetToCrafting={handleResetToCrafting}
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

	.equation-display-wrapper {
		position: relative;
		width: 350px;
		height: 90px;
		margin-bottom: 1.5rem;
	}

	.equation-display {
		width: 350px;
		height: 100%;
		border-radius: 8px;
		padding: 1rem;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.8em;
		font-weight: bold;
		text-align: center;
		transition: none;
		overflow: hidden;
		white-space: nowrap;
	}

	.numpad-area {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	/* --- Fraction Styling --- */
	:global(.fraction) {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		vertical-align: middle;
		margin: 0 0.1em;
		line-height: 1;
	}
	:global(.numerator) {
		font-size: 0.8em;
		line-height: 1;
		padding-bottom: 0.1em;
	}
	:global(.denominator) {
		font-size: 0.8em;
		line-height: 1;
		border-top: 1.5px solid currentColor;
		padding-top: 0.1em;
	}

	/* Remove the crafter-objective style as it's no longer needed */
</style>
