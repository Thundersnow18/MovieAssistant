import { Request, Response, NextFunction } from 'express';
import * as savedService from '../services/saved.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const addToSaved = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const { tmdbId, mediaType } = req.body;
    const entry = await savedService.addToSaved(userId, tmdbId, mediaType);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
};

export const removeFromSaved = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const tmdbId = parseInt(String(req.params.tmdbId));
    await savedService.removeFromSaved(userId, tmdbId);
    res.json({ message: 'Removed from watchlist' });
  } catch (error) {
    next(error);
  }
};

export const getSaved = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit || '20'));
    const data = await savedService.getSaved(userId, page, limit);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const checkSaved = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const tmdbId = parseInt(String(req.params.tmdbId));
    const saved = await savedService.isSaved(userId, tmdbId);
    res.json({ saved });
  } catch (error) {
    next(error);
  }
};
