import { Router } from 'express';
import { addToSaved, removeFromSaved, getSaved, checkSaved } from '../controllers/saved.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getSaved);
router.post('/', addToSaved);
router.get('/check/:tmdbId', checkSaved);
router.delete('/:tmdbId', removeFromSaved);

export default router;
