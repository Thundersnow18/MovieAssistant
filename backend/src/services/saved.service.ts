import prisma from '../config/db';
import { AppError } from '../middleware/error.middleware';

export const addToSaved = async (userId: string, tmdbId: number, mediaType: string = 'movie') => {
  try {
    return await prisma.savedContent.create({
      data: { userId, tmdbId, mediaType },
    });
  } catch (error: any) {
    // Unique constraint violation — already saved
    if (error.code === 'P2002') {
      throw new AppError('Movie already in your watchlist', 409);
    }
    throw error;
  }
};

export const removeFromSaved = async (userId: string, tmdbId: number) => {
  const entry = await prisma.savedContent.findFirst({
    where: { userId, tmdbId },
  });
  if (!entry) throw new AppError('Movie not in your watchlist', 404);

  return prisma.savedContent.delete({ where: { id: entry.id } });
};

export const getSaved = async (userId: string, page: number = 1, limit: number = 20) => {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.savedContent.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.savedContent.count({ where: { userId } }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
};

export const isSaved = async (userId: string, tmdbId: number) => {
  const entry = await prisma.savedContent.findFirst({
    where: { userId, tmdbId },
  });
  return !!entry;
};
