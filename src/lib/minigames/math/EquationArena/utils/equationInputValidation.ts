const OPERATORS = ['+', '-', '×', '/'];

export function isOperatorAllowed(
	op: string,
	currentEquation: string,
	allowedChars: string[] | null
): boolean {
	if (allowedChars && !allowedChars.includes(op)) return false; // Char not allowed by level

	const lastChar = currentEquation.slice(-1);
	const isLastCharOperator = OPERATORS.includes(lastChar);
	const isLastCharOpenParen = lastChar === '(';
	const isLastCharDecimal = lastChar === '.';

	// Allow leading negative sign
	if (currentEquation === '' && op === '-') return true;
	if (currentEquation === '') return false; // No other leading operators

	// Cannot follow another operator, an opening parenthesis, or a decimal point
	if (isLastCharOperator || isLastCharOpenParen || isLastCharDecimal) return false;

	return true;
}

export function isOpenParenAllowed(
	currentEquation: string,
	allowedChars: string[] | null
): boolean {
	if (allowedChars && !allowedChars.includes('(')) return false;

	const lastChar = currentEquation.slice(-1);
	const isLastCharDigit = /\d/.test(lastChar);
	const isLastCharCloseParen = lastChar === ')';
	const isLastCharOpenParen = lastChar === '(';
	const isLastCharDecimal = lastChar === '.';

	// Cannot follow a digit, a closing parenthesis, an opening parenthesis, or a decimal point
	if (isLastCharDigit || isLastCharCloseParen || isLastCharOpenParen || isLastCharDecimal)
		return false;

	return true;
}

export function isCloseParenAllowed(
	currentEquation: string,
	allowedChars: string[] | null
): boolean {
	if (allowedChars && !allowedChars.includes(')')) return false;

	const openParenCount = (currentEquation.match(/\(/g) || []).length;
	const closeParenCount = (currentEquation.match(/\)/g) || []).length;
	const lastChar = currentEquation.slice(-1);
	const isLastCharOperator = OPERATORS.includes(lastChar);
	const isLastCharOpenParen = lastChar === '(';
	const isLastCharDecimal = lastChar === '.';

	// Must have a matching open parenthesis available
	if (openParenCount <= closeParenCount) return false;
	if (currentEquation === '') return false;

	// Cannot follow an operator, an opening parenthesis, or a decimal point
	if (isLastCharOperator || isLastCharOpenParen || isLastCharDecimal) return false;

	return true;
}

export function isDecimalAllowed(currentEquation: string, allowedChars: string[] | null): boolean {
	if (allowedChars && !allowedChars.includes('.')) return false;
	if (currentEquation === '') return false; // No leading decimal

	const lastChar = currentEquation.slice(-1);
	const isLastCharDecimal = lastChar === '.';
	const isLastCharOperator = OPERATORS.includes(lastChar);
	const isLastCharOpenParen = lastChar === '(';
	const isLastCharCloseParen = lastChar === ')';

	// Cannot follow another decimal, an operator, an opening or closing parenthesis
	if (isLastCharDecimal || isLastCharOperator || isLastCharOpenParen || isLastCharCloseParen)
		return false;

	// Check if current number segment already has a decimal
	const lastOperatorOrParenIndex = Math.max(
		...OPERATORS.map((op) => currentEquation.lastIndexOf(op)),
		currentEquation.lastIndexOf('(')
	);
	const currentSegment = currentEquation.substring(lastOperatorOrParenIndex + 1);
	if (currentSegment.includes('.')) return false;

	return true;
}
