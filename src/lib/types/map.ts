// src/lib/types/map.ts
// Defines the structure for our map data
import type { Subject } from './subjects';

export interface LessonNodeData {
	id: string; // Unique ID for this node (e.g., 'math-node-1')
	name: string; // Display name (e.g., "Algebra Basics 1")
	position: { x: number; y: number }; // Position on the 2D map plane
	connections: string[]; // IDs of nodes this one connects to
	// Add other properties as needed, e.g., difficulty, completion status
}

export interface SubjectMapData {
	subject: Subject;
	theme: {
		// Basic theming example
		backgroundColor: string;
		pathColor: string;
	};
	nodes: LessonNodeData[];
	// Add entry node ID, background asset URLs, etc. later
}
