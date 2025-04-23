import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Let Better Auth handle authentication and session management
	const response = await svelteKitHandler({ event, resolve, auth });

	// Optional route protection logic
	const user = event.locals.user;
	const path = event.url.pathname;

	console.log(`--- Hook Start ---`);
	console.log(`Path: ${path}`);
	console.log(`User exists: ${!!user}`);
	// console.log('User details:', user); // Uncomment to see user object if needed

	const protectedRoutes = ['/', '/dashboard', '/profile'];

	// Protect routes if user is not authenticated
	if (
		protectedRoutes.some((route) => path.startsWith(route)) &&
		!path.startsWith('/auth') &&
		!user
	) {
		console.log(
			`Redirecting: Unauthenticated user accessing protected route ${path}. Sending to /auth.`
		);
		throw redirect(303, '/auth');
	}

	// Redirect authenticated users away from auth page
	if (path.startsWith('/auth') && user && event.request.method === 'GET') {
		console.log(`Redirecting: Authenticated user accessing /auth. Sending to /.`);
		throw redirect(303, '/');
	}

	console.log(`--- Hook End (No Redirect) ---`);
	return response;
};
