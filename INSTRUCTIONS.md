Technical PRD: Incept Layer 2 - Overworld MVP Implementation

1. Overall Goal:

Refine the existing SvelteKit + Three.js codebase (cademy project) to implement the Minimum Viable Product (MVP) features for the Incept Layer 2 overworld map. The resulting application should be playable, allowing users to switch between 4 subject maps and navigate a character between lesson nodes using keyboard or tap input. Adhere strictly to principles of clean, minimal, and maintainable code, using TypeScript effectively and preparing for future extensions.

2. Current Codebase Context:

Framework: SvelteKit with TypeScript, using Bun runtime/package manager.
Key Files:
src/routes/+page.svelte: Main page, includes subject tabs and renders MapCanvas.
src/lib/components/MapCanvas.svelte: Handles Three.js scene setup, rendering, and basic interaction logic.
src/lib/mapData.ts: Contains initial map data structure (interfaces LessonNodeData, SubjectMapData) and sample data for 'Math'.
package.json/bun.lock: Define dependencies (SvelteKit, Three.js, TypeScript, etc.).
Backend files (drizzle.config.ts, src/lib/server/): Exist but are out of scope for the frontend-only MVP implementation. Ignore these for now.
README.md: Contains the project summary based on previous discussions. 3. MVP Action Items (Instructions for LLM):

(Guardrail: Implement only the features described below. Prioritize functionality and clarity over complex optimizations or visual polish for this MVP stage. Use Three.js primitives only for visual representation.)

Task 1: Abstract Shared Types

Objective: Centralize shared TypeScript type definitions for better maintainability and adherence to best practices.
Action 1.1: Create a new file: src/lib/types/map.ts.
Action 1.2: Move the LessonNodeData and SubjectMapData interface definitions from src/lib/mapData.ts to the new src/lib/types/map.ts file.
Action 1.3: Update src/lib/mapData.ts to import these types: import type { LessonNodeData, SubjectMapData } from '$lib/types/map';.
Action 1.4: Update src/lib/components/MapCanvas.svelte to import these types: import type { SubjectMapData, LessonNodeData } from '$lib/types/map';.
Guardrail: Ensure only these two shared interfaces are moved. No other refactoring in this step.
Task 2: Populate and Theme Map Data

Objective: Define basic node structures and unique visual themes for all four subject maps.
Action 2.1: In src/lib/mapData.ts, populate the nodes array within the maps object for 'Science', 'History', and 'Language'. Each should contain 2-3 LessonNodeData objects with unique id, name, simple position coordinates (e.g., {x: 0, y: 1}, {x: 2, y: 1}), and plausible connections arrays linking adjacent nodes within that subject map.
Action 2.2: In src/lib/mapData.ts, ensure the theme object for 'Science', 'History', and 'Language' maps has distinct hex color codes for backgroundColor and pathColor (different from 'Math' and each other).
Guardrail: Keep node positions and connections simple. Ensure connections only reference valid ids within the same subject map.
Task 3: Enhance Three.js Rendering & Theming

Objective: Visually represent map elements (background, nodes, paths, player) using Three.js primitives, applying the correct theme for the selected map. Design player rendering for future modularity.
Action 3.1: In src/lib/components/MapCanvas.svelte:
Verify the reactive block ($: { ... }) correctly updates scene.background using mapData.theme.backgroundColor when the mapData prop changes.
Inside createMapElements, modify the node material creation. Use a theme color, for example: new THREE.MeshBasicMaterial({ color: new THREE.Color(mapData.theme.pathColor) }). (Ensure nodes are visible against the background).
Verify path material creation uses new THREE.LineBasicMaterial({ color: new THREE.Color(mapData.theme.pathColor), ... }).
Action 3.2: In createOrUpdatePlayer function within MapCanvas.svelte:
Keep the simple CapsuleGeometry and distinct color (e.g., red) for the MVP player playerMesh.
Ensure the code creating the player mesh (if (!playerMesh) { ... }) is clean and self-contained within this function or called from it. Add a comment indicating this is the placeholder and intended location for future sprite logic.
Guardrail: Use only THREE.Color, THREE.CircleGeometry, THREE.LineBasicMaterial, THREE.CapsuleGeometry, THREE.MeshBasicMaterial, THREE.BufferGeometry, THREE.Vector3, THREE.Line, THREE.Mesh. No textures, lighting, or complex materials.
Task 4: Implement Playable Movement Logic

Objective: Enable the player to move between connected nodes using arrow keys (desktop) or tapping adjacent nodes (mobile).
Action 4.1: Review and refine the handleKeyDown function in src/lib/components/MapCanvas.svelte. Ensure the findConnectionInDirection helper reliably selects the correct adjacent node ID from the currentNode.connections based on the key pressed and relative node positions. Verify currentNodeId is updated and createOrUpdatePlayer is called correctly.
Action 4.2: Review and refine the handleCanvasClick function in src/lib/components/MapCanvas.svelte. Ensure the raycasting correctly identifies the clicked node mesh (intersects[0].object). Crucially, verify it checks if the clickedNodeId exists in the currentNodeData.connections array before updating currentNodeId and calling createOrUpdatePlayer.
Guardrail: Player movement should be instantaneous (snapping to the target node's position). Do not implement animations or transitions between nodes. Movement must be restricted to nodes defined in the connections array of the current node.
Task 5: Verify Node Interaction Display

Objective: Confirm that landing on a node triggers the display of its name.
Action 5.1: Verify that createOrUpdatePlayer in src/lib/components/MapCanvas.svelte calls onNodeInteract(landedNode.name) after updating the player's position.
Action 5.2: Verify that src/routes/+page.svelte correctly uses the on:nodeInteract={handleNodeInteraction} directive on the <MapCanvas> component and that the handleNodeInteraction function updates the currentNodeInfo variable, making the popup display.
Guardrail: The interaction is complete once the node name is displayed temporarily. No further implementation is needed for this task.
Task 6: Code Quality and Cleanup

Objective: Ensure the implemented code is clean, minimal, readable, and avoids unnecessary complexity or tech debt.
Action 6.1: Review all modified files (+page.svelte, MapCanvas.svelte, mapData.ts, types/map.ts). Remove any commented-out code blocks (unless explicitly marking areas for future extension, like the player sprite). Remove console logs unless essential for debugging specific complex interactions.
Action 6.2: Ensure consistent formatting (run bun format or equivalent Prettier command).
Action 6.3: Add brief, explanatory comments only where the code's purpose isn't immediately obvious (e.g., the raycasting logic, the findConnectionInDirection helper).
Guardrail: Avoid adding new abstractions or significant refactoring beyond the type extraction in Task 1. Focus on making the existing structure work correctly and clearly for the MVP features.
