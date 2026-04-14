import { Router } from 'express';
import { getPreferences, updatePreferences } from '../controllers/preference.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getPreferences);
router.put('/', authenticateToken, updatePreferences);

export default router;
