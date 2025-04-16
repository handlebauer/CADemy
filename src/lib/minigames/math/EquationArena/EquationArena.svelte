<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Pane } from 'tweakpane';

	import { minigameStore } from '$lib/stores/minigameStore';
	import { setupTweakpane, type TweakpaneBindingParams } from '$lib/utils/tweakpane';

	import {
		FIRE_DAMAGE,
		RESULT_DISPLAY_DELAY,
		INCORRECT_RESULT_DISPLAY_DELAY,
		CRAFTER_FEEDBACK_DISPLAY_DURATION,
		WRONG_ANSWER_HEALTH_PENALTY,
		WRONG_ANSWER_PENALTY_TOLERANCE,
		SHIELD_DURATION_MS,
		equationArenaTweakpaneBindings
	} from './config/index';
	import { getCrafterLevelConfig } from './config/crafterLevels';

	import { arenaStore, type ArenaState } from './store';
	import { GameStatus, type SpellType, type GradeLevel, type BonusConfig } from './types';

	// Import the input validation functions
	import {
		isOperatorAllowed,
		isOpenParenAllowed,
		isCloseParenAllowed,
		isDecimalAllowed
	} from './utils/equationInputValidation';

	import './styles/animations.css';

	// Import screen components from new location
	import GradeSelectionScreen from './components/screens/GradeSelectionScreen.svelte';
	import StartScreen from './components/screens/StartScreen.svelte';
	import ResultsScreen from './components/screens/ResultsScreen.svelte';

	// Import orchestrator and overlay
	import GameUI from './components/GameUI.svelte';
	import TutorialOverlay from './components/TutorialOverlay.svelte';

	// --- Config Variables (local reactive state) ---
	let globalConfig = {
		RESULT_DISPLAY_DELAY,
		FIRE_DAMAGE,
		WRONG_ANSWER_HEALTH_PENALTY,
		WRONG_ANSWER_PENALTY_TOLERANCE,
		INCORRECT_RESULT_DISPLAY_DELAY,
		CRAFTER_FEEDBACK_DISPLAY_DURATION,
		SHIELD_DURATION_MS
	};

	// --- Local Component State (Timers, Intervals) ---
	let gameTimerInterval: number | null = null;
	let enemyAttackIntervalTimer: number | null = null;
	let nextRoundTimeout: number | null = null;
	let enemyDefeatedTimeout: number | null = null;
	let damageDisplayTimeout: number | null = null;
	let playerHitTimeout: number | null = null;
	let enemyHitTimeout: number | null = null;
	let shieldHitTimeout: number | null = null;
	let telegraphTimeout: number | null = null;
	let shieldBlockedHitTimeout: number | null = null;
	let pane: Pane;

	// --- Local UI State ---
	let displayedDamage: number | null = null;
	let activeBonusesForDisplay: BonusConfig[] = [];
	let playerHit = false;
	let damageTaken: number | null = null;
	let enemyHit = false;
	let shieldHit = false;
	let shieldBlockedHit = false;
	let enemyDefeatedAnimating = false;
	let isEnemyTelegraphing = false;
	let gameStarted = false;

	// --- Element Refs ---
	let arenaContainerElement: HTMLDivElement;
	let tweakpaneContainerElement: HTMLDivElement;

	// --- Player Hit Animation Handling ---
	let previousPlayerHealth: number | undefined = undefined;

	// Non-reactive function to handle player hit animation
	function handlePlayerHit(damageAmount: number) {
		// Set visual state for hit animation
		damageTaken = damageAmount;
		playerHit = true;

		// Clear previous timeout if it exists
		if (playerHitTimeout) clearTimeout(playerHitTimeout);

		// Set new timeout to turn off the hit effect
		playerHitTimeout = setTimeout(() => {
			playerHit = false;
			damageTaken = null; // Clear damage display after animation
		}, 600); // Duration matches TopBar animation
	}

	// --- Lifecycle Functions & Event Handlers ---

	// Helper function to stop all intervals/timeouts
	function stopGameTimers() {
		if (enemyAttackIntervalTimer) clearInterval(enemyAttackIntervalTimer);
		if (gameTimerInterval) clearInterval(gameTimerInterval);
		if (nextRoundTimeout) clearTimeout(nextRoundTimeout);
		if (enemyDefeatedTimeout) clearTimeout(enemyDefeatedTimeout);
		if (damageDisplayTimeout) clearTimeout(damageDisplayTimeout);
		if (playerHitTimeout) clearTimeout(playerHitTimeout);
		if (enemyHitTimeout) clearTimeout(enemyHitTimeout);
		if (shieldHitTimeout) clearTimeout(shieldHitTimeout);
		if (telegraphTimeout) clearTimeout(telegraphTimeout);
		if (shieldBlockedHitTimeout) clearTimeout(shieldBlockedHitTimeout);

		// Reset all timer variables
		enemyAttackIntervalTimer = null;
		gameTimerInterval = null;
		nextRoundTimeout = null;
		enemyDefeatedTimeout = null;
		damageDisplayTimeout = null;
		playerHitTimeout = null;
		enemyHitTimeout = null;
		shieldHitTimeout = null;
		telegraphTimeout = null;
		shieldBlockedHitTimeout = null;

		playerHit = false;
		damageTaken = null;
		enemyHit = false;
		shieldHit = false;
		shieldBlockedHit = false;
		enemyDefeatedAnimating = false;
		isEnemyTelegraphing = false;
	}

	// --- Handler Functions for Child Component Events ---

	// Called when a grade is selected on the GradeSelectionScreen
	function handleGradeSelected(event: CustomEvent<GradeLevel>) {
		arenaStore.setGrade(event.detail);
		// The UI will automatically switch to StartScreen because
		// $arenaStore.selectedGrade is no longer null and
		// $arenaStore.gameStatus is still PRE_GAME (set by reset() onMount)
	}

	// --- GameUI Event Handlers ---
	function handleSelectSpellEvent(event: CustomEvent<SpellType>) {
		arenaStore.selectSpell(event.detail);
	}
	// Solver/Answer Input
	function handleInputEvent(event: CustomEvent<number>) {
		arenaStore.handleInput(event.detail);
	}
	function handleClearInputEvent() {
		arenaStore.clearInput();
	}
	function handleBackspaceEvent() {
		arenaStore.handleBackspace();
	}
	// Crafter Input
	function handleCrafterInputCharEvent(event: CustomEvent<string>) {
		arenaStore.appendToCraftedEquation(event.detail);
	}
	function handleClearCraftedEvent() {
		arenaStore.clearCraftedEquation();
	}
	function handleBackspaceCraftedEvent() {
		arenaStore.backspaceCraftedEquation();
	}
	function handleSubmitEquationEvent() {
		arenaStore.finalizeCrafting();
	}
	// General Action
	function handleCastSpellEvent() {
		arenaStore.castSpell(
			globalConfig.WRONG_ANSWER_PENALTY_TOLERANCE,
			globalConfig.WRONG_ANSWER_HEALTH_PENALTY,
			globalConfig.FIRE_DAMAGE,
			globalConfig.CRAFTER_FEEDBACK_DISPLAY_DURATION
		);
	}

	// --- ResultsScreen Event Handlers ---
	function handleExitGameEvent() {
		minigameStore.closeActiveMinigame();
	}
	function handleNextLevelEvent() {
		console.log('got here');
		arenaStore.advanceLevelAndStart();
	}
	function handleTryAgainEvent() {
		// Explicitly clear the hit effect when trying again
		playerHit = false;
		// Reset to grade selection? Or just restart level 1 of the current grade?
		// For now, let's restart level 1 of the current grade/mode.
		arenaStore.startGame();
	}

	// --- Tutorial Handler ---
	function handleNextTutorialStep() {
		arenaStore.advanceTutorial();
	}

	// Called when the tutorial is skipped because it was already completed
	function handleTutorialSkipped() {
		console.log('Tutorial skipped, calling store action.');
		arenaStore.skipTutorialAndStart();
	}

	// --- Keyboard handler ---
	function handleKeyDown(event: KeyboardEvent) {
		// --- Disable ALL keyboard input if tutorial is active ---
		if ($arenaStore.tutorialStep > 0) {
			return;
		}

		// Start game on Enter press ONLY during PRE_GAME (after grade selection)
		if ($arenaStore.selectedGrade && $arenaStore.gameStatus === GameStatus.PRE_GAME) {
			if (event.key === 'Enter') {
				handleStartGame();
				return; // Prevent further processing
			}
			// Do not process other keys on PRE_GAME screen
			return;
		}

		// Do not process keys if grade not selected yet
		if (!$arenaStore.selectedGrade) return;

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

		// Handle input based on game mode and phase
		if ($arenaStore.gameStatus === GameStatus.SOLVING) {
			if ($arenaStore.gameMode === 'solver') {
				// Solver Mode: Answer Input
				if (event.key >= '0' && event.key <= '9') {
					arenaStore.handleInput(parseInt(event.key, 10));
				} else if (event.key === 'Enter') {
					arenaStore.castSpell(
						globalConfig.WRONG_ANSWER_PENALTY_TOLERANCE,
						globalConfig.WRONG_ANSWER_HEALTH_PENALTY,
						globalConfig.FIRE_DAMAGE,
						globalConfig.CRAFTER_FEEDBACK_DISPLAY_DURATION
					);
				} else if (event.key === 'Backspace') {
					arenaStore.handleBackspace();
				} else if (event.key === 'c' || event.key === 'C' || event.key === 'Escape') {
					arenaStore.clearInput();
				}
			} else if ($arenaStore.gameMode === 'crafter') {
				if ($arenaStore.isCraftingPhase) {
					// Crafter Mode: Crafting Input
					if (
						(event.key >= '0' && event.key <= '9') ||
						['+', '-', '*', '/', '(', ')', '.'].includes(event.key)
					) {
						// Map * to × if needed
						let char = event.key;
						if (char === '*') char = '×';

						// Check against allowed characters for the current level BEFORE sending
						if ($arenaStore.allowedCrafterChars && $arenaStore.allowedCrafterChars.includes(char)) {
							let isAllowedByLevel = true;
							let isInputValid = true;

							// Check against level-specific constraints
							if (char === '(') {
								isInputValid = isOpenParenAllowed(
									$arenaStore.craftedEquationString,
									$arenaStore.allowedCrafterChars
								);
							} else if (char === ')') {
								isInputValid = isCloseParenAllowed(
									$arenaStore.craftedEquationString,
									$arenaStore.allowedCrafterChars
								);
							} else if (char === '.') {
								isInputValid = isDecimalAllowed(
									$arenaStore.craftedEquationString,
									$arenaStore.allowedCrafterChars
								);
							} else if (['+', '-', '×', '/'].includes(char)) {
								isInputValid = isOperatorAllowed(
									char, // op parameter
									$arenaStore.craftedEquationString,
									$arenaStore.allowedCrafterChars
								);
							}

							// Only append if allowed by level AND syntactically valid
							if (isAllowedByLevel && isInputValid) {
								arenaStore.appendToCraftedEquation(char);
							}
						}
					} else if (event.key === 'Enter') {
						// Don't check validation on Enter, finalizeCrafting handles full validation
						arenaStore.finalizeCrafting();
					} else if (event.key === 'Backspace') {
						arenaStore.backspaceCraftedEquation();
					} else if (event.key === 'c' || event.key === 'C' || event.key === 'Escape') {
						arenaStore.clearCraftedEquation();
					}
				} else {
					// Crafter Mode: Answer Input
					if (event.key >= '0' && event.key <= '9') {
						arenaStore.handleInput(parseInt(event.key, 10));
					} else if (event.key === '.') {
						arenaStore.handleInput('.');
					} else if (event.key === '/') {
						// Allow / input only during answer phase (validation happens in store)
						arenaStore.handleInput('/');
					} else if (event.key === 'Enter') {
						arenaStore.castSpell(
							globalConfig.WRONG_ANSWER_PENALTY_TOLERANCE,
							globalConfig.WRONG_ANSWER_HEALTH_PENALTY,
							globalConfig.FIRE_DAMAGE,
							globalConfig.CRAFTER_FEEDBACK_DISPLAY_DURATION
						);
					} else if (event.key === 'Backspace') {
						arenaStore.handleBackspace();
					} else if (event.key === 'c' || event.key === 'C' || event.key === 'Escape') {
						arenaStore.clearInput();
					}
				}
			}
		}
	}

	// Refactored player hit feedback (only handles shield visual now)
	function triggerShieldHitFeedback() {
		if (shieldHitTimeout) clearTimeout(shieldHitTimeout);
		shieldHit = true;
		if (arenaContainerElement) {
			arenaContainerElement.style.setProperty('--shake-intensity', `5px`); // Standard shake for shield
		}
		shieldHitTimeout = setTimeout(() => {
			shieldHit = false;
			shieldHitTimeout = null;
		}, 300);
	}

	// Function to handle starting the game (from StartScreen)
	function handleStartGame() {
		// startGame action now uses selectedGrade/gameMode from the store
		arenaStore.startGame();
	}

	// --- Sequence Handler Functions ---
	// New sequence handler specifically for victory
	function handleEnemyVictorySequence() {
		// Prevent re-triggering if timeout already active or game already over
		if (enemyDefeatedTimeout || $arenaStore.gameStatus === GameStatus.GAME_OVER) return;

		console.log('Triggering Enemy Victory Sequence');
		stopGameTimers(); // Stop other game timers
		enemyDefeatedAnimating = true;

		// Set a timeout to allow animation to play before finalizing game over
		enemyDefeatedTimeout = setTimeout(() => {
			console.log('Enemy Victory Timeout -> Finalizing Victory');
			// Double check status before setting game over (might have reset)
			if ($arenaStore.gameStatus !== GameStatus.GAME_OVER) {
				arenaStore.finalizeVictory();
			}
			enemyDefeatedTimeout = null;
			// Animation flag can reset automatically based on game status change
			// or be explicitly reset if needed when ResultsScreen shows.
		}, 1500); // Increased from 1000ms to 1500ms to give bonus animation more time
	}

	function handleDamageDisplaySequence() {
		// Only run if damage should be displayed (Correct FIRE spell in RESULT state)
		if (
			!$arenaStore.lastAnswerCorrect ||
			$arenaStore.lastSpellCast !== 'FIRE' ||
			$arenaStore.gameStatus !== GameStatus.RESULT
		) {
			// Clear display if conditions aren't met (and no timeout running)
			if (!damageDisplayTimeout) {
				displayedDamage = null;
				activeBonusesForDisplay = [];
			}
			return;
		}

		// Prevent re-triggering if timeout already active
		if (damageDisplayTimeout) return;

		console.log('Triggering Damage Display Sequence');

		let calculatedDamage = globalConfig.FIRE_DAMAGE;
		// Use store's activeBonuses directly
		$arenaStore.activeBonuses.forEach((bonus) => {
			calculatedDamage *= bonus.powerMultiplier;
		});
		calculatedDamage = Math.round(calculatedDamage);

		displayedDamage = calculatedDamage;
		activeBonusesForDisplay = $arenaStore.activeBonuses;

		// Enemy hit animation
		if (enemyHitTimeout) clearTimeout(enemyHitTimeout);
		enemyHit = true;
		enemyHitTimeout = setTimeout(() => {
			enemyHit = false;
			enemyHitTimeout = null;
		}, 200);

		damageDisplayTimeout = setTimeout(() => {
			console.log('Damage Display Timeout -> Clearing Display');
			displayedDamage = null;
			activeBonusesForDisplay = [];
			damageDisplayTimeout = null;
		}, 1200); // Duration damage is shown
	}

	function handleNextRoundSequence() {
		// Only run if in RESULT state and timeout not active
		if ($arenaStore.gameStatus !== GameStatus.RESULT || nextRoundTimeout) return;

		console.log('Triggering Next Round Sequence');

		const delay = $arenaStore.lastAnswerCorrect
			? globalConfig.RESULT_DISPLAY_DELAY
			: globalConfig.INCORRECT_RESULT_DISPLAY_DELAY;

		nextRoundTimeout = setTimeout(() => {
			console.log('Next Round Timeout -> Preparing Next Round');
			// Check status again before proceeding
			if ($arenaStore.gameStatus !== GameStatus.GAME_OVER) {
				arenaStore.prepareNextRound();
			}
			nextRoundTimeout = null;
		}, delay); // Use calculated delay
	}

	// --- Reactive Statements ---

	$: {
		if (
			$arenaStore.gameStatus === GameStatus.SOLVING &&
			!gameStarted &&
			$arenaStore.currentEnemyConfig
		) {
			console.log('Reactive: Game Status == SOLVING & !gameStarted -> Starting Timers');
			startEnemyAttackTimer($arenaStore.currentEnemyConfig);
			startGameTimer();
			gameStarted = true; // Mark timers as started for this game instance
			enemyDefeatedAnimating = false; // Reset defeat animation flag for new level
		} else if (
			($arenaStore.gameStatus === GameStatus.GAME_OVER ||
				$arenaStore.gameStatus === GameStatus.PRE_GAME) &&
			gameStarted // Only reset if it was previously true
		) {
			console.log('Reactive: Game Ended/Reset -> Stopping Timers & Resetting gameStarted');
			stopGameTimers(); // Stop timers when game ends or resets
			gameStarted = false; // Reset for next game
		}
	}

	// Modified reactive block to handle RESULT state and trigger victory sequence
	$: {
		if ($arenaStore.gameStatus === GameStatus.RESULT) {
			// Always handle damage and bonus display regardless of enemy defeat
			handleDamageDisplaySequence();

			if ($arenaStore.enemyJustDefeated) {
				// Enemy defeated, trigger victory sequence
				console.log(
					'Reactive: Game Status == RESULT & enemyJustDefeated -> Calling Victory Sequence'
				);
				handleEnemyVictorySequence();
			} else {
				// Normal RESULT state, handle next round
				console.log('Reactive: Game Status == RESULT -> Calling Next Round Sequence');
				handleNextRoundSequence(); // Checks conditions internally
			}
		} else if ($arenaStore.gameStatus !== GameStatus.GAME_OVER && enemyDefeatedAnimating) {
			// Reset animation flag if game status changes away from GAME_OVER (e.g., reset)
			// This might need refinement depending on when ResultsScreen takes over.
			console.log('Reactive: Resetting enemyDefeatedAnimating flag');
			enemyDefeatedAnimating = false;
		}
	}

	// --- Timer Management ---

	// Helper function to start the enemy timer using current enemy config
	function startEnemyAttackTimer(enemyConfig: ArenaState['currentEnemyConfig']) {
		if (!enemyConfig) return; // Safety check
		if (enemyAttackIntervalTimer) clearInterval(enemyAttackIntervalTimer); // Clear existing if any
		if (telegraphTimeout) clearTimeout(telegraphTimeout); // Clear existing telegraph timeout

		const attackInterval = enemyConfig.attackInterval;
		const attackDamage = enemyConfig.damage;
		const telegraphDuration = 1500; // Duration of telegraph animation (ms)

		enemyAttackIntervalTimer = setInterval(() => {
			// Check status *inside* the interval callback
			if ($arenaStore.gameStatus === GameStatus.SOLVING) {
				// Start telegraphing
				isEnemyTelegraphing = true;

				// Clear any pending damage timeout from a previous cycle (unlikely but safe)
				if (telegraphTimeout) clearTimeout(telegraphTimeout);

				// Set timeout for the actual damage AFTER the telegraph duration
				telegraphTimeout = setTimeout(() => {
					// Check status again *inside* the damage timeout
					// Allow damage/block if game is in progress (not ended/reset)
					if (
						$arenaStore.gameStatus === GameStatus.SOLVING ||
						$arenaStore.gameStatus === GameStatus.RESULT
					) {
						const shieldWillBlock = $arenaStore.isShieldActive;

						// Trigger shield block visual effect *before* damage action
						if (shieldWillBlock) {
							if (shieldBlockedHitTimeout) clearTimeout(shieldBlockedHitTimeout);
							shieldBlockedHit = true;
							shieldBlockedHitTimeout = setTimeout(() => {
								shieldBlockedHit = false;
								shieldBlockedHitTimeout = null;
							}, 600); // Match damage text duration

							// Also trigger screen edge flash for shield hit
							triggerShieldHitFeedback();
						}

						// Call the store action to apply damage (or block it)
						arenaStore.receivePlayerDamage(attackDamage);

						// Ensure shield is cleared after blocking
						if (shieldWillBlock) {
							arenaStore.clearShieldState();
						}

						// Player hit feedback (damage text, health bar flash, heart shake)
						// is handled reactively by the $: block monitoring $arenaStore.playerHealth
						// This will NOT trigger if the shield blocked the damage, because playerHealth won't change.
					}
					// Stop telegraphing *after* damage sequence
					isEnemyTelegraphing = false;
					telegraphTimeout = null; // Clear the timeout ref
				}, telegraphDuration);
			} else {
				// If not solving when interval fires, ensure telegraphing is off
				isEnemyTelegraphing = false;
				if (telegraphTimeout) clearTimeout(telegraphTimeout); // Clear pending damage too
				telegraphTimeout = null;
			}
		}, attackInterval); // Interval triggers the start of the process
	}

	// Helper function to start the game timer
	function startGameTimer() {
		if (gameTimerInterval) clearInterval(gameTimerInterval); // Clear existing if any
		gameTimerInterval = setInterval(() => {
			if ($arenaStore.gameTime > 0 && $arenaStore.gameStatus === GameStatus.SOLVING) {
				arenaStore.tickTime();
			} else if ($arenaStore.gameTime <= 0) {
				// Timer stops itself when time reaches 0, but clear interval ref
				if (gameTimerInterval) clearInterval(gameTimerInterval);
				gameTimerInterval = null;
				// Game over logic is handled by the reactive block checking gameTime
			}
		}, 1000);
	}

	// --- Lifecycle ---
	onMount(() => {
		// Reset the store to initial state (PRE_GAME, grade not selected)
		arenaStore.reset();
		// Default spell selection can happen anytime
		arenaStore.selectSpell('FIRE');

		window.addEventListener('keydown', handleKeyDown);

		// Tweakpane setup (will need updating for dynamic configs)
		if (import.meta.env.DEV) {
			if (tweakpaneContainerElement) {
				const validKeys = Object.keys(globalConfig) as (keyof typeof globalConfig)[];

				const bindings: TweakpaneBindingParams[] = equationArenaTweakpaneBindings
					.filter((def) => validKeys.includes(def.key as keyof typeof globalConfig)) // Filter bindings
					.map((def) => {
						let onChangeHandler = (value: unknown) => {
							// We know the key is valid due to the filter above
							globalConfig[def.key as keyof typeof globalConfig] = value as number;
							globalConfig = globalConfig; // Trigger reactivity
						};

						return {
							target: globalConfig,
							key: def.key,
							options: def.options,
							folderTitle: def.folderTitle,
							onChange: onChangeHandler
						};
					});

				pane = setupTweakpane(tweakpaneContainerElement, bindings, 'Game Config (Global)');
			}
		}

		// Setup health tracking
		const unsubscribe = arenaStore.subscribe((state) => {
			// Initialize or handle health changes
			if (typeof state.playerHealth === 'number') {
				if (
					typeof previousPlayerHealth === 'number' &&
					state.playerHealth < previousPlayerHealth &&
					state.gameStatus !== GameStatus.GAME_OVER
				) {
					// Calculate and show damage animation
					const damageAmount = previousPlayerHealth - state.playerHealth;
					handlePlayerHit(damageAmount);
				}

				// Always update the previous health value
				previousPlayerHealth = state.playerHealth;
			}
		});

		// Clean up subscription on component destroy
		return () => unsubscribe();
	});

	onDestroy(() => {
		stopGameTimers(); // Clear intervals and timeouts
		window.removeEventListener('keydown', handleKeyDown);
		if (import.meta.env.DEV && pane) {
			pane.dispose();
		}
	});

	// --- Derived State ---
	$: formattedTime = `Time: ${Math.floor($arenaStore.gameTime / 60)}:${($arenaStore.gameTime % 60)
		.toString()
		.padStart(2, '0')}`;
	$: timeTakenSeconds =
		$arenaStore.gameStatus === GameStatus.GAME_OVER
			? $arenaStore.startTime - $arenaStore.gameTime
			: 0;
	$: formattedTimeTaken = `${Math.floor(timeTakenSeconds / 60)}:${(timeTakenSeconds % 60).toString().padStart(2, '0')}`;

	// Derive crafter level description
	$: crafterLevelDescription =
		$arenaStore.gameMode === 'crafter'
			? getCrafterLevelConfig($arenaStore.currentLevelNumber)?.description
			: null;
