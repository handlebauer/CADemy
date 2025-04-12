// src/lib/types/sprites.ts
// Defines sprite types and constants

export interface SpriteAnimation {
  row: number;                 // Row in the sprite sheet for this animation
  numFrames: number;           // Number of frames in the animation
  fps: number;                 // Frames per second
  frameStart?: number;         // Optional start frame index (default: 0)
}
  
export interface SpriteConfig {
  textureUrl: string;                    // Path to the sprite sheet
  columns: number;                       // Number of columns in the grid
  rows: number;                          // Number of rows in the grid
  animations: Record<string, SpriteAnimation>; // Animation definitions
}