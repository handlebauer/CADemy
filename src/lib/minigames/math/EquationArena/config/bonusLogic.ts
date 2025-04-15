import type { MathNode } from 'mathjs';
import type { BonusConfig, GameMode } from '../types';
import { bonuses as bonusDefinitions } from './index';
import { parseEquation } from '../utils/math';

// --- Individual Bonus Check Functions --- //
// These are placeholders and will need actual logic using the AST (MathNode)

function checkCommutative(node: MathNode | null): boolean {
	// Placeholder: Requires parsing the equation structure (e.g., a*b vs b*a)
	// console.log('Checking Commutative...', node);
	if (!node) return false;
	// Example sketch: Check if it's an OperatorNode with specific structure
	return false;
}

function checkDistributive(node: MathNode | null): boolean {
	// Placeholder: Requires parsing structure like a*(b+c) vs a*b + a*c
	// console.log('Checking Distributive...', node);
	if (!node) return false;
	return false;
}

function checkBenchmarkFraction(answer: number): boolean {
	// Check if the answer is close to 0.5, 0.75, or 1.0
	// Use a small tolerance for floating point comparisons
	const tolerance = 1e-9;
	return (
		Math.abs(answer - 0.5) < tolerance ||
		Math.abs(answer - 0.75) < tolerance ||
		Math.abs(answer - 1.0) < tolerance
	);
}

function checkPlaceValue(node: MathNode | null, _answer: number): boolean {
	// Placeholder: Requires parsing structure like 0.1 * 10 = 1
	// console.log('Checking Place Value...', node, answer);
	if (!node) return false;
	return false;
}

// --- Main Bonus Calculation Function --- //

/**
 * Determines which bonuses apply to a given successfully evaluated equation.
 * @param equationString The original equation string crafted by the player.
 * @param answer The calculated numerical answer of the equation.
 * @param currentLevel The current level number.
 * @param gameMode The current game mode ('crafter').
 * @returns An array of BonusConfig objects that apply.
 */
export function getActiveBonuses(
	equationString: string,
	answer: number,
	currentLevel: number,
	gameMode: GameMode
): BonusConfig[] {
	if (gameMode !== 'crafter') {
		return []; // Bonuses only apply in crafter mode for now
	}

	const applicableBonuses: BonusConfig[] = [];
	const parsedNode = parseEquation(equationString);

	// Iterate through defined bonuses and check if they apply
	for (const bonus of bonusDefinitions) {
		// Check if bonus is for the correct mode and level (if specified)
		if (bonus.mode !== gameMode || (bonus.level && bonus.level !== currentLevel)) {
			continue;
		}

		let applies = false;
		switch (bonus.id) {
			case 'commutative':
				applies = checkCommutative(parsedNode);
				break;
			case 'distributive':
				applies = checkDistributive(parsedNode);
				break;
			case 'benchmark':
				applies = checkBenchmarkFraction(answer);
				break;
			case 'place_value':
				applies = checkPlaceValue(parsedNode, answer);
				break;
			// Add cases for future bonuses
			default:
				console.warn(`Unknown bonus ID check attempted: ${bonus.id}`);
		}

		if (applies) {
			applicableBonuses.push(bonus);
		}
	}

	return applicableBonuses;
}
