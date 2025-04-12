// src/lib/spriteData.ts
import * as THREE from 'three';
import type {SpriteAnimation, SpriteConfig} from '$lib/types/sprites';

// Configuration for explorer_sprite_sheet.png (4x4 grid)
export const playerSpriteConfig: SpriteConfig = {
  textureUrl: '/explorer_sprite_sheet.png',
  columns: 4,  // 4 frames per row
  rows: 4,     // 4 directions
  animations: {
    // Walking animations (all 4 frames)
    walkUp:    { row: 0, numFrames: 4, fps: 10 }, // Row 0: Up
    walkRight: { row: 1, numFrames: 4, fps: 10 }, // Row 1: Right
    walkDown:  { row: 2, numFrames: 4, fps: 10 }, // Row 2: Down
    walkLeft:  { row: 3, numFrames: 4, fps: 10 }, // Row 3: Left
    
    // Standing still animations (just the second frame)
    idleUp:    { row: 0, numFrames: 1, fps: 1, frameStart: 1 }, // Second frame of Up
    idleRight: { row: 1, numFrames: 1, fps: 1, frameStart: 1 }, // Second frame of Right
    idleDown:  { row: 2, numFrames: 1, fps: 1, frameStart: 1 }, // Second frame of Down
    idleLeft:  { row: 3, numFrames: 1, fps: 1, frameStart: 1 }, // Second frame of Left
  }
};

export function createAnimatedSprite(config: SpriteConfig, scene: THREE.Scene) {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(config.textureUrl);
  texture.magFilter = THREE.NearestFilter; // Better for pixel art
  texture.minFilter = THREE.NearestFilter;
  texture.repeat.set(1 / config.columns, 1 / config.rows);

  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1, 1, 1); // Larger size to allow overflow from nodes
  sprite.position.z = 0.1;   // Above nodes/paths

  let currentAnimation = 'idleDown';
  let animationStartTime = performance.now();
  let animationTimeoutId: number | null = null; // Track current animation timeout
  let lastDirection: string | null = null; // Track last movement direction

  // Animation update function
  function updateAnimation() {
    const anim = config.animations[currentAnimation];
    const frameStart = anim.frameStart || 0; // Default to 0 if frameStart is not specified
    
    // Calculate frame index based on elapsed time
    let frameIndex = frameStart;
    
    // Only animate if there's more than one frame
    if (anim.numFrames > 1) {
      const elapsed = (performance.now() - animationStartTime) / 1000; // Seconds
      frameIndex = frameStart + (Math.floor(elapsed * anim.fps) % anim.numFrames);
    }
    
    texture.offset.set(
      frameIndex / config.columns,
      (config.rows - 1 - anim.row) / config.rows // Top row is 0
    );
  }

  // Movement function
  function moveTo(x: number, y: number, direction: string) {
    sprite.position.set(x, y, 0.1);
    
    // Update animation based on direction
    if (direction in config.animations) {
      // Cancel any pending animation timeouts to prevent them from overriding 
      // the new animation we're about to start
      if (animationTimeoutId !== null) {
        clearTimeout(animationTimeoutId);
        animationTimeoutId = null;
      }
      
      // Set the animation
      currentAnimation = direction;
      animationStartTime = performance.now();
      lastDirection = direction;
      
      // Schedule switching to idle animation after movement completes
      if (direction.startsWith('walk')) {
        // Extract direction (Up/Down/Left/Right) and create idle direction name
        const directionPart = direction.substring(4); // Remove 'walk' prefix
        const idleDirection = 'idle' + directionPart;
        
        // Store the timeout ID so we can cancel it if needed
        animationTimeoutId = window.setTimeout(() => {
          // Only apply the idle transition if this is still the most recent direction
          if (lastDirection === direction) {
            currentAnimation = idleDirection;
            animationStartTime = performance.now();
            animationTimeoutId = null;
          }
        }, 500); // Adjust time as needed for walk animation duration
      }
    }
  }

  scene.add(sprite);

  return { sprite, updateAnimation, moveTo };
}