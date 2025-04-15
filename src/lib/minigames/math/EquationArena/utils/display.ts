import type { DisplaySegment } from '../types';

/**
 * Parses an equation string into segments for safe display, handling fractions for Level 2.
 * Handles both in-progress equations (e.g., "1/2+_") and final equations (e.g., "1/2+1/2=1").
 * @param equation The equation string.
 * @param level The current game level.
 * @returns An array of DisplaySegment objects.
 */
export function parseEquationForDisplay(equation: string, level: number): DisplaySegment[] {
	const segments: DisplaySegment[] = [];

	if (level === 2) {
		// Regex to find fractions (d/d), incomplete fractions (d/), operators (+, -, =)
		// Updated to handle the final answer part (which might be a number or fraction)
		const regex = /(\d+\/\d+)|(\d+\/)|([+\-=])|(\d+|\.)|(_)/g; // Added '=' to operators, removed lookahead for now
		let match;
		let lastIndex = 0;

		while ((match = regex.exec(equation)) !== null) {
			// Capture any text between the last match and the current match (unlikely with this regex but safe)
			if (match.index > lastIndex) {
				segments.push({ type: 'text', value: equation.substring(lastIndex, match.index) });
			}

			if (match[1]) {
				// Complete fraction (e.g., "1/2")
				const [num, den] = match[1].split('/');
				segments.push({ type: 'fraction', numerator: num, denominator: den });
			} else if (match[2]) {
				// Incomplete fraction (e.g., "1/")
				const num = match[2].split('/')[0];
				segments.push({ type: 'text', value: num + '/' });
			} else if (match[3]) {
				// Operator (+, -, =)
				segments.push({ type: 'operator', value: match[3] });
			} else if (match[4]) {
				// Number or decimal point (could be part of the answer)
				segments.push({ type: 'number', value: match[4] });
			} else if (match[5]) {
				// Placeholder (_)
				segments.push({ type: 'placeholder', value: '_' });
			}
			lastIndex = regex.lastIndex;
		}

		// Capture any remaining text after the last match (e.g., if equation ends unexpectedly)
		if (lastIndex < equation.length) {
			segments.push({ type: 'text', value: equation.substring(lastIndex) });
		}

		// Handle cases where the regex might not match anything (e.g., empty string or just '_')
		if (segments.length === 0 && equation === '_') {
			segments.push({ type: 'placeholder', value: '_' });
		} else if (segments.length === 0 && equation !== '') {
			// Fallback for completely unparsed content
			segments.push({ type: 'text', value: equation });
		}
	} else {
		// For non-Level 2, just use the raw equation to avoid extra spaces
		// We might need to revisit this if other levels show the result equation too
		const spacedEquation = equation.replace(/([+\-x=()])/g, ' $1 ').trim(); // Add spacing back for other levels
		segments.push({
			type: 'text',
			value: spacedEquation || '_'
		});
	}

	return segments;
}
