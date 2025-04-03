// src/lib/mapData.ts
// Defines map data implementation

import type { LessonNodeData, SubjectMapData } from '$lib/types/map';

// --- Initial MVP Data ---
// Define initial data for each subject map here
// Keep it simple for the MVP

export const maps: Record<string, SubjectMapData> = {
	Math: {
		subject: 'Math',
		theme: { backgroundColor: '#e0f0ff', pathColor: '#0000ff' },
		nodes: [
			{
				id: 'math-node-1',
				name: 'Counting Intro',
				position: { x: -2, y: 0 },
				connections: ['math-node-2']
			},
			{
				id: 'math-node-2',
				name: 'Simple Addition',
				position: { x: 0, y: 0 },
				connections: ['math-node-1', 'math-node-3']
			},
			{
				id: 'math-node-3',
				name: 'Subtraction Intro',
				position: { x: 2, y: 0 },
				connections: ['math-node-2']
			}
		]
	},
	Science: {
		subject: 'Science',
		theme: { backgroundColor: '#e0ffe0', pathColor: '#008000' },
		nodes: [
			{
				id: 'sci-node-1',
				name: 'Water Cycle',
				position: { x: -1, y: 0 },
				connections: ['sci-node-2']
			},
			{
				id: 'sci-node-2',
				name: 'Cell Biology',
				position: { x: 1, y: 0 },
				connections: ['sci-node-1', 'sci-node-3']
			},
			{
				id: 'sci-node-3',
				name: 'Simple Machines',
				position: { x: 3, y: 0 },
				connections: ['sci-node-2']
			}
		]
	},
	History: {
		subject: 'History',
		theme: { backgroundColor: '#f5e8d0', pathColor: '#a0522d' },
		nodes: [
			{
				id: 'hist-node-1',
				name: 'Ancient Civilizations',
				position: { x: 0, y: -1 },
				connections: ['hist-node-2']
			},
			{
				id: 'hist-node-2',
				name: 'Medieval Times',
				position: { x: 0, y: 1 },
				connections: ['hist-node-1', 'hist-node-3']
			},
			{
				id: 'hist-node-3',
				name: 'Industrial Revolution',
				position: { x: 2, y: 1 },
				connections: ['hist-node-2']
			}
		]
	},
	Language: {
		subject: 'Language',
		theme: { backgroundColor: '#ffe0e0', pathColor: '#ff0000' },
		nodes: [
			{
				id: 'lang-node-1',
				name: 'Basic Grammar',
				position: { x: -2, y: -1 },
				connections: ['lang-node-2']
			},
			{
				id: 'lang-node-2',
				name: 'Vocabulary Building',
				position: { x: 0, y: -1 },
				connections: ['lang-node-1', 'lang-node-3']
			},
			{
				id: 'lang-node-3',
				name: 'Sentence Structure',
				position: { x: 2, y: -1 },
				connections: ['lang-node-2']
			}
		]
	}
};

// Helper function to get map data (can be expanded later)
export function getMapData(subject: string): SubjectMapData | undefined {
	return maps[subject];
}
