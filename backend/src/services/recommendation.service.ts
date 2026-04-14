import axios from 'axios';
import prisma from '../config/db';
import cache from '../config/cache';
import { DiscoverFilters } from '../utils/validators';
import { AppError } from '../middleware/error.middleware';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = () => process.env.TMDB_API_KEY || '';

// Exponential backoff network wrapper
const fetchFromTMDB = async (url: string, params: any, retries = 3): Promise<any> => {
  try {
    // Enforce strict 5000ms TCP socket timeout to prevent node deadlocks from upstream hanging
    const response = await axios.get(url, { params, timeout: 5000 });
    return response;
  } catch (error: any) {
    if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.response?.status >= 500 || error.response?.status === 429)) {
      console.warn(`TMDB ${error.code || error.response?.status} error. Retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchFromTMDB(url, params, retries - 1);
    }
    
    // Extract and forward structural TMDB constraint exceptions natively
    if (error.response && error.response.status) {
      throw new AppError(error.response.data?.status_message || `TMDB API Error: ${error.response.status}`, error.response.status);
    }
    throw new AppError(error.message || 'Error communicating with remote API', 502);
  }
};

// ─── Sanitization Filter ───
// TMDB's native include_adult filter frequently leaks softcore/amateur user-uploaded junk.
// We aggressively filter out any results lacking full professional metadata (posters + backdrops)
// and we mathematically severe highly-rated niche spam by enforcing absolute global engagement minimums.
const sanitizeTMDBResults = (results: any[]) => {
  if (!Array.isArray(results)) return [];
  return results.filter((m: any) => {
    if (m.adult === true) return false;
    if (!m.poster_path || !m.backdrop_path) return false;
    
    // Mathematically filter out high-production adult films with manipulated/fake 7.5+ ratings.
    // Real movies (even obscure indies) generate global popularity scores > 5 and hit multiple vote counts quickly.
    // Niche adult production spam typically sits at 10 votes and extremely low global popularity.
    if (m.vote_count < 15) return false;
    if (m.popularity && m.popularity < 5) return false;

    return true;
  });
};

// ─── Cache TTLs (seconds) ───
const TTL = {
  GENRES: 86400,      // 24 hours
  TRENDING: 3600,     // 1 hour
  DISCOVER: 900,      // 15 minutes
  DETAILS: 43200,     // 12 hours
  PROVIDERS: 86400,   // 24 hours
};

// ═══════════════════════════════════════════════
//  DISCOVER — The main "boom, here's your movie" endpoint
// ═══════════════════════════════════════════════

export const discoverMovies = async (filters: DiscoverFilters, userId?: string) => {
  const cacheKey = `discover:${JSON.stringify(filters)}`;
  const cached = await cache.get(cacheKey);
  
  if (cached) {
    let cachedData = JSON.parse(cached);
    if (userId) cachedData = await filterWatched(cachedData, userId);
    return cachedData;
  }

  const params: Record<string, any> = {
    api_key: API_KEY(),
    language: 'en-US',
    with_original_language: filters.language !== 'all' ? filters.language : undefined,
    page: filters.page || 1,
    sort_by: filters.sortBy || 'popularity.desc',
    include_adult: false,
    include_video: false,
  };

  if (filters.genres) params.with_genres = filters.genres;
  if (filters.minRating) params['vote_average.gte'] = filters.minRating;
  if (filters.maxRating) params['vote_average.lte'] = filters.maxRating;
  if (filters.startYear) params['primary_release_date.gte'] = `${filters.startYear}-01-01`;
  if (filters.endYear) params['primary_release_date.lte'] = `${filters.endYear}-12-31`;
  if (filters.providers) params.with_watch_providers = filters.providers;
  if (filters.providers) params.watch_region = 'US';

  const response = await fetchFromTMDB(`${TMDB_BASE}/discover/movie`, params);
  let data = response.data;
  
  if (data.results) {
    data.results = sanitizeTMDBResults(data.results);
  }

  await cache.set(cacheKey, JSON.stringify(data), TTL.DISCOVER);

  if (userId) {
    data = await filterWatched(data, userId);
  }

  return data;
};

// ═══════════════════════════════════════════════
//  TRENDING
// ═══════════════════════════════════════════════

export const getTrending = async (timeWindow: 'day' | 'week' = 'week', page: number = 1) => {
  const cacheKey = `trending:${timeWindow}:${page}`;
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = await fetchFromTMDB(`${TMDB_BASE}/trending/movie/${timeWindow}`, { api_key: API_KEY(), page });
  const data = response.data;
  
  if (data.results) {
    data.results = sanitizeTMDBResults(data.results);
  }

  await cache.set(cacheKey, JSON.stringify(data), TTL.TRENDING);
  return data;
};

// ═══════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════

export const searchMovies = async (query: string, page: number = 1) => {
  if (!query.trim()) return { results: [], total_results: 0 };

  // Route to the polymorphic multi-search endpoint to capture Cast & Directors natively
  const response = await fetchFromTMDB(`${TMDB_BASE}/search/multi`, {
    api_key: API_KEY(),
    query,
    page,
    include_adult: false,
  });
  
  const data = response.data;
  if (data.results) {
    let movies: any[] = [];
    const personIds: number[] = [];
    
    // Flatten the polymorphic response geometry
    data.results.forEach((item: any) => {
      if (item.media_type === 'movie') {
        movies.push(item);
      } else if (item.media_type === 'person') {
        personIds.push(item.id);
        // Retain standard known_for array as a rapid fallback baseline
        if (item.known_for) {
          item.known_for.forEach((kf: any) => {
            if (kf.media_type === 'movie') movies.push(kf);
          });
        }
      }
    });

    // Deep-dive interpolation: If user searched a human, autonomously rip out their FULL filmography
    // instead of TMDB's default 3-movie limit.
    if (personIds.length > 0) {
      try {
        // Fetch complete filmography matrices for the top matched people
        const creditPromises = personIds.slice(0, 3).map(id => 
          fetchFromTMDB(`${TMDB_BASE}/person/${id}/movie_credits`, { api_key: API_KEY() })
            .catch(() => null)
        );
        
        const creditsResponses = await Promise.all(creditPromises);
        
        creditsResponses.forEach(res => {
          if (res?.data) {
            if (res.data.cast) {
              movies.push(...res.data.cast);
            }
            if (res.data.crew) {
              // Filter to essential cinematic roles
              const VIPCrew = res.data.crew.filter((c: any) => ['Director', 'Writer', 'Producer'].includes(c.job));
              movies.push(...VIPCrew);
            }
          }
        });
      } catch (e) {
        console.error('Network intercept on deep-dive filmography failed:', e);
      }
    }

    // Filter nulls, and enforce global structural deduplication
    const uniqueMovies = Array.from(new Map(movies.filter(m => m && m.id && m.title).map(m => [m.id, m])).values());
    
    // Bubble up massive blockbusters to the top of the dynamic matrix
    uniqueMovies.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

    data.results = sanitizeTMDBResults(uniqueMovies);
  }

  return data;
};

// ═══════════════════════════════════════════════
//  MOVIE DETAILS (with credits + similar)
// ═══════════════════════════════════════════════

export const getMovieDetails = async (tmdbId: number) => {
  const cacheKey = `movie:${tmdbId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = await fetchFromTMDB(`${TMDB_BASE}/movie/${tmdbId}`, {
    api_key: API_KEY(),
    append_to_response: 'credits,similar,watch/providers,videos',
  });

  const data = response.data;

  // Slim down credits to top 10 cast + director
  if (data.credits) {
    data.credits.cast = data.credits.cast?.slice(0, 10) || [];
    data.credits.director = data.credits.crew?.find((c: any) => c.job === 'Director') || null;
    delete data.credits.crew;
  }

  // Get trailer
  if (data.videos?.results) {
    data.trailer = data.videos.results.find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    ) || null;
    delete data.videos;
  }

  await cache.set(cacheKey, JSON.stringify(data), TTL.DETAILS);
  return data;
};

// ═══════════════════════════════════════════════
//  GENRE LIST
// ═══════════════════════════════════════════════

export const getGenres = async () => {
  const cacheKey = 'genres:movie';
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = await fetchFromTMDB(`${TMDB_BASE}/genre/movie/list`, { api_key: API_KEY(), language: 'en' });

  await cache.set(cacheKey, JSON.stringify(response.data.genres), TTL.GENRES);
  return response.data.genres;
};

// ═══════════════════════════════════════════════
//  STREAMING PROVIDERS
// ═══════════════════════════════════════════════

export const getStreamingProviders = async (region: string = 'US') => {
  const cacheKey = `providers:${region}`;
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = await fetchFromTMDB(`${TMDB_BASE}/watch/providers/movie`, { api_key: API_KEY(), watch_region: region });

  // Return top providers (Netflix, Prime, Disney+, etc.)
  const providers = response.data.results?.slice(0, 20) || [];
  await cache.set(cacheKey, JSON.stringify(providers), TTL.PROVIDERS);
  return providers;
};

// ═══════════════════════════════════════════════
//  PERSONALIZED (uses saved preferences)
// ═══════════════════════════════════════════════

export const getPersonalizedMovies = async (userId: string, page: number = 1) => {
  const prefs = await prisma.preference.findUnique({ where: { userId } });

  // ML Recommendation Core: Extract mathematical genre frequencies from raw user Watch History
  const history = await prisma.watchHistory.findMany({ where: { userId } });
  const counts: Record<number, number> = {};
  
  history.forEach((h: any) => {
    if (h.genres && h.genres !== '[]') {
      try {
        const arr = JSON.parse(h.genres);
        arr.forEach((g: number) => { counts[g] = (counts[g] || 0) + 1; });
      } catch (e) {}
    }
  });
  
  // Mathematically splice the Top 2 implicitly learned genres dynamically
  const topAutoGenres = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(e => Number(e[0]));

  const manualGenres = prefs?.preferredGenres ? JSON.parse(prefs.preferredGenres) : [];
  
  // Architecturally Override Taste DNA if the user explicitly provided manual Preferences
  const smartGenres = manualGenres.length > 0 ? manualGenres : topAutoGenres;

  const filters: DiscoverFilters = {
    genres: smartGenres.length > 0 ? smartGenres.join('|') : undefined,
    minRating: prefs?.minRating || 0,
    startYear: prefs?.startYear ?? undefined,
    endYear: prefs?.endYear ?? undefined,
    language: prefs?.language || 'en-US',
    page,
  };

  return discoverMovies(filters, userId);
};

// ─── Helpers ───

async function filterWatched(data: any, userId: string) {
  const history = await prisma.watchHistory.findMany({
    where: { userId },
    select: { tmdbId: true },
  });
  const watchedIds = new Set(history.map(h => Number(h.tmdbId)));

  return {
    ...data,
    results: data.results?.filter((m: any) => !watchedIds.has(Number(m.id))) || [],
  };
}