import type { Handle } from '@sveltejs/kit';

// MVP implementation - no backend auth needed yet
export const handle: Handle = async ({ event, resolve }) => {
	// Set empty user and session data for now
	event.locals.user = null;
	event.locals.session = null;

	return resolve(event);
};
