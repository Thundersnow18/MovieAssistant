import { Request, Response, NextFunction } from 'express';
import * as historyService from '../services/history.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const addToHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const { tmdbId, mediaType, genres, director } = req.body;
    const entry = await historyService.addToHistory(userId, tmdbId, mediaType, genres || [], director || '');
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
};

export const removeFromHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const tmdbId = parseInt(String(req.params.tmdbId));
    await historyService.removeFromHistory(userId, tmdbId);
    res.json({ message: 'Removed from history' });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit || '20'));
    const data = await historyService.getHistory(userId, page, limit);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
