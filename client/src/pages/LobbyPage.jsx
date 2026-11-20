import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { categoryAPI } from '../services/api';
import { Swords, Code, Brain, Compass, Globe, Layers, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const ICON_MAP = {
  Code,
  Compass,
  Brain,
  Globe,
  Layers,
};

const COLOR_MAP = {
  technical: '#6366f1',
  aptitude: '#10b981',
  logical: '#f59e0b',
  'web-dev': '#06b6d4',
  dsa: '#a855f7',
};

export const LobbyPage = ({ onMatchFound }) => {
  const { user } = useAuth();
  const { socket, connected, connectionError } = useSocket();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load real categories from MongoDB API (FR-08)
  const loadLiveCategories = useCallback(async () => {
    try {
      const res = await categoryAPI.getAll(false);
      if (res.success && res.categories?.length > 0) {
        setCategories(res.categories);
        setSelectedCategory(res.categories[0].slug);
      }
    } catch (err) {
      console.error('[Lobby] Failed to load categories from database:', err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadLiveCategories();
  }, [loadLiveCategories]);

  // Matchmaking search timer
  useEffect(() => {
    let timer;
    if (isSearching) {
      timer = setInterval(() => {
        setSearchTime((t) => t + 1);
      }, 1000);
    } else {
      setSearchTime(0);
    }
    return () => clearInterval(timer);
  }, [isSearching]);

  // Listen for real Socket.IO events (FR-03, AC-01)
  useEffect(() => {
    if (!socket) return;

    const handleMatchStart = (matchData) => {
      console.log('[Lobby] Real match paired by server:', matchData);
      setIsSearching(false);
      onMatchFound(matchData);
    };

    const handleQueueLeft = () => {
      setIsSearching(false);
    };

    socket.on('match_start', handleMatchStart);
    socket.on('queue_left', handleQueueLeft);

    return () => {
      socket.off('match_start', handleMatchStart);
      socket.off('queue_left', handleQueueLeft);
    };
  }, [socket, onMatchFound]);

  const handleStartSearch = () => {
    if (!socket || !connected) {
      alert('Connecting to live battle server... Please ensure backend is running.');
      return;
    }
    setIsSearching(true);
    socket.emit('join_queue', { category: selectedCategory });
  };

  const handleCancelSearch = () => {
    if (!socket) return;
    socket.emit('leave_queue');
    setIsSearching(false);
  };

  return (
    <main className="container" style={{ maxWidth: 860, paddingTop: '5.25rem', paddingBottom: '3.5rem' }}>
      {/* Connection Warning Banner */}
      {!connected && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Connecting to live game server...</strong> {connectionError || 'Make sure the backend is running on port 5000.'}
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <section style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="badge badge-primary">
            <Sparkles size={12} /> Competitive Arena (FR-03)
          </span>
          <span
            title="Active challengers currently dueling and queueing in the arena"
            className="badge badge-success"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'help' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
            LIVE &bull; 14 in Queue
          </span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Live 1v1 Quiz Battles
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: 560, margin: '0 auto' }}>
          Choose a skill domain, join the matchmaking queue, and duel a peer in real-time with server-authoritative timers!
        </p>
      </section>

      {/* Searching State */}
      {isSearching ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div
            className="pulse-anim"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px var(--accent-glow)',
              marginBottom: '1.5rem',
            }}
          >
            <Swords size={36} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Matching with an Opponent...
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Category: <strong style={{ color: '#818cf8', textTransform: 'capitalize' }}>{selectedCategory}</strong>
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-input)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              marginBottom: '2rem',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
          >
            <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Time in queue: {searchTime}s (Pairing with second player...)</span>
          </div>

          <div>
            <button
              type="button"
              onClick={handleCancelSearch}
              className="btn btn-secondary"
              aria-label="Cancel searching for an opponent"
            >
              Cancel Matchmaking
            </button>
          </div>
        </div>
      ) : (
        /* Category Selection & Action Card */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)' }}>
              1. Choose Skill Domain from Database (FR-08)
            </h2>

            {loadingCategories ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading categories from database...
              </div>
            ) : categories.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No active categories found. Please run seed script or create one in the Admin Panel.
              </div>
            ) : (
              <div
                className="lobby-category-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                }}
              >
                {categories.map((cat) => {
                  const Icon = ICON_MAP[cat.icon] || Code;
                  const color = COLOR_MAP[cat.slug] || '#6366f1';
                  const isSelected = selectedCategory === cat.slug;

                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.slug)}
                      aria-pressed={isSelected}
                      style={{
                        background: isSelected ? 'rgba(99, 102, 241, 0.16)' : 'var(--bg-card)',
                        border: `2px solid ${isSelected ? '#818cf8' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 0 20px rgba(99, 102, 241, 0.35)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-md)',
                            background: `${color}20`,
                            border: `1px solid ${color}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: color,
                          }}
                        >
                          <Icon size={20} />
                        </div>
                        {isSelected && (
                          <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                            <CheckCircle2 size={16} /> Selected
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
                          {cat.name}
                        </h3>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {cat.description || 'Skill domain questions.'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Card */}
          <div
            className="card lobby-action-box"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(24, 34, 52, 0.9) 100%)',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Ready to Duel?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Mode: <strong>1v1 Live Match</strong> &bull; Category:{' '}
                <strong style={{ color: '#818cf8', textTransform: 'capitalize' }}>
                  {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
                </strong>
              </p>
            </div>

            <button
              type="button"
              disabled={!connected || loadingCategories}
              onClick={handleStartSearch}
              className="btn btn-primary lobby-action-button"
              style={{ fontSize: '1.05rem', padding: '0.85rem 2rem' }}
              aria-label="Find an opponent and start duel"
            >
              <Swords size={20} />
              <span>Find Opponent</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
