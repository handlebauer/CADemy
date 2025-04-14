# Equation Arena v2: Implementation Guide

This guide outlines the steps to implement the new features for Equation Arena, including Grade 5 support, the "Crafter" (Equation Crafting) mode, multiple enemies, pattern bonuses, and a tutorial.

**Core Goal:** Refactor and extend the existing Equation Arena minigame to support multiple grade levels, two distinct game modes (Solver and Crafter), and introduce new mechanics like equation crafting, pattern bonuses, and varied enemies.

---

## Phase 1: Foundation & Configuration

**Goal:** Set up the basic structure and configuration data needed for multiple grades, modes, enemies, and bonuses.

1.  **Define Data Structures (`src/lib/minigames/math/EquationArena/types.ts`):**

    - Define `GameMode = 'solver' | 'crafter'`.
    - Define `GradeLevel = 1 | 2 | 3 | 4 | 5` (or a more flexible range).
    - Define `EnemyConfig` interface: `{ id: string; name: string; health: number; attackInterval: number; damage: number; sprite?: string; mode: GameMode; level: number; }`.
    - Define `BonusConfig` interface: `{ id: string; name: string; description: string; check: (equation: string, answer: number) => boolean; powerMultiplier: number; mode: GameMode; level?: number; }` (The `check` function will be implemented later).
    - Define `GradeConfig` interface: `{ grade: GradeLevel; mode: GameMode; /* Potentially add equation constraints/types here later */ }`.
    - Update `ArenaState` interface in `store.ts` to include `selectedGrade: GradeLevel | null`, `gameMode: GameMode | null`, `currentEnemyId: string | null`, `activeBonuses: { id: string; name: string }[]`.

2.  **Create Configuration Files (New Files):**

    - Create a new directory: `src/lib/minigames/math/EquationArena/config/`
    - `src/lib/minigames/math/EquationArena/config/grades.json`: Array of `GradeConfig`. Map grades 1-3 to 'solver' mode and grade 5 to 'crafter' mode (add grade 4 later if needed, maybe solver or crafter?).
      ```json
      [
      	{ "grade": 1, "mode": "solver" },
      	{ "grade": 2, "mode": "solver" },
      	{ "grade": 3, "mode": "solver" },
      	// { "grade": 4, "mode": "solver" }, // Decide on Grade 4 later
      	{ "grade": 5, "mode": "crafter" }
      ]
      ```
    - `src/lib/minigames/math/EquationArena/config/enemies.json`: Array of `EnemyConfig`. Include the original Dragon for solver mode and the three new enemies for crafter mode levels.
      ```json
      [
      	{
      		"id": "dragon",
      		"name": "Math Dragon",
      		"health": 100,
      		"attackInterval": 10000,
      		"damage": 10,
      		"mode": "solver",
      		"level": 1
      	}, // Adjust stats as needed for solver
      	// Add entries for levels 2, 3 of solver if desired
      	{
      		"id": "order_keeper",
      		"name": "Order Keeper",
      		"health": 75,
      		"attackInterval": 9000,
      		"damage": 15,
      		"mode": "crafter",
      		"level": 1
      	},
      	{
      		"id": "fraction_fiend",
      		"name": "Fraction Fiend",
      		"health": 90,
      		"attackInterval": 8000,
      		"damage": 18,
      		"mode": "crafter",
      		"level": 2
      	},
      	{
      		"id": "decimal_demon",
      		"name": "Decimal Demon",
      		"health": 100,
      		"attackInterval": 7000,
      		"damage": 20,
      		"mode": "crafter",
      		"level": 3
      	}
      ]
      ```
    - `src/lib/minigames/math/EquationArena/config/bonuses.json`: Array of `BonusConfig` (initially just structure, implementation later).
      ```json
      [
      	// Level 1 Crafter
      	{
      		"id": "distributive",
      		"name": "Distributive Bonus!",
      		"description": "e.g., a*(b+c) = a*b + a*c",
      		"powerMultiplier": 1.5,
      		"mode": "crafter",
      		"level": 1
      	},
      	// Level 2 Crafter
      	{
      		"id": "benchmark",
      		"name": "Benchmark Bonus!",
      		"description": "Result is 1/2, 3/4, or 1",
      		"powerMultiplier": 1.5,
      		"mode": "crafter",
      		"level": 2
      	},
      	// Level 3 Crafter
      	{
      		"id": "place_value",
      		"name": "Place Value Bonus!",
      		"description": "e.g., 0.1 * 10 = 1",
      		"powerMultiplier": 1.5,
      		"mode": "crafter",
      		"level": 3
      	},
      	// All Crafter Levels
      	{
      		"id": "commutative",
      		"name": "Symmetry Bonus",
      		"description": "e.g., a*b = b*a",
      		"powerMultiplier": 1.25,
      		"mode": "crafter"
      	}
      ]
      ```
    - Update `config.ts` (the existing one) to import/load these JSON files. Adjust existing constants (`ENEMY_DAMAGE`, `ENEMY_ATTACK_INTERVAL`) to be loaded dynamically based on the current enemy. Remove the hardcoded constants that are now defined per-enemy.

