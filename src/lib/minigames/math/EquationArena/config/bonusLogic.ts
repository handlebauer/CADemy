import type { MathNode } from 'mathjs';
import { evaluate, isOperatorNode, isParenthesisNode, isSymbolNode, isConstantNode } from 'mathjs';
import type { BonusConfig, GameMode } from '../types';
import { bonuses as bonusDefinitions } from './index';
import { parseEquation } from '../utils/math';

// --- Helper Functions ---

function isPowerOfTen(n: number): boolean {
	if (n <= 0) return false;
	const log10Value = Math.log10(n);
	// Check if log10(n) is close to an integer
	return Math.abs(log10Value - Math.round(log10Value)) < 1e-9;
}

// --- Individual Bonus Check Functions --- //

function checkCommutative(node: MathNode | null): boolean {
	// XXX: Scrapping for now: see discussion in Discord
	if (!node) return false;
	return false;
}

function checkDistributive(node: MathNode | null): boolean {
	if (!node || !isOperatorNode(node) || node.op !== '*') {
		// Must be a multiplication at the top level
		return false;
	}

	const args = node.args;
	if (args.length !== 2) return false;

	// Check for pattern: a * (b + c) or a * (b - c)
	const pattern1 =
		(isSymbolNode(args[0]) || isConstantNode(args[0])) &&
		isParenthesisNode(args[1]) &&
		isOperatorNode(args[1].content) &&
		(args[1].content.op === '+' || args[1].content.op === '-') &&
		args[1].content.args.length === 2;

	// Check for pattern: (b + c) * a or (b - c) * a
	const pattern2 =
		(isSymbolNode(args[1]) || isConstantNode(args[1])) &&
		isParenthesisNode(args[0]) &&
		isOperatorNode(args[0].content) &&
		(args[0].content.op === '+' || args[0].content.op === '-') &&
		args[0].content.args.length === 2;

	return pattern1 || pattern2;
}

// Renamed and updated to check the player's input value
function checkBenchmarkOperand(playerInputString: string): boolean {
	let playerInputValue: number | null = null;
	try {
		// Evaluate the player's input string (e.g., "3/4")
		const evaluatedInput = evaluate(playerInputString.replace(/×/g, '*').replace(/÷/g, '/'));
		if (typeof evaluatedInput === 'number' && Number.isFinite(evaluatedInput)) {
			playerInputValue = evaluatedInput;
		}
	} catch (error) {
		console.warn(
			`Could not evaluate player input for benchmark bonus: ${playerInputString}`,
			error
		);
		return false; // Cannot check if evaluation fails
	}

	if (playerInputValue === null) return false;

	const benchmarkValues = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];
	const tolerance = 1e-9; // Tolerance for floating point comparisons

	return benchmarkValues.some((benchmark) => Math.abs(playerInputValue - benchmark) < tolerance);
}

function checkPlaceValue(node: MathNode | null): boolean {
	if (!node) return false;

	let foundPlaceValueOp = false;

	node.traverse((currentNode) => {
		// Check if the current node is multiplication or division
		if (isOperatorNode(currentNode) && (currentNode.op === '*' || currentNode.op === '/')) {
			// Check if any argument is a ConstantNode representing a power of 10
			const hasPowerOfTenArg = currentNode.args.some(
				(arg) => isConstantNode(arg) && typeof arg.value === 'number' && isPowerOfTen(arg.value)
			);
			if (hasPowerOfTenArg) {
				foundPlaceValueOp = true;
				// No need to traverse further down this branch once found, but traverse siblings
			}
		}
		// Continue traversal even if found, as other parts of the tree might be relevant for other checks if this evolves
	});

	return foundPlaceValueOp;
}

// --- Main Bonus Calculation Function --- //

/**
 * Determines which bonuses apply to a given successfully evaluated equation.
 * @param equationString The original equation string crafted by the player (LHS).
 * @param playerInputString The string entered by the player as the answer (RHS).
 * @param answer The calculated numerical answer of the equationString (LHS value).
 * @param currentLevel The current level number.
 * @param gameMode The current game mode ('crafter').
 * @returns An array of BonusConfig objects that apply.
 */
export function getActiveBonuses(
	equationString: string,
	playerInputString: string, // Added playerInputString
	answer: number,
	currentLevel: number,
	gameMode: GameMode
): BonusConfig[] {
	if (gameMode !== 'crafter') {
		return []; // Bonuses only apply in crafter mode for now
	}

	const applicableBonuses: BonusConfig[] = [];
	// Parse the LHS for structural checks if needed
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
				// XXX: Scrapping for now: see discussion in Discord
				applies = checkCommutative(parsedNode);
				break;
			case 'distributive':
				applies = checkDistributive(parsedNode);
				break;
			case 'benchmark':
				applies = checkBenchmarkOperand(playerInputString);
				break;
			case 'place_value':
				applies = checkPlaceValue(parsedNode);
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
