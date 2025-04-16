<script lang="ts">
	import type { EnemyConfig, BonusConfig } from '../../types';
	import { GameStatus } from '../../types';

	export let currentEnemyConfig: EnemyConfig | null = null;
	export let enemyHealth: number;
	export let enemyHit: boolean;
	export let enemyDefeatedAnimating: boolean;
	export let displayedDamage: number | null = null;
	export let lastAnswerCorrect: boolean | null = null;
	export let activeBonuses: BonusConfig[] = [];
	export let gameStatus: GameStatus;
</script>

<!-- Enemy Area Markup -->
<div class="enemy-area" style:--enemy-color={currentEnemyConfig?.color || '#888'}>
	<!-- Wrapper for core enemy info -->
	<div class="enemy-details-box">
		<div class="enemy-icon" class:hit-reaction={enemyHit} class:defeated={enemyDefeatedAnimating}>
			{currentEnemyConfig?.icon || '🐉'}
		</div>
		<div class="enemy-label">{currentEnemyConfig?.name || 'Enemy'}</div>
		<progress class="enemy-health-bar" max={currentEnemyConfig?.health || 100} value={enemyHealth}
		></progress>
		<div class="enemy-health-text">{enemyHealth}/{currentEnemyConfig?.health || 100}</div>
	</div>

	<!-- Damage & Bonus Display Area (outside the box) -->
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

<style>
	/* Enemy Area Styles */
	.enemy-area {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		/* gap is now handled by details-box */
		position: relative;
		margin-bottom: 1.5rem;
		/* Removed padding-bottom and border-bottom */
	}

	/* New style for the wrapper box */
	.enemy-details-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem; /* Maintain gap for internal items */
		padding: 0.5rem 0.75rem; /* Add padding */
		border: 3px solid var(--enemy-color, #888); /* Use variable for border */
		border-radius: 8px; /* Rounded corners */
		width: fit-content; /* Adjust width to content */
	}

	.enemy-icon {
		font-size: 3rem;
	}

	.enemy-label {
		font-weight: bold;
		font-size: 1.1rem;
	}

	.enemy-health-bar {
		width: 100px;
		height: 12px;
		appearance: none;
		border: 1px solid #bdc3c7;
		border-radius: 6px;
		overflow: hidden;
	}

	.enemy-health-bar::-webkit-progress-bar {
		background-color: #eee;
		border-radius: 6px;
	}
	.enemy-health-bar::-webkit-progress-value {
		background-color: #e74c3c;
		border-radius: 6px;
		transition: width 0.3s ease-in-out;
	}
	.enemy-health-bar::-moz-progress-bar {
		background-color: #e74c3c;
		border-radius: 6px;
		transition: width 0.3s ease-in-out;
	}

	.enemy-health-text {
		font-size: 0.9rem;
		color: #555;
	}

	/* Enemy Animations & Effects */
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

	.enemy-icon.defeated {
		animation: enemy-defeat 0.6s ease-in forwards;
	}

	@keyframes enemy-defeat {
		0% {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
		100% {
			opacity: 0;
			transform: scale(0.8) rotate(720deg);
		}
	}

	/* Feedback Overlay Styles */
	.feedback-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		pointer-events: none;
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
		background-color: rgba(255, 215, 0, 0.8);
		color: #4b3621;
		padding: 5px 10px;
		border-radius: 5px;
		font-size: 0.9rem;
		font-weight: bold;
		text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.3);
		opacity: 0;
	}

	/* Feedback Animations */
	.animate-damage {
		animation: show-feedback 1s ease-out forwards;
	}
	.animate-bonus {
		animation: show-feedback 1.2s ease-out 0.1s forwards;
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
</style>
