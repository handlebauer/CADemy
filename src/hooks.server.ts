import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Let Better Auth handle authentication and session management
	const response = await svelteKitHandler({ event, resolve, auth });
	return response;
};
