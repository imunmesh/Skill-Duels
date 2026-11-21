import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaderboardAPI } from '../services/api';
import { normalizeTier } from '../components/ui/podium-leaderboard';
import {
  Trophy,
  Zap,
  Flame,
  Award,
  Globe,
  Calendar,
  Swords,
  Shield,
  Medal,
  Crown,
  Sparkles,
  ShieldCheck,
  Gem,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const renderBadgeIcon = (iconName, isUnlocked) => {
  const color = isUnlocked ? '#ffffff' : '#94a3b8';
  const size = 22;
  switch (iconName) {
    case 'swords':
      return <Swords size={size} color={color} />;
    case 'trophy':
      return <Trophy size={size} color={color} />;
    case 'sparkles':
      return <Sparkles size={size} color={color} />;
    case 'zap':
      return <Zap size={size} color={color} />;
    case 'flame':
    case 'fire':
      return <Flame size={size} color={color} />;
    case 'shield-check':
      return <ShieldCheck size={size} color={color} />;
    case 'shield':
      return <Shield size={size} color={color} />;
    case 'medal':
      return <Medal size={size} color={color} />;
    case 'diamond':
      return <Gem size={size} color={color} />;
    case 'crown':
      return <Crown size={size} color={color} />;
    default:
      return <Award size={size} color={color} />;
  }
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'badges' | 'history'
  const [leaderboardType, setLeaderboardType] = useState('global'); // 'global' | 'weekly'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load User Progression & Stats
  const loadProfile = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await leaderboardAPI.getUserProgression(user._id);
      if (res.success && res.profile) {
        setProfileData(res.profile);
      }
    } catch (err) {
      console.warn('Could not load detailed progression:', err.message);
    }
  }, [user?._id]);

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
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const p = profileData
    ? {
        ...profileData,
        rank: normalizeTier(profileData.rank, profileData.xp || user?.xp || 0),
      }
    : {
        xp: user?.xp || 0,
        weeklyXP: user?.weeklyXP || 0,
        rank: normalizeTier(user?.rank, user?.xp || 0),
        globalPosition: 1,
        xpToNextRank: 100,
        rankProgressPercent: 25,
        stats: { matchesPlayed: 0, matchesWon: 0, matchesLost: 0, winRate: 0 },
        streak: { current: 1, highest: 1 },
        badges: [],
        recentMatches: [],
      };

  return (
    <main className="container" style={{ maxWidth: 1100, paddingTop: '2rem' }}>
      {/* Top Profile Summary Card (FR-02, AC-04) */}
      <section
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          marginBottom: '2rem',
          border: '1px solid #3b82f640',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Avatar & Player Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 800,
                boxShadow: '0 4px 20px var(--accent-glow)',
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{user?.username || 'Player'}</h1>
                <span className="badge badge-primary">{p.rank}</span>
                {user?.role === 'admin' && (
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                    <Shield size={10} /> ADMIN
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Global Standing: <strong style={{ color: '#818cf8' }}>#{p.globalPosition || 1}</strong> &bull; Member since{' '}
                {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Quick Metrics (Streak & Total XP) */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Streak */}
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Flame size={24} color="#ef4444" />
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fca5a5' }}>
                  {p.streak?.current || 0} Day{p.streak?.current === 1 ? '' : 's'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ACTIVE STREAK</div>
              </div>
            </div>

            {/* Total XP */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Zap size={24} color="#f59e0b" />
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fcd34d' }}>
                  {p.xp || 0} XP
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LIFETIME XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Rank Progression Bar */}
        <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span>
              Current Tier: <strong style={{ color: '#818cf8' }}>{p.rank}</strong>
            </span>
            <span>
              {p.nextTier ? (
                <>
                  Next: <strong style={{ color: '#fcd34d' }}>{p.nextTier.name}</strong> ({p.xpToNextRank} XP needed)
                </>
              ) : (
                <span style={{ color: '#fcd34d' }}>Max Tier Achieved!</span>
              )}
            </span>
          </div>
          {/* Progress Bar Container */}
          <div
            style={{
              width: '100%',
              height: 10,
              background: '#334155',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${p.rankProgressPercent || 0}%`,
                height: '100%',
                background: 'var(--accent-gradient)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </section>

      {/* Navigation Sub-Tabs */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`btn ${activeTab === 'leaderboard' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', minHeight: 38 }}
        >
          <Trophy size={16} />
          <span>Leaderboard Rankings</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('badges')}
          className={`btn ${activeTab === 'badges' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', minHeight: 38 }}
        >
          <Award size={16} />
          <span>Badges & Achievements</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', minHeight: 38 }}
        >
          <Swords size={16} />
          <span>Match History</span>
        </button>
      </div>

      {/* TAB 1: LEADERBOARDS (FR-06, FR-07, AC-05) */}
      {activeTab === 'leaderboard' && (
        <div>
          {/* Global vs Weekly Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
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
                }}
              >
                <Globe size={14} style={{ marginRight: 6 }} />
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
                }}
              >
                <Calendar size={14} style={{ marginRight: 6 }} />
                Weekly Rankings (This Week)
              </button>
            </div>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Top {totalPlayers} Players Ranked
            </span>
          </div>

          {/* Leaderboard Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem', width: 70, textAlign: 'center' }}>Rank</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Player</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Tier</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Streak</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Badges</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {leaderboardType === 'weekly' ? 'Weekly XP' : 'Total XP'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading standings...
                      </td>
                    </tr>
                  ) : leaderboardData.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No players ranked yet. Play a match to be the first!
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
                            transition: 'background 0.15s ease',
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
                                {row.username}
                              </span>
                              {isMe && (
                                <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Rank Tier */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                              {normalizeTier(row.rank, row.xp || 0)}
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
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
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
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', minHeight: 32, fontSize: '0.8rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BADGES & ACHIEVEMENTS (FR-10) */}
      {activeTab === 'badges' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {(p.badges || []).map((badge) => {
            return (
              <div
                key={badge.badgeId}
                className="card"
                style={{
                  background: badge.isUnlocked ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-input)',
                  border: `1px solid ${badge.isUnlocked ? 'var(--border-focus)' : 'var(--border-color)'}`,
                  opacity: badge.isUnlocked ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: badge.isUnlocked ? 'var(--accent-gradient)' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {renderBadgeIcon(badge.icon, badge.isUnlocked)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{badge.name}</h3>
                      {badge.isUnlocked ? (
                        <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>
                          UNLOCKED
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>
                          LOCKED
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {badge.description}
                    </p>
                    {badge.isUnlocked && badge.unlockedAt && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                        Unlocked: {new Date(badge.unlockedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: MATCH HISTORY */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Outcome</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Opponent</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Final Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>XP Gained</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {(p.recentMatches || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No match records yet. Enter the Arena from the lobby to play!
                    </td>
                  </tr>
                ) : (
                  p.recentMatches.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <span
                            className={`badge ${
                              m.isWinner ? 'badge-success' : m.isDraw ? 'badge-warning' : 'badge-primary'
                            }`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {m.isWinner ? 'VICTORY' : m.isDraw ? 'DRAW' : 'DEFEAT'}
                          </span>
                          {m.reason === 'tab_switch_forfeit' && (
                            <span
                              className="badge badge-danger"
                              style={{
                                fontSize: '0.55rem',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                              }}
                            >
                              TAB SWITCH FORFEIT
                            </span>
                          )}
                          {m.reason === 'opponent_forfeit' && (
                            <span
                              className="badge badge-warning"
                              style={{
                                fontSize: '0.55rem',
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#fcd34d',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                              }}
                            >
                              DISCONNECT FORFEIT
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize' }}>{m.category}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{m.opponentUsername}</td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'JetBrains Mono, monospace' }}>
                        {m.myScore} - {m.opponentScore}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#fcd34d', fontWeight: 700 }}>
                        +{m.xpAwarded} XP
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        {new Date(m.playedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
};
