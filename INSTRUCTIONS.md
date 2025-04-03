Below are the technical instructions to ingest a 4x4 sprite sheet and replace the cylinder in your game with a properly animated sprite that displays walking animations for up/down/left/right movement. The approach is designed to be generic and reusable, avoiding code duplication for future sprites. I’ll specify where to place the sprite sheet file and how to integrate it into your existing MapCanvas.svelte.
Technical Instructions
1. Place the Sprite Sheet File
Location: Put sprite_sheet.png in the static/ directory of your SvelteKit project (e.g., static/sprite_sheet.png).
Reason: SvelteKit serves files from static/ at the root URL (e.g., /sprite_sheet.png), making them accessible to Three.js’s TextureLoader.
2. Define a Reusable Sprite Animation Config
File: Create a new file src/lib/spriteData.ts.
Content: Define a generic sprite configuration structure and the specific config for your 4x4 sprite sheet.
typescript
// src/lib/spriteData.ts
export interface SpriteAnimation {
  row: number;        // Row in the sprite sheet for this animation
  numFrames: number;  // Number of frames in the animation
  fps: number;        // Frames per second
}

export interface SpriteConfig {
  textureUrl: string;                    // Path to the sprite sheet
  columns: number;                       // Number of columns in the grid
  rows: number;                          // Number of rows in the grid
  animations: Record<string, SpriteAnimation>; // Animation definitions
}

// Configuration for sprite_sheet.png (4x4 grid)
export const playerSpriteConfig: SpriteConfig = {
  textureUrl: '/sprite_sheet.png',
  columns: 4,  // 4 frames per row
  rows: 4,     // 4 directions
  animations: {
    walkNorth: { row: 0, numFrames: 4, fps: 10 }, // Row 0: Up
    walkEast:  { row: 1, numFrames: 4, fps: 10 }, // Row 1: Right
    walkSouth: { row: 2, numFrames: 4, fps: 10 }, // Row 2: Down
    walkWest:  { row: 3, numFrames: 4, fps: 10 }, // Row 3: Left
    idle:      { row: 0, numFrames: 1, fps: 1 }   // First frame of North as idle
  }
};
Purpose: This separates sprite data from logic, making it reusable for any sprite by importing a different config.
3. Create a Reusable Sprite Animator Function
File: Add to src/lib/spriteData.ts.
Content: Define a function to create and animate a sprite, reusable across components.
typescript
// src/lib/spriteData.ts (continued)
import * as THREE from 'three';

