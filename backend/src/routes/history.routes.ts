import { Router } from 'express';
import { addToHistory, removeFromHistory, getHistory } from '../controllers/history.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import prisma from '../config/db';
import axios from 'axios';

const router = Router();

router.use(authenticateToken);

router.get('/', getHistory);
router.post('/', addToHistory);
router.delete('/:tmdbId', removeFromHistory);

export default router;
