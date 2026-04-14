"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { savedAPI, movieAPI } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Inbox, ChevronUp } from 'lucide-react';

export default function Watchlist() {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [enrichedMovies, setEnrichedMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<number | null>(null);
  const scrollRef = useScrollReveal([user, loading]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  useEffect(() => {
    if (!user) return;

    savedAPI.getSaved(1, 1000)
      .then(async (data) => {
        setSavedItems(data.items);
        setTotalSaved(data.total || 0);
        // Enrich saved items with TMDB details
        const movieDetails = await Promise.all(
          data.items.map(async (item: any) => {
            try {
              const details = await movieAPI.getMovieDetails(item.tmdbId);
              return details;
            } catch {
              return { id: item.tmdbId, title: `Movie #${item.tmdbId}`, vote_average: 0 };
            }
          })
        );
        setEnrichedMovies(movieDetails);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleRemove = async (tmdbId: number) => {
    try {
      await savedAPI.removeFromSaved(tmdbId);
      setSavedItems((prev) => prev.filter((item) => item.tmdbId !== tmdbId));
      setEnrichedMovies((prev) => prev.filter((m) => m.id !== tmdbId));
    } catch (error) {
      console.error('Failed to remove:', error);
    }
  };

  if (!user) {
    return (
      <div className="watchlist-page">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '120px' }}>
            <div className="feature-icon" style={{ margin: '0 auto 20px', background: 'transparent', border: 'none' }}><Lock size={48} color="var(--text-secondary)" /></div>
            <h3>Sign in to view your watchlist</h3>
            <p style={{ marginBottom: '24px' }}>Create an account to save movies and track your watching.</p>
            <Link href="/login" className="btn btn-primary">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="watchlist-page" ref={scrollRef}>
      <div className="container">
        <div className="watchlist-header scroll-reveal">
          <h1>My <span className="gradient-text">Watchlist</span></h1>
          <p>{totalSaved} movies saved</p>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner" />
          </div>
        ) : enrichedMovies.length > 0 ? (
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
              {enrichedMovies.map((movie) => (
                <motion.div 
                  key={movie.id} 
                  style={{ position: 'relative' }}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <MovieCard movie={movie} onSelect={(m) => setSelectedMovie(m.id)} />
                  <button
                    onClick={() => handleRemove(movie.id)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.8)',
                      color: 'white',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer',
                      zIndex: 10,
                    }}
                    title="Remove from watchlist"
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="empty-state">
            <div className="feature-icon" style={{ margin: '0 auto 20px', background: 'transparent', border: 'none' }}><Inbox size={48} color="var(--text-secondary)" /></div>
            <h3>Your watchlist is empty</h3>
            <p style={{ marginBottom: '24px' }}>Start discovering movies and save the ones you want to watch!</p>
            <Link href="/discover" className="btn btn-primary">Discover Movies</Link>
          </div>
        )}
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


