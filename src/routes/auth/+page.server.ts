import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { api, createUser } from '$lib/auth';

export const actions: Actions = {
	// Login action
	login: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, {
				success: false,
				error: 'Email and password are required'
			});
		}

		try {
			// Use better-auth's API to sign in with password
			const result = await api.signIn.email({
				email,
				password
			});

			if (!result.ok) {
				// Handle authentication failure
				return fail(401, {
					success: false,
					error: 'Invalid email or password'
				});
			}

			return { success: true };
		} catch (err) {
			console.error('Login error:', err);
			return fail(500, {
				success: false,
				error: 'An error occurred during login'
			});
		}
	},

	// Signup action
	signup: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const username = formData.get('username') as string;
		const name = formData.get('name') as string | undefined; // Name is optional

		if (!email || !password || !username) {
			return fail(400, {
				success: false,
				error: 'Email, username, and password are required'
			});
		}

		try {
			// Create the user with our helper function
			await createUser(email, password, username, name);

			// Automatically sign in the user after registration
			const result = await api.signIn.email({
				email,
				password
			});

			if (!result.ok) {
				return fail(500, {
					success: false,
					error: 'Account created, but failed to log in. Please login manually.'
				});
			}

			return { success: true };
		} catch (err: unknown) {
			console.error('Signup error:', err);

			// Check for known error types and provide friendly messages
			const error = err as Error;
			if (error.message && error.message.includes('User with this email already exists')) {
				return fail(400, {
					success: false,
					error: 'This email is already registered'
				});
			}

			return fail(500, {
				success: false,
				error: 'Failed to create account'
			});
		}
	}
};

// Redirect authenticated users away from the auth page
export async function load({ locals }) {
	// If user is already authenticated, redirect to home page
	if (locals.user) {
		throw redirect(303, '/');
	}

	return {};
}
