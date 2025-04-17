<script lang="ts">
	import type { GameMode, DisplaySegment } from '../../types';
	import { GameStatus } from '../../types';
	import FeedbackOverlay from '../FeedbackOverlay.svelte';
	import { onMount, createEventDispatcher } from 'svelte';

	export let gameMode: GameMode | null = null;
	export let gameStatus: GameStatus;
	export let isCraftingPhase: boolean = false;
	export let solverSolvingSegments: DisplaySegment[] = [];
	export let solverResultSegments: DisplaySegment[] = [];
	export let crafterCraftingSegments: DisplaySegment[] = [];
	export let crafterSolvingEqSegments: DisplaySegment[] = [];
	export let crafterSolvingInputSegments: DisplaySegment[] = [];
	export let crafterResultSegments: DisplaySegment[] = [];
	export let evaluationError: string | null = null;
	export let isFeedbackActive: boolean = false;
	export let showCrafterFeedback: boolean = false;
	export let crafterFeedbackDetails: {
		incorrectEq: string;
		incorrectVal: string;
		correctVal: number | null;
		steps: string[];
	} | null = null;
	export let crafterLevelDescription: string | null = null;
	export let currentLevelNumber: number = 1;
	export let waitingForPlayerStart: boolean = true;
	export let lastAnswerCorrect: boolean | null = null;

	const dispatch = createEventDispatcher<{
		startLevel: void;
	}>();

	// Flip animation state
	let showingGoal = true;
	let isFlipping = false;
	let flipAnimationInProgress = false;

	function handleStartLevel() {
		if (showingGoal && waitingForPlayerStart && !flipAnimationInProgress) {
			flipAnimationInProgress = true;
			isFlipping = true;

			// Wait for the complete animation to finish before changing state
			setTimeout(() => {
				showingGoal = false;
				dispatch('startLevel');
				flipAnimationInProgress = false;
			}, 800); // Full animation duration
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && showingGoal && waitingForPlayerStart && !flipAnimationInProgress) {
			handleStartLevel();
		}
	}

	onMount(() => {
		// Only add keyboard listener when showing goal
		if (showingGoal && waitingForPlayerStart) {
			window.addEventListener('keydown', handleKeyDown);
		}

		// If there's no level description or not in crafter mode, skip goal display
		if (!crafterLevelDescription || gameMode !== 'crafter') {
			showingGoal = false;
			dispatch('startLevel');
		}

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	$: incorrectAttemptSegments = crafterFeedbackDetails
		? parseEquationForDisplay(
				`${crafterFeedbackDetails.incorrectEq} = ${crafterFeedbackDetails.incorrectVal}`,
				1
			)
		: [];

	$: correctSequenceSegments = crafterFeedbackDetails?.steps
		? parseEquationForDisplay(crafterFeedbackDetails.steps.join(' = '), 1)
		: [];

	import { parseEquationForDisplay } from '../../utils/display';
</script>

<div class="card-container" class:flipped={isFlipping}>
	<button class="card-side card-front" on:click={handleStartLevel}>
		<div class="goal-container">
			<div class="level-badge">Level {currentLevelNumber}</div>
			<div class="goal-text">{crafterLevelDescription}</div>
			<div class="start-prompt">
				Press <span class="key">Enter</span> to Start
			</div>
		</div>
	</button>

	<div
		class="card-side card-back"
		class:correct={lastAnswerCorrect === true && gameStatus === GameStatus.RESULT}
		class:incorrect={(lastAnswerCorrect === false && gameStatus === GameStatus.RESULT) ||
			isFeedbackActive}
		class:eval-error={(!!evaluationError && gameStatus === GameStatus.RESULT) || isFeedbackActive}
	>
		{#if gameMode === 'solver'}
			{#if gameStatus === GameStatus.SOLVING}
				<!-- Solver: Solving Equation -->
				<span class="equation-text">
					{#each solverSolvingSegments as segment, i (i)}
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
				</span>
			{:else if gameStatus === GameStatus.RESULT}
				<!-- Solver: Result Equation -->
				<div class="result-equation">
					<span class="equation-content">
						{#each solverResultSegments as segment, i (i)}
							{#if segment.type === 'fraction'}
								<span class="segment segment-fraction">
									<span class="fraction">
										<span class="numerator">{segment.numerator}</span>
										<span class="denominator">{segment.denominator}</span>
									</span>
								</span>
							{:else}
								<span
									class="segment segment-{segment.type}"
									class:placeholder-hidden={segment.type === 'placeholder'}
								>
									{segment.value}
								</span>
							{/if}
						{/each}
					</span>
				</div>
			{:else}
				<span class="info-text">Loading...</span>
			{/if}
		{:else if gameMode === 'crafter'}
			{#if gameStatus === GameStatus.SOLVING}
				{#if isFeedbackActive}
					{#if evaluationError === 'Equation already used!'}
						<!-- Show duplicate feedback error -->
						<span class="info-text eval-error-text">{evaluationError}</span>
					{:else if showCrafterFeedback && crafterFeedbackDetails}
						<!-- Show incorrect answer feedback overlay -->
						<FeedbackOverlay
							{incorrectAttemptSegments}
							{correctSequenceSegments}
							correctVal={crafterFeedbackDetails.correctVal}
						/>
					{/if}
				{:else if isCraftingPhase}
					<!-- Crafter: Crafting Equation -->
					<span class="equation-text">
						{#each crafterCraftingSegments as segment, i (i)}
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
					</span>
				{:else}
					<!-- Crafter: Solving Equation -->
					<span class="equation-text">
						{#each crafterSolvingEqSegments as segment, i (i)}
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
						<span class="segment segment-operator"> = </span>
						{#each crafterSolvingInputSegments as segment, i (i)}
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
					</span>
				{/if}
			{:else if gameStatus === GameStatus.RESULT}
				{#if evaluationError}
					<!-- Crafter: FINAL Evaluation Error Message (e.g., structural) -->
					<span class="info-text eval-error-text">{evaluationError}</span>
				{:else}
					<!-- Crafter: Result Equation -->
					<span class="equation-content">
						{#each crafterResultSegments as segment, i (i)}
							{#if segment.type === 'fraction'}
								<span class="segment segment-fraction">
									<span class="fraction">
										<span class="numerator">{segment.numerator}</span>
										<span class="denominator">{segment.denominator}</span>
									</span>
								</span>
							{:else}
								<span
									class="segment segment-{segment.type}"
									class:placeholder-hidden={segment.type === 'placeholder'}
								>
									{segment.value}
								</span>
							{/if}
						{/each}
					</span>
				{/if}
			{:else}
				<span class="info-text">...</span>
			{/if}
		{:else}
			<!-- Initial state or unknown mode -->
			<span class="info-text">...</span>
		{/if}
	</div>
</div>

<style>
	.card-container {
		position: relative;
		width: 100%;
		height: 100%;
		perspective: 1000px;
		transform-style: preserve-3d;
		transition: transform 800ms;
	}

	.card-container.flipped {
		transform: rotateX(180deg);
	}

	.card-side {
		position: absolute;
		width: 100%;
		height: 100%;
		backface-visibility: hidden;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 8px;
		transition:
			background-color 0.3s ease,
			border-color 0.3s ease;
	}

	.card-front {
		background-color: #f0f9ff; /* Light blue tint */
		border: 2px solid #3498db;
		z-index: 2;
		cursor: pointer;
	}

	.card-back {
		/* Base styles for the equation display */
		background-color: #fffbea;
		border: 2px solid #f9d423;
		transform: rotateX(180deg);
	}

	/* Conditional styles for the equation display */
	.card-back.correct {
		background-color: #e6f4ea;
		border-color: #b7e4c7;
		animation: pulse-correct 0.4s ease-in-out;
	}

	.card-back.incorrect {
		background-color: #f8d7da;
		border-color: #f5c6cb;
		animation: shake-incorrect 0.4s ease-in-out;
	}

	.card-back.eval-error {
		border-color: #e74c3c; /* Red border for error */
		background-color: #fadbd8;
	}

	.goal-container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 0.3rem;
		box-sizing: border-box;
		text-align: center;
		position: relative;
	}

	.level-badge {
		position: absolute;
		top: -19px;
		left: -5px;
		font-size: 0.65rem;
		font-weight: bold;
		color: white;
		background-color: #3498db;
		padding: 1px 5px;
		border-radius: 8px;
	}

	.goal-text {
		font-size: 1.1rem;
		line-height: 1.2;
		font-weight: bold;
		color: #2c3e50;
		max-width: 95%;
		overflow-wrap: break-word;
	}

	.start-prompt {
		font-size: 0.55rem;
		color: #95a5a6;
		position: absolute;
		bottom: -18px;
		right: -5px;
	}

	.key {
		display: inline-block;
		background-color: #ecf0f1;
		border: 1px solid #bdc3c7;
		border-radius: 3px;
		padding: 0 3px;
		font-size: 0.5rem;
		font-weight: bold;
		color: #2c3e50;
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
	}

	.equation-text,
	.result-equation,
	.info-text,
	.equation-content {
		font-size: 1.8rem;
		font-weight: bold;
		line-height: 1.2;
		display: inline-flex;
		align-items: center;
		white-space: nowrap;
		width: 100%;
		justify-content: center;
		text-align: center;
	}

	.eval-error-text {
		color: #e74c3c;
		font-size: 1.2rem;
	}

	/* --- Segment Spacing Styles --- */
	.segment {
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
		margin: 0;
	}

	.segment-operator {
		margin: 0 0.2em; /* Space around operators (+, -, *, /, =) */
	}

	.segment-paren_open {
		margin-left: 0.1em;
		margin-right: 0.05em;
	}

	.segment-paren_close {
		margin-left: 0.05em;
		margin-right: 0.1em;
	}

	.segment-fraction {
		margin: 0 0.1em;
	}

	/* Style to hide the placeholder visually but keep layout space */
	.placeholder-hidden {
		visibility: hidden;
	}

	/* --- Fraction Styling --- */
	.fraction {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		vertical-align: middle;
		margin: 0 0.1em;
		line-height: 1;
	}
	.numerator {
		font-size: 0.8em;
		line-height: 1;
		padding-bottom: 0.1em;
	}
	.denominator {
		font-size: 0.8em;
		line-height: 1;
		border-top: 1.5px solid currentColor;
		padding-top: 0.1em;
	}

	/* --- Keyframes (copied from GameUI) --- */
	@keyframes pulse-correct {
		0%,
		100% {
			/* Combine scale and rotate */
			transform: scale(1) rotateX(180deg);
		}
		50% {
			/* Combine scale and rotate */
			transform: scale(1.03) rotateX(180deg);
		}
	}

	@keyframes shake-incorrect {
		10%,
		90% {
			/* Combine translate and rotate */
			transform: translate3d(-1px, 0, 0) rotateX(180deg);
		}
		20%,
		80% {
			/* Combine translate and rotate */
			transform: translate3d(2px, 0, 0) rotateX(180deg);
		}
		30%,
		50%,
		70% {
			/* Combine translate and rotate */
			transform: translate3d(-4px, 0, 0) rotateX(180deg);
		}
		40%,
		60% {
			/* Combine translate and rotate */
			transform: translate3d(4px, 0, 0) rotateX(180deg);
		}
		0%,
		100% {
			transform: translate3d(0, 0, 0) rotateX(180deg);
		}
	}
</style>
