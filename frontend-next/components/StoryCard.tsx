"use client";
import React, { forwardRef, useState, useEffect } from 'react';
import { Film, Clock, Star, TrendingUp } from 'lucide-react';

export type StoryTheme = 'dark' | 'crimson' | 'cyber' | 'light';

interface StoryCardProps {
  movies: any[];
  fullTasteMovies?: any[];
  username: string;
  theme?: StoryTheme;
  totalHistoryOverride?: number;
}

const themeStyles = {
  dark: { bg: '#050505', text: '#FFFFFF', accent: 'rgba(255,255,255,0.1)', grad: 'rgba(5,5,5,0.3) 0%, rgba(5,5,5,1)', dot: 'rgba(255,255,255,0.08)' },
  crimson: { bg: '#0C0000', text: '#FFFFFF', accent: 'rgba(255,50,50,0.25)', grad: 'rgba(12,0,0,0.3) 0%, rgba(12,0,0,1)', dot: 'rgba(255,50,50,0.12)' },
  cyber: { bg: '#00050C', text: '#FFFFFF', accent: 'rgba(50,150,255,0.25)', grad: 'rgba(0,5,12,0.3) 0%, rgba(0,5,12,1)', dot: 'rgba(50,150,255,0.12)' },
  light: { bg: '#F8F9FA', text: '#111111', accent: 'rgba(0,0,0,0.06)', grad: 'rgba(248,249,250,0.3) 0%, rgba(248,249,250,1)', dot: 'rgba(0,0,0,0.08)' },
};

const StoryCard = forwardRef<HTMLDivElement, StoryCardProps>(({ movies, fullTasteMovies, username, theme = 'dark', totalHistoryOverride }, ref) => {
  const [base64Bg, setBase64Bg] = useState<string>('');

  const totalMovies = totalHistoryOverride || movies?.length || 0;
  if (!totalMovies) return null;

  const validRuntimeMovies = movies.filter(m => m.runtime);
  const avgRuntime = validRuntimeMovies.length > 0
    ? validRuntimeMovies.reduce((acc, m) => acc + (m.runtime || 0), 0) / validRuntimeMovies.length
    : 110;
  const totalMinutes = avgRuntime * totalMovies;
  const totalHours = Math.round(totalMinutes / 60);

  const genreSource = fullTasteMovies?.length ? fullTasteMovies : movies;
  const genreCounts: Record<string, number> = {};
  genreSource.forEach(m => {
    m.genres?.forEach((g: any) => {
      if (g && g.name) genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0]);

  const processedDirMovieIds = new Set<number>();
  const directorCounts: Record<string, number> = {};

  // Track dynamically across the deep DB history
  fullTasteMovies?.forEach(m => {
    const dir = m.credits?.director?.name;
    if (dir) {
      directorCounts[dir] = (directorCounts[dir] || 0) + 1;
      if (m.id) processedDirMovieIds.add(m.id);
    }
  });

  // Gracefully fallback to harvest currently loaded TMDB memory for missing legacy history 
  movies.forEach(m => {
    if (m.id && !processedDirMovieIds.has(m.id)) {
      const dir = m.credits?.director?.name;
      if (dir) directorCounts[dir] = (directorCounts[dir] || 0) + 1;
    }
  });
  const topDirector = Object.entries(directorCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  const bestMovie = [...movies].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0];
  const bgImage = bestMovie?.backdrop_path 
    ? `https://image.tmdb.org/t/p/w1280${bestMovie.backdrop_path}` 
    : '';

  // Converts native remote images to explicit DataURL Base64 arrays preventing DOM Culling Taints permanently
  useEffect(() => {
    if (bgImage) {
      fetch(bgImage)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => setBase64Bg(reader.result as string);
          reader.readAsDataURL(blob);
        })
        .catch(() => setBase64Bg(''));
    }
  }, [bgImage]);

  const style = themeStyles[theme];

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: '400px',
        height: '711px',
        background: style.bg,
        color: style.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Base64 Backdrop guarantees Chrome Canvas can read it securely */}
      {base64Bg && (
        <img 
          src={base64Bg}
          alt="bg"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: theme === 'light' ? 0.2 : 0.4,
            filter: 'grayscale(60%) contrast(1.1)',
            zIndex: 0
          }} 
        />
      )}
      
      {/* 2. Dotted overlay strictly injecting the brand geometric identity natively */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(${style.dot} 1.5px, transparent 1.5px)`,
        backgroundSize: '24px 24px',
        zIndex: 1
      }} />

      {/* 3. Base thematic interceptor matching color parameters explicitly */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(to bottom, ${style.grad} 85%)`,
        zIndex: 2
      }} />

      <div style={{ position: 'relative', zIndex: 10, padding: '40px 30px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 'auto', marginTop: '15px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {username}'s<br/>Taste DNA
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: style.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
              <Film size={24} color={style.text} />
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: 0, lineHeight: 1 }}>{totalMovies}</div>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginTop: '4px' }}>Movies Logged</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: style.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
              <Clock size={24} color={style.text} />
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: 0, lineHeight: 1 }}>{totalHours}<span style={{fontSize: '1.2rem', marginLeft: '4px'}}>hrs</span></div>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginTop: '4px' }}>Time Spent Watching</div>
            </div>
          </div>

          {topDirector !== 'Unknown' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: style.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                <Star size={24} color={style.text} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{topDirector}</div>
                <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginTop: '4px' }}>Favorite Director</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} /> Top Genres
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topGenres.map(g => (
              <span key={g} style={{
                padding: '8px 16px',
                borderRadius: '20px',
                background: style.accent,
                border: `1px solid ${style.dot}`,
                fontSize: '0.9rem',
                fontWeight: 600,
                backdropFilter: 'blur(10px)'
              }}>
                {g}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `1px solid ${style.dot}`, paddingTop: '20px' }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
            Movie<span style={{opacity: 0.5}}>Assistant</span>
          </div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
            Watch History
          </div>
        </div>
      </div>
    </div>
  );
});

StoryCard.displayName = 'StoryCard';
export default StoryCard;
