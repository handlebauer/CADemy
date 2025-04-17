// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				name?: string;
				email?: string;
				image?: string;
				emailVerified?: Date;
			} | null;
			session: Record<string, unknown> | null;
		}
	}
}

export {};
