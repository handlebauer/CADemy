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

	import StartScreen from './components/StartScreen.svelte';
	import GameUI from './components/GameUI.svelte';
	import ResultsScreen from './components/ResultsScreen.svelte';

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
	let shieldHitTimeout: number | null = null; // Timeout for shield hit effect
	let pane: Pane;

	// --- Local UI State ---
	let displayedDamage: number | null = null; // Damage number to show on enemy
	let playerHit = false; // Flag to trigger player hit visual effect
	let enemyHit = false; // Flag to trigger enemy hit visual effect
	let shieldHit = false; // Flag to trigger shield hit visual effect
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
		if (shieldHitTimeout) clearTimeout(shieldHitTimeout); // Clear shield hit timeout

		// Reset all variables
		enemyAttackIntervalTimer = null; // Use renamed timer
		gameTimerInterval = null;
		nextRoundTimeout = null;
		enemyDefeatedTimeout = null;
		damageDisplayTimeout = null;
		playerHitTimeout = null;
		enemyHitTimeout = null; // Clear enemy hit timeout ID
		shieldHitTimeout = null; // Clear shield hit timeout ID
		playerHit = false;
		enemyHit = false; // Reset enemy hit state
		shieldHit = false; // Reset shield hit state
		gameStarted = false; // Reset game started flag
	}

	// Handler Functions for Child Component Events
	function handleSelectSpellEvent(event: CustomEvent<SpellType>) {
		arenaStore.selectSpell(event.detail);
	}
	function handleInputEvent(event: CustomEvent<number>) {
		arenaStore.handleInput(event.detail);
	}
	function handleClearInputEvent() {
		arenaStore.clearInput();
	}
	function handleBackspaceEvent() {
		arenaStore.handleBackspace();
	}
	function handleCastSpellEvent() {
		arenaStore.castSpell();
	}
	function handleExitGameEvent() {
		minigameStore.closeActiveMinigame();
	}
	function handleNextLevelEvent() {
		arenaStore.advanceLevelAndStart();
	}
	function handleTryAgainEvent() {
		arenaStore.startGame(); // Or arenaStore.reset() depending on desired behavior
	}

	// Keyboard handler - calls store actions (Simplified)
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
			startEnemyAttackTimer();
			startGameTimer();
			gameStarted = true; // Mark timers as started
			enemyDefeatedAnimating = false; // Reset defeat animation flag for new level
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
		enemyAttackIntervalTimer = setInterval(() => {
			// Check status *inside* the interval callback as well
			if (($arenaStore as ArenaState).gameStatus === GameStatus.SOLVING) {
				// Capture shield status *before* potential deactivation
				const shieldWasActive = ($arenaStore as ArenaState).isShieldActive;

				// Always attempt to damage player; the store handles shield logic
				arenaStore.damagePlayer(config.ENEMY_DAMAGE);

				// Determine which visual effect to show based on shield status *before* damage was applied
				if (shieldWasActive) {
					// Trigger shield hit visual effect
					if (shieldHitTimeout) clearTimeout(shieldHitTimeout);
					shieldHit = true;
					if (arenaContainerElement) {
						// Maybe a less intense shake for shield block?
						arenaContainerElement.style.setProperty('--shake-intensity', `5px`);
					}
					shieldHitTimeout = setTimeout(() => {
						shieldHit = false;
						shieldHitTimeout = null;
					}, 300); // Slightly longer duration for shield effect?
				} else {
					// Trigger player hit visual effect (shield was not active)
					if (playerHitTimeout) clearTimeout(playerHitTimeout);

					// Calculate shake intensity based on health (lower health = more shake)
					// Note: Reading health *after* damagePlayer was called
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
			}
		}, config.ENEMY_ATTACK_INTERVAL); // Use local reactive config
	}

	// Helper function to start the game timer
	function startGameTimer() {
		if (gameTimerInterval) clearInterval(gameTimerInterval); // Clear existing if any
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
<div
	class="arena-wrapper"
	class:player-hit={playerHit}
	class:shield-hit={shieldHit}
	bind:this={arenaContainerElement}
>
	<!-- Explicit container for Tweakpane (only render in dev) -->
	{#if import.meta.env.DEV}
		<div id="tweakpane-container" bind:this={tweakpaneContainerElement}></div>
	{/if}

	{#if $arenaStore.gameStatus === GameStatus.PRE_GAME}
		<!-- Start Screen Component -->
		<StartScreen on:startGame={handleStartGame} />
	{:else if $arenaStore.gameStatus !== GameStatus.GAME_OVER}
		<!-- Game UI Component -->
		<GameUI
			gameStatus={$arenaStore.gameStatus}
			playerHealth={$arenaStore.playerHealth}
			enemyHealth={$arenaStore.enemyHealth}
			isShieldActive={$arenaStore.isShieldActive}
			{formattedTime}
			gameTime={$arenaStore.gameTime}
			{enemyHit}
			{enemyDefeatedAnimating}
			{displayedDamage}
			selectedSpell={$arenaStore.selectedSpell}
			lastAnswerCorrect={$arenaStore.lastAnswerCorrect}
			currentEquation={$arenaStore.currentEquation}
			playerInput={$arenaStore.playerInput}
			lastFullEquation={$arenaStore.lastFullEquation}
			lastPlayerInput={$arenaStore.lastPlayerInput}
			on:selectSpell={handleSelectSpellEvent}
			on:handleInput={handleInputEvent}
			on:clearInput={handleClearInputEvent}
			on:handleBackspace={handleBackspaceEvent}
			on:castSpell={handleCastSpellEvent}
		/>
	{:else}
		<!-- Results Screen Component -->
		<ResultsScreen
			playerHealth={$arenaStore.playerHealth}
			equationsSolvedCorrectly={$arenaStore.equationsSolvedCorrectly}
			{formattedTimeTaken}
			on:exitGame={handleExitGameEvent}
			on:nextLevel={handleNextLevelEvent}
			on:tryAgain={handleTryAgainEvent}
		/>
	{/if}
</div>

<style>
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
		/* Apply shake animation via CSS variable set in script */
		animation-duration: 0.2s; /* Default duration */
		animation-timing-function: ease-in-out;
		/* Apply shake animation based on playerHit/shieldHit */
	}

	#tweakpane-container {
		position: fixed; /* Keep it fixed in the viewport */
		top: 10px;
		right: 10px;
		z-index: 1000; /* Ensure it stays on top */
	}

	.arena-wrapper.player-hit {
		box-shadow: inset 0 0 40px 30px rgba(231, 76, 60, 0.7); /* Stronger red glow inset */
		animation-name: shake-player-hit;
	}

	.arena-wrapper.shield-hit {
		box-shadow: inset 0 0 40px 30px rgba(52, 152, 219, 0.6); /* Blue glow inset for shield */
		animation-name: shake-shield-block;
		animation-duration: 0.3s;
	}
</style>
