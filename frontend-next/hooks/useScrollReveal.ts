"use client";
import { useEffect, useRef } from 'react';

/**
 * Custom hook that adds Intersection Observer-based scroll reveal animations.
 * Apply the returned ref to a container, then add classes like
 * 'scroll-reveal', 'scroll-reveal-left', 'scale-in', 'stagger-children'
 * to child elements.
 */
export function useScrollReveal(deps: any[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Delay slightly to ensure DOM mapping is definitively painted
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const elements = container.querySelectorAll(
        '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scale-in, .stagger-children'
      );

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );

      elements.forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }, 50);

    return () => clearTimeout(timer);
  }, deps);

  return containerRef;
}
