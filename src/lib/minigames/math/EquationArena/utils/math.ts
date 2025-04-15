import {
	evaluate,
	parse,
	format, // Import format for fraction display
	fraction, // Import fraction function
	type MathNode
} from 'mathjs';
import type { DisplaySegment } from '../types'; // <-- Add DisplaySegment import

// Define the structure for the evaluation result
export interface EvaluationResult {
	value: number | null;
	error: string | null;
	steps: string[]; // Will store the sequence of expression forms
}

// Helper to format node to string, using user-friendly operators
function formatNodeString(nodeOrExpr: MathNode | string): string {
	const exprString =
		typeof nodeOrExpr === 'string' ? nodeOrExpr : nodeOrExpr.toString({ parenthesis: 'keep' });
	return exprString.replace(/\*/g, '×');
}

/**
 * Safely evaluates a mathematical expression string and generates evaluation sequence string array.
 * Behavior varies by level.
 * @param expression The mathematical expression string to evaluate.
 * @param level The current crafter level number.
 * @returns An object containing the numerical result, sequence steps, or an error message.
 */
export function evaluateEquation(expression: string, level: number): EvaluationResult {
	const evaluationSequence: string[] = [];
	try {
		// 1. Format initial expression (user-friendly operators)
		const initialFormattedExpr = formatNodeString(expression);
		evaluationSequence.push(initialFormattedExpr);

		// 2. Sanitize for mathjs evaluation
		const sanitizedExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');

		// 3. Evaluate final value first for correctness check
		const finalValue = evaluate(sanitizedExpression);
		if (typeof finalValue !== 'number' || !Number.isFinite(finalValue)) {
			return { value: null, error: 'Invalid expression result.', steps: [] };
		}

		let finalValueStr = '';
		if (level === 2) {
			// Try formatting as a fraction for level 2
			try {
				const frac = fraction(finalValue); // Convert final value to fraction object
				finalValueStr = format(frac, { fraction: 'ratio' }); // Format as 'n/d'
			} catch {
				// Fallback to default string if not representable as simple fraction
				finalValueStr = format(finalValue, { precision: 14 }); // Use mathjs format for precision
			}
		} else {
			// Default formatting for other levels
			finalValueStr = format(finalValue, { precision: 14 });
		}

		// 4. Level-specific step generation
		if (level === 1) {
			// Find first parenthesis content using regex (simple approach)
			const parenMatch = sanitizedExpression.match(/\(([^()]+)\)/);
			if (parenMatch && parenMatch[1]) {
				const parenContent = parenMatch[1];
				const parenFull = parenMatch[0];
				try {
					const parenValue = evaluate(parenContent);
					if (typeof parenValue === 'number') {
						const substitutedExpr = sanitizedExpression.replace(parenFull, parenValue.toString());
						evaluationSequence.push(formatNodeString(substitutedExpr));
					}
				} catch (parenError) {
					console.warn(
						'Could not evaluate parenthesis content for step:',
						parenContent,
						parenError
					);
				}
			}
		}
		// No specific intermediate step generation for level 2 yet (just initial expr -> final value)

		// 5. Add final value string to the sequence if it's different from the last step
		if (evaluationSequence[evaluationSequence.length - 1] !== finalValueStr) {
			evaluationSequence.push(finalValueStr);
		}

		// 6. Return sequence (filter duplicates)
		const uniqueSequence = evaluationSequence.filter(
			(item, index) => evaluationSequence.indexOf(item) === index
		);
		return { value: finalValue, error: null, steps: uniqueSequence };
	} catch (e: unknown) {
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
			} else if (e.message.includes('Unsupported node type')) {
				errorMessage = 'Equation structure not supported for step display.';
			}
		}
		return { value: null, error: errorMessage, steps: [] };
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

/**
 * Parses an equation string into segments for safe display, handling fractions and parentheses.
 * Handles both in-progress equations (e.g., "1/2+_") and final equations (e.g., "1/2+1/2=1").
 * @param equation The equation string.
 * @param level The current game level (used to determine if fractions are possible).
 * @returns An array of DisplaySegment objects.
 */
export function parseEquationForDisplay(equation: string, level: number): DisplaySegment[] {
	const segments: DisplaySegment[] = [];
	// Regex to find fractions (d/d), numbers (including decimals), operators (+, -, *, ×, /, ÷), parentheses, equals, placeholder (_)
	// Ensure / is included in the operator group
	const regex = /(\d+\/\d+)|(\d+\.?\d*|\.\d+)|([+\-*×/÷=()])|(_)/g; // Explicitly include / in the operator group
	let match;
	let lastIndex = 0;

	// Always parse using the regex, level only affects interpretation potentially later
	while ((match = regex.exec(equation)) !== null) {
		// Capture any unexpected text between matches (e.g., spaces, unknown chars)
		if (match.index > lastIndex) {
			segments.push({ type: 'text', value: equation.substring(lastIndex, match.index).trim() });
		}

		if (match[1] && level === 2) {
			// Complete fraction (e.g., "1/2") - Only treat as fraction for level 2
			const [num, den] = match[1].split('/');
			segments.push({ type: 'fraction', numerator: num, denominator: den });
		} else if (match[1] && level !== 2) {
			// Treat "d/d" as number-operator-number if not level 2
			const [num, den] = match[1].split('/');
			segments.push({ type: 'number', value: num });
			segments.push({ type: 'operator', value: '/' }); // Use / as the operator
			segments.push({ type: 'number', value: den });
		} else if (match[2]) {
			// Number (integer or decimal)
			segments.push({ type: 'number', value: match[2] });
		} else if (match[3]) {
			// Operator or Parenthesis
			const char = match[3];
			if ('+-*/=×÷/'.includes(char)) {
				segments.push({ type: 'operator', value: char });
			} else if (char === '(') {
				segments.push({ type: 'paren_open', value: char });
			} else if (char === ')') {
				segments.push({ type: 'paren_close', value: char });
			}
		} else if (match[4]) {
			// Placeholder
			segments.push({ type: 'placeholder', value: match[4] });
		}

		lastIndex = match.index + match[0].length;
	}

	// Capture any remaining text after the last match
	if (lastIndex < equation.length) {
		segments.push({ type: 'text', value: equation.substring(lastIndex).trim() });
	}

	return segments;
}
