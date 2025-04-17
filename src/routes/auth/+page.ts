import type { PageLoad } from './$types';

// Client-side load function - not doing anything special here
export const load: PageLoad = async () => {
	return {};
};

// Enable form use
export const ssr = true;
export const csr = true;
