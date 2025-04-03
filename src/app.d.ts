// for information about these interfaces
declare global {
	namespace App {
		// Simplified for MVP - no backend/auth needed
		interface Locals {
			user: null;
			session: null;
		}
	}
}

export {};
