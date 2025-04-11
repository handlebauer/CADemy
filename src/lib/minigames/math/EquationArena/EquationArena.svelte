<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Pane } from 'tweakpane';

	import { minigameStore } from '$lib/stores/minigameStore';
	import { setupTweakpane, type TweakpaneBindingParams } from '$lib/utils/tweakpane';

	import {
		ENEMY_ATTACK_INTERVAL,
		ENEMY_DAMAGE,
		FIRE_DAMAGE,
		RESULT_DISPLAY_DELAY,
		equationArenaTweakpaneBindings
	} from './config';

	import { arenaStore, type ArenaState } from './store';
	import { GameStatus, type SpellType } from './types';

	import './animations.css';

	// --- Config Variables (local reactive state) ---
	let config = {
		ENEMY_ATTACK_INTERVAL,
		RESULT_DISPLAY_DELAY,
		ENEMY_DAMAGE,
		FIRE_DAMAGE
	};

	// --- Local Component State (Timers, Intervals) ---
	let gameTimerInterval: number | null = null;
	let enemyAttackIntervalTimer: number | null = null; // Renamed to avoid conflict
	let nextRoundTimeout: number | null = null;
	let enemyDefeatedTimeout: number | null = null; // Timeout for victory screen delay
	let damageDisplayTimeout: number | null = null; // Timeout for damage text display
	let playerHitTimeout: number | null = null; // Timeout for player hit effect
	let enemyHitTimeout: number | null = null; // Timeout for enemy hit effect
	let pane: Pane;

	// --- Local UI State ---
	let displayedDamage: number | null = null; // Damage number to show on enemy
	let playerHit = false; // Flag to trigger player hit visual effect
	let enemyHit = false; // Flag to trigger enemy hit visual effect
	let enemyDefeatedAnimating = false; // Flag for enemy defeat animation
	let gameStarted = false; // Flag to prevent timers restarting on store re-renders

	// --- Element Refs ---
	let arenaContainerElement: HTMLDivElement; // Reference to the main container for setting CSS var
	let tweakpaneContainerElement: HTMLDivElement; // Reference to the Tweakpane container

	// --- Lifecycle Functions & Event Handlers ---

	// Helper function to stop all intervals/timeouts
	function stopGameTimers() {
		if (enemyAttackIntervalTimer) clearInterval(enemyAttackIntervalTimer); // Use renamed timer
		if (gameTimerInterval) clearInterval(gameTimerInterval);
		if (nextRoundTimeout) clearTimeout(nextRoundTimeout);
		if (enemyDefeatedTimeout) clearTimeout(enemyDefeatedTimeout);
		if (damageDisplayTimeout) clearTimeout(damageDisplayTimeout); // Clear damage display timeout
		if (playerHitTimeout) clearTimeout(playerHitTimeout); // Clear player hit timeout
		if (enemyHitTimeout) clearTimeout(enemyHitTimeout); // Clear enemy hit timeout

		// Reset all variables
		enemyAttackIntervalTimer = null; // Use renamed timer
		gameTimerInterval = null;
		nextRoundTimeout = null;
		enemyDefeatedTimeout = null;
		damageDisplayTimeout = null;
		playerHitTimeout = null;
		enemyHitTimeout = null; // Clear enemy hit timeout ID
		playerHit = false;
		enemyHit = false; // Reset enemy hit state
		gameStarted = false; // Reset game started flag
	}

	// Keyboard handler - calls store actions
	function handleKeyDown(event: KeyboardEvent) {
		// Start game on Enter press during PRE_GAME
		if ($arenaStore.gameStatus === GameStatus.PRE_GAME) {
			if (event.key === 'Enter') {
				handleStartGame();
				return; // Prevent further processing
			}
		}

		// Handle spell selection (F/I) unless game is over
		if ($arenaStore.gameStatus !== GameStatus.GAME_OVER) {
			if (event.key === 'f' || event.key === 'F') {
				arenaStore.selectSpell('FIRE');
				return;
			}
			if (event.key === 'i' || event.key === 'I') {
				arenaStore.selectSpell('ICE');
				return;
			}
		}

		// Handle number input, Enter, Backspace, Clear during SOLVING
		if ($arenaStore.gameStatus === GameStatus.SOLVING) {
			if (event.key >= '0' && event.key <= '9') {
				arenaStore.handleInput(parseInt(event.key, 10));
			} else if (event.key === 'Enter') {
				arenaStore.castSpell();
			} else if (event.key === 'Backspace') {
				arenaStore.handleBackspace();
			} else if (event.key === 'c' || event.key === 'C' || event.key === 'Escape') {
				arenaStore.clearInput();
			}
		}
	}

	// Function to handle starting the game
	function handleStartGame() {
		// Assume arenaStore.startGame() sets status to SOLVING and resets necessary state
		arenaStore.startGame();
	}

	// Reactive statement to handle transitions after state changes in the store
	$: {
		// Check if player health reached 0
		if ($arenaStore.playerHealth <= 0 && $arenaStore.gameStatus !== GameStatus.GAME_OVER) {
			arenaStore.setGameOver('Defeat!');
			stopGameTimers();
		}

		// Check if enemy health reached 0 - Add Delay before Victory Screen
		if (
			$arenaStore.enemyHealth <= 0 &&
			$arenaStore.gameStatus !== GameStatus.GAME_OVER &&
			!enemyDefeatedTimeout // Only start timeout if not already running
		) {
			// Stop further attacks/timers immediately
			stopGameTimers();
			// Trigger defeat animation
			enemyDefeatedAnimating = true;
			// Start delay before showing victory screen
			enemyDefeatedTimeout = setTimeout(() => {
				arenaStore.setGameOver('Victory!');
				enemyDefeatedTimeout = null; // Clear the timeout ID
			}, 1000); // 1 second delay
		}

		// Check if time is up
		if ($arenaStore.gameTime <= 0 && $arenaStore.gameStatus !== GameStatus.GAME_OVER) {
			arenaStore.setGameOver('Time is up! Defeat!');
			stopGameTimers();
		}

		// Automatically prepare next round after RESULT state is set
		if ($arenaStore.gameStatus === GameStatus.RESULT && !nextRoundTimeout) {
			// Show damage if fire spell was successful
			if ($arenaStore.lastAnswerCorrect && $arenaStore.lastSpellCast === 'FIRE') {
				displayedDamage = config.FIRE_DAMAGE; // Use local reactive variable
				if (damageDisplayTimeout) clearTimeout(damageDisplayTimeout);

				// Trigger enemy hit effect
				if (enemyHitTimeout) clearTimeout(enemyHitTimeout);
				enemyHit = true;
				enemyHitTimeout = setTimeout(() => {
					enemyHit = false;
					enemyHitTimeout = null;
				}, 200); // Duration of enemy hit effect

				damageDisplayTimeout = setTimeout(() => {
					displayedDamage = null;
					damageDisplayTimeout = null;
				}, 1000); // Display damage for 1 second
			}

			// Prepare next round timeout
			nextRoundTimeout = setTimeout(() => {
				if ($arenaStore.gameStatus !== GameStatus.GAME_OVER) {
					// Check again before proceeding
					arenaStore.prepareNextRound();
				}
				nextRoundTimeout = null; // Clear timeout ID after execution
			}, config.RESULT_DISPLAY_DELAY); // Use local reactive config
		}
	}

	// Reactive statement to start timers when game enters SOLVING state
	$: {
		if ($arenaStore.gameStatus === GameStatus.SOLVING && !gameStarted) {
			console.log('Game status is SOLVING, starting timers...');
			startEnemyAttackTimer();
			startGameTimer();
			gameStarted = true; // Mark timers as started
		}
	}

	// Helper function to restart the enemy attack timer when interval changes
	function restartEnemyAttackTimer() {
		if (enemyAttackIntervalTimer) clearInterval(enemyAttackIntervalTimer);
		// Only start if game is actually running
		if ($arenaStore.gameStatus === GameStatus.SOLVING) {
			startEnemyAttackTimer();
		}
	}

	// Helper function to encapsulate starting the enemy timer
	function startEnemyAttackTimer() {
		if (enemyAttackIntervalTimer) clearInterval(enemyAttackIntervalTimer); // Clear existing if any
		console.log('Starting enemy attack timer with interval:', config.ENEMY_ATTACK_INTERVAL);
		enemyAttackIntervalTimer = setInterval(() => {
			// Check status *inside* the interval callback as well
			if (($arenaStore as ArenaState).gameStatus === GameStatus.SOLVING) {
				arenaStore.damagePlayer(config.ENEMY_DAMAGE); // Use local reactive config
				console.log(`Enemy attacks! Player health: ${($arenaStore as ArenaState).playerHealth}`);

				// Trigger player hit visual effect
				if (playerHitTimeout) clearTimeout(playerHitTimeout);

				// Calculate shake intensity based on health (lower health = more shake)
				const shakeIntensity = Math.max(
					12,
					12 + (100 - ($arenaStore as ArenaState).playerHealth) / 5
				);

				// Set CSS variable for shake animation
				if (arenaContainerElement) {
					arenaContainerElement.style.setProperty('--shake-intensity', `${shakeIntensity}px`);
				}

				playerHit = true;
				playerHitTimeout = setTimeout(() => {
					playerHit = false;
					playerHitTimeout = null;
				}, 200); // Duration of the flash effect
			}
		}, config.ENEMY_ATTACK_INTERVAL); // Use local reactive config
	}

	// Helper function to start the game timer
	function startGameTimer() {
		if (gameTimerInterval) clearInterval(gameTimerInterval); // Clear existing if any
		console.log('Starting game timer...');
		gameTimerInterval = setInterval(() => {
			if (
				($arenaStore as ArenaState).gameTime > 0 &&
				($arenaStore as ArenaState).gameStatus === GameStatus.SOLVING // Check for SOLVING state
			) {
				arenaStore.tickTime();
			} else if (($arenaStore as ArenaState).gameTime <= 0) {
				// Optional: Clear interval here if time runs out, though stopGameTimers handles it
				if (gameTimerInterval) clearInterval(gameTimerInterval);
				gameTimerInterval = null;
			}
		}, 1000);
	}

	onMount(() => {
		// Reset the store to initial state (PRE_GAME)
		arenaStore.reset();
		// Select default spell (can stay here, doesn't affect PRE_GAME state)
		arenaStore.selectSpell('FIRE');

		// Add key listener
		window.addEventListener('keydown', handleKeyDown);

		// Tweakpane setup (only relevant in dev)
		if (import.meta.env.DEV) {
			if (tweakpaneContainerElement) {
				// Map the definitions from config.ts to the format needed by the utility
				const bindings: TweakpaneBindingParams[] = equationArenaTweakpaneBindings.map((def) => {
					// Default onChange just updates the local reactive config object
					let onChangeHandler = (value: unknown) => {
						config[def.key] = value as number; // Assuming number for simplicity
						config = config; // Trigger Svelte reactivity
					};

					// Special case for ENEMY_ATTACK_INTERVAL to restart the timer
					if (def.key === 'ENEMY_ATTACK_INTERVAL') {
						onChangeHandler = (value) => {
							config.ENEMY_ATTACK_INTERVAL = value as number;
							config = config; // Trigger Svelte reactivity
							restartEnemyAttackTimer();
						};
					}

					return {
						target: config, // Bind directly to the local reactive config object
						key: def.key,
						options: def.options,
						folderTitle: def.folderTitle,
						onChange: onChangeHandler
					};
				});

				pane = setupTweakpane(tweakpaneContainerElement, bindings, 'Game Config');
			}
		}
	});

	onDestroy(() => {
		console.log('Equation Arena component destroyed');
		stopGameTimers(); // Clear intervals and timeouts
		window.removeEventListener('keydown', handleKeyDown);
		// Dispose Tweakpane only if it was created (in dev mode)
		if (import.meta.env.DEV && pane) {
			pane.dispose();
		}
	});

	// Derived state for display (remains in component)
	$: formattedTime = `Time: ${Math.floor($arenaStore.gameTime / 60)}:${($arenaStore.gameTime % 60)
		.toString()
		.padStart(2, '0')}`;

	// Calculate time taken for results screen
	$: timeTakenSeconds =
		$arenaStore.gameStatus === GameStatus.GAME_OVER
			? $arenaStore.startTime - $arenaStore.gameTime
			: 0;
	$: formattedTimeTaken = `${Math.floor(timeTakenSeconds / 60)}:${(timeTakenSeconds % 60).toString().padStart(2, '0')}`;
