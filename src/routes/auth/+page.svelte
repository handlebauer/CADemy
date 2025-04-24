<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { signIn, signUp, client } from '$lib/auth-client';

	let showLoginForm = true;
	let showSignupForm = false;
	let backgroundImage: string;

	// Form data
	let email = '';
	let password = '';
	let confirmPassword = '';
	let username = '';

	// Form validation and errors
	let loginError = '';
	let signupError = '';
	let isSubmitting = false;

	// Use the session store from the client
	const session = client.useSession();

	// Redirect if logged in and randomly select background on mount
	onMount(() => {
		// Check if already logged in using the session store
		if ($session.data) {
			goto('/');
			return;
		}

		// Pick random background
		const bgNum = Math.random() > 0.5 ? 1 : 2;
		backgroundImage = `/bg${bgNum}.png`;
	});

	function showLogin() {
		// Reset form data when switching to login
		email = '';
		password = '';
		confirmPassword = '';
		username = '';
		loginError = '';
		signupError = '';

		showSignupForm = false;
		showLoginForm = true;
	}

	function showSignup() {
		// Reset form data when switching to signup
		email = '';
		password = '';
		confirmPassword = '';
		username = '';
		loginError = '';
		signupError = '';

		showLoginForm = false;
		showSignupForm = true;
	}

	async function handleLogin() {
		loginError = '';
		if (!email || !password) {
			loginError = 'Email and password are required';
			return;
		}

		isSubmitting = true;
		try {
			await signIn.email(
				{
					email,
					password,
					callbackURL: '/'
				},
				{
					onError: (context) => {
						loginError = context.error.message || 'Login failed. Please try again.';
					}
				}
			);
		} catch (error) {
			loginError = error instanceof Error ? error.message : 'An error occurred. Please try again.';
			console.error('Login error:', error);
		} finally {
			isSubmitting = false;
		}
	}

	async function handleSignup() {
		signupError = '';

		// Basic validation
		if (!email || !password || !confirmPassword || !username) {
			signupError = 'All fields are required';
			return;
		}

		if (password !== confirmPassword) {
			signupError = 'Passwords do not match';
			return;
		}

		isSubmitting = true;
		try {
			await signUp.email(
				{
					email,
					password,
					name: username,
					callbackURL: '/'
				},
				{
					onError: (context) => {
						signupError = context.error.message || 'Signup failed. Please try again.';
					}
				}
			);

			// Auto sign-in after successful signup
			await signIn.email(
				{
					email,
					password,
					callbackURL: '/'
				},
				{
					onError: (context) => {
						signupError =
							context.error.message ||
							'Signup succeeded but auto-login failed. Please log in manually.';
					}
				}
			);
		} catch (error) {
			signupError = error instanceof Error ? error.message : 'An error occurred. Please try again.';
			console.error('Signup error:', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="auth-container" style="background-image: url('{backgroundImage}')">
	<div class="content">
		<h1>CADemy</h1>

		<div class="buttons">
			<button class="auth-button" on:click={showLogin} class:active={showLoginForm}>Log in</button>
			<button class="auth-button" on:click={showSignup} class:active={showSignupForm}
				>Sign up</button
			>
		</div>
	</div>

	<div class="form-container">
		{#if showLoginForm}
			<div class="auth-form">
				<h2>Log In</h2>

				{#if loginError}
					<div class="error-message">{loginError}</div>
				{/if}

				<form on:submit|preventDefault={handleLogin}>
					<div class="form-group">
						<label for="login-email">Email</label>
						<input type="email" id="login-email" bind:value={email} required autocomplete="email" />
					</div>

					<div class="form-group">
						<label for="login-password">Password</label>
						<input
							type="password"
							id="login-password"
							bind:value={password}
							required
							autocomplete="current-password"
						/>
					</div>

					<button type="submit" class="submit-button" disabled={isSubmitting}>
						{isSubmitting ? 'Logging in...' : 'Enter'}
					</button>
				</form>

				<div class="form-footer">
					<p>
						Don't have an account? <button class="text-button" on:click={showSignup}>Sign up</button
						>
					</p>
				</div>
			</div>
		{/if}

		{#if showSignupForm}
			<div class="auth-form">
				<h2>Sign Up</h2>

				{#if signupError}
					<div class="error-message">{signupError}</div>
				{/if}

				<form on:submit|preventDefault={handleSignup}>
					<div class="form-group">
						<label for="signup-email">Email</label>
						<input
							type="email"
							id="signup-email"
							bind:value={email}
							required
							autocomplete="email"
						/>
					</div>

					<div class="form-group">
						<label for="signup-username">Username</label>
						<input
							type="text"
							id="signup-username"
							bind:value={username}
							required
							autocomplete="username"
						/>
					</div>

					<div class="form-group">
						<label for="signup-password">Password</label>
						<input
							type="password"
							id="signup-password"
							bind:value={password}
							required
							autocomplete="new-password"
						/>
					</div>

					<div class="form-group">
						<label for="signup-confirm">Confirm Password</label>
						<input
							type="password"
							id="signup-confirm"
							bind:value={confirmPassword}
							required
							autocomplete="new-password"
						/>
					</div>

					<button type="submit" class="submit-button" disabled={isSubmitting}>
						{isSubmitting ? 'Creating account...' : 'Sign up'}
					</button>
				</form>

				<div class="form-footer">
					<p>
						Already have an account? <button class="text-button" on:click={showLogin}>Log in</button
						>
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.auth-container {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		background-size: cover;
		background-position: center;
		position: relative;
	}

	.auth-container::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5); /* Dark overlay for better text visibility */
		z-index: 1;
	}

	.content {
		text-align: center;
		z-index: 2;
		color: white;
		padding-top: 5rem;
		width: 100%;
	}

	h1 {
		font-size: 4rem;
		margin-bottom: 2rem;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
		font-weight: bold;
		letter-spacing: 2px;
	}

	.buttons {
		display: flex;
		gap: 2rem;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.auth-button {
		background-color: rgba(128, 128, 128, 0.8);
		color: white;
		border: none;
		border-radius: 6px;
		padding: 0.75rem 1.5rem;
		font-size: 1.25rem;
		cursor: pointer;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.3),
			0 1px 3px rgba(0, 0, 0, 0.2),
			0 2px 2px rgba(255, 255, 255, 0.1) inset;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.auth-button:hover {
		transform: translateY(-2px);
		box-shadow:
			0 6px 10px rgba(0, 0, 0, 0.4),
			0 1px 3px rgba(0, 0, 0, 0.3),
			0 2px 3px rgba(255, 255, 255, 0.15) inset;
	}

	.auth-button:active,
	.auth-button.active {
		transform: translateY(1px);
		box-shadow:
			0 2px 3px rgba(0, 0, 0, 0.3),
			0 1px 2px rgba(0, 0, 0, 0.2),
			0 1px 2px rgba(255, 255, 255, 0.1) inset;
		background-color: rgba(100, 100, 100, 0.9);
	}

	.form-container {
		z-index: 2;
		width: 90%;
		max-width: 400px;
	}

	.auth-form {
		background: rgba(240, 240, 235, 0.7);
		border-radius: 6px;
		padding: 2rem;
		width: 100%;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
		color: #333;
	}

	h2 {
		margin-top: 0;
		color: #333;
		font-size: 1.5rem;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #555;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ccc;
		border-radius: 2px;
		font-size: 1rem;
		background-color: rgba(255, 255, 255, 0.8);
		box-sizing: border-box;
	}

	input:focus {
		border-color: #4a90e2;
		outline: none;
		box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
	}

	.submit-button {
		width: 100%;
		padding: 0.75rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 2px;
		font-size: 1rem;
		cursor: pointer;
		margin-top: 1rem;
		transition: background-color 0.2s;
		box-sizing: border-box;
	}

	.submit-button:hover:not(:disabled) {
		background-color: #3a80d2;
	}

	.submit-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.error-message {
		background-color: #ffebee;
		color: #d32f2f;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		text-align: center;
	}

	.form-footer {
		margin-top: 1.5rem;
		text-align: center;
		color: #666;
		font-size: 0.9rem;
	}

	.text-button {
		background: none;
		border: none;
		color: #4a90e2;
		cursor: pointer;
		font-size: inherit;
		padding: 0;
		text-decoration: underline;
	}

	.text-button:hover {
		color: #3a80d2;
	}
</style>
