// src/lib/types/subjects.ts
// Defines subject types and constants

export const SUBJECTS = ['Math', 'Science', 'History', 'Language'] as const;
export type Subject = (typeof SUBJECTS)[number];
