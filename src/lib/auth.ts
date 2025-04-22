import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import type { Session, User } from 'better-auth';

if (!env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is not set');
if (!env.BETTER_AUTH_URL) console.warn('BETTER_AUTH_URL not set; using default for development.');

export const auth = betterAuth({
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
	trustHost: true,
	appUrl: env.BETTER_AUTH_URL || 'http://localhost:5173',
	emailAndPassword: {
		enabled: true
		// Better-auth will handle password hashing and verification internally
	},
	session: {
		strategy: 'database',
		maxAge: 30 * 24 * 60 * 60, // 30 days
		updateAge: 24 * 60 * 60 // 24 hours
	},
	callbacks: {
		async session({ session, user }: { session: Session; user: User }) {
			// Return an object that includes the desired session data, including the user ID.
			return {
				...session, // Spread existing session properties
				user: {
					// The original session likely doesn't have a user property to spread,
					// so we just create the user object with the ID.
					id: user.id // Add the user ID
				}
			};
		}
	}
});

// Export the handler for SvelteKit integration
export const { handler: handle } = auth;
