"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { movieAPI, type DiscoverParams } from "@/api/client";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Search, ChevronUp, X, RotateCcw } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'primary_release_date.desc', label: 'Newest First' },
  { value: 'primary_release_date.asc', label: 'Oldest First' },
  { value: 'revenue.desc', label: 'Highest Revenue' },
];

const LANGUAGE_OPTIONS = [
  { value: 'all', label: 'All Languages' },
  { value: 'en', label: 'English' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
];

export default function Discover() {
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [language, setLanguage] = useState('all');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'personalized' | 'search'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const isFetchingRef = useRef(false);
  
  const scrollRef = useScrollReveal();
  const { user, watchedIds } = useAuth();

  const fetchMovies = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    isFetchingRef.current = true;
    setLoading(true);
    if (!append) setMovies([]);
    try {
      const params: DiscoverParams = {
        page: pageNum,
        sortBy,
      };

      if (selectedGenres.length > 0) params.genres = selectedGenres.join('|');
      if (minRating > 0) params.minRating = minRating;
      if (startYear) params.startYear = parseInt(startYear);
      if (endYear) params.endYear = parseInt(endYear);
      if (language !== 'all') params.language = language;

      const data = await movieAPI.discover(params);
      
      if (append) {
        setMovies(prev => {
          const newIds = new Set(prev.map(m => m.id));
          const uniqueNew = (data.results || []).filter((m: any) => !newIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        // Shuffle the primary payload matrix dynamically to disperse static blockbusters from the top row
        const shuffled = [...(data.results || [])];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setMovies(shuffled);
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      
      setTotalPages(Math.min(data.total_pages || 0, 500));
      setPage(pageNum);

      // Recursive Pagination Recovery: If the power-user's Watch History mathematically decimated the entire 
      // 20-movie dataset for this specific page, autonomously force-queue the next index immediately.
      // Explicitly disable this recovery loop if the user has actively constrained the TMDB query via Filters.
      const hasActiveFilters = selectedGenres.length > 0 || minRating > 0 || startYear !== '' || endYear !== '';
      if (!hasActiveFilters && (!data.results || data.results.length === 0) && pageNum < Math.min(data.total_pages || 0, 500)) {
        setTimeout(() => fetchMovies(pageNum + 1, true), 100);
      }
    } catch (error: any) {
      // Use standard log to prevent Next.js Dev tools from violently hijacking on network/TMDB drops
      console.log('Network interruption during discover fetch:', error?.message);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [selectedGenres, minRating, startYear, endYear, language, sortBy]);

  const fetchPersonalized = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    isFetchingRef.current = true;
    setLoading(true);
    if (!append) setMovies([]);
    try {
      let targetPage = pageNum;
      if (pageNum === 1 && !append) {
        // Deepen the randomization vector to pull from a massive pool of the first 200 Taste DNA movies (10-page deep rotation)
        targetPage = Math.floor(Math.random() * 10) + 1;
      }
      const data = await movieAPI.getPersonalized(targetPage);
      
      if (append) {
        setMovies(prev => {
          const newIds = new Set(prev.map(m => m.id));
          const uniqueNew = (data.results || []).filter((m: any) => !newIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        // Scramble the payload matrix visually
        const shuffled = [...(data.results || [])];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setMovies(shuffled);
        window.scrollTo({ top: 0, behavior: 'auto' });
      }

      setTotalPages(Math.min(data.total_pages || 0, 500));
      setPage(targetPage);

      // Autonomous Payload Padding: If the user filters out movies they've seen, the UI shouldn't feel empty.
      // Automatically queue up a second batch if we are on the initial payload load.
      if ((!data.results || data.results.length === 0) && targetPage < Math.min(data.total_pages || 0, 500)) {
        setTimeout(() => fetchPersonalized(targetPage + 1, true), 100);
      } else if (pageNum === 1 && !append && targetPage < Math.min(data.total_pages || 0, 500)) {
        // Unconditionally double-pump the first load so they get 40 recommendations right out the gate
        setTimeout(() => fetchPersonalized(targetPage + 1, true), 300);
      }
    } catch (error: any) {
      // Prevent dev overlay hijacks for ECONNRESET anomalies just like search
      console.log('Network interruption during personalized fetch:', error?.message);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  const fetchSearch = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    isFetchingRef.current = true;
    setLoading(true);
    if (!append) setMovies([]);
    try {
      const data = await movieAPI.search(searchQuery, pageNum);
      
      if (append) {
        setMovies(prev => {
          const newIds = new Set(prev.map(m => m.id));
          const uniqueNew = (data.results || []).filter((m: any) => !newIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setMovies(data.results || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      setTotalPages(Math.min(data.total_pages || 0, 500));
      setPage(pageNum);

      // Decoupled recursive recovery here: Search intentionally maps directly against the user query constraints.
    } catch (error: any) {
      // Prevent dev overlay hijacks for ECONNRESET anomalies 
      console.log('Network interruption during search fetch:', error?.message);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [searchQuery]);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && page < totalPages && !isFetchingRef.current) {
        if (activeTab === 'search') fetchSearch(page + 1, true);
        else if (activeTab === 'discover') fetchMovies(page + 1, true);
        else if (activeTab === 'personalized') fetchPersonalized(page + 1, true);
      }
    }, { rootMargin: '100px' });  
    
    if (node) observer.current.observe(node);
  }, [loading, page, totalPages, activeTab, fetchSearch, fetchMovies, fetchPersonalized]);

  // Fetch genres on mount
  useEffect(() => {
    movieAPI.getGenres()
      .then(setGenres)
      .catch(console.error);
  }, []);

  // Handle scroll to top visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() !== '') {
      setActiveTab('search');
    } else {
      setActiveTab('discover');
    }
  };

  useEffect(() => {
    if (activeTab === 'search') {
      const timer = setTimeout(() => {
        if (searchQuery.trim() !== '') {
          fetchSearch(1);
        }
      }, 500); 
      return () => clearTimeout(timer);
    } else if (activeTab === 'discover') {
      fetchMovies(1);
    } else if (activeTab === 'personalized') {
      fetchPersonalized(1);
    }
    // Explicitly ignoring fetchMovies to prevent rapid-fire API hits while adjusting filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPersonalized, fetchSearch, activeTab, searchQuery]);

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((g) => g !== genreId)
        : [...prev, genreId]
    );
  };

  return (
    <div className="discover-page" ref={scrollRef}>
      <div className="container">
        <div className="discover-header scroll-reveal">
          <h1>
            <span className="gradient-text">Discover</span> Movies
          </h1>
          <p>Find your next favorite film.</p>
          
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={handleSearch}
                style={{ width: '100%', padding: '16px 24px', borderRadius: '30px', fontSize: '1.1rem', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)' }}
              />
              <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setActiveTab('discover'); }} 
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                  >
                    <X size={18} />
                  </button>
                )}
                <Search size={20} color="var(--text-secondary)" />
              </div>
            </div>
          </div>

          {user && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button 
                className={`btn ${activeTab === 'discover' || activeTab === 'search' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setSearchQuery(''); setActiveTab('discover'); }}
              >
                Explore All
              </button>
              <button 
                className={`btn ${activeTab === 'personalized' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setSearchQuery(''); setActiveTab('personalized'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Sparkles size={18} /> FOR YOU
              </button>
            </div>
          )}
        </div>

        <div className="discover-layout" style={{ gridTemplateColumns: activeTab === 'discover' ? undefined : '1fr' }}>
          {/* ─── Filter Panel ─── */}
          <aside className="filter-panel scroll-reveal" id="filter-panel" style={{ display: activeTab === 'discover' ? 'block' : 'none' }}>
            <div className="filter-section">
              <span className="filter-label">Genres</span>
              <div className="genre-chips">
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    className={`genre-chip ${selectedGenres.includes(genre.id) ? 'active' : ''}`}
                    onClick={() => toggleGenre(genre.id)}
                    id={`genre-chip-${genre.id}`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <span className="filter-label" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Minimum Rating <span className="filter-value" style={{ float: 'right', color: 'var(--text-primary)' }}>{minRating.toFixed(1)}</span>
              </span>
              <input
                type="range"
                className="input-field"
                style={{ width: '100%' }}
                min="0"
                max="10"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                id="rating-slider"
              />
            </div>

            <div className="filter-section">
              <span className="filter-label" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Year Range</span>
              <div className="year-range" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <input
                  type="number"
                  placeholder="From"
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  min="1900"
                  max="2026"
                  id="start-year"
                  className="input-field"
                  style={{ padding: '12px 16px', background: 'var(--bg-glass)', border: 'none', borderRadius: '10px' }}
                />
                <input
                  type="number"
                  placeholder="To"
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  min="1900"
                  max="2026"
                  id="end-year"
                  className="input-field"
                  style={{ padding: '12px 16px', background: 'var(--bg-glass)', border: 'none', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div className="filter-section">
              <span className="filter-label" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Language</span>
              <select
                className="input-field"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                id="language-select"
                style={{ padding: '12px 16px', background: 'var(--bg-glass)', border: 'none', borderRadius: '10px', marginTop: '12px', cursor: 'pointer' }}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-section">
              <span className="filter-label" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sort By</span>
              <select
                className="input-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                id="sort-select"
                style={{ padding: '12px 16px', background: 'var(--bg-glass)', border: 'none', borderRadius: '10px', marginTop: '12px', cursor: 'pointer' }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary filter-apply-btn"
              onClick={() => fetchMovies(1)}
              id="apply-filters-btn"
            >
              Apply Filters
            </button>
            <button
              className="btn btn-primary filter-apply-btn"
              onClick={() => {
                setSelectedGenres([]);
                setMinRating(0);
                setStartYear('');
                setEndYear('');
                setLanguage('all');
                setSortBy('popularity.desc');
                setTimeout(() => fetchMovies(1), 0);
              }}
              style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RotateCcw size={18} style={{ marginRight: '8px' }}/> Clear Filters
            </button>
          </aside>

          {/* ─── Movie Grid ─── */}
          <div>
            {loading && movies.length === 0 ? (
              <div className="loading-spinner">
                <div className="spinner" />
              </div>
            ) : (
              <>
                {movies.length > 0 ? (
                  <motion.div 
                    className="movie-grid"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                    }}
                  >
                    <AnimatePresence>
                      {movies.filter(m => activeTab === 'search' || !watchedIds?.has(m.id)).map((movie, index, filteredArray) => (
                        <motion.div
                          key={movie.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          ref={filteredArray.length === index + 1 ? lastMovieElementRef : null}
                        >
                          <MovieCard
                            movie={movie}
                            onSelect={(m) => setSelectedMovie(m.id)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <div className="empty-state">
                    <div className="emoji">🍿</div>
                    <h3>No movies found</h3>
                    <p>Try adjusting your search terms or filters.</p>
                  </div>
                )}

                {loading && page > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                    <Loader2 className="spinner" size={32} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {selectedMovie && (
        <MovieModal movieId={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}

      {/* Floating Scroll-to-Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            whileHover={{ scale: 1.1, backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            style={{
              position: 'fixed',
              bottom: '40px',
              right: '40px',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 900,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              transition: 'background 0.2s, color 0.2s'
            }}
            title="Scroll to Top"
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

