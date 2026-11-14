import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Swords, LogOut, Zap, Shield, Trophy, User as UserIcon } from 'lucide-react';

export const Navbar = ({ currentView, onNavigate }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { connected } = useSocket();

  const handleBrandClick = () => {
    if (!isAuthenticated) return;
    if (user?.role === 'admin') {
      onNavigate('admin');
    } else {
      onNavigate('arena');
    }
  };

  const userInitial = (user?.displayName || user?.username || 'U').charAt(0).toUpperCase();

  return (
    <header
      role="banner"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Brand */}
        <div
          onClick={handleBrandClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: isAuthenticated ? 'pointer' : 'default',
          }}
          aria-label="SkillDuels Home"
        >
          <div
            style={{
              background: 'var(--accent-gradient)',
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Swords size={22} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Skill<span style={{ color: '#818cf8' }}>Duels</span>
          </span>
          {isAuthenticated && user?.role === 'admin' && (
            <span className="badge badge-warning" style={{ fontSize: '0.65rem', marginLeft: '0.25rem' }}>
              ADMIN
            </span>
          )}
        </div>

        {/* Right side controls & navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Live Socket Status Indicator - ONLY displayed when logged in */}
          {isAuthenticated && (
            <div
              title={connected ? 'Live WebSocket connection active' : 'Connecting to WebSocket server...'}
              aria-label={`Server status: ${connected ? 'Connected' : 'Disconnected'}`}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                background: connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: connected ? '#6ee7b7' : '#fca5a5',
                border: `1px solid ${connected ? '#10b981' : '#ef4444'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: connected ? '#10b981' : '#ef4444',
                  boxShadow: connected ? '0 0 6px #10b981' : 'none',
                }}
              />
              {connected ? 'LIVE SERVER' : 'CONNECTING...'}
            </div>
          )}

          {/* Authenticated Controls */}
          {isAuthenticated && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* ADMIN ONLY VIEW */}
              {user.role === 'admin' ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#fcd34d',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <Shield size={14} />
                    <span>Admin Portal</span>
                  </div>
                </>
              ) : (
                /* PLAYER VIEWS (Arena, My Profile, Leaderboard, XP) */
                <>
                  {/* Arena Button */}
                  <button
                    type="button"
                    onClick={() => onNavigate('arena')}
                    className={`btn ${currentView === 'arena' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', minHeight: 34, fontSize: '0.85rem' }}
                    aria-label="Go to Duel Arena"
                  >
                    <Swords size={14} />
                    <span>Arena</span>
                  </button>

                  {/* Leaderboard Button */}
                  <button
                    type="button"
                    onClick={() => onNavigate('leaderboard')}
                    className={`btn ${currentView === 'leaderboard' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.35rem 0.75rem', minHeight: 34, fontSize: '0.85rem' }}
                    aria-label="View Leaderboards"
                  >
                    <Trophy size={14} />
                    <span>Leaderboard</span>
                  </button>

                  {/* My Profile Button with Avatar Thumbnail */}
                  <button
                    type="button"
                    onClick={() => onNavigate('profile')}
                    className={`btn ${currentView === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      padding: '0.25rem 0.65rem 0.25rem 0.4rem',
                      minHeight: 34,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                    }}
                    aria-label="View My Profile"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Avatar"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid #818cf8',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'var(--accent-gradient)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#ffffff',
                        }}
                      >
                        {userInitial}
                      </div>
                    )}
                    <span>{user.displayName || user.username}</span>
                  </button>

                  {/* XP Pill */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <Zap size={13} color="#f59e0b" />
                    <span style={{ color: '#fcd34d' }}>{user.xp || 0} XP</span>
                  </div>
                </>
              )}

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', minHeight: 34, fontSize: '0.85rem' }}
                aria-label="Log out of SkillDuels"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
