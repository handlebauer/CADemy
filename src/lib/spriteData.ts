// src/lib/spriteData.ts
import * as THREE from 'three';

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

// Configuration for explorer_sprite_sheet.png (4x4 grid)
export const playerSpriteConfig: SpriteConfig = {
  textureUrl: '/explorer_sprite_sheet.png',
  columns: 4,  // 4 frames per row
  rows: 4,     // 4 directions
  animations: {
    walkUp:    { row: 0, numFrames: 4, fps: 10 }, // Row 0: Up
    walkRight: { row: 1, numFrames: 4, fps: 10 }, // Row 1: Right
    walkDown:  { row: 2, numFrames: 4, fps: 10 }, // Row 2: Down
    walkLeft:  { row: 3, numFrames: 4, fps: 10 }, // Row 3: Left
    idle:      { row: 2, numFrames: 1, fps: 1 }   // First frame of Down as idle
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

  let currentAnimation = 'idle';
  let animationStartTime = performance.now();

  // Animation update function
  function updateAnimation() {
    const anim = config.animations[currentAnimation];
    const elapsed = (performance.now() - animationStartTime) / 1000; // Seconds
    const frameIndex = Math.floor(elapsed * anim.fps) % anim.numFrames;
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
      currentAnimation = direction;
      animationStartTime = performance.now();
    }
  }

  scene.add(sprite);

  return { sprite, updateAnimation, moveTo };
}