import prisma from '../config/db';

export const addToHistory = async (userId: string, tmdbId: number, mediaType: string = 'movie', genres: number[] = [], director: string = '') => {
  return (prisma.watchHistory as any).upsert({
    where: {
      userId_tmdbId: { userId, tmdbId },
    },
    update: {
      watchedAt: new Date(),
      genres: JSON.stringify(genres),
      director
    },
    create: {
      userId,
      tmdbId,
      mediaType,
      genres: JSON.stringify(genres),
      director
    },
  });
};

export const removeFromHistory = async (userId: string, tmdbId: number) => {
  const entry = await prisma.watchHistory.findFirst({
    where: { userId, tmdbId },
  });
  if (!entry) return null;

  return prisma.watchHistory.delete({ where: { id: entry.id } });
};

export const getHistory = async (userId: string, page: number = 1, limit: number = 20) => {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.watchHistory.findMany({
      where: { userId },
      orderBy: { watchedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.watchHistory.count({ where: { userId } }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
};
