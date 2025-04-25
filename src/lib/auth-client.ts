import { createAuthClient } from 'better-auth/svelte';
import { env } from '$env/dynamic/public';

export const client = createAuthClient({
	baseURL: env.PUBLIC_AUTH_URL || window.location.origin
});

export const { signIn, signUp, useSession } = client;
