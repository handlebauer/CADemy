# Implementation Guide: Crafter Normal & Challenge Modes

This guide outlines the steps to introduce 'Normal' and 'Challenge' sub-modes within the 'Crafter' game mode in the Equation Arena minigame. The 'Normal' mode will consist of the existing 3 levels, while 'Challenge' mode will offer an indefinite sequence of enemies after 'Normal' mode is completed. The main mode ('solver' or 'crafter') selection via `GradeSelectionScreen.svelte` remains unchanged.

## 1. State Management Updates (`src/lib/minigames/math/EquationArena/store/`)

**`index.ts` (`types.ts` or wherever `ArenaState` is defined):**

- **`ArenaState` Interface:**
  - Add `crafterSubMode: 'normal' | 'challenge' | null;` (To track the active sub-mode within Crafter).
  - Add `crafterNormalCompleted: boolean;` (To track if the player has ever completed the Normal Crafter mode).
- **`initialArenaState`:**
  - Add `crafterSubMode: null,`
  - Add `crafterNormalCompleted: false,` (This will be initialized properly later by reading from localStorage).

**`actions.ts` / `helpers.ts` (Modify relevant action creators/helpers):**

- **`createLifecycleActions` (`startGame` action):**
  - Modify the `startGame` action signature to accept an optional subMode: `startGame(mode: GameMode, subMode?: 'normal' | 'challenge')`.
  - Inside `startGame`, update the state: set `gameMode: mode` and `crafterSubMode: subMode ?? null`. If the mode is 'solver', ensure `crafterSubMode` is set to `null`.
  - Ensure `reset` properly resets `crafterSubMode` to `null`.
- **`createLifecycleActions` (`advanceLevelAndStart` action or equivalent logic):**
  - Modify the logic that determines if the game is won or if the next level should start.
  - Inside this logic, add a check:
    ```typescript
    if (state.gameMode === 'crafter' && state.crafterSubMode === 'normal') {
    	// Assuming NORMAL_MODE_MAX_LEVEL is defined (e.g., 3)
    	const NORMAL_MODE_MAX_LEVEL = 3;
    	if (state.currentLevelNumber >= NORMAL_MODE_MAX_LEVEL) {
    		// Instead of just advancing, trigger the game over/win sequence for Normal mode
    		setGameOverInternal(update, GameStatus.GAME_OVER, true); // Pass 'true' for 'won'
    		return; // Stop the advancement logic here for Normal mode completion
    	}
    }
    // If it's challenge mode or not yet completed normal mode, continue to prepare next round
    // ... existing logic or call prepareNextRoundInternal ...
    ```
- **`helpers.ts` (`setGameOverInternal` function):**

  - Modify the signature to accept a `won` parameter: `setGameOverInternal(update, status: GameStatus, won: boolean)`.
  - Inside `setGameOverInternal`:

    ```typescript
    update((state) => {
    	// ... existing logic ...

    	let newCrafterNormalCompleted = state.crafterNormalCompleted; // Preserve existing status by default

    	// Check if the player just won the Crafter Normal mode
    	if (state.gameMode === 'crafter' && state.crafterSubMode === 'normal' && won) {
    		newCrafterNormalCompleted = true; // Mark normal mode as completed
    		try {
    			if (typeof localStorage !== 'undefined') {
    				localStorage.setItem('equationArenaCrafterNormalCompleted', 'true');
    				console.log('Crafter Normal Mode completed status saved to localStorage.');
    			}
    		} catch (e) {
    			console.error('Failed to access localStorage:', e);
    		}
    	}

    	return {
    		...state,
    		gameStatus: status,
    		// ... other state resets like score, level number etc. if applicable ...
    		crafterNormalCompleted: newCrafterNormalCompleted // Update state with the potentially new completion status
    		// Reset crafterSubMode? Maybe not here, depends on desired flow post-game. Resetting in startGame might be better.
    	};
    });
    ```

