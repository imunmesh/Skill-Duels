import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Swords, LogOut, Zap, Shield, Trophy, User as UserIcon, Medal, Award, Crown, Gem, AlertTriangle } from 'lucide-react';
import { LiquidNavbar } from './ui/liquid-glass-navbar';
import { getAvatarUrl } from '../utils/avatar';
import { normalizeTier, getTierDetails } from '../constants/tiers';

const VIEW_MAP = ['arena', 'leaderboard', 'profile'];

export const Navbar = ({ currentView, onNavigate }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { socket, connected } = useSocket();
  const location = useLocation();
  const isMatchInProgress = location.pathname.startsWith('/match');
  const [pendingNavTarget, setPendingNavTarget] = useState(null);

  const handleAttemptNavigate = (target) => {
    if (isMatchInProgress) {
      setPendingNavTarget(target);
    } else {
      if (typeof target === 'function') {
        target();
      } else {
        onNavigate(target);
      }
    }
  };

  const handleConfirmForfeitLeave = () => {
    if (socket && isMatchInProgress) {
      const matchId = location.pathname.split('/match/')[1];
      socket.emit('leave_match', { matchId });
    }
    const target = pendingNavTarget;
    setPendingNavTarget(null);
    if (typeof target === 'function') {
      target();
    } else if (target) {
      onNavigate(target);
    }
  };

  const handleBrandClick = () => {
    if (!isAuthenticated) return;
    const target = user?.role === 'admin' ? 'admin' : 'arena';
    handleAttemptNavigate(target);
  };

  const userInitial = (user?.displayName || user?.username || 'U').charAt(0).toUpperCase();
  const activeNavIndex = VIEW_MAP.indexOf(currentView);

  const userTier = normalizeTier(user?.rank, user?.xp || 0);
  const tierDetails = getTierDetails(user?.xp || 0);

  const renderTierIcon = (iconName, color) => {
    switch (iconName) {
      case 'Crown': return <Crown size={13} color={color} />;
      case 'Award': return <Award size={13} color={color} />;
      case 'Gem': return <Gem size={13} color={color} />;
      case 'Shield': return <Shield size={13} color={color} />;
      case 'Trophy': return <Trophy size={13} color={color} />;
      default: return <Medal size={13} color={color} />;
    }
  };

  const navItems = [
    { label: 'Arena', icon: <Swords size={16} />, fx: 'plane' },
    { label: 'Leaderboard', icon: <Trophy size={16} />, fx: 'glow' },
    { label: 'Profile', icon: <UserIcon size={16} />, fx: 'wave' },
  ];

  return (
    <header
      role="banner"
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.65rem 1.5rem',
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

        {/* Center: Liquid Glass Waterline Navbar for SkillDuels */}
        {isAuthenticated && user?.role !== 'admin' && (
          <div className="liquid-nav-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
            <LiquidNavbar
              items={navItems}
              active={activeNavIndex >= 0 ? activeNavIndex : 0}
              onChange={(index) => handleAttemptNavigate(VIEW_MAP[index])}
              tone="dark"
              sound={true}
            />
          </div>
        )}

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
              <span className="nav-server-text">{connected ? 'LIVE' : 'CONNECTING...'}</span>
            </div>
          )}

          {/* Authenticated Controls */}
          {isAuthenticated && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
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
                /* PLAYER METRICS & CONTROLS */
                <>
                  {/* Tier & XP Chip (Hidden mid-duel to prevent confusion) */}
                  {!isMatchInProgress && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        padding: '0.35rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                      title={`${userTier} Tier • ${user.xp || 0} Total XP`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: tierDetails.color }}>
                        {renderTierIcon(tierDetails.icon, tierDetails.color)}
                        <span style={{ fontWeight: 800 }}>{userTier}</span>
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#fcd34d' }}>
                        <Zap size={12} color="#f59e0b" />
                        <span>{user.xp || 0} XP</span>
                      </span>
                    </div>
                  )}

                  {/* Player Avatar Chip */}
                  <div
                    onClick={() => handleAttemptNavigate('profile')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.25rem 0.55rem 0.25rem 0.35rem',
                      borderRadius: 'var(--radius-sm)',
                      background: currentView === 'profile' ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-input)',
                      border: `1px solid ${currentView === 'profile' ? '#818cf8' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                    }}
                    title="View My Profile"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={getAvatarUrl(user.avatarUrl)}
                        alt="Avatar"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
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
                    <span className="nav-user-name" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {user.displayName || user.username}
                    </span>
                  </div>
                </>
              )}

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => handleAttemptNavigate(logout)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', minHeight: 34, fontSize: '0.85rem' }}
                aria-label="Log out of SkillDuels"
                title="Log Out"
              >
                <LogOut size={15} />
                <span className="nav-btn-label">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forfeit Confirmation Modal mid-duel */}
      {pendingNavTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(5, 10, 18, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setPendingNavTarget(null)}
        >
          <div
            style={{
              background: '#131b2e',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.2)',
              color: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#f87171',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Leave Duel?</h3>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: 0 }}>
                  Active match in progress
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Leaving this page will immediately <strong>forfeit</strong> the match and award the victory to your opponent. Are you sure you want to exit?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPendingNavTarget(null)}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.15rem' }}
              >
                Stay in Duel
              </button>
              <button
                type="button"
                onClick={handleConfirmForfeitLeave}
                className="btn btn-danger"
                style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '0.55rem 1.15rem', borderRadius: 8, fontWeight: 700 }}
              >
                Forfeit & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
