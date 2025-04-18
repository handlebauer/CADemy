<script lang="ts">
	import type { BonusConfig } from '../../types';
	import type { GameMode } from '../../types';

	export let playerHealth: number;
	export let equationsSolvedCorrectly: number;
	export let formattedLevelDuration: string;
	export let currentLevelBonuses: BonusConfig[] = [];
	export let levelScore: number;

	// Declare handlers purely as props expecting functions from the parent
	export let handleExit: () => void;
	export let handleNextLevel: () => void;
	export let handleTryAgain: () => void;

	// Add gameMode and crafterSubMode props
	export let gameMode: GameMode | null = null;
	export let crafterSubMode: 'normal' | 'challenge' | null = null;

	// Reactive block to aggregate bonuses
	$: aggregatedBonuses = currentLevelBonuses.reduce(
		(acc, bonus) => {
			if (!acc[bonus.id]) {
				acc[bonus.id] = { ...bonus, count: 0 };
			}
			acc[bonus.id].count++;
			return acc;
		},
		{} as Record<string, BonusConfig & { count: number }>
	);

	// Convert the aggregated object back to an array for easier iteration in the template
	$: displayedBonuses = Object.values(aggregatedBonuses);
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

	<div class="metrics">
		<div class="metric">
			<div class="metric-header">
				<span class="metric-label">EQUATIONS</span>
			</div>
			<div class="metric-value">{equationsSolvedCorrectly}</div>
		</div>
		<div class="metric-divider">•</div>
		<div class="metric">
			<div class="metric-header">
				<span class="metric-label">TIME</span>
			</div>
			<div class="metric-value">{formattedLevelDuration}</div>
		</div>
		<div class="metric-divider">•</div>
		<div class="metric">
			<div class="metric-header">
				<span class="metric-label">
					{#if playerHealth <= 0 && gameMode === 'crafter' && crafterSubMode === 'challenge'}
						TOTAL SCORE
					{:else}
						SCORE
					{/if}
				</span>
			</div>
			<div class="metric-value">{levelScore}</div>
		</div>
	</div>

	<!-- Display Aggregated Bonuses -->
	{#if displayedBonuses.length > 0}
		<div class="bonus-cards">
			{#each displayedBonuses as bonus (bonus.id)}
				<div class="bonus-badge">
					<span class="bonus-emoji">🌟</span>
					<span class="bonus-text">
						<span class="bonus-name">{bonus.name} (x{bonus.count})</span>
					</span>
				</div>
			{/each}
		</div>
	{/if}

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

	.bonus-cards {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		flex-wrap: wrap;
		margin: 0.5rem 0;
	}

	.bonus-badge {
		background: #fff5cc;
		padding: 0.3rem 0.7rem;
		border-radius: 20px;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		box-shadow: 0 1px 2px rgba(255, 152, 0, 0.1);
	}

	.bonus-emoji {
		font-size: 0.9rem;
	}

	.bonus-text {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.9rem;
	}

	.bonus-name {
		font-weight: bold;
		color: #ff9800;
	}

	.metrics {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		margin: 1.5rem 0;
	}

	.metric {
		background: #f8f9fa;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		text-align: center;
	}

	.metric-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		margin-bottom: 0.3rem;
	}

	.metric-label {
		font-size: 0.5rem;
		font-weight: 600;
		color: #666;
		letter-spacing: 0.05em;
	}

	.metric-value {
		font-size: 1.75rem;
		font-weight: bold;
		color: #333;
		line-height: 1;
	}

	.metric-divider {
		color: #ddd;
		font-size: 0.5rem;
		margin-top: 1rem;
	}
</style>
