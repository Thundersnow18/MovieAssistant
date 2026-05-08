"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { movieAPI } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import MovieCard from "@/components/MovieCard";
import StoryCard, { StoryTheme } from "@/components/StoryCard";
import * as htmlToImage from 'html-to-image';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Share, Check, Lock } from 'lucide-react';

export default function Onboarding() {
  const [step, setStep] = useState(0); // 0: Name, 1: Selection, 2: Result
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [storyTheme, setStoryTheme] = useState<StoryTheme>('dark');
  const [exporting, setExporting] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();
  const storyCardRef = useRef<HTMLDivElement>(null);

  // Check localStorage on mount in case they just returned from login
  useEffect(() => {
    const savedName = localStorage.getItem('taste_dna_name');
    const savedMovies = localStorage.getItem('taste_dna_movies');
    if (savedMovies) {
      try {
        const parsedMovies = JSON.parse(savedMovies);
        if (parsedMovies.length >= 5) {
          setName(savedName || (user?.name || 'Guest'));
          setSelectedMovies(parsedMovies);
          setStep(2); // Jump straight to result
        }
      } catch(e) {}
    }
  }, [user]);

  // Fetch trending movies for initial selection view
  useEffect(() => {
    if (step === 1 && trendingMovies.length === 0) {
      setLoading(true);
      movieAPI.trending('week', 1)
        .then(data => setTrendingMovies(data.results.slice(0, 20)))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [step]);

  // Debounced Search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      setLoading(true);
      movieAPI.search(searchQuery, 1)
        .then(data => setSearchResults(data.results.slice(0, 10)))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const toggleMovie = (movie: any) => {
    if (selectedMovies.find(m => m.id === movie.id)) {
      setSelectedMovies(selectedMovies.filter(m => m.id !== movie.id));
    } else {
      if (selectedMovies.length < 5) {
        setSelectedMovies([...selectedMovies, movie]);
      }
    }
  };

  const generateDNA = async () => {
    if (selectedMovies.length < 5) return;
    
    // We need to fetch full details (runtime, genres) for the selected movies
    setLoading(true);
    try {
      const detailedMovies = await Promise.all(
        selectedMovies.map(m => movieAPI.getMovieDetails(m.id).catch(() => m))
      );
      setSelectedMovies(detailedMovies);
      setStep(2);
    } catch (e) {
      console.error("Failed to enrich movies", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      // Save state and redirect to login
      localStorage.setItem('taste_dna_name', name);
      localStorage.setItem('taste_dna_movies', JSON.stringify(selectedMovies));
      router.push('/login?redirect=/onboarding');
      return;
    }

    if (!storyCardRef.current) return;
    try {
      setExporting(true);
      await new Promise(r => setTimeout(r, 200));
      const dataUrl = await htmlToImage.toPng(storyCardRef.current, { pixelRatio: 2, cacheBust: false });
      const link = document.createElement('a');
      link.download = `${name.toLowerCase()}-taste-dna.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '100px', minHeight: '100vh' }}>
      
      {/* STEP 0: NAME */}
      {step === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', marginBottom: '16px' }}>What's your name?</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>We'll use this to personalize your Taste DNA card.</p>
          
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Your Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) setStep(1); }}
              autoFocus
              style={{ fontSize: '1.2rem', padding: '16px 24px', textAlign: 'center' }}
            />
          </div>
          
          <button 
            className="btn btn-primary" 
            onClick={() => setStep(1)} 
            disabled={!name.trim()}
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            Next <ArrowRight size={20} />
          </button>
        </motion.div>
      )}

      {/* STEP 1: SELECTION */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '8px' }}>Pick your Top 5 Movies</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Select 5 of your all-time favorites to generate your DNA.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '40px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{
                width: '60px', height: '85px', borderRadius: '8px', 
                background: selectedMovies.length >= i ? 'var(--accent-primary)' : 'var(--bg-glass)',
                border: selectedMovies.length >= i ? 'none' : '2px dashed var(--border-glass)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative'
              }}>
                {selectedMovies[i - 1] ? (
                  <>
                    <img src={`https://image.tmdb.org/t/p/w200${selectedMovies[i-1].poster_path}`} alt="poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={24} color="#fff" />
                    </div>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>{i}</span>
                )}
              </div>
            ))}
          </div>

          {selectedMovies.length === 5 && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
              <button 
                className="btn btn-primary" 
                onClick={generateDNA} 
                disabled={loading}
                style={{ padding: '16px 40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {loading ? 'Analyzing DNA...' : 'Generate My Taste DNA'} <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          <div style={{ maxWidth: '600px', margin: '0 auto 40px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search for a movie..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '48px', fontSize: '1.1rem' }}
            />
          </div>

          <div className="movie-grid">
            {(searchQuery.length > 1 ? searchResults : trendingMovies).map(movie => {
              const isSelected = !!selectedMovies.find(m => m.id === movie.id);
              return (
                <div key={movie.id} onClick={() => toggleMovie(movie)} style={{ cursor: 'pointer', position: 'relative' }}>
                  <div style={{ opacity: (selectedMovies.length === 5 && !isSelected) ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                    <MovieCard movie={movie} onSelect={() => {}} />
                  </div>
                  {isSelected && (
                    <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-primary)', opacity: 0.3, borderRadius: '12px', pointerEvents: 'none' }} />
                  )}
                  {isSelected && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--accent-primary)', borderRadius: '50%', padding: '4px', zIndex: 10 }}>
                      <Check size={16} color="#000" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* STEP 2: RESULT */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '8px' }}>Your Taste DNA is ready.</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Based on your 5 favorite movies.</p>
          </div>

          <div className="story-scale-container" style={{ marginBottom: '30px' }}>
            <div>
              <StoryCard 
                ref={storyCardRef} 
                movies={selectedMovies} 
                username={name} 
                theme={storyTheme} 
                totalHistoryOverride={selectedMovies.length} 
                showRoast={true}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
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

          <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleDownload} 
              disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 32px', fontSize: '1.1rem', justifyContent: 'center' }}
            >
              {exporting ? <div className="spinner" style={{width: 20, height: 20, borderWidth: 2}} /> : (user ? <Share size={20} /> : <Lock size={20} />)}
              {exporting ? 'Downloading...' : (user ? 'Download Image' : 'Sign in to Download & Save')}
            </button>
            
            {!user && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center' }}>
                Create a free account to download your image and save these movies to your watchlist.
              </p>
            )}
            
            <button className="btn btn-ghost" onClick={() => {
              setSelectedMovies([]);
              setStep(1);
            }}>
              Start Over
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
}
