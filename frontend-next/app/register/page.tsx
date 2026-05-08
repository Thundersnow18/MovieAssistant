"use client";
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { historyAPI } from "@/api/client";

function RegisterContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      
      const redirectUrl = searchParams.get('redirect') || '/discover';
      if (redirectUrl === '/onboarding') {
        const localMovies = localStorage.getItem('taste_dna_movies');
        if (localMovies) {
          try {
            const moviesArray = JSON.parse(localMovies);
            for (const movie of moviesArray) {
              await historyAPI.addToHistory(movie.id, 'movie').catch(() => {});
            }
          } catch(e) {}
        }
      }
      
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" id="register-card">
        <h1>Get <span className="gradient-text">Started</span></h1>
        <p className="subtitle">Create an account to save your preferences and watchlist</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="register-name">Name</label>
            <input
              id="register-name"
              className="input-field"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              className="input-field"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            id="register-submit"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}


