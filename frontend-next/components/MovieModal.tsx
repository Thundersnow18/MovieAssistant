"use client";
import { useState, useEffect } from 'react';
import { movieAPI, savedAPI, historyAPI } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Eye, Bookmark, Check, PlaySquare } from 'lucide-react';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w1280';
const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';

interface MovieModalProps {
  movieId: number;
  onClose: () => void;
}

export default function MovieModal({ movieId, onClose }: MovieModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  
  const { user, watchedIds, savedIds, addWatchedId, removeWatchedId, addSavedId } = useAuth();

  const isWatched = watchedIds.has(movieId);
  const isSaved = savedIds.has(movieId);

  const loadMovie = () => {
    setLoading(true);
    setFetchError(false);
    movieAPI.getMovieDetails(movieId)
      .then(setDetails)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMovie();
  }, [movieId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSave = async () => {
    if (!user || isSaved) return;
    try {
      await savedAPI.addToSaved(movieId);
      addSavedId(movieId);
    } catch {
      addSavedId(movieId); // likely already saved
    }
  };

  const handleWatch = async () => {
    if (!user) return;
    try {
      if (isWatched) {
        await historyAPI.removeFromHistory(movieId);
        removeWatchedId(movieId);
      } else {
        const genreIds = details?.genres?.map((g: any) => g.id) || [];
        const directorName = details?.credits?.director?.name || '';
        await historyAPI.addToHistory(movieId, 'movie', genreIds, directorName);
        addWatchedId(movieId);
      }
    } catch (error) {
      // Revert optimism if failed? Currently blindly caching visually
    }
  };

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="modal-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (fetchError && !details) {
    return (
      <div className="modal-backdrop" onClick={onClose} id="movie-modal-error">
        <div className="modal-content" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '16px' }}>Server Timeout</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>It took too long to securely fetch this movie's metadata. Our servers might be experiencing heavy load.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={loadMovie}>Try Again</button>
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="modal-backdrop" onClick={onClose} id="movie-modal-error">
        <div className="modal-content" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '16px' }}>Movie Not Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>We couldn't load the details for this movie. It might be missing from our database.</p>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const backdrop = details.backdrop_path
    ? `${TMDB_IMG}${details.backdrop_path}`
    : null;

  const runtime = details.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} id="movie-modal">
      <div className="modal-content">
        <div className="modal-backdrop-image">
          {backdrop && <img src={backdrop} alt={details.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <h2 className="modal-title">{details.title}</h2>

          <div className="modal-meta">
            <span className="rating">⭐ {details.vote_average?.toFixed(1)}</span>
            <span>{details.release_date?.substring(0, 4)}</span>
            {runtime && <span>{runtime}</span>}
            {details.original_language && (
              <span style={{ textTransform: 'uppercase' }}>{details.original_language}</span>
            )}
          </div>

          {details.genres && (
            <div className="modal-genres">
              {details.genres.map((g: any) => (
                <span key={g.id}>{g.name}</span>
              ))}
            </div>
          )}

          {(() => {
            const providers = details?.['watch/providers']?.results;
            const usProviders = providers?.US?.flatrate || providers?.IN?.flatrate || [];
            const topProviders = usProviders.filter((p: any) => {
              const name = p.provider_name.toLowerCase();
              return name.includes('netflix') || name.includes('prime') || name.includes('jio') || 
                     name.includes('hotstar') || name.includes('disney') || name.includes('hulu') || 
                     name.includes('apple') || name.includes('max') || name.includes('hbo');
            }).slice(0, 3); // Max 3 providers to stay minimal

            const getProviderName = (name: string) => {
              const l = name.toLowerCase();
              if (l.includes('netflix')) return 'NETFLIX';
              if (l.includes('prime')) return 'PRIME VIDEO';
              if (l.includes('jio') || l.includes('hotstar')) return 'JIOHOTSTAR';
              if (l.includes('disney')) return 'DISNEY+';
              if (l.includes('hulu')) return 'HULU';
              if (l.includes('apple')) return 'APPLE TV+';
              if (l.includes('max') || l.includes('hbo')) return 'MAX';
              return name;
            };

            if (topProviders.length === 0) return null;

            return (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', justifyContent: 'center' }}>
                {topProviders.map((p: any) => (
                  <span key={p.provider_id} style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-glass)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <PlaySquare size={12} /> {getProviderName(p.provider_name)}
                  </span>
                ))}
              </div>
            );
          })()}

          <p className="modal-overview">{details.overview}</p>

          {details.credits?.director && (
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Director:</strong>{' '}
              {details.credits.director.name}
            </p>
          )}

          {details.credits?.cast?.length > 0 && (
            <>
              <h3 className="modal-section-title">Cast</h3>
              <div className="modal-cast">
                {details.credits.cast.map((person: any) => (
                  <div className="cast-card" key={person.id}>
                    {person.profile_path ? (
                      <>
                        <img 
                          src={`${TMDB_PROFILE}${person.profile_path}`} 
                          alt={person.name} 
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            if (target.nextElementSibling) {
                              (target.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                        <div style={{
                          display: 'none', width: '64px', height: '64px', borderRadius: '50%',
                          background: 'var(--bg-glass)', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.5rem', margin: '0 auto 6px', border: '1px solid var(--border-glass)'
                        }}>👤</div>
                      </>
                    ) : (
                      <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'var(--bg-glass)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', margin: '0 auto 6px', border: '1px solid var(--border-glass)'
                      }}>👤</div>
                    )}
                    <div className="name">{person.name}</div>
                    <div className="character">{person.character}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {details.trailer && (
            <div style={{ marginTop: '24px' }}>
              <h3 className="modal-section-title">Trailer</h3>
              <a
                href={`https://www.youtube.com/watch?v=${details.trailer.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                ▶ Watch Trailer
              </a>
            </div>
          )}

          <div className="actions-wrapper" style={{ marginTop: '30px', display: 'flex', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
            {user && (
              <>
                <button className={`btn ${isSaved ? 'btn-ghost' : 'btn-primary'}`} onClick={handleSave} disabled={isSaved} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSaved ? <Check size={18} color="var(--text-primary)" /> : <Bookmark size={18} />} 
                  {isSaved ? 'Saved' : 'Add to Watchlist'}
                </button>
                <button className={`btn ${isWatched ? 'btn-ghost' : 'btn-secondary'}`} onClick={handleWatch} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isWatched ? <Check size={18} color="var(--text-primary)" /> : <Eye size={18} />} 
                  {isWatched ? 'Watched' : 'Mark as Watched'}
                </button>
              </>
            )}
            <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: 'auto' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

