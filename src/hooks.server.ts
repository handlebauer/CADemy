import { handle as authHandle } from '$lib/server/auth'; // Import the handle export
// Import sequence if you have multiple hooks to combine
// import { sequence } from '@sveltejs/kit/hooks';

// Use the auth handle. If you have other server hooks, sequence them.
// e.g., export const handle = sequence(myOtherHandle, authHandle);
export const handle = authHandle;

// Remove the placeholder MVP implementation
// export const handle: Handle = async ({ event, resolve }) => {
// 	 event.locals.user = null;
// 	 event.locals.session = null;
// 	 return resolve(event);
// };