3.  **Refactor Store (`store.ts`):**
    - Add the new state properties defined in step 1.
    - Create actions: `setGrade(grade: GradeLevel)`, `setGameMode(mode: GameMode)`, `setCurrentEnemy(enemyId: string)`.
    - Modify `initialState` and `reset` action to handle the new properties (set them to `null` initially).
    - Update `startGame` action: It should now take the selected grade, determine the mode using `grades.json`, load the appropriate level 1 enemy from `enemies.json`, and set the initial state.
    - Update `advanceLevelAndStart`: It should load the enemy for the _next_ level within the _current_ `gameMode`.
    - Modify state accessors (`get().playerHealth`, etc.) if needed, but focus on adding new state first.

---

## Phase 2: Grade Selection & Mode Switching

**Goal:** Allow the user to select a grade and have the game initialize into the correct mode (Solver or Crafter) with the appropriate starting enemy.

1.  **Create `GradeSelectionScreen.svelte` Component:**

    - **Location:** `src/lib/minigames/math/EquationArena/components/GradeSelectionScreen.svelte`
    - **Functionality:** Display buttons or a dropdown for selecting Grade (1-5). Show which mode (`Solver`/`Crafter`) corresponds to the selected grade (read from `grades.json`). Emit a `selectGrade` event with the chosen `GradeLevel`.
    - **Styling:** Basic styling to fit the game's theme.

2.  **Integrate Grade Selection (`EquationArena.svelte`):**

    - Modify the main component's template logic:
      - Show `GradeSelectionScreen` initially (when `selectedGrade` is null in the store).
      - On `selectGrade` event, call a new handler `handleGradeSelected(event: CustomEvent<GradeLevel>)`.
      - `handleGradeSelected` should call the `arenaStore.setGrade(event.detail)` action.
    - Update the main conditional rendering:
      - `{#if !$arenaStore.selectedGrade}` show `GradeSelectionScreen`.
      - `{:else if $arenaStore.gameStatus === GameStatus.PRE_GAME}` show `StartScreen`.
      - (Keep existing logic for `GameUI` and `ResultsScreen`).
    - Modify `handleStartGame`: Instead of just calling `arenaStore.startGame()`, ensure the grade/mode are set first. The `arenaStore.startGame()` action itself should now use the `selectedGrade` from the store state to set up the correct mode and enemy.

3.  **Update `StartScreen.svelte`:**

    - Optionally, display the selected Grade and determined Game Mode (`Solver`/`Crafter`) for confirmation before starting.

