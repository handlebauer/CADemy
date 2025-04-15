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

	// --- Exported Props ---
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
	export let craftedEquationString: string = '';
	export let isCraftingPhase: boolean = false;
	export let crafterLevelDescription: string | null = null;
	export let activeBonuses: BonusConfig[] = [];
	export let evaluationError: string | null = null;
	export let allowedCrafterChars: string[] | null = null;
	export let isCraftedEquationValidForLevel: boolean = true;
	export let currentLevelNumber: number = 1;
	export let showCrafterFeedback: boolean = false;
	export let crafterFeedbackDetails: {
		incorrectEq: string;
		incorrectVal: string;
		correctVal: number | null;
		steps: string[];
	} | null = null;

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
	function handleCastSpell() {
		dispatch('castSpell');
	}

	// --- Reactive Segment Calculations ---
	// (These still need to happen here as they depend on multiple props)
	$: solverSolvingSegments = parseEquationForDisplay(
		currentEquation.replace('?', playerInput + '_'),
		currentLevelNumber
	);
	$: solverResultSegments = parseEquationForDisplay(
		lastFullEquation.replace('?', lastPlayerInput) + '_',
		currentLevelNumber
	);
	$: crafterCraftingSegments = parseEquationForDisplay(
		(craftedEquationString || '') + '_',
		currentLevelNumber
	);
	$: crafterSolvingEqSegments = parseEquationForDisplay(craftedEquationString, currentLevelNumber);
	$: crafterSolvingInputSegments = parseEquationForDisplay(playerInput + '_', currentLevelNumber);
	$: crafterResultSegments = parseEquationForDisplay(
		lastFullEquation.replace('?', lastPlayerInput) + '_',
		currentLevelNumber
	);

	// ---> ADDITION: Parse feedback strings into segments <--- */
	$: incorrectAttemptSegments = crafterFeedbackDetails
		? parseEquationForDisplay(
				`${crafterFeedbackDetails.incorrectEq} = ${crafterFeedbackDetails.incorrectVal}`,
				currentLevelNumber // Pass level, though it might not affect spacing
			)
		: [];

	$: correctSequenceSegments = crafterFeedbackDetails?.steps
		? parseEquationForDisplay(crafterFeedbackDetails.steps.join(' = '), currentLevelNumber)
		: [];
	// ---> END ADDITION <--- */
</script>

