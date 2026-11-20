import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaderboardAPI } from '../services/api';
import { ChevronLeft, Flame, Trophy, Zap, Shield, Sparkles } from 'lucide-react';
import PodiumLeaderboard from '../components/ui/podium-leaderboard';
import { getAvatarUrl } from '../utils/avatar';

export const LeaderboardPage = ({ onBackToArena }) => {
  const { user } = useAuth();
  const [leaderboardType, setLeaderboardType] = useState('weekly'); // 'weekly' | 'global'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Load Leaderboard
  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const fetchFn =
        leaderboardType === 'global' ? leaderboardAPI.getGlobal : leaderboardAPI.getWeekly;
      const res = await fetchFn(currentPage, limit);
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
  }, [leaderboardType, currentPage, limit]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Find current user's entry in leaderboard
  const myEntry = leaderboardData.find((p) => String(p.id) === String(user?._id));
  const topStreakPlayers = [...leaderboardData]
    .filter((p) => (p.streak || 0) > 0)
    .sort((a, b) => (b.streak || 0) - (a.streak || 0))
    .slice(0, 3);

  return (
    <main className="container" style={{ maxWidth: 1040, paddingTop: '5.25rem', paddingBottom: '3.5rem' }}>
      {/* Top Back Link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={onBackToArena}
          className="btn btn-secondary"
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.85rem',
            minHeight: 36,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <ChevronLeft size={16} />
          <span>Back to Arena</span>
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Main: Modern Podium Leaderboard Card */}
        <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
          <PodiumLeaderboard
            type={leaderboardType}
            onTypeChange={(t) => {
              setLeaderboardType(t);
              setCurrentPage(1);
            }}
            players={leaderboardData}
            currentUserId={user?._id}
            loading={loading}
            totalPlayers={totalPlayers}
            currentPage={currentPage}
            totalPages={totalPages}
            limit={limit}
            onPageChange={(page) => setCurrentPage(page)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Side Panels: "Your Rank" & "Top Streaks" */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: 400, margin: '0 auto' }}>
          {/* Card 1: Your Rank Snapshot */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Trophy size={18} color="#818cf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>Your Standing</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              {user?.avatarUrl ? (
                <img
                  src={getAvatarUrl(user.avatarUrl)}
                  alt="Avatar"
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #818cf8' }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#ffffff',
                  }}
                >
                  {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                  {user?.displayName || user?.username}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {user?.rank || 'Novice'} &bull; <strong style={{ color: '#818cf8' }}>Rank #{myEntry?.position || '—'}</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.6rem',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '0.75rem',
                borderRadius: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>TOTAL XP</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fcd34d' }}>
                  {(user?.xp || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ACTIVE STREAK</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Flame size={14} color="#ef4444" />
                  <span>{user?.streak?.current || 0}d</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Top Active Streaks */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <Flame size={18} color="#ef4444" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>Top Streaks</h3>
            </div>

            {topStreakPlayers.length === 0 ? (
              <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: 0 }}>
                Play a duel today to begin a daily winning streak!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {topStreakPlayers.map((tp, idx) => (
                  <div
                    key={tp.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.6rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', width: 14 }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                        {tp.displayName || tp.username}
                      </span>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#fca5a5',
                      }}
                    >
                      <Flame size={13} color="#ef4444" />
                      {tp.streak} Days
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Scoring Rules */}
          <div
            className="card"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              padding: '1rem',
              fontSize: '0.8rem',
              color: '#94a3b8',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              &bull; Leaderboard Rules:
            </div>
            <div>&bull; Victory awards <strong>+50 XP</strong></div>
            <div>&bull; Weekly rankings reset every Monday at midnight UTC</div>
            <div>&bull; Consecutive battle days grant streak multiplier bonuses</div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LeaderboardPage;
