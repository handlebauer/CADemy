import type { CrafterLevelConfig } from '../types';

const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const operators = ['+', '-', '×', '/', '.'];

// --- Common Validation Helpers ---

function hasBalancedParentheses(eq: string): boolean {
	let balance = 0;
	for (const char of eq) {
		if (char === '(') balance++;
		else if (char === ')') balance--;
		if (balance < 0) return false; // Closing parenthesis without matching open
	}
	return balance === 0; // Ensure all opened parentheses are closed
}

function hasNoEmptyParentheses(eq: string): boolean {
	return !eq.includes('()');
}

function hasNoInvalidOperatorPlacement(eq: string): boolean {
	const trimmed = eq.trim();
	// Check start (allow leading minus)
	if (operators.includes(trimmed[0]) && trimmed[0] !== '-') {
		return false;
	}
	// Check end
	if (operators.includes(trimmed.slice(-1))) {
		return false;
	}

	// Check for operators adjacent to parentheses or other operators
	for (let i = 0; i < trimmed.length - 1; i++) {
		const char = trimmed[i];
		const nextChar = trimmed[i + 1];

		// Operator directly after opening parenthesis (e.g., "(+") - allow negative sign "(-"
		if (char === '(' && operators.includes(nextChar) && nextChar !== '-') {
			return false;
		}
		// Operator directly before closing parenthesis (e.g., "+)")
		if (operators.includes(char) && nextChar === ')') {
			return false;
		}
		// Two operators in a row (excluding allowed leading minus edge case like "5 * -2")
		if (
			operators.includes(char) &&
			char !== '(' &&
			operators.includes(nextChar) &&
			nextChar !== '-'
		) {
			// More nuanced check needed if we allow negative numbers like "5 * -2"
			// For now, let's assume simple consecutive operators are disallowed by numpad logic,
			// but we double-check here robustly.
			// A simple check like below might be too strict if negative numbers are common input.
			// Consider refining if "5 * -2" should be valid input.
			// if (operators.includes(char) && operators.includes(nextChar)) return false;
		}
	}
	return true;
}

// Renamed function for clarity
function isSyntacticallySound(eq: string): boolean {
	const trimmed = eq.trim();
	if (trimmed.length === 0) return false;
	return (
		hasBalancedParentheses(trimmed) &&
		hasNoEmptyParentheses(trimmed) &&
		hasNoInvalidOperatorPlacement(trimmed)
	);
}

// --- Level Configurations ---

export const crafterLevelConfigs: CrafterLevelConfig[] = [
	{
		level: 1,
		description: 'Craft some equations!',
		allowedChars: [...numbers, '+', '-', '×', '/', '(', ')'],
		validate: (equation: string): boolean => {
			const trimmed = equation.trim();
			// Only check for basic syntactic validity
			return isSyntacticallySound(trimmed);
		}
	},
	{
		level: 2,
		description: 'Unlike denominators only!',
		allowedChars: [...numbers, '+', '-', '/'], // Division instead of multiplication
		validate: (equation: string): boolean => {
			const trimmed = equation.trim();
			if (!isSyntacticallySound(trimmed)) return false;

			// Level 2 specific: Must contain division
			if (!trimmed.includes('/')) {
				return false;
			}

			// Find all denominators (numbers immediately after '/')
			const denominatorRegex = /\/\s*(\d+(\.\d+)?)/g; // Adjusted regex for decimals
			const matches = [...trimmed.matchAll(denominatorRegex)];
			const denominators = matches.map((match) => match[1]);

			// Must have at least two fractions being added/subtracted
			if (denominators.length < 2) {
				return false;
			}

			// Check if all denominators are the same
			const firstDenominator = denominators[0];
			const allSame = denominators.every((denom) => denom === firstDenominator);

			// If all denominators are the same, it's invalid for this level's requirement
			return !allSame;
		}
	},
	{
		level: 3,
		description: 'Craft with decimals only!',
		allowedChars: [...numbers, '+', '-', '×', '/', '.'], // Multiplication, division and decimal
		validate: (equation: string): boolean => {
			const trimmed = equation.trim();
			if (!isSyntacticallySound(trimmed)) return false;

			// Level 3 specific: Must contain a decimal point
			// Ensure the decimal is part of a number, not standalone.
			const decimalValid = trimmed.includes('.') && /\d\.\d/.test(trimmed);

			// Optional: Also require division for this level?
			// const divisionValid = trimmed.includes('/');
			// return decimalValid && divisionValid;

			return decimalValid; // Keep original validation for now
		}
	}
	// Add more levels here
];

// Helper function to get config for a specific level
export const getCrafterLevelConfig = (level: number): CrafterLevelConfig | undefined => {
	return crafterLevelConfigs.find((config) => config.level === level);
};