4.  **Refactor Enemy Logic (`EquationArena.svelte` & `store.ts`):**
    - Remove hardcoded enemy config from `EquationArena.svelte`.
    - The `startEnemyAttackTimer` in `EquationArena.svelte` should now read `attackInterval` and `damage` from the _currently loaded enemy_ configuration (accessible via the store, e.g., `$arenaStore.currentEnemyConfig` - which needs to be added to the store state and populated when an enemy is loaded).
    - The store (`store.ts`) should hold the `currentEnemyConfig: EnemyConfig | null` state. Actions like `startGame` and `advanceLevelAndStart` should update this based on `currentEnemyId`.
    - Update `GameUI.svelte` to display the `name` and `health` of the `currentEnemyConfig`.

---

## Phase 3: Crafter Mode - Equation Crafting & Input

**Goal:** Implement the UI and state management for crafting equations in Crafter mode, including handling numbers, operators, and parentheses.

1.  **Equation Crafting State (`store.ts`):**

    - Add state: `craftedEquationString: string`, `isCraftingPhase: boolean` (to differentiate between crafting and solving within the Crafter mode's `SOLVING` status). Initialize `craftedEquationString` to `''` and `isCraftingPhase` to `false`.
    - Add actions:
      - `appendToCraftedEquation(char: string)`: Appends numbers, operators, parentheses. Include basic validation (e.g., prevent `++`, `* /`, etc.).
      - `clearCraftedEquation()`: Clears the string.
      - `backspaceCraftedEquation()`: Removes the last character.
      - `finalizeCrafting()`: Sets `isCraftingPhase` to `false`, potentially performs more validation on the structure. This transitions the player to the "solving" part of the turn.
    - Modify `prepareNextRound`: For crafter mode, it should reset `craftedEquationString` and set `isCraftingPhase` to `true`.
    - Modify `GameStatus`: Potentially add substates to `SOLVING` like `SOLVING_CRAFTING` and `SOLVING_ANSWERING` or use the `isCraftingPhase` boolean. Let's use the boolean flag for simplicity first.

2.  **Create `CrafterNumpad.svelte` Component:**

    - **Location:** `src/lib/minigames/math/EquationArena/components/CrafterNumpad.svelte`
    - **Functionality:**
      - Display buttons for digits 0-9.
      - Display buttons for operators: +, -, \*, / (`×`, `÷` symbols preferred).
      - Display buttons for parentheses: (, ).
      - Display buttons for Backspace, Clear, and "Craft!" (or "Submit Equation").
      - Emit events: `inputChar` (for numbers, ops, parens), `backspace`, `clear`, `submitEquation`.
    - **Styling:** Design to accommodate more buttons than the solver numpad.

3.  **Update `GameUI.svelte`:**

    - Conditionally render either the existing numpad (`SolverNumpad.svelte` - rename the old one) (solver mode) or the new `CrafterNumpad` (crafter mode, when `$arenaStore.isCraftingPhase` is true).
    - Wire up events from `CrafterNumpad` to the corresponding new store actions (`appendToCraftedEquation`, `backspaceCraftedEquation`, `clearCraftedEquation`, `finalizeCrafting`).
    - Modify the equation display area: In crafter mode during crafting, show the `$arenaStore.craftedEquationString`.
    - Modify the player input display: In crafter mode, once crafting is done (`isCraftingPhase` is false), clear this display and use it for the _answer_ input (like in solver mode). The crafted equation should remain visible separately (perhaps above the answer input area).

4.  **Update Keyboard Handling (`EquationArena.svelte`):**
    - Modify `handleKeyDown`:
      - In crafter mode, when `isCraftingPhase` is true: Map relevant keys (0-9, +, -, \*, /, (, ), Backspace, Enter/Submit, Escape/Clear) to the _crafting_ actions.
      - In crafter mode, when `isCraftingPhase` is false: Map keys (0-9, Backspace, Enter, Escape/Clear) to the _answering_ actions (`handleInput`, `handleBackspace`, `castSpell`, `clearInput`).

---

## Phase 4: Crafter Mode - Evaluation & Pattern Bonuses

**Goal:** Evaluate the player's crafted equation and their answer, detect mathematical property bonuses, and apply damage accordingly.

1.  **Equation Evaluation (`src/lib/utils/mathEval.ts` or similar - create this file/directory):**

    - Implement or integrate a safe math expression evaluator.
      - **Recommendation:** Use `mathjs`. Install it (`npm install mathjs @types/mathjs`). Ensure it's configured for safe evaluation (disable symbol assignment, etc.). `math.evaluate(expressionString)`
    - Create a utility function `evaluateEquation(equation: string): { value: number | null, error: string | null }`. It should return the result or an error message if the expression is invalid/malformed.

2.  **Bonus Detection Logic (`src/lib/minigames/math/EquationArena/bonuses.ts` - create this file):**

    - Create functions to check for each bonus type defined in `bonuses.json`. These functions might need the crafted equation string and possibly the calculated answer. Use the `mathjs` parser/nodes if possible for reliable checks.
      - `checkCommutative(node: math.MathNode): boolean`
      - `checkDistributive(node: math.MathNode): boolean`
      - `checkBenchmarkFraction(answer: number): boolean` (check if `answer` is close to 0.5, 0.75, 1.0).
      - `checkPlaceValue(node: math.MathNode, answer: number): boolean`
    - Create a main function `getActiveBonuses(equation: string, answer: number, level: number): BonusConfig[]` that calls the individual check functions based on the `bonuses.json` config for the current mode/level. Handle potential parsing errors.

3.  **Update Store Logic (`store.ts`):**

    - Modify the `castSpell` action:
      - **Crafter Mode:**
        - Check `isCraftingPhase`. If true, call `finalizeCrafting()` instead (user is submitting the equation to be solved). Do not cast spell yet.
        - If `isCraftingPhase` is false (user is submitting the answer):
          1.  Get `craftedEquationString` and `playerInput` (the answer).
          2.  Evaluate `craftedEquationString` using the utility from step 1. Handle evaluation errors (set `lastAnswerCorrect` to false, maybe store error message in state for UI).
          3.  If evaluation is successful, compare the evaluated result with `playerInput` (converted to number, handle floating point comparisons carefully).
          4.  Set `lastAnswerCorrect` based on the comparison.
          5.  If correct:
              - Calculate base damage (e.g., `FIRE_DAMAGE`).
              - Get active bonuses using the utility from step 2 (`getActiveBonuses`). Store triggered bonuses in `activeBonuses` state for display.
              - Apply multipliers to damage based on `activeBonuses`.
              - Apply damage to the enemy (`damageEnemy` action, passing the calculated damage).
          6.  If incorrect or evaluation error: Handle incorrect answer (clear input, maybe small feedback).
          7.  Transition to `RESULT` state. Reset `activeBonuses` only _after_ the result display delay.
      - **Solver Mode:** Keep existing logic (evaluate `currentEquation.answer` vs `playerInput`).
    - Add `activeBonuses: BonusConfig[]` to the state. Initialize to `[]`.
    - Update `damageEnemy` action to accept the calculated damage amount.

4.  **Update UI (`GameUI.svelte`):**
    - Display active bonuses when an attack successfully lands (read from `$arenaStore.activeBonuses`). Show the bonus name (e.g., "Distributive Bonus! +50%").
    - Potentially add visual flair/animation when bonuses trigger.
    - Ensure the correct damage number (including bonuses) is displayed via `displayedDamage`.
    - Display evaluation errors from the store if the crafted equation was invalid.

---

## Phase 5: Crafter Mode - Tutorial

**Goal:** Implement the three-step onboarding tutorial for the Crafter mode.

1.  **Tutorial State (`store.ts`):**

    - Add state: `tutorialStep: number` (0 = not started, 1, 2, 3 = steps, 4 = completed), `needsCrafterTutorial: boolean`. Initialize `needsCrafterTutorial` to `true`.
    - Modify `startGame`: If mode is `crafter` and `needsCrafterTutorial` is true, set `tutorialStep` to 1 and `isCraftingPhase` to `true` (so the crafting UI is visible).
    - Add action: `advanceTutorial()`. Increments `tutorialStep`. If it reaches 4, set `needsCrafterTutorial` to `false`. When advancing from step 3 to 4, ensure the game proceeds (e.g., maybe call `prepareNextRound` to get the first real crafting task started).
    - Modify `reset`: Set `needsCrafterTutorial` back to `true` (for now, persistence later).

2.  **Create `TutorialOverlay.svelte` Component:**

    - **Location:** `src/lib/minigames/math/EquationArena/components/TutorialOverlay.svelte`
    - **Props:** `step: number`, `targetElementSelector?: string` (for highlighting).
    - **Functionality:**
      - Displays tutorial text based on the `step` prop:
        - Step 1: “Tap numbers and operations to build an equation” (Highlight `CrafterNumpad`).
        - Step 2: “Use parentheses () to control order of operations for bonus power” (Highlight parentheses buttons).
        - Step 3: “Create equations that demonstrate mathematical properties (like Commutative: 2+3=3+2) for power bonuses” (Highlight maybe the equation display area).
      - Shows a "Next" or "Got it!" button that emits a `nextStep` event.
      - Uses basic CSS `:after` pseudo-elements or borders triggered by a class on the `arena-wrapper` (e.g., `.tutorial-step-1`) to highlight the target area indicated by `targetElementSelector`. Avoid complex DOM manipulation for highlighting initially.

3.  **Integrate Tutorial (`EquationArena.svelte` / `GameUI.svelte`):**
    - In `EquationArena.svelte` or `GameUI.svelte`, conditionally render `TutorialOverlay` based on `$arenaStore.tutorialStep` (show if step > 0 and < 4).
    - Pass the current `$arenaStore.tutorialStep` as a prop.
    - Define appropriate CSS selectors for highlighting targets (e.g., `#crafter-numpad`, `.paren-button`, `#equation-display`). Pass these as the `targetElementSelector` prop based on the step.
    - Handle the `nextStep` event from the overlay by calling `arenaStore.advanceTutorial()`.
    - Ensure game input (keyboard/numpad) is disabled while the tutorial overlay is active (e.g., add `pointer-events: none;` to relevant UI elements based on `$arenaStore.tutorialStep`).

---

## Phase 6: Refinement & Polish

**Goal:** Improve visual feedback, add animations, and ensure robustness.

1.  **Visual Effects:**
    - Implement distinct visual effects/animations for each pattern bonus trigger in `GameUI.svelte` or via CSS in `animations.css`. Use the `id` from the `activeBonuses` state to trigger specific CSS classes/animations.
    - Enhance enemy defeat animation (`enemyDefeatedAnimating`).
    - Consider unique hit effects for different enemy attacks.
2.  **Sound Effects (Future):** Add sounds for button clicks, casting spells, getting hit, enemy attacks, bonus triggers, victory/defeat.
3.  **Error Handling:** Provide clearer feedback to the player if their crafted equation is mathematically invalid (e.g., "Invalid Equation: Cannot divide by zero", "Missing Parenthesis"). Display this near the equation input area.
4.  **Balancing:** Playtest both modes across different grades/levels. Adjust enemy stats, damage values, bonus multipliers, and potentially equation difficulty/constraints. Use the Tweakpane setup for easier iteration during development (ensure Tweakpane bindings work with the new config structure).
5.  **Code Cleanup:** Refactor overly complex components or functions. Ensure consistent naming and code style. Add comments for non-obvious logic (especially evaluation and bonus detection).
6.  **Persistence (Future):** Use `localStorage` or a backend service to store `selectedGrade` and `needsCrafterTutorial` between sessions.

---

This guide provides a structured approach. Each phase builds upon the previous one, starting with data structures and gradually adding UI, logic, and features. Remember to test incrementally after each significant step. Good luck!