export function createAnimatedSprite(config: SpriteConfig, scene: THREE.Scene) {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(config.textureUrl);
  texture.repeat.set(1 / config.columns, 1 / config.rows);

  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.5, 0.5, 1); // Adjust size to match your map scale
  sprite.position.z = 0.1;        // Above nodes/paths

  let currentAnimation = 'idle';
  let animationStartTime = performance.now();

  // Animation update function
  function updateAnimation() {
    const anim = config.animations[currentAnimation];
    const elapsed = (performance.now() - animationStartTime) / 1000; // Seconds
    const frameIndex = Math.floor(elapsed * anim.fps) % anim.numFrames;
    material.map.offset.set(
      frameIndex / config.columns,
      (config.rows - 1 - anim.row) / config.rows // Top row is 0
    );
  }

  // Movement function
  function moveTo(x: number, y: number, direction: string) {
    sprite.position.set(x, y, 0.1);
    currentAnimation = direction;
    animationStartTime = performance.now();
  }

  scene.add(sprite);

  return { sprite, updateAnimation, moveTo };
}
Purpose: Encapsulates sprite creation and animation logic, reusable by passing a config and scene.
4. Update MapCanvas.svelte
File: Modify src/lib/components/MapCanvas.svelte.
Changes: Replace the cylinder with the animated sprite and integrate movement animations.
typescript
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import type { SubjectMapData } from '$lib/types/map';
  import { createAnimatedSprite, playerSpriteConfig } from '$lib/spriteData';

  export let mapData: SubjectMapData;
  export let onNodeInteract: (nodeName: string) => void;

  let canvasElement: HTMLCanvasElement;
  let canvasContainer: HTMLElement;
  let scene: THREE.Scene;
  let camera: THREE.OrthographicCamera;
  let renderer: THREE.WebGLRenderer;
  let animationFrameId: number;
  let playerSprite: ReturnType<typeof createAnimatedSprite>;
  let currentNodeId: string | null = null;
  const nodeMeshes = new Map<string, THREE.Mesh>();

  onMount(() => {
    // Scene setup (unchanged)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(mapData.theme.backgroundColor);
    let containerWidth = window.innerWidth;
    let containerHeight = window.innerHeight * 0.8;
    if (canvasContainer) {
      const rect = canvasContainer.getBoundingClientRect();
      containerWidth = rect.width || containerWidth;
      containerHeight = rect.height || containerHeight;
    }
    const aspect = containerWidth / containerHeight || 1;
    const frustumSize = 10;
    camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      1,
      1000
    );
    camera.position.z = 5;
    renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
    renderer.setSize(containerWidth, containerHeight);

    // Create map elements (unchanged)
    createMapElements();

    // Initialize player sprite
    if (mapData.nodes.length > 0) {
      const startNode = mapData.nodes[0];
      currentNodeId = startNode.id;
      playerSprite = createAnimatedSprite(playerSpriteConfig, scene);
      playerSprite.moveTo(startNode.position.x, startNode.position.y, 'idle');
      onNodeInteract(startNode.name);
    }

    // Event listeners (unchanged)
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    canvasElement.addEventListener('click', handleCanvasClick);

    // Animation loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (playerSprite) playerSprite.updateAnimation();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      canvasElement.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (playerSprite) scene.remove(playerSprite.sprite);
    };
  });

  // Reactive map update (unchanged except player handling)
  $: if (scene && mapData) {
    scene.background = new THREE.Color(mapData.theme.backgroundColor);
    clearMapElements();
    createMapElements();
    if (mapData.nodes.length > 0 && (!currentNodeId || !mapData.nodes.some(n => n.id === currentNodeId))) {
      const startNode = mapData.nodes[0];
      currentNodeId = startNode.id;
      if (playerSprite) playerSprite.moveTo(startNode.position.x, startNode.position.y, 'idle');
    }
  }

  // Unchanged functions: clearMapElements, createMapElements

  function handleKeyDown(event: KeyboardEvent) {
    if (!currentNodeId) return;
    const currentNode = mapData.nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) return;
    let targetNodeId: string | undefined;
    let direction: string;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
        event.preventDefault();
        targetNodeId = findConnectionInDirection(currentNode, 0, 1);
        direction = 'walkNorth';
        break;
      case 'ArrowDown':
      case 's':
        event.preventDefault();
        targetNodeId = findConnectionInDirection(currentNode, 0, -1);
        direction = 'walkSouth';
        break;
      case 'ArrowLeft':
      case 'a':
        event.preventDefault();
        targetNodeId = findConnectionInDirection(currentNode, -1, 0);
        direction = 'walkWest';
        break;
      case 'ArrowRight':
      case 'd':
        event.preventDefault();
        targetNodeId = findConnectionInDirection(currentNode, 1, 0);
        direction = 'walkEast';
        break;
    }

    if (targetNodeId && playerSprite) {
      const targetNode = mapData.nodes.find((n) => n.id === targetNodeId);
      if (targetNode) {
        currentNodeId = targetNodeId;
        playerSprite.moveTo(targetNode.position.x, targetNode.position.y, direction);
        onNodeInteract(targetNode.name);
      }
    }
  }

  function handleCanvasClick(event: MouseEvent) {
    const rect = canvasElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(Array.from(nodeMeshes.values()));

    if (intersects.length > 0 && playerSprite) {
      const clickedNodeMesh = intersects[0].object as THREE.Mesh;
      const clickedNodeId = clickedNodeMesh.userData.id;
      const currentNodeData = mapData.nodes.find((n) => n.id === currentNodeId);
      if (currentNodeData?.connections.includes(clickedNodeId)) {
        const targetNode = mapData.nodes.find((n) => n.id === clickedNodeId);
        if (targetNode) {
          const dx = targetNode.position.x - currentNodeData.position.x;
          const dy = targetNode.position.y - currentNodeData.position.y;
          const direction = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'walkEast' : 'walkWest')
            : (dy > 0 ? 'walkNorth' : 'walkSouth');
          currentNodeId = clickedNodeId;
          playerSprite.moveTo(targetNode.position.x, targetNode.position.y, direction);
          onNodeInteract(targetNode.name);
        }
      }
    }
  }

  // Unchanged: handleResize, findConnectionInDirection
</script>

<!-- HTML unchanged -->
5. Notes on Reusability
Adding Another Sprite: To add a new sprite (e.g., an enemy), define a new config in spriteData.ts (e.g., enemySpriteConfig), then call createAnimatedSprite(enemySpriteConfig, scene) in MapCanvas.svelte or another component. The logic remains identical.
Cleanup: The sprite and its material are removed in onDestroy, ensuring no memory leaks.
Generic: The createAnimatedSprite function works with any sprite sheet config, avoiding duplication.
This replaces the cylinder with a sprite animated from sprite_sheet.png, showing walking animations based on movement direction, and keeps the system reusable for future sprites. Place sprite_sheet.png in static/ and follow the steps above.
