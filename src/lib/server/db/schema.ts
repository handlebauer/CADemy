import { timestamp, pgTable, text, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	username: text('username').unique(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
	updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull()
});

export const accounts = pgTable(
	'account',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', {
			mode: 'date',
			withTimezone: true
		}),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
			mode: 'date',
			withTimezone: true
		}),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull()
	},
	(account) => ({
		providerProviderAccountIdIndex: uniqueIndex('account_provider_providerId_idx').on(
			account.accountId,
			account.providerId
		)
	})
);

export const sessions = pgTable('session', {
	id: text('id') // Use 'id' as PK instead of sessionToken
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
	updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent')
});

export const verification = pgTable('verification', {
	id: text('id') // Use 'id' as PK
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	identifier: text('identifier').notNull(), // Typically email
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull(),
	updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull()
});

// Export the 'users' table also as 'user' for compatibility with adapters expecting that name
export { users as user };

// Update exported types to reflect the new schema structure
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert; // Useful for creating users

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Add other types if needed
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
