import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { signInEmailHelper, signUpEmailHelper } from '$lib/auth';

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
			// Use the Better Auth signup API directly
			const signUpResult = await signUpEmailHelper(event, {
				email,
				password,
				username,
				name
			});

			if (!signUpResult.success) {
				return fail(400, {
					success: false,
					email,
					username,
					name,
					error: signUpResult.error ?? 'Failed to create account'
				});
			}

			// User is automatically logged in after sign up
			return { success: true };
		} catch (err: unknown) {
			console.error('Signup error:', err);

			let errorMessage = 'Failed to create account';
			if (err instanceof Error && err.message) {
				errorMessage = err.message;
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
