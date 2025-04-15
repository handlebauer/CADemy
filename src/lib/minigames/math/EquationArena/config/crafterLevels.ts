import type { CrafterLevelConfig } from '../types';

const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const crafterLevelConfigs: CrafterLevelConfig[] = [
	{
		level: 1,
		description: 'Use parentheses for order of operations.',
		allowedChars: [...numbers, '+', '-', '×', '(', ')'],
		validate: (equation: string): boolean => {
			const trimmed = equation.trim();
			// Basic validation: contains parentheses and doesn't end in operator
			return (
				trimmed.includes('(') &&
				trimmed.includes(')') &&
				!['+', '-', '×', '÷'].includes(trimmed.slice(-1)) &&
				trimmed.length > 0
			);
		}
	},
	{
		level: 2,
		description: 'Create an equation using division (fractions).',
		allowedChars: [...numbers, '+', '-', '/'], // Division instead of multiplication
		validate: (equation: string): boolean => {
			const trimmed = equation.trim();
			// Basic validation: contains division and doesn't end in operator
			return (
				trimmed.includes('/') && !['+', '-', '/'].includes(trimmed.slice(-1)) && trimmed.length > 0
			);
		}
	},
	{
		level: 3,
		description: 'Create an equation using decimals.',
		allowedChars: [...numbers, '+', '-', '×', '.'], // Multiplication and decimal
		validate: (equation: string): boolean => {
			const trimmed = equation.trim();
			// Basic validation: contains decimal and doesn't end in operator
			return (
				trimmed.includes('.') &&
				!['+', '-', '×', '.'].includes(trimmed.slice(-1)) &&
				trimmed.length > 0
			);
		}
	}
	// Add more levels here
];

// Helper function to get config for a specific level
export const getCrafterLevelConfig = (level: number): CrafterLevelConfig | undefined => {
	return crafterLevelConfigs.find((config) => config.level === level);
};
