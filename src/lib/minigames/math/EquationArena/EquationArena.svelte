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
		equationArenaTweakpaneBindings,
		enemies
	} from './config/index';
	import { getCrafterLevelConfig } from './config/crafterLevels';

	import { arenaStore, type ArenaState } from './store';
	import {
		GameStatus,
		type SpellType,
		type GradeLevel,
		type BonusConfig,
		type GameMode,
		type EnemyConfig
	} from './types';

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
	import FinalSummaryScreen from './components/screens/FinalSummaryScreen.svelte';

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
		CRAFTER_FEEDBACK_DISPLAY_DURATION
	};

	// --- Local Component State (Timers, Intervals) ---
	let attackTimerInterval: number | null = null;
	let nextRoundTimeout: number | null = null;
	let enemyDefeatedTimeout: number | null = null;
	let damageDisplayTimeout: number | null = null;
	let playerHitTimeout: number | null = null;
	let enemyHitTimeout: number | null = null;
	let telegraphTimeout: number | null = null;
	let pane: Pane;

	// --- Local UI State ---
	let displayedDamage: number | null = null;
	let activeBonusesForDisplay: BonusConfig[] = [];
	let playerHit = false;
	let damageTaken: number | null = null;
	let enemyHit = false;
	let enemyDefeatedAnimating = false;
	let isEnemyTelegraphing = false;
	let gameStarted = false;
	let waitingForPlayerStart = true;

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
		if (attackTimerInterval) clearInterval(attackTimerInterval);
		if (nextRoundTimeout) clearTimeout(nextRoundTimeout);
		if (enemyDefeatedTimeout) clearTimeout(enemyDefeatedTimeout);
		if (damageDisplayTimeout) clearTimeout(damageDisplayTimeout);
		if (playerHitTimeout) clearTimeout(playerHitTimeout);
		if (enemyHitTimeout) clearTimeout(enemyHitTimeout);
		if (telegraphTimeout) clearTimeout(telegraphTimeout);

		// Reset all timer variables
		attackTimerInterval = null;
		nextRoundTimeout = null;
		enemyDefeatedTimeout = null;
		damageDisplayTimeout = null;
		playerHitTimeout = null;
		enemyHitTimeout = null;
		telegraphTimeout = null;

		playerHit = false;
		damageTaken = null;
		enemyHit = false;
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
		const char = event.detail;
		if ($arenaStore.isCraftingPhase) {
			// Original crafting logic (input validation happens in numpad/store)
			arenaStore.appendToCraftedEquation(char);
		} else if (
			char === '/' &&
			$arenaStore.gameStatus === GameStatus.SOLVING &&
			$arenaStore.currentLevelNumber === 2
		) {
			// Handle '/' input during solving phase for level 2 from numpad
			arenaStore.handleInput(char);
		}
		// Potentially add '.' handling here later if needed for solving phase numpad input
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
	// Crafter Reset Event
	function handleResetCrafterEvent() {
		arenaStore.resetCrafterState();
	}

	// --- ResultsScreen Event Handlers ---
	function handleExitGameEvent() {
		minigameStore.closeActiveMinigame();
	}
	function handleNextLevelEvent() {
		arenaStore.advanceLevelAndStart();
		waitingForPlayerStart = true; // Reset waiting state when advancing to next level
	}
	function handleTryAgainEvent() {
		// Explicitly clear the hit effect when trying again
		playerHit = false;
		// Reset to grade selection? Or just restart level 1 of the current grade?
		// For now, let's restart level 1 of the current grade/mode.
		arenaStore.startGame();
		waitingForPlayerStart = true; // Reset waiting state when retrying
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
				// Create the event detail object that handleStartGame expects
				const gameMode = $arenaStore.gameMode || 'solver';
				const subMode = gameMode === 'crafter' ? 'normal' : undefined;
				handleStartGame({ detail: { mode: gameMode, subMode } } as CustomEvent<{
					mode: GameMode;
					subMode?: 'normal' | 'challenge';
				}>);
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

	// Function to handle starting the game (from StartScreen)
	function handleStartGame(
		event: CustomEvent<{ mode: GameMode; subMode?: 'normal' | 'challenge' }>
	) {
		// Start game with the specified mode and subMode
		arenaStore.startGame(event.detail.mode, event.detail.subMode);
		waitingForPlayerStart = true; // Reset waiting state when starting a new game
	}

	// Function to handle starting challenge mode from final summary
	function handleStartChallengeFromSummary() {
		arenaStore.startGame('crafter', 'challenge');
	}

	// --- Timer Management ---
	// Helper function to start the attack timer using current enemy config
	function startAttackTimer(enemyConfig: ArenaState['currentEnemyConfig']) {
		if (!enemyConfig) return; // Safety check
		if (attackTimerInterval) clearInterval(attackTimerInterval); // Clear existing if any
		if (waitingForPlayerStart) return; // Don't start timer if player hasn't confirmed

		// Set the initial attack time from enemy config
		arenaStore.resetAttackTimer(enemyConfig.solveTimeSec);

		// Define telegraph duration once
		const TELEGRAPH_DURATION = 1500; // ms

		// Flag to track if telegraphing has started for this attack cycle
		let hasTelegraphStarted = false;

		// Start the countdown interval
		attackTimerInterval = setInterval(() => {
			// Check if feedback is active first
			if ($arenaStore.isFeedbackActive) {
				// Timer is paused while feedback is active
				// Ensure telegraphing is also paused/reset
				if (isEnemyTelegraphing) {
					isEnemyTelegraphing = false;
				}
				return; // Skip timer tick and attack logic
			}

			// Always try to tick the main attack timer (action handles pause)
			if ($arenaStore.gameStatus === GameStatus.SOLVING) {
				arenaStore.tickAttackTimer();
			}

			// If the timer is frozen, also tick the freeze duration
			if ($arenaStore.isTimerFrozen) {
				arenaStore.tickTimerFreeze(100);
			}

			// Check attack condition only if the timer isn't frozen
			if (!$arenaStore.isTimerFrozen && $arenaStore.gameStatus === GameStatus.SOLVING) {
				// Decrement timer if time remains
				if ($arenaStore.attackTimeRemaining > 0) {
					// Start telegraphing when there's exactly TELEGRAPH_DURATION milliseconds left
					const timeRemainingMs = $arenaStore.attackTimeRemaining * 1000;
					if (timeRemainingMs <= TELEGRAPH_DURATION && !hasTelegraphStarted) {
						isEnemyTelegraphing = true;
						hasTelegraphStarted = true;
					}
				}
				// When timer reaches 0, execute the attack immediately
				else if ($arenaStore.attackTimeRemaining <= 0) {
					// Stop the timer interval
					if (attackTimerInterval) clearInterval(attackTimerInterval);
					attackTimerInterval = null;

					// Execute attack
					if ($arenaStore.gameStatus === GameStatus.SOLVING) {
						// Apply damage or block it
						arenaStore.receivePlayerDamage(enemyConfig.damage);

						// Reset telegraph state
						isEnemyTelegraphing = false;

						// Start new attack cycle
						if ($arenaStore.gameStatus === GameStatus.SOLVING && enemyConfig) {
							startAttackTimer(enemyConfig);
						}
					}
				}
			}
			// If game state is not SOLVING, check if we should stop completely
			else if (
				$arenaStore.gameStatus === GameStatus.GAME_OVER ||
				$arenaStore.gameStatus === GameStatus.PRE_GAME
			) {
				// Only stop interval completely if game is over or reset
				if (attackTimerInterval) clearInterval(attackTimerInterval);
				attackTimerInterval = null;
				isEnemyTelegraphing = false;
			}
			// Otherwise (e.g., status is RESULT), let the interval continue running.
			// It will call tickAttackTimer (which checks status) and tickTimerFreeze (if needed).
		}, 100);
	}

	// --- Reactive Statements ---
	$: {
		if (
			$arenaStore.gameStatus === GameStatus.SOLVING &&
			!gameStarted &&
			$arenaStore.currentEnemyConfig &&
			!waitingForPlayerStart // Only start attack timer if player has confirmed
		) {
			// Start the attack timer immediately when the level begins
			startAttackTimer($arenaStore.currentEnemyConfig);
			gameStarted = true; // Mark timers as started for this game instance
			enemyDefeatedAnimating = false; // Reset defeat animation flag for new level
		} else if (
			($arenaStore.gameStatus === GameStatus.GAME_OVER ||
				$arenaStore.gameStatus === GameStatus.PRE_GAME) &&
			gameStarted // Only reset if it was previously true
		) {
			stopGameTimers(); // Stop timers when game ends or resets
			gameStarted = false; // Reset for next game
			waitingForPlayerStart = true; // Reset waiting state for next level
		}
	}

	// Modified reactive block to handle RESULT state and trigger victory sequence
	$: {
		if ($arenaStore.gameStatus === GameStatus.RESULT) {
			// Always handle damage and bonus display regardless of enemy defeat
			handleDamageDisplaySequence();

			if ($arenaStore.enemyJustDefeated) {
				// Enemy defeated, trigger victory sequence
				handleEnemyVictorySequence();
			} else {
				// Normal RESULT state, handle next round
				handleNextRoundSequence(); // Checks conditions internally
			}
		} else if ($arenaStore.gameStatus !== GameStatus.GAME_OVER && enemyDefeatedAnimating) {
			// Reset animation flag if game status changes away from GAME_OVER (e.g., reset)
			// This might need refinement depending on when ResultsScreen takes over.
			enemyDefeatedAnimating = false;
		}
	}

	// --- Timer Management ---

	// Helper function to handle damage display sequence
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
			// Check status again before proceeding
			if ($arenaStore.gameStatus !== GameStatus.GAME_OVER) {
				// Check if timer was frozen *before* preparing the next round
				const wasTimerFrozen = $arenaStore.isTimerFrozen;

				arenaStore.prepareNextRound();

				// Get the spell cast *after* prepareNextRound might have updated it
				const lastSpellCast = $arenaStore.lastSpellCast;

				// After preparation, restart the attack timer for the next round
				// ONLY if the timer wasn't frozen, OR if it was frozen but FIRE was just cast.
				if ((!wasTimerFrozen || lastSpellCast === 'FIRE') && $arenaStore.currentEnemyConfig) {
					// Slight delay to let state update
					setTimeout(() => {
						// Double check status and ensure timer isn't frozen now
						if ($arenaStore.gameStatus === GameStatus.SOLVING && !$arenaStore.isTimerFrozen) {
							startAttackTimer($arenaStore.currentEnemyConfig);
						}
					}, 100);
				}
			}
			nextRoundTimeout = null;
		}, delay); // Use calculated delay
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
			// Double check status before setting game over (might have reset)
			if ($arenaStore.gameStatus !== GameStatus.GAME_OVER) {
				arenaStore.finalizeVictory();
			}
			enemyDefeatedTimeout = null;
			// Animation flag can reset automatically based on game status change
			// or be explicitly reset if needed when ResultsScreen shows.
		}, 1500); // Increased from 1000ms to 1500ms to give bonus animation more time
	}

	// Add startLevel handler
	function handleStartLevel() {
		waitingForPlayerStart = false;

		// Start the attack timer after the player indicates they're ready
		if ($arenaStore.gameStatus === GameStatus.SOLVING && $arenaStore.currentEnemyConfig) {
			startAttackTimer($arenaStore.currentEnemyConfig);
			gameStarted = true;
		}
	}

	// --- Lifecycle ---
	onMount(() => {
		// Reset the store to initial state (PRE_GAME, grade not selected)
		arenaStore.reset();
		// Default spell selection can happen anytime
		arenaStore.selectSpell('FIRE');

		// Read localStorage for crafter normal completion status
		try {
			if (typeof localStorage !== 'undefined') {
				const storedStatus = localStorage.getItem('equationArenaCrafterNormalCompleted');
				if (storedStatus === 'true') {
					arenaStore.setInitialCompletionStatus(true);
				}
			}
		} catch (e) {
			console.error('Failed to access localStorage on mount:', e);
		}

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
	$: formattedTime = `${Math.ceil($arenaStore.attackTimeRemaining)}s`;

	// Calculate and format level duration
	$: levelDurationMs =
		$arenaStore.levelStartTime && $arenaStore.levelEndTime
			? $arenaStore.levelEndTime - $arenaStore.levelStartTime
			: 0;
	$: formattedLevelDuration = (() => {
		const totalSeconds = Math.round(levelDurationMs / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	})();

	// Derive effective rule level based on mode, subMode, and current enemy
	$: effectiveRuleLevel = (() => {
		if ($arenaStore.gameMode === 'crafter' && $arenaStore.crafterSubMode === 'challenge') {
			return $arenaStore.currentEnemyConfig?.level || 1; // Challenge uses enemy's original level
		} else {
			return $arenaStore.currentLevelNumber; // Normal/Solver use current level
		}
	})();

	// Derive crafter level description using the correct lookup level
	$: crafterLevelDescription = (() => {
		if ($arenaStore.gameMode !== 'crafter') return null;

		let configLookupLevel: number;
		if ($arenaStore.crafterSubMode === 'challenge') {
			// Challenge mode: Use the CURRENT enemy's original level for the description
			configLookupLevel = $arenaStore.currentEnemyConfig?.level || 1; // Fallback to 1
		} else {
			// Normal mode: Use the actual current level number
			configLookupLevel = $arenaStore.currentLevelNumber;
		}

		// Ensure configLookupLevel is valid (at least 1)
		configLookupLevel = Math.max(1, configLookupLevel);

		return getCrafterLevelConfig(configLookupLevel)?.description || 'Challenge Level'; // Provide fallback
	})();

	// ---> ADDITION: Calculate score for ResultsScreen <---
	// Determine score to show on ResultsScreen
	$: scoreForResults =
		$arenaStore.playerHealth <= 0 &&
		$arenaStore.gameMode === 'crafter' &&
		$arenaStore.crafterSubMode === 'challenge'
			? $arenaStore.totalGameScore // Show total score on Challenge defeat
			: $arenaStore.currentLevelScore; // Show level score otherwise (Normal/Solver win/loss)

	// ---> ADDITION: Calculate scaled health bonus for EnemyDisplay <---
	$: scaledHealthBonus = (() => {
		if (
			$arenaStore.gameMode !== 'crafter' ||
			$arenaStore.crafterSubMode !== 'challenge' ||
			!$arenaStore.currentEnemyConfig ||
			!$arenaStore.currentEnemyId
		) {
			return null; // Not applicable
		}

		// Find the base config for the current enemy
		const baseEnemyConfig = enemies.find((e: EnemyConfig) => e.id === $arenaStore.currentEnemyId);
		if (!baseEnemyConfig) {
			console.warn(`Base config not found for enemy ID: ${$arenaStore.currentEnemyId}`);
			return null;
		}

		const healthDifference = $arenaStore.currentEnemyConfig.health - baseEnemyConfig.health;
		return healthDifference > 0 ? healthDifference : null; // Only return positive difference
	})();

	// ---> ADDITION: Calculate scaled time bonus for TopBar <---
	$: scaledTimeBonusSeconds = (() => {
		if (
			$arenaStore.gameMode !== 'crafter' ||
			$arenaStore.crafterSubMode !== 'challenge' ||
			!$arenaStore.currentEnemyConfig ||
			!$arenaStore.currentEnemyId
		) {
			return null; // Not applicable
		}

		// Find the base config for the current enemy
		const baseEnemyConfig = enemies.find((e: EnemyConfig) => e.id === $arenaStore.currentEnemyId);
		if (!baseEnemyConfig) {
			// Warning already logged by scaledHealthBonus calc
			return null;
		}

		const timeDifference =
			baseEnemyConfig.solveTimeSec - $arenaStore.currentEnemyConfig.solveTimeSec;
		// Round to one decimal place for display, return only if positive
		return timeDifference > 0 ? Math.round(timeDifference * 10) / 10 : null;
	})();
</script>

<!-- Main Template -->
<div
	class="arena-wrapper"
	class:player-hit={playerHit ||
		($arenaStore.gameStatus === GameStatus.GAME_OVER && $arenaStore.playerHealth <= 0)}
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
			<StartScreen gameMode={$arenaStore.gameMode || 'solver'} on:startGame={handleStartGame} />
		{:else if $arenaStore.gameStatus !== GameStatus.GAME_OVER && $arenaStore.gameStatus !== GameStatus.FINAL_SUMMARY}
			<GameUI
				{...$arenaStore}
				{formattedTime}
				{enemyHit}
				{enemyDefeatedAnimating}
				{displayedDamage}
				activeBonuses={activeBonusesForDisplay}
				{crafterLevelDescription}
				{effectiveRuleLevel}
				showCrafterFeedback={$arenaStore.showCrafterFeedback}
				crafterFeedbackDetails={$arenaStore.crafterFeedbackDetails}
				{damageTaken}
				{isEnemyTelegraphing}
				isTimerFrozen={$arenaStore.isTimerFrozen}
				{waitingForPlayerStart}
				{scaledHealthBonus}
				gameMode={$arenaStore.gameMode}
				crafterSubMode={$arenaStore.crafterSubMode}
				{scaledTimeBonusSeconds}
				currentLevelNumber={$arenaStore.currentLevelNumber}
				on:selectSpell={handleSelectSpellEvent}
				on:handleInput={handleInputEvent}
				on:clearInput={handleClearInputEvent}
				on:handleBackspace={handleBackspaceEvent}
				on:castSpell={handleCastSpellEvent}
				on:inputChar={handleCrafterInputCharEvent}
				on:clearCrafted={handleClearCraftedEvent}
				on:backspaceCrafted={handleBackspaceCraftedEvent}
				on:submitEquation={handleSubmitEquationEvent}
				on:startLevel={handleStartLevel}
				on:resetCrafter={handleResetCrafterEvent}
			/>
		{:else if $arenaStore.gameStatus === GameStatus.FINAL_SUMMARY}
			<FinalSummaryScreen
				totalGameScore={$arenaStore.totalGameScore}
				completedLevelsData={$arenaStore.completedLevelsData}
				gameMode={$arenaStore.gameMode}
				crafterSubMode={$arenaStore.crafterSubMode}
				crafterNormalCompleted={$arenaStore.crafterNormalCompleted}
				handleStartChallengeMode={handleStartChallengeFromSummary}
				handlePlayAgain={handleTryAgainEvent}
				handleExit={handleExitGameEvent}
			/>
		{:else}
			<ResultsScreen
				playerHealth={$arenaStore.playerHealth}
				equationsSolvedCorrectly={$arenaStore.equationsSolvedCorrectly}
				{formattedLevelDuration}
				currentLevelBonuses={$arenaStore.currentLevelBonuses}
				levelScore={scoreForResults}
				gameMode={$arenaStore.gameMode}
				crafterSubMode={$arenaStore.crafterSubMode}
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
		box-shadow: inset 0 0 0 0 rgba(231, 76, 60, 0); /* Initial shadow for player hit */
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

	.game-content {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
