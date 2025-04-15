<script lang="ts">
	export let playerHealth: number;
	export let isShieldActive: boolean;
	export let gameTime: number;
	export let formattedTime: string;
</script>

<div class="top-bar">
	<div class="health-player">
		<span>❤️</span>
		<div class="player-health-bar-container" class:shield-active={isShieldActive}>
			<div class="player-health-bar-fill" style="width: {playerHealth}%;"></div>
		</div>
		<span class="player-health-value">{playerHealth}/100</span>
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
		padding: 0.5rem 1rem;
		box-sizing: border-box;
		margin-bottom: 1.5rem;
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

	.player-health-bar-container.shield-active {
		border-color: #3498db;
		box-shadow: 0 0 6px rgba(52, 152, 219, 0.6);
		animation: pulse-shield-bar 1.5s infinite ease-in-out;
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
		/* Copied from GameUI */
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
</style>