- **`helpers.ts` (`prepareNextRoundInternal` function):**

  - This function needs significant modification to handle the two sub-modes.
  - If `state.gameMode === 'crafter'`:
    - If `state.crafterSubMode === 'normal'`:
      - Increment `state.currentLevelNumber`.
      - Fetch the config for the _next_ level (e.g., level 2 or 3) based on the _new_ `currentLevelNumber` from `crafterLevels.ts` and `enemies.json` as before.
    - If `state.crafterSubMode === 'challenge'`:
      - Increment `state.currentLevelNumber`.
      - Implement logic for indefinite levels:
        - **Enemy Selection:** Choose an enemy configuration. Options:
          - Cycle through the existing 3 crafter enemies (`enemies.json`).
          - Pick randomly from the crafter enemies.
          - Introduce scaling stats (health, attack time) based on `currentLevelNumber`.
        - **Level Constraints:** Choose level constraints (`allowedCrafterChars`, `isCraftedEquationValidForLevel`). Options:
          - Cycle through the 3 sets of constraints from `crafterLevels.ts`.
          - Always use the constraints from the last normal level (level 3).
          - Introduce progressively harder constraints (e.g., more complex validation, fewer allowed chars).
      - Update `currentEnemyConfig`, `allowedCrafterChars`, validation functions, etc., based on the chosen enemy and constraints for the challenge level.

- **(New Action) `setInitialCompletionStatus`:**
  - Create a simple action like `setInitialCompletionStatus(status: boolean)` that updates the `crafterNormalCompleted` state. This will be called once on game load after checking localStorage.

## 2. UI Component Updates (`src/lib/minigames/math/EquationArena/components/`)

**`screens/StartScreen.svelte`:**

- This screen is displayed _after_ a grade has been selected via `GradeSelectionScreen.svelte`. It needs to conditionally show different content based on whether the selected grade corresponds to 'solver' or 'crafter' mode.
- **Script:**

  - Import necessary types (`GameMode`).
  - Receive the determined `gameMode: GameMode` as a prop (this needs to be passed down from `EquationArena.svelte` based on the selected grade).
  - Import `onMount` from Svelte.
  - Add a reactive state variable `let crafterNormalCompleted = false;`
  - Import the store instance (`arenaStore`).
  - Use `onMount` to check localStorage _only if the mode is crafter_:

    ```typescript
    import { onMount } from 'svelte';
    // Assuming arenaStore is imported/available and gameMode prop is set

    export let gameMode: GameMode;
    let crafterNormalCompleted = false;

    onMount(() => {
    	// Only check localStorage if we are in Crafter mode context
    	if (gameMode === 'crafter') {
    		try {
    			if (typeof localStorage !== 'undefined') {
    				const storedStatus = localStorage.getItem('equationArenaCrafterNormalCompleted');
    				if (storedStatus === 'true') {
    					crafterNormalCompleted = true;
    					// Sync with store - This should ideally happen once in EquationArena.svelte
    					// arenaStore.setInitialCompletionStatus(true);
    				}
    			}
    		} catch (e) {
    			console.error('Failed to access localStorage on mount:', e);
    		}
    	}
    });
    ```

    _(Reminder: Centralizing the initial store update in `EquationArena.svelte` is likely better)._

  - Modify the event dispatcher to include sub-mode: `createEventDispatcher<{ startGame: { mode: GameMode; subMode?: 'normal' | 'challenge' } }>();`
  - Define event handlers:
    - `handleStartSolver()`: `dispatch('startGame', { mode: 'solver' });` (Used if `gameMode` prop is 'solver')
    - `handleStartNormal()`: `dispatch('startGame', { mode: 'crafter', subMode: 'normal' });` (Used if `gameMode` prop is 'crafter')
    - `handleStartChallenge()`: `dispatch('startGame', { mode: 'crafter', subMode: 'challenge' });` (Used if `gameMode` prop is 'crafter')

- **Markup:**
  - Conditionally render content based on the `gameMode` prop.
  - `{#if gameMode === 'solver'}`: Show the original "Start Game" button triggering `handleStartSolver`. Include title/instructions for Solver mode.
  - `{#if gameMode === 'crafter'}`:
    - Show a title/description for Crafter Mode.
    - Add Button: `<button on:click={handleStartNormal}>Normal Mode (3 Levels)</button>`
    - Add Button: `<button on:click={handleStartChallenge} disabled={!crafterNormalCompleted} title={!crafterNormalCompleted ? 'Complete Normal Mode first to unlock Challenge Mode' : 'Face endless enemies!'}>Challenge Mode</button>`
    - Optionally display text indicating if Challenge Mode is locked or unlocked.
- **Styles:** Style the new buttons and layout as needed. Adjust existing styles if necessary to accommodate the conditional rendering.

**`screens/FinalSummaryScreen.svelte`:**

- **Script:**
  - Add `export let gameMode: GameMode | null = null;`
  - Add `export let crafterSubMode: 'normal' | 'challenge' | null = null;`
  - Add `export let crafterNormalCompleted: boolean = false;` // Pass the completion status
  - Add `export let handleStartChallengeMode: () => void;` // Function prop to start challenge mode
