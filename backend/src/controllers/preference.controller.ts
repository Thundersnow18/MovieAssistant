import { Request, Response, NextFunction } from 'express';
import * as prefService from '../services/preference.service';
import { preferenceSchema } from '../utils/validators';
import { AuthRequest } from '../middleware/auth.middleware';

export const getPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const prefs = await prefService.getPreferences(userId);
    res.json(prefs || { message: 'No preferences set yet' });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const parsed = preferenceSchema.parse(req.body);
    const prefs = await prefService.upsertPreferences(userId, parsed);
    res.json(prefs);
  } catch (error) {
    next(error);
  }
};
