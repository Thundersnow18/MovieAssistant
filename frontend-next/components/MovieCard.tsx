"use client";
import { useState } from 'react';
import { savedAPI } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Bookmark, BookmarkCheck, Play, Star, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

interface MovieCardProps {
  movie: any;
  onSelect: (movie: any) => void;
}

export default function MovieCard({ movie, onSelect }: MovieCardProps) {
  const { user, savedIds, watchedIds, addSavedId } = useAuth();
  const [imgError, setImgError] = useState(false);
  
  const isSaved = savedIds.has(movie.id);
  const isWatched = watchedIds.has(movie.id);
  
  const rating = movie.vote_average?.toFixed(1);
  const ratingClass = movie.vote_average >= 7 ? 'high' : movie.vote_average >= 5 ? 'medium' : 'low';
  const year = movie.release_date?.substring(0, 4) || '—';
  const poster = movie.poster_path
    ? `${TMDB_IMG}${movie.poster_path}`
    : null;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isSaved) return;
    try {
      await savedAPI.addToSaved(movie.id);
      addSavedId(movie.id);
    } catch {
      addSavedId(movie.id);
    }
  };

  return (
    <motion.div 
      className="movie-card" 
      onClick={() => onSelect(movie)} 
      id={`movie-card-${movie.id}`}
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="movie-card-poster">
        {poster && !imgError ? (
          <img src={poster} alt={movie.title} loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <div className="empty-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-glass)' }}>
            <Play size={40} color="var(--text-muted)" />
          </div>
        )}
        
        <div className={`movie-card-rating ${ratingClass}`}>
          <Star size={12} style={{ marginRight: '4px' }} fill="currentColor" /> {rating}
        </div>
        
        {isWatched && (
          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '6px', borderRadius: '50%', color: 'var(--text-primary)', display: 'flex', border: '1px solid var(--border-glass)', zIndex: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} title="Watched">
            <Check size={16} strokeWidth={3} />
          </div>
        )}

        <div className="movie-card-overlay">
          <div className="movie-card-actions">
            {user && (
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`movie-card-action-btn ${isSaved ? 'active' : ''}`} 
                onClick={handleSave} 
                title="Add to watchlist"
              >
                {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </motion.button>
            )}
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="movie-card-action-btn primary" 
              title="View details"
            >
              <Play size={18} fill="currentColor" />
            </motion.button>
          </div>
        </div>
      </div>
      
      <div className="movie-card-info">
        <div className="movie-card-title">{movie.title}</div>
        <div className="movie-card-year">{year}</div>
      </div>
    </motion.div>
  );
}

