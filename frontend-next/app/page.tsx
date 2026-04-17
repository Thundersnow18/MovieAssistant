"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { movieAPI } from "@/api/client";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { motion, useScroll, useTransform } from 'framer-motion';
import { Filter, Zap, Bookmark, Compass } from 'lucide-react';

export default function Landing() {
  const [trending, setTrending] = useState<any[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<number | null>(null);
  const scrollRef = useScrollReveal();
  const { scrollY } = useScroll();
  
  // Unified Hero Parallax
  const heroOpacity = useTransform(scrollY, [0, 800], [1, 0]);
  const heroY = useTransform(scrollY, [0, 800], [0, -150]);
  const heroScale = useTransform(scrollY, [0, 800], [1, 1.15]);
  const heroBlur = useTransform(scrollY, [0, 800], ["blur(0px)", "blur(20px)"]);

  // Features Section Parallax
  const featuresRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: featuresProgress } = useScroll({ target: featuresRef, offset: ["start start", "end start"] });
  const featuresOpacity = useTransform(featuresProgress, [0.5, 1], [1, 0]);
  const featuresY = useTransform(featuresProgress, [0.5, 1], [0, -50]);

  // Trending Section Parallax
  const trendingRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: trendingProgress } = useScroll({ target: trendingRef, offset: ["start start", "end start"] });
  const trendingOpacity = useTransform(trendingProgress, [0.5, 1], [1, 0]);
  const trendingY = useTransform(trendingProgress, [0.5, 1], [0, -50]);

  useEffect(() => {
    movieAPI.trending('week', 1)
      .then((data) => setTrending(data.results?.slice(0, 12) || []))
      .catch((error: any) => console.log('Network interruption on landing page trending fetch:', error?.message));
  }, []);

  return (
    <div ref={scrollRef}>
      {/* ─── Hero ─── */}
      <motion.section 
        className="landing-hero" 
        id="hero"
      >
        <div className="hero-bg" />
        <motion.div 
          className="hero-content"
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale, filter: heroBlur }}
        >
          <motion.div 
            className="hero-badge" 
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >Stop Browsing. Start Watching.</motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="hero-title" style={{ textTransform: 'none', letterSpacing: '-0.04em' }}>
              find your perfect movie<br />
              <span style={{ textTransform: 'uppercase', fontSize: '1.2em', display: 'inline-block', marginTop: '10px' }} className="gradient-text">IN SECONDS</span>
            </h1>
          </motion.div>
          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            No more endless scrolling through Netflix and Prime. 
            Set your filters, hit discover, and get personalized recommendations instantly.
          </motion.p>
          <motion.div 
            className="hero-cta"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/discover" className="btn btn-primary" id="hero-discover-btn">
              DISCOVER MOVIES
            </Link>
            <Link href="/register" className="btn btn-secondary" id="hero-register-btn">
              CREATE ACCOUNT
            </Link>
          </motion.div>
        </motion.div>
        <motion.div 
          className="hero-scroll-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          style={{ opacity: heroOpacity }}
        >
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scroll</span>
          <motion.span
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: 'inline-block' }}
          >
            ↓
          </motion.span>
        </motion.div>
      </motion.section>

      {/* ─── Features ─── */}
      <motion.section 
        className="features-section" 
        id="features"
        ref={featuresRef}
        style={{ opacity: featuresOpacity, y: featuresY }}
      >
        <div className="container">
          <div className="section-header scroll-reveal">
            <div className="section-label">How It Works</div>
            <h2 className="section-title">
              Three Steps to Your <span className="gradient-text">Perfect Movie</span>
            </h2>
            <p className="section-subtitle">
              We combine smart filters with TMDB's massive database to find exactly what you want.
            </p>
          </div>

          <div className="features-grid stagger-children visible">
            <motion.div whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} className="feature-card">
              <div className="feature-icon"><Filter size={24} color="var(--text-primary)" /></div>
              <h3>Set Your Filters</h3>
              <p>Choose genres, minimum rating, year range, and sort order. Be as specific or broad as you like.</p>
            </motion.div>
            <motion.div whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} className="feature-card">
              <div className="feature-icon"><Zap size={24} color="var(--text-primary)" /></div>
              <h3>Instant Results</h3>
              <p>Our engine queries TMDB's database of 900,000+ movies and returns matching results in milliseconds.</p>
            </motion.div>
            <motion.div whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} className="feature-card">
              <div className="feature-icon"><Bookmark size={24} color="var(--text-primary)" /></div>
              <h3>Save & Track</h3>
              <p>Build your watchlist, mark movies as watched, and never get the same recommendation twice.</p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ─── Trending ─── */}
      <motion.section 
        className="trending-section" 
        id="trending"
        ref={trendingRef}
        style={{ opacity: trendingOpacity, y: trendingY, display: trending.length > 0 ? 'block' : 'none' }}
      >
        <div className="container">
          <div className="section-header scroll-reveal">
            <div className="section-label">Trending Now</div>
            <h2 className="section-title">
              What Everyone's <span className="gradient-text">Watching</span>
            </h2>
          </div>

          <motion.div 
            className="trending-row"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
          >
            {trending.map((movie) => (
              <motion.div 
                key={movie.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
                }}
              >
                <MovieCard
                  movie={movie}
                  onSelect={(m) => setSelectedMovie(m.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ─── CTA ─── */}
      <section style={{ padding: '100px 0 140px', position: 'relative' }}>
        {/* Ambient Glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60vw', height: '60vw', background: 'radial-gradient(circle, var(--text-primary) 0%, transparent 60%)', opacity: 0.03, filter: 'blur(100px)', zIndex: -1, pointerEvents: 'none' }} />
        
        <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <motion.div 
            className="glass-card scroll-reveal" 
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
            padding: 'clamp(60px, 10vw, 80px) 20px clamp(40px, 8vw, 64px)',
            textAlign: 'center',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-glass)',
            borderRadius: '32px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Subtle inner grid/dots overlay */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.1,
                marginBottom: '20px',
                color: 'var(--text-primary)'
              }}>
                ready to find your next<br /><span className="gradient-text" style={{ textTransform: 'uppercase' }}>FAVORITE MOVIE?</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 40px' }}>
                Join now and never waste time browsing again. Let our Taste DNA engine do the heavy lifting.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ display: 'inline-block' }}>
                <Link href="/discover" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={20} /> START DISCOVERING
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {selectedMovie && (
        <MovieModal movieId={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
}


