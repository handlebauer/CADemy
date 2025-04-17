// import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
// Remove the old api import if not needed elsewhere, or adjust if needed
// import { api } from '$lib/server/auth';
// import { redirect } from '@sveltejs/kit';

// Import the initialized Better Auth instance and the SvelteKit handler
import { auth } from '$lib/auth'; // Updated path
import { svelteKitHandler } from 'better-auth/svelte-kit';

// Remove the entire custom authProtection handle
/*
const authProtection: Handle = async ({ event, resolve }) => {
  // ... old code ...
};
*/

// Replace the sequence call with the direct use of svelteKitHandler
export const handle: Handle = async ({ event, resolve }) => {
	// Let Better Auth handle authentication and session management
	const response = await svelteKitHandler({ event, resolve, auth });

	// === Add custom logic AFTER Better Auth if needed ===
	// For example, check if a user exists on event.locals (set by Better Auth)
	// and apply your custom route protection/redirects here.

	// Example: Re-implementing your route protection logic
	// Ensure Better Auth populates event.locals.user appropriately first.
	// Check Better Auth docs for how it exposes the user/session state in event.locals.
	/*
	const user = event.locals.user; // Assuming Better Auth sets this
	const path = event.url.pathname;

	const protectedRoutes: string[] = [
		'/dashboard',
		'/profile',
	];

	if (protectedRoutes.some(route => path.startsWith(route)) && !user) {
		throw redirect(303, '/auth');
	}

	if (path.startsWith('/auth') && user && event.request.method === 'GET') {
		throw redirect(303, '/');
	}
	*/
	// ======================================================

	return response;
};

// Remove the old sequence export
// export const handle = sequence(authHandle, authProtection);
