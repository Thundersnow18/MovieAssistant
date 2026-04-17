"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { historyAPI, movieAPI } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Clock, Lock, Share, ChevronUp } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import TasteChart from "@/components/TasteChart";
import StoryCard, { StoryTheme } from "@/components/StoryCard";
import * as htmlToImage from 'html-to-image';

export default function History() {
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [enrichedMovies, setEnrichedMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalHistory, setTotalHistory] = useState(0);
  const [dbHistoryMovies, setDbHistoryMovies] = useState<any[]>([]);

  const [selectedMovie, setSelectedMovie] = useState<number | null>(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyTheme, setStoryTheme] = useState<StoryTheme>('dark');
  const [exporting, setExporting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const scrollRef = useScrollReveal([user, loading]);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const { scrollY } = useScroll();
  const chartOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const chartY = useTransform(scrollY, [0, 400], [0, -80]);
  const chartScale = useTransform(scrollY, [0, 300], [1, 0.95]);

  const handleExportWrapped = async () => {
    if (!storyCardRef.current) return;
    try {
      setExporting(true);
      // Wait a fraction of a second to ensure clean rendering frame.
      await new Promise(r => setTimeout(r, 200));
      const dataUrl = await htmlToImage.toPng(storyCardRef.current, { pixelRatio: 2, cacheBust: false });
      
      const link = document.createElement('a');
      link.download = 'movie-taste-dna.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    } finally {
      setExporting(false);
    }
  };

  const fetchHistory = async (pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    else setIsFetchingMore(true);

    try {
      const data = await historyAPI.getHistory(pageNum);
      setTotalHistory(data.total || 0);

      const newItems = data.items || [];
      const movieDetails = await Promise.all(
        newItems.map(async (item: any) => {
          try {
            const details = await movieAPI.getMovieDetails(item.tmdbId);
            details.watchedAt = item.watchedAt;
            return details;
          } catch {
            return { id: item.tmdbId, title: `Movie #${item.tmdbId}`, vote_average: 0, watchedAt: item.watchedAt };
          }
        })
      );

      if (pageNum === 1) {
        setHistoryItems(newItems);
        setEnrichedMovies(movieDetails);
      } else {
        setHistoryItems(prev => [...prev, ...newItems]);
        setEnrichedMovies(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const additions = movieDetails.filter(m => !existingIds.has(m.id));
          return [...prev, ...additions];
        });
      }

      setHasMore(pageNum < (data.totalPages || 1));
    } catch (err) {
      console.error(err);
    } finally {
      if (pageNum === 1) setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      setPage(1);
      fetchHistory(1);
      
      Promise.all([
        historyAPI.getHistory(1, 1000),
        movieAPI.getGenres()
      ]).then(([histData, genresData]) => {
        const genreDict: Record<number, string> = {};
        genresData.forEach((g: any) => { genreDict[g.id] = g.name; });
        
        const mappedMovies = (histData.items || []).map((dbItem: any) => {
          let movieGenres: any[] = [];
          if (dbItem.genres) {
             try {
               const gIds = JSON.parse(dbItem.genres);
               movieGenres = gIds.map((id: number) => ({ name: genreDict[id] }));
             } catch(e) {}
          }
          return { 
            genres: movieGenres,
            credits: { director: { name: dbItem.director || undefined } }
          };
        });
        
        setDbHistoryMovies(mappedMovies);
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (loading || isFetchingMore || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => {
          const next = prev + 1;
          fetchHistory(next);
          return next;
        });
      }
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loading, isFetchingMore, hasMore]);

  // Handle scroll to top visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Derived Summary Computing
  const sourceData = dbHistoryMovies.length > 0 ? dbHistoryMovies : enrichedMovies;
  const genreCounts: Record<string, number> = {};
  const directorCounts: Record<string, number> = {};
  const processedDirMovieIds = new Set<number>();

  sourceData.forEach(m => {
    m.genres?.forEach((g: any) => {
      if (g && g.name) genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
    });
    const dir = m.credits?.director?.name;
    if (dir) {
      directorCounts[dir] = (directorCounts[dir] || 0) + 1;
      if (m.id) processedDirMovieIds.add(m.id);
    }
  });

  enrichedMovies.forEach(m => {
    if (m.id && !processedDirMovieIds.has(m.id)) {
      const dir = m.credits?.director?.name;
      if (dir) directorCounts[dir] = (directorCounts[dir] || 0) + 1;
    }
  });

  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
  const topDirector = Object.entries(directorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (!user) {
    return (
      <div className="watchlist-page">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '120px' }}>
            <div className="feature-icon" style={{ margin: '0 auto 20px', background: 'transparent', border: 'none' }}><Lock size={48} color="var(--text-secondary)" /></div>
            <h3>Sign in to view your history</h3>
            <p style={{ marginBottom: '24px' }}>Create an account to track your watched movies.</p>
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
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            My <span className="gradient-text">History</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            <Clock size={18} /> 
            <span>{totalHistory} movies watched</span>
            
            {(!loading && totalHistory > 0) && (
              <button 
                onClick={() => setShowStoryModal(true)} 
                className="btn btn-secondary" 
                style={{ marginLeft: '16px', padding: '6px 14px', fontSize: '0.85rem', gap: '6px', borderRadius: '20px', display: 'flex', alignItems: 'center' }}
              >
                <Share size={14} /> Preview Story
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <motion.div
              style={{ position: 'relative', marginBottom: '40px', opacity: chartOpacity, y: chartY, scale: chartScale }}
            >
              <TasteChart movies={dbHistoryMovies.length > 0 ? dbHistoryMovies : enrichedMovies.length > 0 ? enrichedMovies : [
                { genres: [{ name: 'Action' }, { name: 'Sci-Fi' }] },
                { genres: [{ name: 'Action' }, { name: 'Thriller' }] },
                { genres: [{ name: 'Comedy' }, { name: 'Romance' }] }
              ]} />
              
              {enrichedMovies.length === 0 && (
                <div style={{
                  position: 'absolute', inset: 0, 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-primary)', zIndex: 10,
                  border: '1px solid var(--border-glass)'
                }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '-0.05em' }}>Taste DNA Locked</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Search and log movies via Discover to uncover your genomic profile.</p>
                </div>
              )}

              {enrichedMovies.length > 0 && topGenres.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '20px auto 0', lineHeight: 1.6 }}>
                  According to your history, your cinematic DNA shows a strong affinity for <strong style={{color: 'var(--text-primary)'}}>{topGenres[0]}</strong>{topGenres[1] ? <span> and <strong style={{color: 'var(--text-primary)'}}>{topGenres[1]}</strong></span> : ''}. 
                  {topDirector && <span> Your most prominent director on record is <strong style={{color: 'var(--text-primary)'}}>{topDirector}</strong>.</span>}
                </div>
              )}
            </motion.div>
            
            {enrichedMovies.length > 0 ? (
              <>
                <div className="movie-grid">
                {enrichedMovies.map((movie, idx) => (
                  <div 
                    key={`${movie.id}-${idx}`} 
                    className="history-movie"
                    style={{ position: 'relative' }}
                  >
                    <MovieCard movie={movie} onSelect={(m) => setSelectedMovie(m.id)} />
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      width: '100%',
                      textAlign: 'center',
                      background: 'var(--bg-primary)',
                      borderTop: '1px solid var(--border-glass)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      padding: '6px 0',
                      pointerEvents: 'none',
                      fontWeight: 500
                    }}>
                      Watched: {new Date(movie.watchedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
              
              {hasMore && (
                <div ref={loadMoreRef} style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: '30px', height: '30px', borderTopColor: 'var(--accent-primary)' }} />
                </div>
              )}
              </>
            ) : (
              <div className="empty-state" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                <div className="feature-icon" style={{ margin: '0 auto 20px', background: 'transparent', border: 'none' }}><Clock size={48} color="var(--text-secondary)" /></div>
                <h3 style={{ fontFamily: 'var(--font-display)' }}>Your history is empty</h3>
                <p style={{ marginBottom: '24px' }}>Once you start watching movies, they'll appear here.</p>
                <Link href="/discover" className="btn btn-primary">Discover Movies</Link>
              </div>
            )}
          </>
        )}
      </div>

      {selectedMovie && (
        <MovieModal movieId={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}

      {showStoryModal && enrichedMovies.length > 0 && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowStoryModal(false)} style={{ zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <div className="story-scale-container">
              <div>
                <StoryCard ref={storyCardRef} movies={enrichedMovies} fullTasteMovies={dbHistoryMovies} totalHistoryOverride={totalHistory} username={user?.name || 'User'} theme={storyTheme} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '-10px' }}>
              {(['dark', 'crimson', 'cyber', 'light'] as StoryTheme[]).map(t => (
                <button
                  key={t}
                  onClick={() => setStoryTheme(t)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: storyTheme === t ? '3px solid var(--text-primary)' : '2px solid var(--border-glass)',
                    background: t === 'dark' ? 'linear-gradient(135deg, #444, #000)' : t === 'crimson' ? 'linear-gradient(135deg, #FF3232, #400)' : t === 'cyber' ? 'linear-gradient(135deg, #3296FF, #002)' : 'linear-gradient(135deg, #FFF, #CCC)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: storyTheme === t ? '0 0 15px rgba(255,255,255,0.2)' : '0 4px 10px rgba(0,0,0,0.3)',
                    padding: 0,
                    transform: storyTheme === t ? 'scale(1.1)' : 'scale(1)'
                  }}
                  title={t}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleExportWrapped} 
                disabled={exporting}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', justifyContent: 'center' }}
              >
                {exporting ? <div className="spinner" style={{width: 18, height: 18, borderWidth: 2}} /> : <Share size={18} />}
                {exporting ? 'Downloading...' : 'Download Image'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowStoryModal(false)} disabled={exporting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
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


