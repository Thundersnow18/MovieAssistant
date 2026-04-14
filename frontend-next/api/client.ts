const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = '/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build query string
  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Attach auth token if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...fetchOptions, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Auth ───
export const authAPI = {
  register: (name: string, email: string, password: string) =>
    apiFetch<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    apiFetch<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () => apiFetch<any>('/auth/profile'),
};

// ─── Recommendations ───
export interface DiscoverParams {
  genres?: string;
  minRating?: number;
  startYear?: number;
  endYear?: number;
  sortBy?: string;
  language?: string;
  page?: number;
}

export const movieAPI = {
  discover: (filters: DiscoverParams) =>
    apiFetch<{ results: any[]; total_pages: number; page: number }>('/recommendations/discover', {
      params: filters as Record<string, string | number | undefined>,
    }),

  trending: (window: string = 'week', page: number = 1) =>
    apiFetch<{ results: any[] }>('/recommendations/trending', {
      params: { window, page },
    }),

  search: (query: string, page: number = 1) =>
    apiFetch<{ results: any[]; total_results: number; total_pages: number }>('/recommendations/search', {
      params: { q: query, page },
    }),

  getGenres: () => apiFetch<{ id: number; name: string }[]>('/recommendations/genres'),

  getMovieDetails: (id: number) => apiFetch<any>(`/recommendations/movie/${id}`),

  getProviders: () => apiFetch<any[]>('/recommendations/providers'),

  getPersonalized: (page: number = 1) => apiFetch<{ results: any[]; total_pages: number; page: number }>('/recommendations/personalized', {
    params: { page },
  }),
};

// ─── Saved / Watchlist ───
export const savedAPI = {
  getSaved: (page: number = 1, limit?: number) =>
    apiFetch<{ items: any[]; total: number; totalPages: number }>('/saved', {
      params: limit ? { page, limit } : { page },
    }),

  addToSaved: (tmdbId: number) =>
    apiFetch<any>('/saved', {
      method: 'POST',
      body: JSON.stringify({ tmdbId, mediaType: 'movie' }),
    }),

  removeFromSaved: (tmdbId: number) =>
    apiFetch<any>(`/saved/${tmdbId}`, { method: 'DELETE' }),

  checkSaved: (tmdbId: number) =>
    apiFetch<{ saved: boolean }>(`/saved/check/${tmdbId}`),
};

// ─── History ───
export const historyAPI = {
  getHistory: (page: number = 1, limit?: number) =>
    apiFetch<{ items: any[]; total: number; totalPages: number }>('/history', {
      params: limit ? { page, limit } : { page },
    }),

  addToHistory: (tmdbId: number, mediaType: string, genres: number[] = [], director: string = '') =>
    apiFetch<any>('/history', {
      method: 'POST',
      body: JSON.stringify({ tmdbId, mediaType, genres, director }),
    }),

  removeFromHistory: (tmdbId: number) =>
    apiFetch<any>(`/history/${tmdbId}`, { method: 'DELETE' }),
};

// ─── Preferences ───
export const preferenceAPI = {
  getPreferences: () => apiFetch<any>('/preferences'),
  updatePreferences: (data: any) =>
    apiFetch<any>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
