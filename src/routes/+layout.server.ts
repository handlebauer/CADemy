import type { LayoutServerLoad } from './$types';
import { auth } from '$lib/auth'; // Import your configured auth instance
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	const path = new URL(request.url).pathname;
	const protectedRoutes = ['/'];

	if (!session && protectedRoutes.includes(path)) {
		redirect(302, '/auth');
	}
};
