"use client";
import { useState, useEffect } from 'react';
import { preferenceAPI, movieAPI } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { motion } from 'framer-motion';
import { Save, AlertCircle, RotateCcw } from 'lucide-react';

export default function Preferences() {
  const { user } = useAuth();
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [preferences, setPreferences] = useState({
    preferredGenres: [] as string[],
    minRating: 0,
    startYear: '',
    endYear: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    
    Promise.all([
      movieAPI.getGenres(),
      preferenceAPI.getPreferences().catch(() => null)
    ]).then(([genreList, userPrefs]) => {
      setGenres(genreList);
      if (userPrefs) {
        setPreferences({
          preferredGenres: userPrefs.preferredGenres ? userPrefs.preferredGenres.map(String) : [],
          minRating: userPrefs.minRating || 0,
          startYear: userPrefs.startYear || '',
          endYear: userPrefs.endYear || '',
        });
      }
      setLoading(false);
    });
  }, [user]);

  const toggleGenre = (genreId: string) => {
    setPreferences(prev => {
      const isSelected = prev.preferredGenres.includes(genreId);
      return {
        ...prev,
        preferredGenres: isSelected
          ? prev.preferredGenres.filter(id => id !== genreId)
          : [...prev.preferredGenres, genreId]
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const isCompletelyEmpty = preferences.preferredGenres.length === 0 && (!preferences.minRating || Number(preferences.minRating) === 0) && !preferences.startYear && !preferences.endYear;
      
      if (isCompletelyEmpty) {
        setMessage('Please select at least one filter before saving. Use the Clear button to rely on personalized suggestions.');
        setSaving(false);
        return;
      }

      await preferenceAPI.updatePreferences({
        preferredGenres: preferences.preferredGenres.map(Number),
        minRating: Number(preferences.minRating),
        startYear: preferences.startYear ? Number(preferences.startYear) : null,
        endYear: preferences.endYear ? Number(preferences.endYear) : null,
      });
      
      let msg = 'Preferences saved successfully!';
      const blanks = [];
      if (preferences.preferredGenres.length === 0) blanks.push('Genres');
      if (!preferences.minRating || Number(preferences.minRating) === 0) blanks.push('a Minimum Rating');
      if (!preferences.startYear && !preferences.endYear) blanks.push('a Release Year');
      
      if (blanks.length > 0) {
        let blanksText = blanks[0];
        if (blanks.length === 2) blanksText = `${blanks[0]} or ${blanks[1]}`;
        else if (blanks.length === 3) blanksText = `${blanks[0]}, ${blanks[1]}, or ${blanks[2]}`;
        
        msg = `Saved! Just a heads up, you didn't select ${blanksText}.`;
      }
      
      setMessage(msg);
      setTimeout(() => setMessage(''), 5000);
    } catch (err: any) {
      setMessage('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <h2>Sign in to view preferences</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <motion.div 
      className="container" 
      style={{ paddingTop: '100px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 style={{ marginBottom: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '3rem', letterSpacing: '-0.04em' }}>
        my <span style={{ textTransform: 'uppercase' }} className="gradient-text">PREFERENCES</span>
      </h1>
      
      <form onSubmit={handleSave} className="preferences-form" style={{ textAlign: 'left' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '3rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--border-glass)', maxWidth: '650px', margin: '0 auto 3rem auto' }}>
          
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontSize: '2rem', fontWeight: 800 }}>FAVORITE GENRES</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1rem' }}>
              Select the genres you enjoy. This helps us personalize your recommendations.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-start' }}>
              {genres.map(genre => {
                const isSelected = preferences.preferredGenres.includes(String(genre.id));
                return (
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: isSelected ? 0 : 2 }}
                    whileTap={{ scale: 0.9 }}
                    key={genre.id}
                    type="button"
                    onClick={() => toggleGenre(String(genre.id))}
                    style={{
                      padding: '0.6rem 1.4rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem',
                      border: `1px solid ${isSelected ? 'var(--text-primary)' : 'var(--border-glass)'}`,
                      background: isSelected ? 'var(--text-primary)' : 'var(--bg-primary)',
                      color: isSelected ? 'var(--bg-primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'background 0.3s, color 0.3s',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {genre.name}
                  </motion.button>
                );
              })}
            </div>
          </div>          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontSize: '2rem', fontWeight: 800 }}>MINIMUM RATING: {preferences.minRating}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1rem' }}>
              Only show movies with this rating or higher on TMDB.
            </p>
            <input 
              type="range"
              className="input-field"
              style={{ width: '100%' }}
              min="0" max="10" step="0.5"
              value={preferences.minRating}
              onChange={(e) => setPreferences(prev => ({ ...prev, minRating: Number(e.target.value) }))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              <span>0 (Any)</span>
              <span>10 (Masterpiece)</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem', fontWeight: 700 }}>RELEASE YEAR FROM</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 1990"
                style={{ textAlign: 'center', background: 'var(--bg-primary)' }}
                value={preferences.startYear}
                onChange={(e) => setPreferences(prev => ({ ...prev, startYear: e.target.value }))}
              />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem', fontWeight: 700 }}>RELEASE YEAR TO</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 2024"
                style={{ textAlign: 'center', background: 'var(--bg-primary)' }}
                value={preferences.endYear}
                onChange={(e) => setPreferences(prev => ({ ...prev, endYear: e.target.value }))}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '3rem' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={async () => {
                  setPreferences({ preferredGenres: [], minRating: 0, startYear: '', endYear: '' });
                  setMessage('Clearing...');
                  try {
                    await preferenceAPI.updatePreferences({ preferredGenres: [], minRating: 0, startYear: null, endYear: null });
                    setMessage('Preferences cleared. Personalized recommendations reactivated!');
                    setTimeout(() => setMessage(''), 5000);
                  } catch (e) {
                    setMessage('Failed to clear preferences.');
                  }
                }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <RotateCcw size={18} style={{ marginRight: '8px' }}/> CLEAR PREFERENCES
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : <><Save size={18} style={{ marginRight: '8px' }}/> SAVE PREFERENCES</>}
              </button>
            </div>
            {message && (
              <motion.span 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                style={{ 
                  color: message.includes('Failed') || message.includes('Please') ? '#ef4444' : '#10b981', 
                  display: 'inline-block', 
                  textAlign: 'center', 
                  maxWidth: '500px',
                  lineHeight: '1.5'
                }}
              >
                <AlertCircle size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} /> 
                {message}
              </motion.span>
            )}
          </div>
        </div>

      </form>
    </motion.div>
  );
}