</script>

<!-- Use a main container to switch between Game UI and Results Screen -->
<div class="arena-wrapper" class:player-hit={playerHit} bind:this={arenaContainerElement}>
	<!-- Explicit container for Tweakpane (only render in dev) -->
	{#if import.meta.env.DEV}
		<div id="tweakpane-container" bind:this={tweakpaneContainerElement}></div>
	{/if}

	{#if $arenaStore.gameStatus === GameStatus.PRE_GAME}
		<!-- Start Screen -->
		<div class="start-screen animate-fade-in">
			<h1 class="start-title animate-fade-in-staggered delay-1">🧙‍♂️ Equation Arena 🐉</h1>
			<p class="start-instructions animate-fade-in-staggered delay-2">
				Solve equations to defeat the enemy!
			</p>
			<button class="start-button animate-fade-in-staggered delay-3" on:click={handleStartGame}>
				Start Game
			</button>
		</div>
	{:else if $arenaStore.gameStatus !== GameStatus.GAME_OVER}
		<!-- Game UI (Existing structure) -->
		<div class="equation-arena-container" class:shake={playerHit}>
			<!-- Top Bar -->
			<div class="top-bar">
				<div class="health-player">
					<span>❤️</span>
					<!-- Replace progress with divs -->
					<div class="player-health-bar-container" class:shield-active={$arenaStore.isShieldActive}>
						<div class="player-health-bar-fill" style="width: {$arenaStore.playerHealth}%;"></div>
					</div>
					<span class="player-health-value">{$arenaStore.playerHealth}/100</span>
				</div>
				<div
					class="timer"
					class:low-time={($arenaStore as ArenaState).gameTime > 0 &&
						($arenaStore as ArenaState).gameTime < 10}
				>
					⏱️ {formattedTime.replace('Time: ', '')}
				</div>
			</div>

			<!-- Enemy Area -->
			<div class="enemy-area">
				<!-- Direct children for enemy display -->
				<div
					class="enemy-icon"
					class:hit-reaction={enemyHit}
					class:defeated={enemyDefeatedAnimating}
				>
					🐉
				</div>
				<div class="enemy-label">Enemy</div>
				<progress class="enemy-health-bar" max="100" value={($arenaStore as ArenaState).enemyHealth}
				></progress>
				<div class="enemy-health-text">{$arenaStore.enemyHealth}/100</div>
				<!-- Damage Display Text -->
				{#if displayedDamage !== null}
					<span class="damage-dealt-text animate-damage">-{displayedDamage}</span>
				{/if}
			</div>

			<!-- Spell Selection -->
			<div class="spell-selection">
				<!-- Spell buttons -->
				<button
					on:click={() => arenaStore.selectSpell('FIRE')}
					class:selected={($arenaStore as ArenaState).selectedSpell === 'FIRE'}
				>
					🔥 FIRE
				</button>
				<!-- No :active needed for spell selection, only visual state change -->
				<button
					on:click={() => arenaStore.selectSpell('ICE')}
					class:selected={($arenaStore as ArenaState).selectedSpell === 'ICE'}
				>
					🧊 ICE
				</button>
			</div>

			<!-- Equation Display -->
			<div
				class="equation-display"
				class:correct={$arenaStore.lastAnswerCorrect === true &&
					$arenaStore.gameStatus === GameStatus.RESULT}
				class:incorrect={$arenaStore.lastAnswerCorrect === false &&
					$arenaStore.gameStatus === GameStatus.RESULT}
			>
				{#if $arenaStore.gameStatus === GameStatus.SOLVING}
					<!-- Equation text -->
					<span class="equation-text"
						>{$arenaStore.currentEquation.replace('?', $arenaStore.playerInput + '_')}</span
					>
				{:else if $arenaStore.gameStatus === GameStatus.WAITING}
					<span class="info-text">Waiting for spell selection...</span>
				{:else if $arenaStore.gameStatus === GameStatus.RESULT}
					<!-- Result equation -->
					<div class="result-equation">
						<span class="equation-content"
							>{$arenaStore.lastFullEquation.replace('?', $arenaStore.lastPlayerInput)}</span
						>
					</div>
				{/if}
			</div>

			<!-- Number Pad -->
			<div class="number-pad">
				<!-- Number buttons -->
				{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
					<button
						on:click={() => arenaStore.handleInput(num)}
						disabled={$arenaStore.gameStatus !== GameStatus.SOLVING}
					>
						{num}
					</button>
				{/each}
				<button
					on:click={arenaStore.clearInput}
					disabled={$arenaStore.gameStatus !== GameStatus.SOLVING}
					class="button-clear"
				>
					C
				</button>
				<button
					on:click={() => arenaStore.handleInput(0)}
					disabled={$arenaStore.gameStatus !== GameStatus.SOLVING}
					class="button-zero"
				>
					0
				</button>
				<button
					on:click={arenaStore.handleBackspace}
					disabled={$arenaStore.gameStatus !== GameStatus.SOLVING ||
						$arenaStore.playerInput.length === 0}
					class="button-backspace"
				>
					DEL
				</button>
			</div>

			<!-- Cast Button -->
			<div class="cast-area">
				<!-- Cast button -->
				<button
					on:click={arenaStore.castSpell}
					disabled={$arenaStore.gameStatus !== GameStatus.SOLVING ||
						$arenaStore.playerInput === '' ||
						!$arenaStore.selectedSpell}
					class:glow={$arenaStore.gameStatus === GameStatus.SOLVING &&
						$arenaStore.playerInput !== '' &&
						!!$arenaStore.selectedSpell}
				>
					CAST SPELL
				</button>
			</div>
		</div>
	{:else}
		<!-- Results Screen -->
		<div class="results-screen">
			<div class="results-title {$arenaStore.playerHealth > 0 ? 'victory' : 'defeat'}">
				{$arenaStore.playerHealth > 0 ? '🏆 VICTORY!' : '☠️ DEFEAT!'}
				{#if $arenaStore.playerHealth > 0}
					<!-- Add multiple star elements for animation -->
					<span class="star">★</span>
					<span class="star">★</span>
					<span class="star">★</span>
					<span class="star">★</span>
					<span class="star">★</span>
					<span class="star">★</span>
				{/if}
			</div>
			<div class="results-stats">
				<p>Equations Solved: {$arenaStore.equationsSolvedCorrectly}</p>
				<p>Time Taken: {formattedTimeTaken}</p>
				<!-- Add other stats here later -->
			</div>
			<div class="results-feedback-prompt">
				How was your experience?
				<div class="feedback-buttons">
					<button>🙁</button>
					<button>😐</button>
					<button>🙂</button>
				</div>
			</div>
			<div class="results-actions">
				<button class="exit-button" on:click={() => minigameStore.closeActiveMinigame()}
					>EXIT</button
				>
				<button class="continue-button" on:click={() => console.log('Continue')}>
					Next Level →
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Add styles for the wrapper and results screen */
	.arena-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #e8edf1; /* Slightly different background for wrapper */
		/* Add transition for the hit effect */
		box-shadow: inset 0 0 0 0 rgba(231, 76, 60, 0);
		transition: box-shadow 0.2s ease-out;
		position: relative; /* Needed for absolute positioning of tweakpane container if used */
	}

	/* Style for the Tweakpane container */
	#tweakpane-container {
		position: fixed; /* Keep it fixed in the viewport */
		top: 10px;
		right: 10px;
		z-index: 1000; /* Ensure it stays on top */
	}

	/* Style for the player hit flash effect */
	.arena-wrapper.player-hit {
		box-shadow: inset 0 0 40px 30px rgba(231, 76, 60, 0.7); /* Stronger red glow inset */
	}

	.equation-arena-container {
		/* Styles from before, but maybe constrain max-width/height */
		max-width: 500px; /* Example max width */
		max-height: 800px; /* Example max height */
		width: 90%;
		height: 95%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		box-sizing: border-box;
		font-family: sans-serif;
		background-color: #f0f4f8;
		color: #333;
		border-radius: 10px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
	}

	/* Add shake animation */
	.equation-arena-container.shake {
		animation: shake-player-hit 0.2s ease-in-out;
	}

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

	.results-stats p {
		margin: 0.5rem 0;
		font-size: 1.1rem;
		color: #333;
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

	/* --- Existing Styles below (make sure they don't conflict) --- */
	.top-bar {
		display: flex;
		justify-content: space-between; /* Space out items */
		align-items: center; /* Vertically align items */
		width: 100%;
		padding: 0.5rem 1rem; /* Add some padding */
		box-sizing: border-box;
	}

	.health-player {
		color: #e74c3c;
		font-size: 1.5rem; /* Larger font */
		font-weight: bold;
		background-color: rgba(231, 76, 60, 0.1); /* Light red background */
		padding: 0.5rem 1rem;
		border-radius: 6px;
		display: flex; /* Use flexbox to arrange items */
		align-items: center; /* Center items vertically */
		gap: 0.5rem; /* Add space between icon, bar, text */
		min-width: 180px; /* Adjust width */
	}

	/* New div-based health bar styles */
	.player-health-bar-container {
		width: 80px; /* Match previous width */
		height: 10px; /* Match previous height */
		border: 2px solid #e74c3c; /* Always have a 2px border, but transparent */
		border-radius: 3px; /* Apply radius to container */
		overflow: hidden; /* Crucial for clipping the inner div */
		background-color: #f8d7da; /* Track background */
		position: relative; /* Needed if adding inner elements later */
		transition: border-color 0.3s ease; /* Smooth color transition */
	}

	.player-health-bar-fill {
		height: 100%;
		background-color: #e74c3c; /* Fill color */
		border-radius: 0; /* Fill div does NOT need radius */
		transition: width 0.3s ease-in-out; /* Animate width changes */
	}

	.player-health-value {
		font-size: 0.9em; /* Slightly smaller than the main text */
		font-weight: bold; /* Keep it bold */
		color: #e74c3c;
		line-height: 1; /* Adjust line height */
	}

	.timer {
		color: #3498db;
		font-size: 1.5rem; /* Larger font */
		font-weight: bold;
		background-color: rgba(52, 152, 219, 0.1); /* Light blue background */
		padding: 0.5rem 1rem;
		border-radius: 6px;
		margin: 0; /* Remove margin */
		min-width: 100px; /* Ensure minimum width */
		text-align: center;
	}

	.enemy-area {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		gap: 0.25rem; /* Add small gap between elements */
		position: relative; /* Make this the reference for absolute positioning */
	}

	.enemy-icon {
		font-size: 3rem;
	}

	.enemy-label {
		font-weight: bold;
		font-size: 1.1rem;
	}

	.enemy-health-bar {
		width: 100px; /* Fixed width for health bar */
		height: 12px;
		appearance: none; /* Override default appearance */
		border: 1px solid #bdc3c7;
		border-radius: 6px;
		overflow: hidden; /* Ensure inner bar respects border-radius */
	}

	/* Styling the progress bar fill */
	.enemy-health-bar::-webkit-progress-bar {
		/* Background */
		background-color: #eee;
		border-radius: 6px;
	}
	.enemy-health-bar::-webkit-progress-value {
		/* Fill */
		background-color: #e74c3c; /* Red color for health */
		border-radius: 6px;
		transition: width 0.3s ease-in-out;
	}
	.enemy-health-bar::-moz-progress-bar {
		/* Firefox Fill */
		background-color: #e74c3c;
		border-radius: 6px;
		transition: width 0.3s ease-in-out;
	}

	.enemy-health-text {
		font-size: 0.9rem;
		color: #555;
	}

	.spell-selection {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.spell-selection button {
		padding: 0.8rem 1.5rem;
		font-size: 1rem;
		border: 2px solid #ccc;
		border-radius: 6px;
		cursor: pointer;
		background-color: #fff;
		transition: all 0.2s ease;
	}
	.spell-selection button:hover:not(:disabled) {
		background-color: #eef;
	}
	.spell-selection button.selected {
		border-color: #3498db;
		background-color: #d6eaf8;
	}
	.spell-selection button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.equation-display {
		background-color: #fff9e6;
		border: 1px solid #f1c40f;
		color: #333;
		padding: 1rem 1.5rem;
		width: 300px;
		min-height: auto;
		border-radius: 8px;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		transition: background-color 0.1s ease-in-out;
		margin-bottom: 1rem; /* Add spacing below the equation */
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

	.equation-text,
	.result-equation,
	.info-text {
		font-size: 1.8rem;
		font-weight: bold;
		line-height: 1.2;
	}

	.result-equation {
		/* Styles specific to the solved equation display */
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.number-pad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin-bottom: 1rem;
		width: 70%; /* Adjust width slightly */
		max-width: 250px;
	}
	.number-pad button {
		padding: 1rem;
		font-size: 1.2rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		background-color: #fff;
		transition:
			background-color 0.2s,
			transform 0.15s ease-out; /* Add transform transition */
	}
	.number-pad button:hover:not(:disabled) {
		background-color: #eee;
		transform: scale(1.1); /* Scale up on hover */
	}
	.number-pad button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Position Clear (C), Zero (0), and Backspace buttons */
	.button-clear {
		grid-column: 1 / 2; /* First column */
	}
	.button-zero {
		grid-column: 2 / 3; /* Second column */
	}
	.button-backspace {
		grid-column: 3 / 4; /* Third column */
	}

	.cast-area {
		width: 100%;
		display: flex;
		justify-content: center;
	}
	.cast-area button {
		padding: 1rem 2.5rem;
		font-size: 1.2rem;
		font-weight: bold;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		background-color: #bdc3c7; /* Default grey */
		color: #fff;
		transition: all 0.2s ease;
	}
	.cast-area button:not(:disabled) {
		background-color: #2ecc71; /* Green when active */
	}
	.cast-area button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.cast-area button.glow:not(:disabled) {
		animation: pulse-glow 1.5s infinite ease-in-out; /* Pulsing glow animation */
	}

	/* Added styles for damage text */
	.damage-dealt-text {
		position: absolute; /* Position relative to the enemy area */
		top: 20%; /* Position near the top of the enemy area */
		left: 50%; /* Center horizontally within the enemy area */
		transform: translate(-50%, -50%);
		font-size: 1.5rem; /* Make it noticeable */
		font-weight: bold;
		color: #e74c3c; /* Red for damage */
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); /* Add some contrast */
		pointer-events: none; /* Prevent interaction */
		opacity: 0; /* Start invisible for animation */
	}

	.animate-damage {
		animation: show-damage 1s ease-out forwards;
	}

	/* Add styles for low-time timer */
	.timer.low-time {
		color: #e74c3c; /* Red color */
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

	/* Enemy Hit Reaction Style */
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

	.spell-selection button {
		/* ... existing styles ... */
		transition: all 0.2s ease;
	}
	.spell-selection button:active {
		transform: scale(0.95); /* Slightly depress */
	}

	.number-pad button {
		/* ... existing styles ... */
		transition:
			background-color 0.2s,
			transform 0.15s ease-out;
	}
	.number-pad button:hover:not(:disabled) {
		background-color: #eee;
		transform: scale(1.1);
	}
	.number-pad button:active:not(:disabled) {
		transform: scale(1); /* Scale down slightly more than hover */
		background-color: #ddd; /* Darken slightly */
	}

	.cast-area button {
		/* ... existing styles ... */
		transition: all 0.2s ease;
	}
	.cast-area button:active:not(:disabled) {
		transform: scale(0.95); /* Depress */
	}
	.cast-area button.glow:not(:disabled) {
		animation: pulse-glow 1.5s infinite ease-in-out; /* Pulsing glow animation */
	}

	@keyframes pulse-glow {
		0% {
			box-shadow: 0 0 8px rgba(46, 204, 113, 0.5);
		}
		50% {
			box-shadow: 0 0 20px rgba(46, 204, 113, 0.9);
		}
		100% {
			box-shadow: 0 0 8px rgba(46, 204, 113, 0.5);
		}
	}

	.results-actions button {
		/* ... existing styles ... */
		transition: all 0.2s;
	}
	.results-actions button:active {
		transform: scale(0.95); /* Depress */
	}

	.enemy-icon.defeated {
		animation: enemy-defeat 0.6s ease-in forwards;
	}

	/* START SCREEN STYLES - Minimal & Captivating */
	.start-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem; /* Generous padding */
		background-color: #f0f4f8; /* Match game background */
		border-radius: 12px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08); /* Subtle shadow */
		text-align: center;
		font-family: sans-serif; /* Use consistent font */
		color: #333; /* Default dark text */
		width: 90%;
		max-width: 450px;
		overflow: hidden; /* Hide elements before slide-up */
	}

	.start-title {
		font-size: 2.4rem; /* Prominent but not huge */
		font-weight: 600; /* Semi-bold */
		color: #2c3e50; /* Dark slate blue */
		margin-bottom: 1rem;
		line-height: 1.2;
	}

	.start-instructions {
		font-size: 1.1rem;
		color: #555; /* Medium grey */
		margin-bottom: 2.5rem;
		max-width: 80%;
		line-height: 1.6;
	}

	.start-button {
		padding: 0.8rem 2rem; /* Standard padding */
		font-size: 1.1rem;
		font-weight: 500; /* Medium weight */
		border: none;
		border-radius: 8px; /* Moderate rounding */
		cursor: pointer;
		background-color: #3498db; /* Nice blue accent */
		color: #fff;
		transition: all 0.2s ease-in-out;
		box-shadow: 0 2px 5px rgba(52, 152, 219, 0.3);
	}

	.start-button:hover {
		background-color: #2980b9; /* Darker blue */
		box-shadow: 0 4px 8px rgba(52, 152, 219, 0.35);
		transform: translateY(-1px);
	}

	.start-button:active {
		transform: translateY(0) scale(0.98); /* Slight press down */
		box-shadow: 0 1px 3px rgba(52, 152, 219, 0.2);
		background-color: #2471a3; /* Even darker blue */
	}

	/* Animations */
	.animate-fade-in {
		animation: fade-in 0.5s ease-out forwards;
	}

	.animate-fade-in-staggered {
		animation: fade-in-staggered 0.6s ease-out forwards;
		opacity: 0;
	}

	/* Stagger delays */
	.delay-1 {
		animation-delay: 0.1s;
	}
	.delay-2 {
		animation-delay: 0.2s;
	}
	.delay-3 {
		animation-delay: 0.3s;
	}

	@keyframes fade-in {
		to {
			opacity: 1;
		}
	}

	@keyframes fade-in-staggered {
		to {
			opacity: 1;
		}
	}

	/* Player Health Bar Shield Active State */
	.player-health-bar-container.shield-active {
		border-color: #3498db; /* Blue border */
		box-shadow: 0 0 6px rgba(52, 152, 219, 0.6); /* Subtle blue glow */
		animation: pulse-shield-bar 1.5s infinite ease-in-out;
	}
</style>
