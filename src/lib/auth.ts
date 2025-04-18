import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { signOut } from 'better-auth/api';

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
	// Use the 'database' key as shown in the PostgreSQL docs example
	database: drizzleAdapter(db, {
		schema: {
			...schema,
			user: schema.users,
			account: schema.accounts,
			session: schema.sessions,
			verificationToken: schema.verification
		},
		provider: 'pg'
	}),
	secret: env.BETTER_AUTH_SECRET,
	trustHost: true, // Review for production
	appUrl: env.BETTER_AUTH_URL || 'http://localhost:5173', // Required for proper URL generation

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

			// 1. Find user by email
			const user = await db.query.users.findFirst({
				where: (users, { eq }) => eq(users.email, email)
			});

			if (!user) {
				console.log('User not found:', email);
				throw new Error('Incorrect email or password');
			}

			// 2. Find the associated account for this user
			const account = await db.query.accounts.findFirst({
				where: (accounts, { eq }) => eq(accounts.userId, user.id)
			});

			if (!account || !account.password) {
				// Should not happen if created correctly, but handle defensively
				console.error('Credential account or password hash not found for user:', email);
				throw new Error('Authentication configuration error');
			}

			// 3. Verify password using argon2 against accounts.password
			const isValidPassword = await argon2.verify(account.password, password);

			if (isValidPassword) {
				console.log('Password verified for user:', email);
				// Return the user object (still based on the users table data)
				return {
					id: user.id,
					name: user.name, // name is notNull in schema now
					username: user.username, // Include custom field if needed
					email: user.email,
					image: user.image,
					emailVerified: user.emailVerified,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt
				} as Omit<DbUser, 'hashedPassword'>; // DbUser refers to the schema type
			} else {
				console.log('Incorrect password for user:', email);
				// Throw specific error or return null based on better-auth expectations
				throw new Error('Incorrect email or password');
			}
		}
		// Optional: autoSignIn defaults to true, set false if needed
		// autoSignIn: false
	},

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

// Re-export the API functions for use in routes
export { signOut };

// --- ADD Helper Functions for Sign In/Sign Up ---
import type { RequestEvent } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';

// Helper function for user sign-up via Better Auth
export async function signUpEmailHelper(
	event: RequestEvent,
	userData: { email: string; password: string; name?: string; username?: string; image?: string }
): Promise<{ success: boolean; error?: string }> {
	try {
		// Use Better Auth's signUp.email API
		const response = await auth.api.signUpEmail({
			body: {
				email: userData.email,
				password: userData.password,
				name: userData.name || userData.username || userData.email.split('@')[0]
				// image is not supported in the API type definition
			},
			headers: event.request.headers,
			asResponse: true
		});

		if (!response.ok) {
			// Attempt to parse error from better-auth response body if possible
			let errorMessage = 'Failed to create account';
			try {
				const errorBody = await response.json();
				if (errorBody.message) {
					errorMessage = errorBody.message;
				}
			} catch {
				// Ignore if body isn't JSON or doesn't have message
			}
			console.error('Better Auth Sign Up Error:', response.status, errorMessage);
			return { success: false, error: errorMessage };
		}

		// Handle cookies just as in signIn
		const setCookieHeader = response.headers.get('set-cookie');
		if (setCookieHeader) {
			const cookieStrings = setCookieHeader.split(', ').filter((c) => c.trim() !== '');
			for (const cookieString of cookieStrings) {
				const parts = cookieString.split(';')[0].split('=');
				if (parts.length === 2) {
					const name = parts[0];
					const value = parts[1];
					event.cookies.set(name, value, {
						path: '/',
						httpOnly: true,
						secure: true,
						sameSite: 'lax'
					});
				}
			}
		} else {
			console.warn('No set-cookie header received from better-auth signUpEmail');
		}

		return { success: true };
	} catch (error) {
		console.error('Error calling auth.api.signUpEmail:', error);
		let message = 'An unexpected error occurred during signup.';
		if (error instanceof APIError) {
			message = error.message;
		} else if (error instanceof Error) {
			message = error.message;
		}
		return { success: false, error: message };
	}
}

export async function signInEmailHelper(
	event: RequestEvent,
	credentials: { email: string; password: string }
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await auth.api.signInEmail({
			body: credentials,
			headers: event.request.headers, // Pass headers for context (IP, etc.) and cookie setting
			asResponse: true // Get the full Response object to handle cookies
		});

		if (!response.ok) {
			// Attempt to parse error from better-auth response body if possible
			let errorMessage = 'Invalid email or password';
			try {
				const errorBody = await response.json();
				if (errorBody.message) {
					errorMessage = errorBody.message;
				}
			} catch {
				// Ignore if body isn't JSON or doesn't have message
			}
			console.error('Better Auth Sign In Error:', response.status, errorMessage);
			return { success: false, error: errorMessage };
		}

		// Manually set cookies from the response headers on the event locals/cookies
		const setCookieHeader = response.headers.get('set-cookie');
		if (setCookieHeader) {
			// SvelteKit's event.cookies.set can handle multiple cookies from the header
			// Note: Parsing and setting cookies manually might be complex.
			// If better-auth has a SvelteKit plugin/adapter, using that is preferred.
			// This is a basic attempt assuming direct header manipulation.
			// You might need a library or more robust parsing if this fails.
			const cookieStrings = setCookieHeader.split(', ').filter((c) => c.trim() !== '');
			for (const cookieString of cookieStrings) {
				const parts = cookieString.split(';')[0].split('=');
				if (parts.length === 2) {
					const name = parts[0];
					const value = parts[1];
					// Extract options like Path, HttpOnly, Secure, Max-Age, SameSite
					// For simplicity, setting basic options here. Adjust as needed.
					event.cookies.set(name, value, {
						path: '/',
						httpOnly: true,
						secure: true,
						sameSite: 'lax'
					});
				}
			}
		} else {
			console.warn('No set-cookie header received from better-auth signInEmail');
		}

		return { success: true };
	} catch (error) {
		console.error('Error calling auth.api.signInEmail:', error);
		let message = 'An unexpected error occurred during login.';
		if (error instanceof APIError) {
			message = error.message; // Use message from better-auth's APIError
		} else if (error instanceof Error) {
			message = error.message;
		}
		return { success: false, error: message };
	}
}
// --- END New Helper Function ---

// Utility function to hash passwords using argon2
// export async function hashPassword(password: string): Promise<string> {
// 	return await argon2.hash(password, {
// 		type: argon2.argon2id, // Most secure variant recommended for general use
// 		memoryCost: 19456, // Default is 65536 (64 MiB), lower for server performance
// 		timeCost: 2, // Number of iterations
// 		parallelism: 1 // Degree of parallelism
// 	});
// }

// COMMENT OUT createUser helper - better-auth should handle user/account creation
// export async function createUser(
// 	email: string,
// 	password: string,
// 	username?: string,
// 	name?: string
// ) {
// 	const hashedPassword = await hashPassword(password);

// 	// Check if user already exists
// 	const existingUser = await db.query.users.findFirst({
// 		where: (users, { eq }) => eq(users.email, email)
// 	});

// 	if (existingUser) {
// 		throw new Error('User with this email already exists');
// 	}

// 	// Insert the new user
// 	const [newUser] = await db
// 		.insert(schema.users)
// 		.values({
// 			email,
// 			// hashedPassword, // No longer storing here
// 			username,
// 			name: name || username || email.split('@')[0], // Ensure name is non-null
// 			createdAt: new Date(),
// 			updatedAt: new Date(),
// 			emailVerified: false
// 		})
// 		.returning();

// 	return newUser;
// }
