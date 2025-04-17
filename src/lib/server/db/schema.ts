import { timestamp, pgTable, text, primaryKey, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	// Table name often 'user' or 'users'
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name'), // Keep name field, can be populated from username or profile
	username: text('username').unique(), // Added username field
	email: text('email').notNull().unique(), // Added email field
	emailVerified: timestamp('emailVerified', { mode: 'date', withTimezone: true }), // Standard field
	image: text('image'), // Standard field
	hashedPassword: text('hashed_password') // Added field to store hashed password for credentials auth
});

export const accounts = pgTable(
	'account',
	{
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		// Using plain text for now, refine if AdapterAccount type is found or needed
		type: text('type').notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('providerAccountId').notNull(),
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(account) => ({
		compoundKey: primaryKey({
			columns: [account.provider, account.providerAccountId]
		})
	})
);

export const sessions = pgTable('session', {
	// Table name often 'session' or 'sessions'
	sessionToken: text('sessionToken').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull() // Use 'expires' as commonly expected
});

export const verificationTokens = pgTable(
	'verificationToken',
	{
		identifier: text('identifier').notNull(), // Typically email
		token: text('token').notNull().unique(), // Token should be unique
		expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull()
	},
	(vt) => ({
		// Primary key often on identifier and token
		compoundKey: primaryKey({ columns: [vt.identifier, vt.token] })
	})
);

// Update exported types to reflect the new schema structure
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert; // Useful for creating users

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Add other types if needed
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