</script>

<!-- Main Template -->
<div
	class="arena-wrapper"
	class:player-hit={playerHit ||
		($arenaStore.gameStatus === GameStatus.GAME_OVER && $arenaStore.playerHealth <= 0)}
	class:shield-hit={shieldHit}
	bind:this={arenaContainerElement}
>
	<!-- Tweakpane container -->
	{#if import.meta.env.DEV}
		<div id="tweakpane-container" bind:this={tweakpaneContainerElement}></div>
	{/if}

	<!-- Game Content Area -->
	<div class="game-content">
		{#if !$arenaStore.selectedGrade}
			<GradeSelectionScreen on:selectGrade={handleGradeSelected} />
		{:else if $arenaStore.gameStatus === GameStatus.PRE_GAME}
			<StartScreen on:startGame={handleStartGame} />
		{:else if $arenaStore.gameStatus !== GameStatus.GAME_OVER}
			<GameUI
				{...$arenaStore}
				{formattedTime}
				{enemyHit}
				{enemyDefeatedAnimating}
				{displayedDamage}
				activeBonuses={activeBonusesForDisplay}
				{crafterLevelDescription}
				showCrafterFeedback={$arenaStore.showCrafterFeedback}
				crafterFeedbackDetails={$arenaStore.crafterFeedbackDetails}
				on:selectSpell={handleSelectSpellEvent}
				on:handleInput={handleInputEvent}
				on:clearInput={handleClearInputEvent}
				on:handleBackspace={handleBackspaceEvent}
				on:castSpell={handleCastSpellEvent}
				on:inputChar={handleCrafterInputCharEvent}
				on:clearCrafted={handleClearCraftedEvent}
				on:backspaceCrafted={handleBackspaceCraftedEvent}
				on:submitEquation={handleSubmitEquationEvent}
				{playerHit}
				{damageTaken}
				{isEnemyTelegraphing}
				shieldTimeRemaining={$arenaStore.shieldDurationRemaining}
				{shieldBlockedHit}
			/>
		{:else}
			<ResultsScreen
				playerHealth={$arenaStore.playerHealth}
				equationsSolvedCorrectly={$arenaStore.equationsSolvedCorrectly}
				{formattedTimeTaken}
				handleExit={handleExitGameEvent}
				handleNextLevel={handleNextLevelEvent}
				handleTryAgain={handleTryAgainEvent}
			/>
		{/if}
	</div>

	<!-- Tutorial Overlay -->
	{#if $arenaStore.tutorialStep > 0}
		<TutorialOverlay
			step={$arenaStore.tutorialStep}
			on:nextStep={handleNextTutorialStep}
			on:tutorialSkipped={handleTutorialSkipped}
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
		background-color: #e8edf1;
		box-shadow: inset 0 0 0 0 rgba(231, 76, 60, 0);
		transition: box-shadow 0.2s ease-out;
		position: relative;
		animation-duration: 0.2s;
		animation-timing-function: ease-in-out;
	}

	#tweakpane-container {
		position: fixed;
		top: 10px;
		right: 10px;
		z-index: 1000;
	}

	.arena-wrapper.player-hit {
		box-shadow: inset 0 0 40px 30px rgba(231, 76, 60, 0.7);
		animation-name: shake-player-hit;
	}

	.arena-wrapper.shield-hit {
		box-shadow: inset 0 0 40px 30px rgba(52, 152, 219, 0.6);
		animation-name: shake-shield-block;
		animation-duration: 0.3s;
	}

	.game-content {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
