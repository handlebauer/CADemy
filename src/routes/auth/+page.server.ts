import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { signInEmailHelper, createUser } from '$lib/auth';

export const actions: Actions = {
	// Login action
	login: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, {
				success: false,
				email,
				error: 'Email and password are required'
			});
		}

		// Call the new helper function, passing the event object
		const result = await signInEmailHelper(event, {
			email,
			password
		});

		if (!result.success) {
			return fail(401, {
				success: false,
				email,
				error: result.error ?? 'Invalid email or password'
			});
		}

		return { success: true };
	},

	// Signup action
	signup: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const username = formData.get('username') as string;
		const name = formData.get('name') as string | undefined; // Name is optional

		if (!email || !password || !username) {
			return fail(400, {
				success: false,
				email,
				username,
				name,
				error: 'Email, username, and password are required'
			});
		}

		try {
			// Create the user first (this might throw if email exists)
			await createUser(email, password, username, name);

			// Automatically sign in the user after registration using the helper
			const signInResult = await signInEmailHelper(event, {
				email,
				password
			});

			if (!signInResult.success) {
				return fail(500, {
					success: false,
					email,
					username,
					name,
					error:
						signInResult.error ?? 'Account created, but auto-login failed. Please login manually.'
				});
			}

			return { success: true };
		} catch (err: unknown) {
			console.error('Signup - createUser error:', err);

			let errorMessage = 'Failed to create account';
			if (
				err instanceof Error &&
				err.message &&
				err.message.includes('User with this email already exists')
			) {
				errorMessage = 'This email is already registered';
				return fail(400, {
					success: false,
					email,
					username,
					name,
					error: errorMessage
				});
			}

			return fail(500, {
				success: false,
				email,
				username,
				name,
				error: errorMessage
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
