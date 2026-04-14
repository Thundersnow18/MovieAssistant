import prisma from '../config/db';
import { PreferenceInput } from '../utils/validators';

export const getPreferences = async (userId: string) => {
  const pref = await prisma.preference.findUnique({ where: { userId } });
  if (!pref) return null;

  // Parse genres from JSON string back to array
  return {
    ...pref,
    preferredGenres: JSON.parse(pref.preferredGenres),
  };
};

export const upsertPreferences = async (userId: string, data: PreferenceInput) => {
  const genresJson = JSON.stringify(data.preferredGenres);

  const pref = await prisma.preference.upsert({
    where: { userId },
    update: {
      preferredGenres: genresJson,
      minRating: data.minRating,
      startYear: data.startYear ?? null,
      endYear: data.endYear ?? null,
      language: data.language,
      contentType: data.contentType,
    },
    create: {
      userId,
      preferredGenres: genresJson,
      minRating: data.minRating,
      startYear: data.startYear ?? null,
      endYear: data.endYear ?? null,
      language: data.language,
      contentType: data.contentType,
    },
  });

  return {
    ...pref,
    preferredGenres: JSON.parse(pref.preferredGenres),
  };
};
