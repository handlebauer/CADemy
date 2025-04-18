<script lang="ts">
	import type { BonusConfig } from '../../types';
	import type { GameMode } from '../../types';

	export let totalGameScore: number;
	export let completedLevelsData: Array<{
		levelNumber: number;
		score: number;
		bonuses: BonusConfig[];
	}>;

	// Add new props for game mode and challenge mode handling
	export let gameMode: GameMode | null = null;
	export let crafterSubMode: 'normal' | 'challenge' | null = null;
	export let crafterNormalCompleted: boolean = false;
	export let handleStartChallengeMode: () => void;

	// Handlers passed from parent
	export let handlePlayAgain: () => void;
	export let handleExit: () => void;

	// Reactive block to aggregate bonuses for each level
	$: aggregatedLevelsData = completedLevelsData.map((level) => {
		const aggregatedBonuses = level.bonuses.reduce(
			(acc, bonus) => {
				if (!acc[bonus.id]) {
					acc[bonus.id] = { ...bonus, count: 0 };
				}
				acc[bonus.id].count++;
				return acc;
			},
			{} as Record<string, BonusConfig & { count: number }>
		);
		return {
			...level,
			displayedBonuses: Object.values(aggregatedBonuses)
		};
	});

	console.log('FinalSummaryScreen props:', {
		gameMode,
		crafterSubMode,
		crafterNormalCompleted
	});

	// Compute whether to show challenge mode button
	$: showChallengeButton =
		gameMode === 'crafter' && crafterSubMode === 'normal' && crafterNormalCompleted;
</script>

<div class="final-summary-screen">
	<h1>🎉 Game Complete! 🎉</h1>
	<div class="total-score-section">
		<h2>Total Score</h2>
		<div class="total-score-value">{totalGameScore}</div>
	</div>

	{#if completedLevelsData && completedLevelsData.length > 0}
		<h2>Level Breakdown</h2>
		<div class="level-breakdown">
			{#each aggregatedLevelsData as levelData (levelData.levelNumber)}
				<div class="level-card">
					<h3>Level {levelData.levelNumber}</h3>
					<div class="level-score">Score: {levelData.score}</div>
					{#if levelData.displayedBonuses && levelData.displayedBonuses.length > 0}
						<div class="level-bonuses">
							<ul>
								{#each levelData.displayedBonuses as bonus (bonus.id)}
									<li>🌟 {bonus.name} (x{bonus.count})</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div class="summary-actions">
		<button class="exit-button" on:click={handleExit}>EXIT</button>
		{#if showChallengeButton}
			<button class="challenge-button" on:click={handleStartChallengeMode}>
				Try Challenge Mode
			</button>
		{/if}
		<button class="play-again-button" on:click={handlePlayAgain}> Play Again? </button>
	</div>
</div>

<style>
	.final-summary-screen {
		background-color: #fff;
		padding: 2rem 2.5rem;
		border-radius: 12px;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		font-family: sans-serif;
		width: 90%;
		max-width: 500px;
		max-height: 90vh; /* Limit height and allow scroll */
		overflow-y: auto;
	}

	h1 {
		color: #ff9800;
		margin-bottom: 0;
	}

	.total-score-section {
		background-color: #f0f4f8;
		padding: 1rem 1.5rem;
		border-radius: 8px;
	}

	.total-score-section h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.2rem;
		color: #555;
	}

	.total-score-value {
		font-size: 2.5rem;
		font-weight: bold;
		color: #ff9800;
	}

	.level-breakdown {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.level-card {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #eee;
		text-align: left;
	}

	.level-card h3 {
		margin: 0 0 0.5rem 0;
		color: #333;
		border-bottom: 1px solid #ddd;
		padding-bottom: 0.3rem;
	}

	.level-score {
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #444;
	}

	.level-bonuses ul {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.85rem;
	}

	.level-bonuses li {
		margin-bottom: 0.2rem;
		color: #555;
	}

	.summary-actions {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.summary-actions button {
		padding: 0.8rem 1.5rem;
		font-size: 1rem;
		font-weight: bold;
		border-radius: 6px;
		border: 2px solid;
		cursor: pointer;
		transition: all 0.2s;
	}

	.play-again-button {
		background-color: #ff9800;
		border-color: #f57c00;
		color: #fff;
	}
	.play-again-button:hover {
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

	.challenge-button {
		background-color: #e74c3c;
		border-color: #c0392b;
		color: #fff;
	}
	.challenge-button:hover {
		background-color: #c0392b;
		border-color: #a93226;
	}
</style>
