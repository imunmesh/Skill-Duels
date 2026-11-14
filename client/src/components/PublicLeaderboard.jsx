import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import { Trophy, Crown, Globe, Calendar, Zap, Award } from 'lucide-react';

export const PublicLeaderboard = () => {
  const [type, setType] = useState('global'); // 'global' | 'weekly'
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    leaderboardAPI
      .getPublic(type, 10)
      .then((res) => {
        if (isMounted && res.success) {
          setLeaderboard(res.leaderboard || []);
        }
      })
      .catch((err) => {
        console.warn('Could not load public standings:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [type]);

  return (
    <section
      aria-label="Public Hall of Fame Top 10"
      className="card"
      style={{
        width: '100%',
        maxWidth: 780,
        margin: '2rem auto 1rem',
        padding: '1.5rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {/* Header & Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trophy size={20} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Hall of Fame &bull; Top 10</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Top duelists competing live in the SkillDuels Arena
            </p>
          </div>
        </div>

        {/* Global vs Weekly Toggle */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-input)',
            padding: '0.2rem',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <button
            type="button"
            onClick={() => setType('global')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: type === 'global' ? 'var(--accent-primary)' : 'transparent',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Globe size={12} />
            Global (All Time)
          </button>
          <button
            type="button"
            onClick={() => setType('weekly')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: type === 'weekly' ? 'var(--accent-primary)' : 'transparent',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Calendar size={12} />
            Weekly (This Week)
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.5rem 0.75rem', width: 50, textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Duelist</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Tier</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                {type === 'weekly' ? 'Weekly XP' : 'Total XP'}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading top standings...
                </td>
              </tr>
            ) : leaderboard.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No player records yet. Register to claim #1!
                </td>
              </tr>
            ) : (
              leaderboard.map((player) => {
                const isTop3 = player.position <= 3;
                const medalColor =
                  player.position === 1 ? '#f59e0b' : player.position === 2 ? '#94a3b8' : '#b45309';

                return (
                  <tr
                    key={player.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Rank Badge */}
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                      {isTop3 ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: `${medalColor}25`,
                            color: medalColor,
                            fontWeight: 800,
                            fontSize: '0.8rem',
                          }}
                        >
                          {player.position === 1 ? <Crown size={14} /> : player.position}
                        </div>
                      ) : (
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          #{player.position}
                        </span>
                      )}
                    </td>

                    {/* Avatar & Display Name */}
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={player.displayName}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid var(--border-color)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'var(--accent-gradient)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              color: '#ffffff',
                              flexShrink: 0,
                            }}
                          >
                            {(player.displayName || player.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.875rem' }}>
                            {player.displayName || player.username}
                          </div>
                          {player.displayName && player.displayName !== player.username && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              @{player.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tier */}
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                        {player.rank}
                      </span>
                    </td>

                    {/* XP */}
                    <td
                      style={{
                        padding: '0.6rem 0.75rem',
                        textAlign: 'right',
                        fontWeight: 800,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#fcd34d',
                        fontSize: '0.9rem',
                      }}
                    >
                      {player.xp} XP
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