<!-- Game UI Layout -->
<div class="equation-arena-container" class:shake={false} class:shake-shield={false}>
	<!-- Use the new TopBar component -->
	<TopBar {playerHealth} {isShieldActive} {gameTime} {formattedTime} />

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
	/>

	<!-- Use the new SpellSelection component -->
	<SpellSelection {selectedSpell} on:selectSpell={handleSelectSpellEvent} />

	<!-- Equation Display -->
	<div
		id="equation-display-wrapper"
		class="equation-display-wrapper"
		class:status-solving={gameStatus === GameStatus.SOLVING}
		class:status-result={gameStatus === GameStatus.RESULT}
		class:status-pregame={gameStatus === GameStatus.PRE_GAME}
	>
		<div
			class="equation-display"
			class:correct={lastAnswerCorrect === true && gameStatus === GameStatus.RESULT}
			class:incorrect={lastAnswerCorrect === false && gameStatus === GameStatus.RESULT}
			class:eval-error={!!evaluationError && gameStatus === GameStatus.RESULT}
		>
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
			/>
		</div>

		{#if showCrafterFeedback && crafterFeedbackDetails}
			<div class="feedback-overlay">
				<div class="feedback-content">
					<div class="feedback-inner-box">
						<p class="feedback-line incorrect-attempt">
							{#each incorrectAttemptSegments as segment, i (i)}
								{#if segment.type === 'fraction'}
									<span class="segment segment-fraction">
										<span class="fraction">
											<span class="numerator">{segment.numerator}</span>
											<span class="denominator">{segment.denominator}</span>
										</span>
									</span>
								{:else}
									<span class="segment segment-{segment.type}">{segment.value}</span>
								{/if}
							{/each}
						</p>
						<p class="should-be">should be</p>
						{#if crafterFeedbackDetails.correctVal !== null}
							<p class="feedback-line correct-eval">
								{#each correctSequenceSegments as segment, i (i)}
									{#if segment.type === 'fraction'}
										<span class="segment segment-fraction">
											<span class="fraction">
												<span class="numerator">{segment.numerator}</span>
												<span class="denominator">{segment.denominator}</span>
											</span>
										</span>
									{:else}
										<span class="segment segment-{segment.type}">{segment.value}</span>
									{/if}
								{/each}
							</p>
						{:else}
							<p class="feedback-line error-eval">Couldn't evaluate your equation.</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Crafter Level Description -->
	{#if gameMode === 'crafter' && (gameStatus === GameStatus.SOLVING || gameStatus === GameStatus.RESULT) && crafterLevelDescription}
		<div class="crafter-objective">🎯 Goal: {crafterLevelDescription}</div>
	{/if}

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
				allowedChars={allowedCrafterChars}
				{isCraftedEquationValidForLevel}
				on:inputChar={handleCrafterInputChar}
				on:clear={handleClearCraftedEquation}
				on:backspace={handleCrafterBackspace}
				on:submitEquation={handleSubmitEquation}
				on:castSpell={handleCastSpell}
				on:inputNumber={handleAnswerInput}
				on:backspaceAnswer={handleAnswerBackspace}
				on:clearAnswer={handleClearAnswerInput}
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
		height: 70px;
		margin-bottom: 1.5rem;
	}

	.equation-display {
		width: 350px;
		height: 70px; /* Added fixed height */
		background-color: #fffbea; /* Light yellow background */
		border: 2px solid #f9d423; /* Yellow border */
		border-radius: 8px;
		padding: 1rem;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.8em; /* Larger font size */
		font-weight: bold;
		text-align: center;
		transition:
			background-color 0.3s ease,
			border-color 0.3s ease;
		overflow: hidden;
		white-space: nowrap; /* Prevent wrapping of equation */
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

	.numpad-area {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.equation-display.eval-error {
		border-color: #e74c3c; /* Red border for error */
		background-color: #fadbd8;
	}

	/* --- Fraction Styling --- */
	:global(.fraction) {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		vertical-align: middle; /* Align with surrounding text */
		margin: 0 0.1em; /* Small horizontal margin */
		line-height: 1; /* Prevent extra vertical space */
	}
	:global(.numerator) {
		font-size: 0.8em; /* Slightly smaller */
		line-height: 1;
		padding-bottom: 0.1em;
	}
	:global(.denominator) {
		font-size: 0.8em;
		line-height: 1;
		border-top: 1.5px solid currentColor; /* Fraction line */
		padding-top: 0.1em;
	}

	.crafter-objective {
		font-size: 0.9em;
		color: #555;
		background-color: #eaf2f8;
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		margin-top: -0.75rem; /* Pull up slightly below equation display */
		margin-bottom: 1rem; /* Add space before numpad */
		max-width: 350px;
		text-align: center;
	}

	.feedback-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 360px;
		height: auto;
		background-color: #f8d7da;
		border: 2px solid #f5c6cb;
		border-radius: 12px;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0.5rem;
		box-sizing: border-box;
		z-index: 10;
		animation: fadeIn 0.3s ease-out;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
	}

	.feedback-content {
		text-align: center;
		font-size: 1em;
		color: #333;
		width: 100%;
	}

	.feedback-inner-box {
		background-color: #ffffff;
		border-radius: 8px;
		padding: 1.5rem 1.5rem;
		margin: 0;
		box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.05);
	}

	.feedback-line {
		margin: 0.5rem 0;
		font-size: 1.1em;
		line-height: 1.3;
	}

	/* ---> ADDITION: Copied Segment Spacing Styles <--- */
	/* Apply these within the feedback box context */
	.feedback-inner-box .segment {
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
		margin: 0; /* Base margin */
		font-weight: bold; /* Apply bold to all segments */
		font-family: monospace;
	}

	.feedback-inner-box .segment-operator {
		margin: 0 0.2em; /* Space around operators */
	}

	.feedback-inner-box .segment-paren_open {
		margin-left: 0.1em;
		margin-right: 0.05em;
	}

	.feedback-inner-box .segment-paren_close {
		margin-left: 0.05em;
		margin-right: 0.1em;
	}
	/* ---> END ADDITION <--- */

	/* ---> ADDITION: Fraction Styling (scoped) <--- */
	.feedback-inner-box .segment-fraction {
		margin: 0 0.1em;
	}
	.feedback-inner-box .fraction {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		vertical-align: middle;
		margin: 0 0.1em;
		line-height: 1;
	}
	.feedback-inner-box .numerator {
		font-size: 0.8em;
		line-height: 1;
		padding-bottom: 0.1em;
	}
	.feedback-inner-box .denominator {
		font-size: 0.8em;
		line-height: 1;
		border-top: 1.5px solid currentColor;
		padding-top: 0.1em;
	}
	/* ---> END ADDITION <--- */

	/* Style the specific lines */
	.incorrect-attempt .segment {
		color: #dc3545; /* Red for incorrect attempt */
	}

	.correct-eval .segment {
		color: #000000; /* Black for correct sequence */
	}

	.feedback-tip {
		margin-top: 0.4rem;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.should-be {
		margin: 1rem 0;
		font-style: italic;
		font-weight: bold;
		color: #dc3545;
	}
</style>
