<script lang="ts">
	import type { DisplaySegment as Segment } from '../types';

	export let incorrectAttemptSegments: Segment[] = [];
	export let correctSequenceSegments: Segment[] = [];
	export let correctVal: number | null = null;
</script>

<div class="feedback-overlay">
	<div class="feedback-content">
		<div class="feedback-inner-box">
			<!-- Your attempt -->
			<div class="feedback-section attempt">
				<div class="section-label">Your Spell</div>
				<div class="equation-container incorrect">
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
				</div>
			</div>

			<!-- Divider with text -->
			<div class="divider">
				<div class="divider-content">
					<span class="divider-line"></span>
					<span class="divider-text">should be</span>
					<span class="divider-line"></span>
				</div>
			</div>

			<!-- Correct solution -->
			<div class="feedback-section solution">
				<div class="section-label">Correct Spell</div>
				{#if correctVal !== null}
					<div class="equation-container correct">
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
					</div>
				{:else}
					<p class="feedback-line error-eval">
						<span class="error-icon">⚠️</span>
						Couldn't evaluate your equation
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.feedback-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 380px;
		background: linear-gradient(to bottom, rgba(248, 215, 218, 0.98), rgba(248, 200, 205, 0.98));
		border: 2px solid rgba(245, 198, 203, 0.8);
		border-radius: 20px;
		padding: 0.75rem;
		box-sizing: border-box;
		z-index: 10;
		animation: fadeIn 0.3s ease-out;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.12),
			0 2px 8px rgba(0, 0, 0, 0.08),
			0 0 0 1px rgba(255, 255, 255, 0.5) inset;
	}

	.feedback-content {
		text-align: center;
		width: 100%;
		color: #333;
	}

	.feedback-inner-box {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 16px;
		padding: 1rem;
		margin: 0;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.05),
			0 0 0 1px rgba(0, 0, 0, 0.02);
	}

	.feedback-section {
		padding: 0.5rem;
		border-radius: 12px;
		transition: transform 0.2s ease;
	}

	.equation-container {
		background: rgba(255, 255, 255, 0.9);
		border-radius: 10px;
		padding: 0.4rem 0.5rem;
		margin: 0.25rem 0;
		border: 1px solid transparent;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		transition: all 0.2s ease;
		overflow: hidden;
	}

	.equation-container.incorrect {
		background: rgba(255, 235, 238, 0.9);
		border-color: rgba(220, 53, 69, 0.1);
	}

	.equation-container.correct {
		background: rgba(248, 249, 250, 0.9);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.section-label {
		font-size: 0.85em;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 0.4rem;
		color: #555;
		font-weight: 700;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	.feedback-line {
		margin: 0;
		font-size: 1.4em;
		line-height: 1.4;
		padding: 0.4rem 0.5rem;
		font-family: 'Fira Code', monospace;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	/* Divider styling */
	.divider {
		padding: 0.4rem 0;
		margin: 0.4rem 0;
	}

	.divider-content {
		display: flex;
		align-items: center;
		max-width: 80%;
		margin: 0 auto;
	}

	.divider-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(to right, transparent, rgba(220, 53, 69, 0.5), transparent);
	}

	.divider-text {
		margin: 0 1rem;
		color: #dc3545;
		font-style: italic;
		font-size: 0.85em;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	/* Segment styling */
	.segment {
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
		margin: 0;
		font-weight: 600;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
	}

	.segment-operator {
		margin: 0 0.25em;
		opacity: 0.85;
	}

	.segment-paren_open {
		margin-right: 0.1em;
		opacity: 0.75;
	}

	.segment-paren_close {
		margin-left: 0.1em;
		opacity: 0.75;
	}

	/* Fraction styling */
	.segment-fraction {
		margin: 0 0.2em;
	}

	.fraction {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		vertical-align: middle;
		margin: 0 0.1em;
		line-height: 1;
		padding: 0.1em 0;
	}

	.numerator,
	.denominator {
		font-size: 0.7em;
		line-height: 1.2;
		padding: 0.1em;
	}

	.denominator {
		border-top: 2px solid currentColor;
		padding-top: 0.2em;
	}

	/* Result styling */
	.incorrect-attempt .segment {
		color: #dc3545;
	}

	.correct-eval .segment {
		color: #212529;
	}

	.error-eval {
		color: #721c24;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 1.2em;
		background: rgba(248, 215, 218, 0.3);
		border-radius: 8px;
		padding: 1rem;
		margin: 0.5rem 0;
	}

	.error-icon {
		font-size: 1.2em;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translate(-50%, -48%) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}
</style>
