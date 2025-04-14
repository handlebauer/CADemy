# equation-arena-v0-implementation

# Equation Arena: v0 Implementation

## 1. Core Equation Mechanic

Players create and solve math equations to cast spells against enemies.

**Input System:** Number, operation, and special tiles (parentheses, fractions, decimals) appear at the bottom of the screen. Players tap tiles to place them in the equation builder. Equations automatically solve when complete. A “Cast” button activates the spell.

**Player Onboarding:**

- 3-step tutorial overlay on first play:

1. “Tap numbers and operations to build an equation”
2. “Use parentheses to control order of operations for bonus power”
3. “Create equations that demonstrate mathematical properties for power bonuses”

- Helper highlights for first equation (subtle arrows pointing to valid next moves)
- “Undo” button to remove the last tile placed

**Pattern Recognition:**

- Level 1: Equations demonstrating the distributive property (e.g., 2×(3+4) = 2×3+2×4) receive +50% power with a “Distributive Bonus!” text indicator and visual effect.
- Level 2: Equations resulting in benchmark fractions (1/2, 3/4, 1) receive +50% power with a “Benchmark Bonus!” text indicator.
- Level 3: Equations showing place value understanding (0.1×10 = 1) receive +50% power with a “Place Value Bonus!” effect.
- All Levels: Equations demonstrating the commutative property (e.g., 3×4 = 4×3) receive a “Symmetry Bonus” of +25% power.

## 2. Spell System

**Spell Types (v0):**

- **Fire (Damage)**: Deals 15-40 damage based on equation complexity
- **Ice (Shield)**: Creates a shield absorbing 20-45 damage. Shield remains until all absorption is used or new shield is cast.

**Damage/Shield Scaling:**

```
Base Value:
- Simple equation (addition/subtraction only): 15 damage / 20 shield
- Medium equation (multiplication/division OR parentheses): 20 damage / 25 shield
- Complex equation (fractions OR decimals): 25 damage / 35 shield
- Advanced equation (combines multiple complexity factors): 30 damage / 40 shield

Complexity Factors:
- Using both multiplication AND parentheses: +5
- Using both fractions AND decimals: +5

Pattern Bonuses (multiplicative):
- Level-specific property: ×1.5 (+50%)
- Commutative property: ×1.25 (+25%)
- Both properties in one equation: ×1.75 (+75%)
```

Example calculations:

- 2+3=5 (simple): 15 damage / 20 shield
- 2×3=6 (medium): 20 damage / 25 shield
- 2×(3+4)=14 (medium + complexity): 25 damage / 30 shield
- 2×(3+4)=14 with distributive property: 37 damage / 45 shield (25 × 1.5)
- 1/4+1/4=1/2 with benchmark property: 37 damage / 45 shield (25 × 1.5)
- 0.1×10=1 with place value property: 37 damage / 45 shield (25 × 1.5)
- 3×4=12 with commutative property: 25 damage / 31 shield (20 × 1.25)

**Shield Behavior:**

- Shields don’t stack - casting a new shield replaces any existing shield
- Shield remains active until all absorption is used up
- Shield value is displayed as a number inside the shield bubble
- Shield blocks incoming damage completely until depleted
- Math connection: Shield values provide a concrete representation of equation results

**Visual Feedback:**

- Fire spell: Red glow effect on enemy with floating damage numbers
- Ice spell: Blue shield bubble around player with shield strength displayed
- Pattern bonus: Amplified effects with additional particles and screen flash
- Commutative property bonus: Simple glow effect with subtle animation
- Distributive property bonus: Purple highlighting showing the relationship
- Benchmark fraction bonus: Green pulse effect emphasizing the result
- Place value bonus: Cyan animation highlighting decimal places
- Effects designed to highlight mathematical structure rather than just decoration

**Visual Effects Scope:**

- Simple color-based effects only (no complex particle systems)
- Basic animations for tiles and spells (no advanced physics)
- Text indicators for key events
- Placeholder character/enemy art acceptable for v0

**Enemy Types (v0):**

