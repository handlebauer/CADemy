import type { DisplaySegment } from '../types';

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
	// Order matters: capture fractions first.
	const regex = /(\d+\/\d+)|(\d+\.?\d*|\.\d+)|([+\-*×/÷=()])|(_)/g;
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
			segments.push({ type: 'operator', value: '/' });
			segments.push({ type: 'number', value: den });
		} else if (match[2]) {
			// Number (integer or decimal)
			segments.push({ type: 'number', value: match[2] });
		} else if (match[3]) {
			// Operator or Parenthesis
			const char = match[3];
			if ('+-*/=×÷'.includes(char)) {
				segments.push({ type: 'operator', value: char });
			} else if (char === '(') {
				segments.push({ type: 'paren_open', value: char });
			} else if (char === ')') {
				segments.push({ type: 'paren_close', value: char });
			}
		} else if (match[4]) {
			// Placeholder (_)
			segments.push({ type: 'placeholder', value: '_' });
		}
		lastIndex = regex.lastIndex;
	}

	// Capture any remaining text after the last match
	if (lastIndex < equation.length) {
		segments.push({ type: 'text', value: equation.substring(lastIndex).trim() });
	}

	// Filter out empty text segments that might result from trimming spaces
	const filteredSegments = segments.filter(
		(segment) => !(segment.type === 'text' && segment.value === '')
	);

	// Handle empty input or placeholder-only input
	if (filteredSegments.length === 0 && equation.trim() === '_') {
		return [{ type: 'placeholder', value: '_' }];
	} else if (filteredSegments.length === 0 && equation.trim() === '') {
		return [];
	} else if (filteredSegments.length === 0) {
		// Fallback for unparsed content if needed, though the regex should cover most cases
		return [{ type: 'text', value: equation }];
	}

	return filteredSegments;
}
