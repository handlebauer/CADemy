# Equation Arena: Game Design Doc

## Player Experience Goals

- Create a game where mathematical thinking directly translates to tactical advantage
- Provide clear, satisfying feedback for successful equation building
- Reward pattern recognition with visually impressive effects
- Balance educational value with genuinely engaging gameplay
- Maintain session lengths of 5-10 minutes for classroom viability

## 1. Equation Crafting Mechanics

Players combine mathematical components (numbers and operations) to create equations. The equation’s power is determined by:

- Complexity of the operation (multiplication: 30-50 power, addition: 15-30 power)
- Size of the numbers involved (each digit adds 5 power)
- Speed of completion (< 3 seconds: +25% bonus)

**Input System:** Number and operation tiles float up from the bottom of the screen. Players tap components, which move into the equation builder. The equation visually evaluates in real-time, showing the current result. The “Cast” button activates when a valid equation is ready. Players can tap components in the equation to remove them.

**Feedback Systems:**

- Tiles pulse briefly when tapped and animate smoothly into equation
- Visual/audio confirmation when valid equation is created
- Invalid equations trigger gentle error feedback (shake/red glow)
- “Cast” button grows and pulses when equation is valid

The system rewards mathematical patterns with clear bonuses:

- Doubles (4×4, 5×5): +50% spell effect
- Multiples of 10: +25% duration
- Target Numbers (equations equaling 10, 25, 50, 100): +40% area effect

**Pattern Recognition Feedback:**

- Pattern triggers unique visual effect overlay
- Large text announcement (e.g., “Perfect 25!”, “Power 100!”)
- Special casting animation for pattern-boosted spells
- Enemy reaction animations differ for pattern-boosted effects

## 2. Strategic Choice Framework

**Spell Effect Types:**

- **Fire (Damage)**: Deals 20-50 damage based on equation power. 2× damage against Frost enemies.
- **Ice (Defense)**: Creates a shield absorbing 30-60 damage for 20 seconds. 2× effectiveness against Fire enemies.
- **Lightning (Speed)**: Increases equation component generation by 50% and reduces solve time by 25% for 15 seconds. Creates combo opportunities for bonus damage.

**Monster Types:**

- **Fire Elementals**: 50% resistant to Fire, 2× damage from Ice
- **Frost Beasts**: 50% resistant to Ice, 2× damage from Fire

**Battle Mechanics:**

- **Player Damage**: Players take 10-25 damage when enemies attack (every 8 seconds) or when equation solutions are incorrect (15 damage per error)
- **Health System**: Players start with 100 health; battle is lost if health reaches 0
- **Time Pressure**: Each battle has a 3-minute time limit; defeat all enemies before time expires

**Victory Conditions:** Battles are won when all enemies in the encounter are defeated. Arena stages contain 3-5 enemies of varying types, while boss battles feature a single powerful opponent with higher health. Rewards and progression are granted only upon successful completion.

**Battle Flow:**

1. Player selects spell type (Fire/Ice/Lightning) based on enemy vulnerabilities
2. Player constructs and solves equation using available components
3. Successful equation casts spell with effect determined by equation power
4. Enemies attack on fixed intervals (every 8 seconds per enemy)
5. Process repeats until victory or defeat

## 3. Progression Model

**Mathematical Mastery:**

- Track success rates per operation (8 correct solutions to advance a level)
- Each mastery level unlocks new components (Level 2: larger numbers, Level 3: new operations)
- Adaptive difficulty maintains 75-85% success rate

**Game Progression:**

- 3 difficulty tiers with distinct visual themes
- Tier 1: Addition/Subtraction, Tier 2: Multiplication, Tier 3: Division
- Boss battles require combining multiple operations

**Session Pacing:**

- Early encounters completable in 2-3 minutes
- Middle-tier battles last 3-5 minutes
- Late-game and boss encounters designed for 5-7 minutes
- Total player session designed for classroom periods (~30 minutes)

**Success Metrics:**

- Player completes at least 15 equations per session
- At least 40% of equations utilize pattern bonuses by mid-game
- Session-to-session improvement in equation solve time
- 80%+ of players can complete Tier 1 without assistance

## 4. Learning Integration & Engagement

Mathematical patterns provide substantial gameplay advantages with visual feedback. Early patterns (doubles, multiples of 10) are clearly indicated, creating immediate “aha!” moments.

**For Core Implementation:**

- 3 core patterns with significant, visible bonuses (+40-50% effect)
- Visual effects scale with equation power (larger numbers = more impressive effects)
- Simple battle pass with 10 tiers of achievement
- Core loop completion time: 3-5 minutes per battle

**Retention Mechanics:**

- Daily challenges featuring specific pattern goals
- Growth indicators showing mastery improvement over time
- Weekly special battle types that emphasize different operations
- Collection system for unlocking spell variants

**Future Expansion:**

- Add equation patterns with more subtle relationships
- Implement social features and tournament system
- Develop more complex enemy types and behaviors

---

_This document provides gameplay systems with specific parameters while balancing educational value with engaging gameplay._
