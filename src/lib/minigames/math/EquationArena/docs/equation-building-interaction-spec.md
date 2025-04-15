# equation-building-interaction-spec

# Equation Building Interaction Specification

## Core Interaction Loop (30-Second Satisfaction Cycle)

1. **Player selects spell type** → **Builds equation** → **Casts spell** → **Receives feedback** → **Repeat**

## Input System

### Tile Selection

- **Method**: Tap-to-place (not drag-and-drop)
- **Response Time**: ≤ 50ms from tap to visual placement
- **Visual Feedback**:
  - Slight scale animation on valid tap (110% → 100%, 100ms duration)
  - Red shake animation on invalid selection
- **Audio Feedback**: Distinct sounds for number vs. operation selection

### Equation Building Area

- **Layout**: Central, prominently displayed equation zone
- **Format**: `= [ ]` with clear placeholders
- **Auto-Validation**: Validates after = sign and result are placed
- **Tile Removal**: Tap placed tile to remove it

### Cast Button

- **State Management**:
  - Disabled (gray) when equation incomplete
  - Enabled when equation valid
  - Animated pulse when equation creates pattern bonus
- **Activation Time**: 120ms from press to spell launch

## Feedback Systems

### Correct Equation

- **Visual**:
  - Equation glows green (300ms)
  - Numbers briefly scale up (150ms)
  - Spell animation launches toward enemy
- **Audio**:
  - Success sound (distinct from placement sound)
  - Spell casting sound varies by spell type
- **Timing**: ≤ 200ms from validation to feedback start

### Pattern Bonus

- **Detection Types**:
  - **Level 1**: Distributive property (e.g., 2×(3+4) = 2×3+2×4)
  - **Level 2**: Benchmark fractions (e.g., 1/4+1/4 = 1/2, 2/4+2/4 = 1)
  - **Level 3**: Place value patterns (e.g., 0.1×10 = 1, 0.01×100 = 1)
  - **All Levels**: Commutative property (e.g., 3×4 = 4×3, 2+5 = 5+2)
- **Visual Effects**:
  - Level-specific colored borders (purple/green/cyan)
  - “[Property Name] BONUS!” text appears (1.2s)
  - Property explanation displayed briefly
  - Spell visual size increases by 40%
  - Simple animations that highlight mathematical relationships:
    - Distributive: Purple highlighting connecting related terms
    - Benchmark Fractions: Green highlighting on the equivalent value
    - Place Value: Cyan highlighting on the decimal movement
    - Commutative: Gold highlighting connecting swapped terms
- **Audio**:
  - Property-specific power-up sound (distinct, satisfying)
  - Amplified spell sound
- **Learning Moment**: Brief pause (0.5s) to let the pattern recognition register

### Incorrect Equation

- **Visual**:
  - Gentle red glow on incorrect portion
  - Small shake animation (300ms)
- **Audio**: Soft error sound (non-punitive)
- **Recovery**: Invalid tiles can be tapped to remove
- **Helper Text**: After 2 consecutive errors, show hint text

## Error Prevention

### Input Constraints

- Only allow valid next inputs (e.g., can’t place operation after operation)
- Highlight valid next options subtly
- Auto-position = sign when left side is complete

### Common Mistakes

- Prevent duplicate operations side-by-side
- Guide player with subtle UI cues for next logical step
- Provide undo functionality (last tile removal)

## Playtesting Focus

### Key Metrics

- Time to first successful equation
- Mathematical property discovery rate
- Error recovery time
- Tiles placed per second

### Hypotheses

1. Players will discover at least one mathematical property within 3 equations
2. Players will understand the relationship between the equation and the property
3. Equation building will take ≤ 15 seconds for Level 1 problems
4. Players will find the feedback for property discovery satisfying

## Technical Requirements

### Performance

- Input lag < 50ms on target devices
- Animation framerate stable at 60fps
- Total memory for animation assets < 15MB

### Accessibility

- Tap targets minimum 44×44px
- Color feedback supplemented with shape/animation
- Audio cues paired with visual feedback
- Property explanations use clear, grade-appropriate language

## Skillful Expression

Players express skill through:

1. Speed of equation construction
2. Strategic mathematical property discovery
3. Application of multiple properties in single equations
4. Spell type selection based on battle context
5. Optimization of number and operation usage

## Testing Criteria

A successful implementation meets these criteria:

1. New players can build an equation within 40 seconds of starting
2. Players express satisfaction at property discovery feedback (score 4/5+)
3. At least one mathematical property is discovered by 70% of players
4. Input feels responsive with no perceptible lag
5. Core equation-building loop drives engagement through all 3 levels
6. At least 70% of players complete all three levels on first attempt
7. Players can explain at least one mathematical property after playing
