"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon, Clapperboard, User, Menu, X, LogIn } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent, useAnimation } from 'framer-motion';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuth();
  const { scrollY } = useScroll();
  const controls = useAnimation();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  // Next.js CSS Hydration guarantee
  const navStyles = `
    .nav-desktop-only { display: flex; }
    .nav-mobile-only { display: none; }
    @media (max-width: 900px) {
      .nav-desktop-only { display: none !important; }
      .nav-mobile-only { display: flex !important; }
    }
  `;

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Collapse mobile menu organically if dragged to desktop boundary
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900 && mobileMenuOpen) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  const isActive = (path: string) => pathname === path ? 'active' : '';

  const renderLinks = (isMobile = false) => (
    <>
      <Link href="/" className={isActive('/')} onClick={() => isMobile && setMobileMenuOpen(false)}>Home</Link>
      <Link href="/discover" className={isActive('/discover')} onClick={() => isMobile && setMobileMenuOpen(false)}>Discover</Link>
      {mounted && user && (
        <>
          <Link href="/watchlist" className={isActive('/watchlist')} onClick={() => isMobile && setMobileMenuOpen(false)}>Watchlist</Link>
          <Link href="/history" className={isActive('/history')} onClick={() => isMobile && setMobileMenuOpen(false)}>History</Link>
        </>
      )}
    </>
  );

  const renderThemeToggle = () => {
    if (!mounted) return <div style={{ width: 36, height: 36 }} />;
    return (
      <button 
        onClick={toggleTheme} 
        className="btn-ghost theme-toggle-btn"
        title="Toggle theme"
        style={{ padding: '8px', borderRadius: '50%', display: 'flex', color: 'var(--text-primary)' }}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
    );
  };

  return (
    <nav 
      className="navbar" 
      id="main-navbar"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', backdropFilter: 'none' }}
    >
      <style dangerouslySetInnerHTML={{ __html: navStyles }} />
      <div className="container" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" className="navbar-brand" onClick={() => setMobileMenuOpen(false)}>
          <Clapperboard className="icon" size={28} style={{ color: 'var(--text-primary)' }} />
          <span className="gradient-text">MovieAssist</span>
        </Link>

        {/* Desktop Elements */}
        <div className="navbar-links nav-desktop-only">
          {renderLinks(false)}
        </div>

        <div className="navbar-auth nav-desktop-only" style={{ alignItems: 'center', gap: '1rem' }}>
          {renderThemeToggle()}
          
          {mounted && user ? (
            <>
              <Link href="/preferences" className="btn-ghost" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <User size={16} /> {user.name}
              </Link>
              <button className="btn btn-ghost" onClick={() => logout()} id="logout-btn">
                Logout
              </button>
            </>
          ) : mounted ? (
            <>
              <Link href="/login" className="btn btn-ghost" id="login-link">Sign In</Link>
              <Link href="/register" className="btn btn-primary" id="register-link">Get Started</Link>
            </>
          ) : <div style={{ width: 150, height: 36 }} />}
        </div>

        {/* Mobile Persistent Actions */}
        <div className="mobile-actions nav-mobile-only" style={{ alignItems: 'center', gap: '0.25rem', zIndex: 110 }}>
          {renderThemeToggle()}
          {mounted && user && (
            <Link href="/preferences" className="btn-ghost" style={{ padding: '8px', display: 'flex', color: 'var(--text-primary)', borderRadius: '50%' }} onClick={() => setMobileMenuOpen(false)}>
              <User size={20} />
            </Link>
          )}
          {mounted && !user && (
            <Link href="/login" className="btn-ghost" style={{ padding: '8px', display: 'flex', color: 'var(--text-primary)', borderRadius: '50%' }}>
              <LogIn size={20} />
            </Link>
          )}
          <button className="mobile-toggle btn-ghost" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ padding: '8px', display: 'flex' }}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'show' : ''}`}>
        <div className="mobile-links">
          {renderLinks(true)}
        </div>
        <div className="mobile-auth" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mounted && user ? (
            <button className="btn btn-ghost" onClick={() => { logout(); setMobileMenuOpen(false); }} style={{ width: '100%', justifyContent: 'center' }}>
              Logout
            </button>
          ) : mounted ? (
            <>
              <Link href="/login" className="btn btn-ghost" onClick={() => setMobileMenuOpen(false)} style={{ width: '100%', justifyContent: 'center' }}>Sign In</Link>
              <Link href="/register" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)} style={{ width: '100%', justifyContent: 'center' }}>Get Started</Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
