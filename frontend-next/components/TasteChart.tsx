"use client";
import { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface TasteChartProps {
  movies: any[];
}

export default function TasteChart({ movies }: TasteChartProps) {
  const data = useMemo(() => {
    const genreCounts: Record<string, number> = {};
    
    // Aggregate genre frequency from all watched movies
    movies.forEach(movie => {
      if (movie.genres && Array.isArray(movie.genres)) {
        movie.genres.forEach((g: any) => {
          if (g && g.name) {
            genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
          }
        });
      }
    });

    if (Object.keys(genreCounts).length === 0) return [];

    // Format for Recharts Radar
    const maxCount = Math.max(...Object.values(genreCounts));
    return Object.entries(genreCounts)
      .map(([name, count]) => ({
        subject: name,
        score: count,
        fullMark: maxCount + 1,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Top 8 genres to keep the radar chart readable
  }, [movies]);

  if (data.length === 0) return null;

  return (
    <div style={{ width: '100%', height: '350px', marginTop: '20px', marginBottom: '40px' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '10px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        Your Taste Profile
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="var(--border-glass)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--text-primary)', borderRadius: '8px', color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Radar
            name="Movies Watched"
            dataKey="score"
            stroke="var(--text-primary)"
            fill="var(--text-primary)"
            fillOpacity={0.4}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
