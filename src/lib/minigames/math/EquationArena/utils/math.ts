import { evaluate, parse, type MathNode } from 'mathjs';

// Define the structure for the evaluation result
export interface EvaluationResult {
	value: number | null;
	error: string | null;
}

/**
 * Safely evaluates a mathematical expression string.
 * @param expression The mathematical expression string to evaluate.
 * @returns An object containing the numerical result or an error message.
 */
export function evaluateEquation(expression: string): EvaluationResult {
	try {
		// Replace user-friendly operators with standard ones
		const sanitizedExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');

		// Evaluate the expression
		const result = evaluate(sanitizedExpression);

		// Check if the result is a valid number
		if (typeof result === 'number' && Number.isFinite(result)) {
			return { value: result, error: null };
		} else {
			// Handle cases where evaluation results in non-numeric types
			console.warn('Non-numeric evaluation result:', result);
			return { value: null, error: 'Invalid expression result.' };
		}
	} catch (e: unknown) {
		// Catch errors during parsing or evaluation
		console.error('Error evaluating equation:', expression, e);
		let errorMessage = 'Invalid expression.';
		if (e instanceof Error) {
			if (e.message.includes('Undefined symbol')) {
				errorMessage = 'Invalid character or symbol.';
			} else if (e.message.includes('Parenthesis mismatch')) {
				errorMessage = 'Check your parentheses.';
			} else if (e.message.includes('Unexpected end of expression')) {
				errorMessage = 'Incomplete equation.';
			} else if (e.message.includes('Value expected')) {
				errorMessage = 'Missing number or value.';
			}
		}
		return { value: null, error: errorMessage };
	}
}

/**
 * Parses an expression string into a MathNode tree.
 * Useful for analyzing the structure for bonus checks.
 * @param expression The mathematical expression string.
 * @returns The root MathNode or null if parsing fails.
 */
export function parseEquation(expression: string): MathNode | null {
	try {
		const sanitizedExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');
		return parse(sanitizedExpression);
	} catch (e) {
		console.error('Error parsing equation:', expression, e);
		return null;
	}
}
