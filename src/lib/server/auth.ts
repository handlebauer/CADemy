import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
// CredentialsProvider is not used directly in config based on docs basic usage example
// import CredentialsProvider from 'better-auth/providers/credentials';

import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { User as DbUser } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import * as argon2 from 'argon2';

if (!env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is not set');
// BETTER_AUTH_URL might not be strictly required by the core if trustHost=true, but good practice
if (!env.BETTER_AUTH_URL)
	console.warn('BETTER_AUTH_URL is not set in .env, consider setting it for production');

// Main configuration based on docs structure
export const auth = betterAuth({
	// Database adapter is likely still needed for user/session storage with database strategy
	adapter: drizzleAdapter(db, { schema, provider: 'pg' }),
	secret: env.BETTER_AUTH_SECRET,
	trustHost: true, // Review for production
	// appUrl: env.BETTER_AUTH_URL, // Consider using instead of trustHost

	// Configure email/password directly as per basic usage docs
	emailAndPassword: {
		enabled: true,
		// Add basic type to credentials parameter
		async verifyUser(credentials: { email?: unknown; password?: unknown }) {
			// Refined check for specific types
			if (
				!credentials ||
				typeof credentials.email !== 'string' ||
				typeof credentials.password !== 'string'
			) {
				console.error('Invalid credentials format received in verifyUser');
				throw new Error('Invalid credentials format');
			}

			const email = credentials.email;
			const password = credentials.password;

			console.log('Verifying user:', email); // Dev logging

			const user = await db.query.users.findFirst({
				where: (users, { eq }) => eq(users.email, email)
			});

			if (!user) {
				console.log('User not found:', email);
				// Throw specific error or return null based on better-auth expectations
				throw new Error('Incorrect email or password');
			}

			if (!user.hashedPassword) {
				console.error('User found but has no hashed password:', email);
				// This indicates a data integrity issue
				throw new Error('Authentication configuration error');
			}

			// Verify password using argon2
			const isValidPassword = await argon2.verify(user.hashedPassword, password);

			if (isValidPassword) {
				console.log('Password verified for user:', email);
				// Return the user object expected by better-auth
				// Ensure it includes required fields (id, email at minimum)
				return {
					id: user.id,
					name: user.name ?? user.username, // Include name/username if available
					email: user.email,
					image: user.image,
					emailVerified: user.emailVerified // Pass emailVerified status if used
				} as Omit<DbUser, 'hashedPassword'>; // Return DbUser minus the hash
			} else {
				console.log('Incorrect password for user:', email);
				// Throw specific error or return null based on better-auth expectations
				throw new Error('Incorrect email or password');
			}
		}
		// Optional: autoSignIn defaults to true, set false if needed
		// autoSignIn: false
	},

	// Social providers would go here if needed
	// socialProviders: { ... },

	session: {
		strategy: 'database', // Use the database via the adapter
		maxAge: 30 * 24 * 60 * 60,
		updateAge: 24 * 60 * 60
	},

	// Callbacks might still be useful, structure seems similar
	callbacks: {
		async session({
			session,
			user
		}: {
			session: Record<string, unknown>;
			user: Omit<DbUser, 'hashedPassword'> | Record<string, unknown>;
		}) {
			if (session.user && user) {
				// Type assertion needed since we know the structure but TypeScript doesn't
				if ('id' in user && typeof session.user === 'object' && session.user !== null) {
					(session.user as Record<string, unknown>).id = user.id;
				}
			}
			return session;
		}
	}
});

// SvelteKit integration likely uses a Request Handler, often named 'handle' or 'handler'.
// The main 'auth' export object might contain this handler.
// We need to confirm the exact export name from better-auth docs/types for SvelteKit.
// Assuming it might be nested or named differently, let's try accessing '.handler' as suggested before
// or potentially directly if 'auth' itself is the handler.
// For now, let's assume the main export *is* the handler function required by SvelteKit hooks
// export const handle = auth; // If auth object itself is the handler
// OR if it's nested:
// export const handle = auth.handler; // If handler is a property

// --- ACTION REQUIRED: Verify the correct way to export the SvelteKit handler ---
// Placeholder - Assuming the main export needs to be called or accessed for the handler:
// This part is uncertain without explicit SvelteKit integration docs for better-auth.
// The most likely scenario is that `betterAuth` returns an object, and that object
// *contains* the handler function, possibly along with the `.api` object.
// Let's assume it returns `{ handler: SvelteKitHandle, api: ... }` for now.

// export const handle = auth.handler; // Tentative based on previous linter hint
// export const api = auth.api; // Assuming api is available for server-side calls

// Re-evaluating: The `betterAuth` function itself might return the SvelteKit handle directly
// when configured within a SvelteKit environment, or it returns an object containing it.
// Given the persistent errors, let's simplify and assume `auth` itself is NOT the handler.
// We will export `auth` and the hook will need to import it and potentially call a method on it.
// Let's remove the problematic handle/signIn/signOut exports for now.

// export const handle = ??? Need to confirm
// export const signIn = ??? Need to confirm (likely via auth.api.signInEmail)
// export const signOut = ??? Need to confirm (likely via auth.api.signOut)

// The auth object itself is needed for accessing the API methods server-side
// export { auth }; // Keep the main auth object exported

// Helper function likely needs modification to use the API
// export async function getCurrentUser(event: import('@sveltejs/kit').RequestEvent) {
// 	 // Need to use the method shown in docs: auth.api.getSession
// 	 const session = await auth.api.getSession({ /* Need request context, e.g., headers */ });
// 	 return session?.user ?? null;
// }

// --- FINAL ATTEMPT STRUCTURE ---
// Export the configured auth object. The consumer (hooks.server.ts, server routes)
// will need to use this object to get the handler and API methods.

// NOTE: Further adjustments will be needed in hooks.server.ts and any server routes
// using sign-in/sign-out based on how `handle`, `signInEmail`, `signOut` are accessed.

// Export the handle function for SvelteKit hooks
export const { handler: handle } = auth;

// Export common auth API functions from the api object
export const api = auth.api;

// Utility function to hash passwords using argon2
export async function hashPassword(password: string): Promise<string> {
	return await argon2.hash(password, {
		type: argon2.argon2id, // Most secure variant recommended for general use
		memoryCost: 19456, // Default is 65536 (64 MiB), lower for server performance
		timeCost: 2, // Number of iterations
		parallelism: 1 // Degree of parallelism
	});
}

// Helper function to create new user with hashed password
export async function createUser(
	email: string,
	password: string,
	username?: string,
	name?: string
) {
	const hashedPassword = await hashPassword(password);

	// Check if user already exists
	const existingUser = await db.query.users.findFirst({
		where: (users, { eq }) => eq(users.email, email)
	});

	if (existingUser) {
		throw new Error('User with this email already exists');
	}

	// Insert the new user
	const [newUser] = await db
		.insert(schema.users)
		.values({
			email,
			hashedPassword,
			username,
			name: name || username
		})
		.returning();

	return newUser;
}
