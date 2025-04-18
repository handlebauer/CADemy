<script lang="ts">
	import type { GameMode } from '../../types';

	export let playerHealth: number;
	export let attackTimeRemaining: number;
	export let maxAttackTime: number;
	export let formattedTime: string;
	export let damageTaken: number | null = null;
	export let waitingForPlayerStart: boolean = false;
	export let isTimerFrozen: boolean = false;

	export let gameMode: GameMode | null = null;
	export let crafterSubMode: 'normal' | 'challenge' | null = null;
	export let scaledTimeBonusSeconds: number | null = null;

	// Use explicit function to handle player hit effect
	let playerHitEffect = false;
	let playerHitTimeout: number | null = null;

	function updatePlayerHitEffect() {
		if (damageTaken !== null) {
			playerHitEffect = true;
			if (playerHitTimeout) clearTimeout(playerHitTimeout);

			playerHitTimeout = setTimeout(() => {
				playerHitEffect = false;
			}, 600); // Duration matches animation
		}
	}

	// Watch for changes in damageTaken without creating a loop
	$: if (damageTaken !== null) updatePlayerHitEffect();
</script>

<div class="top-bar">
	<div class="status-container health-player">
		<span class="icon heart-icon" class:heart-shake={playerHitEffect}>❤️</span>
		<div class="bar-container player-health-bar-container" class:player-hit-flash={playerHitEffect}>
			<div class="bar-fill player-health-bar-fill" style="width: {playerHealth}%;"></div>
		</div>
		<span class="value-text player-health-value">{playerHealth}/100</span>
		{#if playerHitEffect && damageTaken !== null}
			<span class="damage-taken-text animate-player-damage">
				{#if damageTaken !== null}
					-{damageTaken}
				{/if}
			</span>
		{/if}
	</div>

	<div
		class="status-container timer"
		class:low-time={!waitingForPlayerStart &&
			attackTimeRemaining > 0 &&
			attackTimeRemaining <= maxAttackTime * 0.3}
		class:frozen={isTimerFrozen}
	>
		<span class="icon timer-icon" class:pulse-frozen={isTimerFrozen}>⏱️</span>
		<div class="bar-container attack-timer-bar-container">
			<div
				class="bar-fill attack-timer-bar-fill"
				style="width: {waitingForPlayerStart
					? '100'
					: (attackTimeRemaining / maxAttackTime) * 100}%;"
			></div>
		</div>
		<span class="value-text timer-text">
			{formattedTime.replace('Time: ', '')}
			{#if gameMode === 'crafter' && crafterSubMode === 'challenge' && scaledTimeBonusSeconds && scaledTimeBonusSeconds > 0}
				<span class="scaled-time-reduction">(-{scaledTimeBonusSeconds}s)</span>
			{/if}
		</span>
	</div>
</div>

<style>
	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0 1rem 0.5rem 1rem;
		box-sizing: border-box;
		margin-bottom: 1.5rem;
		position: relative;
	}

	/* Common styling for both status containers - let width be determined by content */
	.status-container {
		font-weight: bold;
		padding: 0.5rem 0.8rem;
		border-radius: 6px;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
	}

	/* Health player specific styling - health text is wider */
	.health-player {
		color: #e74c3c;
		font-size: 1.5rem;
		background-color: rgba(231, 76, 60, 0.1);
	}

	/* Timer specific styling - timer text is narrower */
	.timer {
		color: #3498db;
		font-size: 1.5rem;
		background-color: rgba(52, 152, 219, 0.1);
	}

	/* Common styling for icons */
	.icon {
		font-size: 1.5rem;
	}

	/* Bar container - fixed width for both */
	.bar-container {
		width: 80px; /* Fixed width for both bars */
		height: 10px;
		border-radius: 3px;
		overflow: hidden;
		position: relative;
		flex-shrink: 0; /* Prevent bars from shrinking */
	}

	/* Health bar specific */
	.player-health-bar-container {
		border: 2px solid #e74c3c;
		background-color: #f8d7da;
		transition: box-shadow 0.3s ease; /* Keep transition for hit flash */
	}

	/* Timer bar specific */
	.attack-timer-bar-container {
		border: 2px solid #3498db;
		background-color: rgba(52, 152, 219, 0.1);
	}

	/* Common styling for bar fills */
	.bar-fill {
		height: 100%;
		transition: width 0.3s ease-in-out;
	}

	.player-health-bar-fill {
		background-color: #e74c3c;
	}

	.attack-timer-bar-fill {
		background-color: #3498db;
		transition: width 0.1s linear;
	}

	/* Common styling for value text */
	.value-text {
		display: flex;
		align-items: center;
		font-size: 1.1rem;
		font-weight: bold;
		text-align: left;
		white-space: nowrap;
	}

	.player-health-value {
		min-width: 4rem; /* Wider for "100/100" format */
	}

	.timer-text {
		min-width: 2rem; /* Narrower for "9s" format */
	}

	.heart-icon.heart-shake {
		animation: heart-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}

	.player-health-bar-container.player-hit-flash {
		animation: player-bar-flash 0.4s ease-out;
	}

	.damage-taken-text {
		position: absolute;
		top: 50%;
		left: calc(100% + 5px);
		transform: translateY(-50%);
		font-size: 1.4rem;
		font-weight: bold;
		color: #e74c3c;
		text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.7);
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
	}

	.timer.low-time {
		color: #e74c3c;
		animation: low-time-pulse 1s infinite;
	}

	.timer.low-time .attack-timer-bar-container {
		border-color: #e74c3c;
	}

	.timer.low-time .attack-timer-bar-fill {
		background-color: #e74c3c;
	}

	.timer.frozen {
		color: #2980b9; /* Darker blue for frozen text */
		background-color: rgba(52, 152, 219, 0.2); /* Slightly darker bg */
	}

	.timer.frozen .attack-timer-bar-container {
		border-color: #2980b9;
	}

	.timer-icon.pulse-frozen {
		animation: pulse-frozen-icon 1.2s infinite ease-in-out;
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

	@keyframes pulse-frozen-icon {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.2);
			opacity: 0.7;
		}
	}

	.animate-player-damage {
		animation: show-player-feedback 0.6s ease-out forwards;
	}

	@keyframes show-player-feedback {
		0% {
			opacity: 0;
			transform: translateY(-40%) scale(0.8);
		}
		20% {
			opacity: 1;
			transform: translateY(-60%) scale(1.1);
		}
		80% {
			opacity: 1;
			transform: translateY(-65%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translateY(-75%) scale(0.9);
		}
	}

	@keyframes player-bar-flash {
		0%,
		100% {
			border-color: #e74c3c;
			box-shadow: none;
		}
		50% {
			border-color: #ffcccc;
			box-shadow: 0 0 8px rgba(231, 76, 60, 0.7);
		}
	}

	@keyframes heart-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.3);
		}
	}

	@keyframes heart-shake {
		10%,
		90% {
			transform: translate3d(-1px, 0, 0);
		}
		20%,
		80% {
			transform: translate3d(2px, 0, 0);
		}
		30%,
		50%,
		70% {
			transform: translate3d(-3px, 0, 0);
		}
		40%,
		60% {
			transform: translate3d(3px, 0, 0);
		}
		0%,
		100% {
			transform: translate3d(0, 0, 0);
		}
	}

	.scaled-time-reduction {
		font-size: 0.75em;
		font-weight: normal;
		color: #e74c3c;
		opacity: 0.8;
		margin-left: 0.3em;
	}
</style>
