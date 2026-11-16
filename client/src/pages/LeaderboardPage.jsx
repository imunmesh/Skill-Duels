import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaderboardAPI } from '../services/api';
import {
  Trophy,
  Globe,
  Calendar,
  Flame,
  Award,
  Crown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const LeaderboardPage = ({ onBackToArena }) => {
  const { user } = useAuth();
  const [leaderboardType, setLeaderboardType] = useState('global'); // 'global' | 'weekly'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load Leaderboard
  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const fetchFn =
        leaderboardType === 'global' ? leaderboardAPI.getGlobal : leaderboardAPI.getWeekly;
      const res = await fetchFn(currentPage, 15);
      if (res.success) {
        setLeaderboardData(res.leaderboard || []);
        setTotalPages(res.totalPages || 1);
        setTotalPlayers(res.totalPlayers || 0);
      }
    } catch (err) {
      console.warn('Could not load leaderboard:', err.message);
    } finally {
      setLoading(false);
    }
  }, [leaderboardType, currentPage]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <main className="container" style={{ maxWidth: 1000, paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      {/* Header & Back Link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onBackToArena}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', minHeight: 36 }}
          >
            <ChevronLeft size={16} />
            <span>Back to Arena</span>
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={22} color="#f59e0b" />
              <span>Leaderboards</span>
            </h1>
          </div>
        </div>

        {/* Global vs Weekly Selector */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-input)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setLeaderboardType('global');
              setCurrentPage(1);
            }}
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              background: leaderboardType === 'global' ? 'var(--accent-primary)' : 'transparent',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Globe size={14} />
            Global Rankings (All Time)
          </button>
          <button
            type="button"
            onClick={() => {
              setLeaderboardType('weekly');
              setCurrentPage(1);
            }}
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              background: leaderboardType === 'weekly' ? 'var(--accent-primary)' : 'transparent',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Calendar size={14} />
            Weekly Rankings (This Week)
          </button>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>
            Showing standings for{' '}
            <strong style={{ color: '#818cf8' }}>
              {leaderboardType === 'global' ? 'All Time XP' : 'This Week\'s XP'}
            </strong>
          </span>
          <span>{totalPlayers} Total Players Ranked</span>
        </div>

        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem', width: 60, textAlign: 'center' }}>Rank</th>
                <th style={{ padding: '0.85rem 1rem' }}>Player</th>
                <th className="hide-on-mobile" style={{ padding: '0.85rem 1rem' }}>Tier</th>
                <th style={{ padding: '0.85rem 1rem' }}>Streak</th>
                <th className="hide-on-mobile" style={{ padding: '0.85rem 1rem' }}>Badges</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                  {leaderboardType === 'weekly' ? 'Weekly XP' : 'Total XP'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading standings...
                  </td>
                </tr>
              ) : leaderboardData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No players ranked yet. Play a match to climb the ranks!
                  </td>
                </tr>
              ) : (
                leaderboardData.map((row) => {
                  const isMe = row.id === user?._id;
                  const isTop3 = row.position <= 3;
                  const medalColor =
                    row.position === 1 ? '#f59e0b' : row.position === 2 ? '#94a3b8' : '#b45309';

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: isMe ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      }}
                    >
                      {/* Rank Position */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {isTop3 ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: `${medalColor}25`,
                              color: medalColor,
                              fontWeight: 800,
                            }}
                          >
                            {row.position === 1 ? <Crown size={16} /> : row.position}
                          </div>
                        ) : (
                          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                            #{row.position}
                          </span>
                        )}
                      </td>

                      {/* Username */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: isMe ? '#818cf8' : '#ffffff' }}>
                            {row.displayName || row.username}
                          </span>
                          {row.displayName && row.displayName !== row.username && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              @{row.username}
                            </span>
                          )}
                          {isMe && (
                            <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rank Tier */}
                      <td className="hide-on-mobile" style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                          {row.rank}
                        </span>
                      </td>

                      {/* Streak */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fca5a5' }}>
                          <Flame size={14} />
                          <span>{row.streak || 0}</span>
                        </div>
                      </td>

                      {/* Badges count */}
                      <td className="hide-on-mobile" style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Award size={14} color="#fcd34d" />
                          <span>{row.badgesCount || 0}</span>
                        </div>
                      </td>

                      {/* XP */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: '#fcd34d',
                          fontSize: '1rem',
                        }}
                      >
                        {(leaderboardType === 'weekly' ? row.weeklyXP : row.xp) || 0} XP
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', minHeight: 32, fontSize: '0.8rem' }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', minHeight: 32, fontSize: '0.8rem' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