- Three enemy types with health that increases by level:
- Level 1: Order Keeper - 75 health, attacks every 9 seconds for 15 damage
- Level 2: Fraction Fiend - 90 health, attacks every 8 seconds for 18 damage
- Level 3: Decimal Demon - 100 health, attacks every 7 seconds for 20 damage
- Visual telegraph 3 seconds before attacking (increased from 2 seconds)
- Clear reaction animations when taking damage

**Battle Flow:**

1. Player selects spell type (Fire/Ice)
2. Player builds and solves equation using available tiles
3. Successful equation casts spell with visual feedback
4. Enemy attacks on timer
5. Repeat until victory or defeat

**Error Handling:**

- Incorrect equations gently shake with brief red glow
- Misplaced tiles can be removed by tapping them
- If stuck for >15 seconds, subtle hint appears
- Order of operations errors are highlighted with a special indicator
- Focus on understanding the math, not just getting correct answers
- System tracks common errors to help improve the game in future versions

**Victory Condition:** Reduce enemy health to zero before player health reaches zero.

## 3. Progression

**Level Structure:**

- 3 levels with increasing difficulty focused on Grade 5 content
- Level 1: Order of operations with whole numbers and parentheses
- Level 2: Fractions with unlike denominators (addition and subtraction)
- Level 3: Decimals to hundredths (all operations)

**Session Boundaries:**

- Complete gameplay session consists of all 3 levels
- Each level contains a single battle against 1 themed enemy
- Expected session length: 5-8 minutes total
- Progress saves after each completed level
- Clear “Continue” and “Exit” options after each level

**Session Pacing:**

- Each level designed to take 90-150 seconds (increased maximum from 120)
- Complete v0 experience: ~6-10 minutes (increased from 8)
- Final battle slightly more challenging but still completable by most students

**Success Metrics:**

- Track completion of each level
- Monitor equation solve rate and patterns used
- Capture data on:
  - Time spent per equation
  - Pattern bonus frequency
  - Mathematical concepts used (order of operations, fractions, decimals)
  - Spell type preference
  - Completion rate per level

## 4. Implementation Focus

**Priority Elements:**

- Functional equation building and validation for Grade 5 content
- Order of operations logic with parentheses support
- Fraction and decimal validation and display
- Basic combat loop with health tracking
- Simple visual feedback for successful spells
- Pattern recognition for target numbers and properties
- Level progression with themed content focus
- Basic tutorial system

**Visual Requirements:**

- Simple character/enemy representations themed to match mathematical concepts
- Clear health bars and damage numbers
- Basic spell effects (size varies with power)
- Text indicators for pattern recognition
- Distinct visualizations for different equation types (whole numbers, fractions, decimals)
- Victory and defeat screens with simple stats

**Testing & Feedback:**

- Session-end feedback prompt (3 emojis: 😀 😐 ☹️)
- Optional questions: “What was your favorite part?” and “What was most challenging?”
- Analytics tracking for key metrics
- Auto-capture of session length and completion status

## 5. v0 Success Criteria

A successful v0 implementation meets these criteria:

**Functional Requirements:**

- Players can complete all 3 levels within an 8-minute session
- Pattern bonuses are recognized and rewarded correctly
- Equation building works without technical errors for whole numbers, fractions, and decimals
- Order of operations is correctly implemented
- Game progression saves correctly between levels

**Player Experience Goals:**

- 80%+ of test players can complete the tutorial without assistance (increased from 70%)
- Average session length of 6-10 minutes (increased from 5-8)
- At least 20% of equations utilize pattern bonuses (decreased from 25%)
- Players report spell effects as “satisfying” or “fun”
- First-time 5th grade players can understand gameplay without external explanation
- At least 70% of players should complete all three levels on first attempt

**Educational Goals:**

- Players demonstrate understanding of order of operations
- Players successfully build equations with fractions and unlike denominators
- Players correctly use decimal operations
- Players report increased confidence with Grade 5 math concepts

**Technical Performance:**

- Game runs at consistent framerate on target devices
- No crashes or progression-blocking bugs
- Load times under 3 seconds between levels
- All analytics data properly captured

Meeting these criteria indicates readiness to proceed with expanded development based on the full GDD.

---

_This v0 document focuses on what’s needed for a functional first implementation that enables meaningful player testing. It prioritizes core gameplay loop, basic feedback systems, and minimal onboarding while targeting Grade 5 mathematical content._
