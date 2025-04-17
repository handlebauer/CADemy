<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';

	let showLoginForm = true;
	let showSignupForm = false;
	let backgroundImage: string;

	// Form data
	let email = '';
	let password = '';
	let confirmPassword = '';
	let username = '';
	let name = '';

	// Form validation and errors
	let loginError = '';
	let signupError = '';
	let isSubmitting = false;

	// Randomly select background on load
	onMount(() => {
		const bgNum = Math.random() > 0.5 ? 1 : 2;
		backgroundImage = `/bg${bgNum}.png`;
	});

	function showLogin() {
		showSignupForm = false;
		showLoginForm = true;
	}

	function showSignup() {
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
			const formData = new FormData();
			formData.append('email', email);
			formData.append('password', password);

			const response = await fetch('?/login', {
				method: 'POST',
				body: formData // Send FormData instead of JSON
				// Remove Content-Type header, fetch handles it for FormData
			});

			// SvelteKit action responses might not be JSON by default when using FormData
			// Check response status and potentially read text or handle redirects
			if (response.ok && response.redirected) {
				// Successful login often results in a redirect
				window.location.href = response.url; // Follow redirect manually
				return; // Stop processing
			} else if (response.ok) {
				// Maybe success without redirect? Or handle JSON response if configured
				const result = await response.json(); // Attempt to parse JSON if needed
				if (result.success) {
					goto('/'); // Or use goto if preferred
				} else {
					loginError = result.error || 'Login failed. Check response.';
				}
			} else {
				// Handle non-OK responses (e.g., 400, 401, 500)
				const result = await response
					.json()
					.catch(() => ({ error: 'Login failed. Invalid server response.' }));
				loginError = result.error || `Login failed (${response.status} ${response.statusText})`;
			}
		} catch (error) {
			loginError = 'An error occurred. Please try again.';
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
			const formData = new FormData();
			formData.append('email', email);
			formData.append('password', password);
			formData.append('username', username);
			formData.append('name', name || username);

			const response = await fetch('?/signup', {
				method: 'POST',
				body: formData // Send FormData instead of JSON
				// Remove Content-Type header
			});

			// Similar response handling as login
			if (response.ok && response.redirected) {
				window.location.href = response.url; // Follow redirect manually
				return;
			} else if (response.ok) {
				const result = await response.json(); // Attempt to parse JSON if needed
				if (result.success) {
					goto('/'); // Redirect on success
				} else {
					signupError = result.error || 'Signup failed. Check response.';
				}
			} else {
				const result = await response
					.json()
					.catch(() => ({ error: 'Signup failed. Invalid server response.' }));
				signupError = result.error || `Signup failed (${response.status} ${response.statusText})`;
			}
		} catch (error) {
			signupError = 'An error occurred. Please try again.';
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
			<div class="auth-form" transition:fly={{ y: 20, duration: 300 }}>
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
						{isSubmitting ? 'Logging in...' : 'Log in'}
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
			<div class="auth-form" transition:fly={{ y: 20, duration: 300 }}>
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
						<label for="signup-name">Full Name (optional)</label>
						<input type="text" id="signup-name" bind:value={name} autocomplete="name" />
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
		border-radius: 8px;
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
		background: white;
		border-radius: 12px;
		padding: 2rem;
		width: 100%;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
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
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		background-color: white;
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
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		margin-top: 1rem;
		transition: background-color 0.2s;
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
