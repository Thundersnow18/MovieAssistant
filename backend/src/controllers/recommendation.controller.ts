import { Request, Response, NextFunction } from 'express';
import * as recService from '../services/recommendation.service';
import { discoverFiltersSchema } from '../utils/validators';
import { AuthRequest } from '../middleware/auth.middleware';

export const discoverMovies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = discoverFiltersSchema.parse(req.query);
    const userId = (req as AuthRequest).user?.userId;
    const movies = await recService.discoverMovies(filters, userId);
    res.json(movies);
  } catch (error) {
    next(error);
  }
};

export const getTrending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const windowParam = String(req.query.window || 'week');
    const timeWindow: 'day' | 'week' = windowParam === 'day' ? 'day' : 'week';
    const page = parseInt(String(req.query.page || '1')) || 1;
    const data = await recService.getTrending(timeWindow, page);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const searchMovies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = String(req.query.q ?? '');
    const page = parseInt(String(req.query.page ?? '1')) || 1;
    const data = await recService.searchMovies(query, page);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getMovieDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tmdbId = parseInt(String(req.params.id));
    if (isNaN(tmdbId)) {
      res.status(400).json({ message: 'Invalid movie ID' });
      return;
    }
    const data = await recService.getMovieDetails(tmdbId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getGenres = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const genres = await recService.getGenres();
    res.json(genres);
  } catch (error) {
    next(error);
  }
};

export const getStreamingProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const region = String(req.query.region || 'US');
    const providers = await recService.getStreamingProviders(region);
    res.json(providers);
  } catch (error) {
    next(error);
  }
};

export const getPersonalized = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const movies = await recService.getPersonalizedMovies(userId);
    res.json(movies);
  } catch (error) {
    next(error);
  }
};