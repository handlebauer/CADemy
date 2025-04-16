<script lang="ts">
	export let playerHealth: number;
	export let isShieldActive: boolean;
	export let gameTime: number;
	export let formattedTime: string;
	export let playerHit: boolean = false;
	export let damageTaken: number | null = null;
	export let shieldBlockedHit: boolean = false;
</script>

<div class="top-bar">
	<div class="health-player">
		<span class="heart-icon" class:heart-shake={playerHit}>❤️</span>
		<div
			class="player-health-bar-container"
			class:shield-active={isShieldActive}
			class:player-hit-flash={playerHit}
		>
			<div class="player-health-bar-fill" style="width: {playerHealth}%;"></div>
		</div>
		<span class="player-health-value">{playerHealth}/100</span>
		{#if (playerHit && damageTaken !== null) || shieldBlockedHit}
			<span class="damage-taken-text animate-player-damage" class:blocked={shieldBlockedHit}>
				{#if shieldBlockedHit}
					-0
				{:else if damageTaken !== null}
					-{damageTaken}
				{/if}
			</span>
		{/if}
	</div>
	<div class="timer" class:low-time={gameTime > 0 && gameTime < 10}>
		⏱️ {formattedTime.replace('Time: ', '')}
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

	.health-player {
		color: #e74c3c;
		font-size: 1.5rem;
		font-weight: bold;
		background-color: rgba(231, 76, 60, 0.1);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 180px;
		position: relative;
	}

	.heart-icon.heart-shake {
		animation: heart-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}

	.player-health-bar-container {
		width: 80px;
		height: 10px;
		border: 2px solid #e74c3c;
		border-radius: 3px;
		overflow: hidden;
		background-color: #f8d7da;
		position: relative;
		transition: border-color 0.3s ease;
	}

	.player-health-bar-container.player-hit-flash {
		animation: player-bar-flash 0.4s ease-out;
	}

	.player-health-bar-container.shield-active {
		border-color: #3498db;
		box-shadow: 0 0 6px rgba(52, 152, 219, 0.6);
		animation: pulse-shield-bar 1.5s infinite ease-in-out;
	}

	.player-health-bar-container.player-hit-flash.shield-active {
		animation: player-bar-flash 0.4s ease-out;
	}

	.player-health-bar-fill {
		height: 100%;
		background-color: #e74c3c;
		border-radius: 0;
		transition: width 0.3s ease-in-out;
	}

	.player-health-value {
		font-size: 0.9em;
		font-weight: bold;
		color: #e74c3c;
		line-height: 1;
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

	.damage-taken-text.blocked {
		color: #3498db;
	}

	.timer {
		color: #3498db;
		font-size: 1.5rem;
		font-weight: bold;
		background-color: rgba(52, 152, 219, 0.1);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		margin: 0;
		min-width: 100px;
		text-align: center;
	}

	.timer.low-time {
		color: #e74c3c;
		animation: low-time-pulse 1s infinite;
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

	@keyframes pulse-shield-bar {
		0% {
			box-shadow: 0 0 3px rgba(52, 152, 219, 0.4);
		}
		50% {
			box-shadow: 0 0 10px rgba(52, 152, 219, 0.8);
		}
		100% {
			box-shadow: 0 0 3px rgba(52, 152, 219, 0.4);
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
</style>
