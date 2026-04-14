import { Router } from 'express';
import {
  discoverMovies,
  getTrending,
  searchMovies,
  getMovieDetails,
  getGenres,
  getStreamingProviders,
  getPersonalized,
} from '../controllers/recommendation.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public endpoints (no auth required, but optional auth for personalization)
router.get('/genres', getGenres);
router.get('/providers', getStreamingProviders);
router.get('/trending', getTrending);
router.get('/search', searchMovies);
router.get('/discover', optionalAuth, discoverMovies);
router.get('/movie/:id', getMovieDetails);

// Protected endpoints
router.get('/personalized', authenticateToken, getPersonalized);

export default router;