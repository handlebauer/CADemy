# equation-arena-gdd

# Equation Arena: Game Design Document

## Target Audience

- Primary: 5th Grade students (10-11 years old)
- Curriculum Alignment: Common Core Math Standards for Grade 5
  - Operations & Algebraic Thinking
  - Number & Operations in Fractions
  - Number & Operations in Base Ten

## Player Experience Goals

- Create a game where mathematical thinking directly translates to tactical advantage
- Provide clear, satisfying feedback for successful equation building
- Reward pattern recognition with visually impressive effects
- Balance educational value with genuinely engaging gameplay
- Maintain session lengths of 5-10 minutes for classroom viability

## Educational Philosophy

Equation Arena follows core Mathcademy principles:

- **Insight Over Memorization**: Players discover mathematical properties through gameplay, experiencing moments of insight rather than memorizing procedures
- **Concrete to Abstract**: All mathematical concepts are represented visually before being expressed symbolically
- **Multiple Representations**: Each property is shown through animation, visualization, and symbolic notation
- **Big Ideas**: Focus on deeper mathematical structures (properties, relationships) rather than isolated calculations
- **Productive Struggle**: Challenge is carefully calibrated to create moments of discovery after appropriate effort

## 1. Equation Crafting Mechanics

Players combine mathematical components (numbers and operations) to create equations. The equation’s power is determined by:

- Complexity of the operation (multiplication: 30-50 power, addition: 15-30 power)
- Appropriate use of parentheses and order of operations
- Correct use of fractions and decimals according to level

**Input System:** Number and operation tiles appear at the bottom of the screen. Players tap components to place them in the equation builder. The equation validates when complete, showing the current result. The “Cast” button activates when a valid equation is ready. Players can tap placed components to remove them.

**Feedback Systems:**

- Tiles pulse briefly when tapped (110% → 100%, 100ms duration)
- Visual/audio confirmation when valid equation is created
- Invalid equations trigger gentle error feedback (shake/red glow)
- “Cast” button grows and pulses when equation is valid

The system rewards mathematical properties with clear bonuses:

- **Level 1**: Distributive Property (e.g., 2×(3+4) = 2×3+2×4): +50% spell effect
- **Level 2**: Benchmark Fractions (e.g., 1/4+1/4 = 1/2): +50% spell effect
- **Level 3**: Place Value Understanding (e.g., 0.1×10 = 1): +50% spell effect
- **All Levels**: Commutative Property (e.g., 3×4 = 4×3): +25% spell effect

**Pattern Recognition Feedback:**

- Pattern triggers unique level-specific visual effect (purple/green/cyan)
- Property name announcement (e.g., “Distributive Bonus!”, “Benchmark Bonus!”)
- Property explanation displayed briefly
- Enhanced casting animation for property-boosted spells

## 2. Strategic Choice Framework

**Spell Effect Types:**

- **Fire (Damage)**: Deals damage based on equation complexity
- **Ice (Shield)**: Creates a shield absorbing damage. Shield remains until all absorption is used or new shield is cast.
- **Future Spells**: Lightning (speed boost), Earth (stun), Water (heal) could expand gameplay options

**Enemy Types:**

- **Level 1**: Order Keeper - focuses on testing order of operations understanding
- **Level 2**: Fraction Fiend - challenges players with fraction concepts
- **Level 3**: Decimal Demon - tests decimal place value understanding
- **Future Enemies**: More varied enemy types with unique mathematical challenges and attack patterns

**Battle Mechanics:**

- **Player Damage**: Players take damage when enemies attack
- **Health System**: Players start with full health; battle is lost if health reaches 0
- **Time Pressure**: Each battle has a time limit; defeat the enemy before time expires
- **Strategy**: Players choose between offense (damage) and defense (shield) based on situation

**Victory Conditions:** Each level is won when the enemy is defeated. Players must complete all three levels to finish the game.

**Battle Flow:**

1. Player selects spell type (Fire/Ice) based on strategic needs
2. Player constructs and solves equation using available components
3. Successful equation casts spell with effect determined by equation complexity
4. Enemy attacks on fixed intervals (varies by level)
5. Process repeats until victory or defeat

## 3. Progression Model

**Mathematical Mastery:**

- **Level 1**: Order of operations with parentheses and whole numbers
- **Level 2**: Fractions with unlike denominators
- **Level 3**: Decimals to the hundredths place with all operations

**Game Progression:**

- 3 levels with distinct mathematical focus and visual themes
- Each level features a single themed enemy
- Level completion unlocks the next mathematical concept

**Session Pacing:**

- Each level designed for appropriate classroom time constraints
- Complete initial gameplay session: Under 10 minutes total
- Difficulty progression ensures challenge while maintaining achievability

**Success Metrics:**

- Players complete all levels within a single class session
- Significant portion of equations utilize mathematical properties
- Session-to-session improvement in equation solve time
- High percentage of students complete tutorial without assistance
- Majority of players successfully complete all levels on first attempt

## 4. Learning Integration & Engagement

Mathematical properties provide substantial gameplay advantages with visual feedback. Each level introduces a property relevant to Grade 5 standards, creating educational “aha!” moments.

**For v0 Implementation:**

- 4 core mathematical properties with significant, visible bonuses
- Visual effects themed to property type (purple for distributive, green for fractions, cyan for decimals)
- Core loop completion time: 90-120 seconds per level

**Retention Mechanics:**

- Visual summary of equations used and skills mastered
- Clear feedback on property discovery
- Session-end survey to capture player experience

**Future Expansion:**

- Add Lightning spell for increased equation component generation
- Implement Earth spell for crowd control effects
- Add equation patterns with more subtle relationships
- Implement social features and tournament system
- Develop more complex enemy types and behaviors
- Daily challenges featuring specific property goals
- Growth indicators showing mastery improvement over time
- Weekly special battle types that emphasize different operations
- Collection system for unlocking spell variants

---

_This document provides gameplay systems for v0 implementation while maintaining a vision for future expansion, balancing educational value with engaging gameplay._