- **Markup:**
  - In the actions area (`.summary-actions`), add a conditional button:
    ```svelte
    {#if gameMode === 'crafter' && crafterSubMode === 'normal' && crafterNormalCompleted}
    	<!-- Show this button only if they just finished Normal mode and it's now completed -->
    	<button class="challenge-button" on:click={handleStartChallengeMode}>
    		Try Challenge Mode?
    	</button>
    {/if}
    ```
- **Styles:** Add styles for `.challenge-button`.

**`EquationArena.svelte` (Main Component):**

- **State Initialization (Crucial):**
  - In the `onMount` hook (or a suitable place _before_ `StartScreen` might need the value), check localStorage for `'equationArenaCrafterNormalCompleted'`.
  - Call the new store action `arenaStore.setInitialCompletionStatus(status)` to ensure the store's `crafterNormalCompleted` state is correctly initialized from localStorage right at the start. This makes the store the single source of truth during the game's lifecycle.
- **Grade Selection Handling (`handleGradeSelected`):**
  - Keep the existing logic to determine the `gameMode` ('solver' or 'crafter') based on the selected `grade` using the `grades` config.
  - Store this determined `gameMode` in a component state variable (e.g., `selectedGameMode`).
  - Transition the UI to show `StartScreen`.
- **Props for `StartScreen`:**
  - Pass the determined `gameMode` to the `StartScreen` component: `<StartScreen gameMode={selectedGameMode} on:startGame={handleStartGame} />`.
- **Start Game Logic (`handleStartGame`):**
  - Update the handler for the `startGame` event dispatched by `StartScreen`.
  - Call the store's `startGame` action, passing both the `mode` and the `subMode` from the event detail: `arenaStore.startGame(event.detail.mode, event.detail.subMode)`.
- **Props for `FinalSummaryScreen`:**
  - Ensure you pass the necessary props from the store state:
    ```svelte
    <FinalSummaryScreen
      ...
      gameMode={$arenaStore.gameMode}
      crafterSubMode={$arenaStore.crafterSubMode}
      crafterNormalCompleted={$arenaStore.crafterNormalCompleted}
      handleStartChallengeMode={handleStartChallengeFromSummary}
      ...
    />
    ```
- **Handler for Challenge Button on Summary:**
  - Implement the `handleStartChallengeFromSummary` function:
    ```typescript
    function handleStartChallengeFromSummary() {
    	// Reset relevant game state and start challenge mode
    	arenaStore.startGame('crafter', 'challenge');
    	// Transition UI back to the game view or appropriate state
    }
    ```

## 3. Configuration Updates (`src/lib/minigames/math/EquationArena/config/`)

- **`enemies.json`:** Review if the existing 3 enemy configurations are suitable for cycling or random selection in Challenge mode. Consider if stats need scaling within the `prepareNextRoundInternal` logic rather than defining infinite enemies here.
- **`crafterLevels.ts`:** Review the level constraints (`validate`, `allowedChars`, `description`). Decide how these will be applied or adapted in Challenge mode (cycling, fixed level 3, scaling difficulty). This logic primarily resides in `prepareNextRoundInternal`.

## 4. LocalStorage Key

- Use a consistent, specific key: `equationArenaCrafterNormalCompleted`.

## 5. Testing Checklist

- Does `GradeSelectionScreen` still function correctly to select grades?
- Does selecting a 'Solver' grade lead to the correct `StartScreen` view (Solver instructions, single start button)?
- Does selecting a 'Crafter' grade lead to the correct `StartScreen` view (Crafter instructions, 'Normal' and disabled 'Challenge' buttons)?
- Can you start and complete 'Normal' mode (3 levels) after selecting a Crafter grade?
- After completing 'Normal' mode, is the completion status saved to localStorage?
- On the `FinalSummaryScreen` after completing 'Normal' mode, does the "Try Challenge Mode?" button appear? Does it work?
- After completing 'Normal' mode and reloading the page/game:
  - If you select a Crafter grade again, is the 'Challenge' button on the `StartScreen` now enabled?
- Can you start 'Challenge' mode (from `StartScreen` or `FinalSummaryScreen`)?
- Does 'Challenge' mode correctly select enemies and constraints for levels 4, 5, 6, etc.?
- Does losing in 'Challenge' mode lead to the game over screen correctly?
- Does losing in 'Normal' mode behave as expected (no completion, no challenge unlock)?
