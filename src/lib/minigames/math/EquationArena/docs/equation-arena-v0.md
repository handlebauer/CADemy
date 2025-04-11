# Equation Arena: v0

## 1. Core Equation Mechanic

Players create and solve math equations to cast spells against enemies.

**Input System:** Number and operation tiles appear at the bottom of the screen. Players tap tiles to place them in the equation builder. Equations automatically solve when complete. A "Cast" button activates the spell.

**Pattern Recognition:** Equations equaling specific target numbers (10, 25) receive +50% power with a simple "Power 10!" text indicator.

## 2. Spell System

**Spell Types (v0):**

- **Fire (Damage)**: Deals 10-30 damage based on equation difficulty
- **Ice (Defense)**: Creates a shield absorbing 10-30 damage for 15 seconds

**Enemy Types (v0):**

- Single enemy type with 100 health
- Attacks player every 8 seconds for 15 damage

**Battle Flow:**

1. Player selects spell type (Fire/Ice)
2. Player builds and solves equation using available tiles
3. Successful equation casts spell with visual feedback
4. Enemy attacks on timer
5. Repeat until victory or defeat

**Victory Condition:** Reduce enemy health to zero before player health reaches zero.

## 3. Progression

**Level Structure:**

- 3 levels with increasing difficulty
- Level 1: Addition only (numbers 1-9)
- Level 2: Addition and subtraction (numbers 1-9)
- Level 3: Addition, subtraction, multiplication (numbers 1-9)

**Success Metrics:**

- Track completion of each level
- Monitor equation solve rate and patterns used

## 4. Implementation Focus

**Priority Elements:**

- Functional equation building and validation
- Basic combat loop with health tracking
- Simple visual feedback for successful spells
- Pattern recognition for target numbers
- Level progression with difficulty increase

**Visual Requirements:**

- Simple character/enemy representations
- Clear health bars and damage numbers
- Basic spell effects (size varies with power)
- Text indicators for pattern recognition

---

_This v0 document focuses exclusively on what's needed for a functional first implementation that tests the core concept._
