<script lang="ts">
	import type { GameMode, DisplaySegment } from '../../types';
	import { GameStatus } from '../../types';
	import FeedbackOverlay from '../FeedbackOverlay.svelte';

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
		<span class="info-text">Loading...</span>
	{/if}
{:else}
	<!-- Initial state or unknown mode -->
	<span class="info-text">...</span>
{/if}

<style>
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
</style>
