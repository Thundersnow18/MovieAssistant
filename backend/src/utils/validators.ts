import { z } from 'zod/v4';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const preferenceSchema = z.object({
  preferredGenres: z.array(z.number()).default([]),
  minRating: z.number().min(0).max(10).default(0),
  startYear: z.number().int().min(1900).max(2030).nullable().optional(),
  endYear: z.number().int().min(1900).max(2030).nullable().optional(),
  language: z.string().default('en'),
  contentType: z.enum(['movie', 'tv', 'both']).default('movie'),
});

export const discoverFiltersSchema = z.object({
  genres: z.string().optional(),           // comma-separated genre IDs
  minRating: z.coerce.number().min(0).max(10).optional(),
  maxRating: z.coerce.number().min(0).max(10).optional(),
  startYear: z.coerce.number().int().optional(),
  endYear: z.coerce.number().int().optional(),
  language: z.string().optional(),
  sortBy: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  providers: z.string().optional(),        // comma-separated provider IDs
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PreferenceInput = z.infer<typeof preferenceSchema>;
export type DiscoverFilters = z.infer<typeof discoverFiltersSchema>;
