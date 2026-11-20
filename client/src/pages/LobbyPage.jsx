import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { categoryAPI } from '../services/api';
import { Swords, Code, Brain, Compass, Globe, Layers, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import InfoCard from '../components/ui/info-card';

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
  ml: '#6366f1',
};

const CANONICAL_ORDER = ['dsa', 'logical', 'ml', 'aptitude', 'technical', 'web-dev'];

const CANONICAL_CATEGORIES = [
  {
    _id: 'dsa',
    slug: 'dsa',
    name: 'Data Structures &\nAlgorithms',
    displayName: 'Data Structures & Algorithms',
    description: 'Arrays, trees, graphs, sorting, searching, and asymptotic Big-O analysis.',
    icon: 'Layers',
    color: '#a855f7',
  },
  {
    _id: 'logical',
    slug: 'logical',
    name: 'Logical Reasoning',
    displayName: 'Logical Reasoning',
    description: 'Sequences, patterns, deductions, syllogisms, and critical reasoning.',
    icon: 'Brain',
    color: '#f59e0b',
  },
  {
    _id: 'ml',
    slug: 'ml',
    name: 'Machine learning',
    displayName: 'Machine learning',
    description: 'Models',
    icon: 'Code',
    color: '#6366f1',
  },
  {
    _id: 'aptitude',
    slug: 'aptitude',
    name: 'Quantitative Aptitude',
    displayName: 'Quantitative Aptitude',
    description: 'Arithmetic, speed, distance, time, percentages, and problem solving.',
    icon: 'Compass',
    color: '#10b981',
  },
  {
    _id: 'technical',
    slug: 'technical',
    name: 'Technical & CS',
    displayName: 'Technical & CS',
    description: 'Core computer science fundamentals, OS, memory, and programming concepts.',
    icon: 'Code',
    color: '#6366f1',
  },
  {
    _id: 'web-dev',
    slug: 'web-dev',
    name: 'Web Development',
    displayName: 'Web Development',
    description: 'HTML5, CSS3, modern JavaScript, browser DOM, and HTTP protocols.',
    icon: 'Globe',
    color: '#06b6d4',
  },
];

export const LobbyPage = ({ onMatchFound }) => {
  const { user } = useAuth();
  const { socket, connected, connectionError } = useSocket();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [categories, setCategories] = useState(CANONICAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'dsa');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load real categories from MongoDB API (FR-08)
  const loadLiveCategories = useCallback(async () => {
    try {
      const res = await categoryAPI.getAll(false);
      let catList = [...CANONICAL_CATEGORIES];
      if (res.success && res.categories?.length > 0) {
        const dbMap = new Map(res.categories.map((c) => [c.slug, c]));
        catList = CANONICAL_CATEGORIES.map((canonical) => {
          const fromDb = dbMap.get(canonical.slug);
          return fromDb ? { ...canonical, ...fromDb, name: canonical.name } : canonical;
        });
        res.categories.forEach((c) => {
          if (!catList.find((item) => item.slug === c.slug)) {
            catList.push(c);
          }
        });
      }

      // Sort by canonical order
      catList.sort((a, b) => {
        const idxA = CANONICAL_ORDER.indexOf(a.slug);
        const idxB = CANONICAL_ORDER.indexOf(b.slug);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      setCategories(catList);
      const match = categoryParam && catList.find((c) => c.slug === categoryParam);
      setSelectedCategory(match ? match.slug : 'dsa');
    } catch (err) {
      console.error('[Lobby] Failed to load categories from database:', err);
      setCategories(CANONICAL_CATEGORIES);
      setSelectedCategory(categoryParam || 'dsa');
    } finally {
      setLoadingCategories(false);
    }
  }, [categoryParam]);

  useEffect(() => {
    loadLiveCategories();
  }, [loadLiveCategories]);

  // Sync selected category if URL search query changes
  useEffect(() => {
    if (categoryParam && categories.length > 0) {
      const match = categories.find((c) => c.slug === categoryParam);
      if (match && selectedCategory !== match.slug) {
        setSelectedCategory(match.slug);
      }
    }
  }, [categoryParam, categories, selectedCategory]);

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
    <main className="container" style={{ maxWidth: 1040, paddingTop: '5.25rem', paddingBottom: '3.5rem' }}>
      <style>{`
        .arena-category-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
        }
        @media (max-width: 960px) {
          .arena-category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 580px) {
          .arena-category-grid {
            grid-template-columns: 1fr;
          }
        }
        .arena-category-card {
          background: #131b2e;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 1.6rem 1.6rem 1.8rem;
          min-height: 195px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          text-align: left;
          position: relative;
          cursor: pointer;
          outline: none;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .arena-category-card:hover {
          border-color: rgba(99, 102, 241, 0.4);
          transform: translateY(-2px);
        }
        .arena-category-card.is-selected {
          border: 2px solid #6366f1;
          box-shadow: 0 0 25px rgba(99, 102, 241, 0.25), inset 0 0 15px rgba(99, 102, 241, 0.04);
        }
        .arena-category-card:focus-visible {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5);
        }
      `}</style>

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
              <div className="arena-category-grid">
                {categories.map((cat) => {
                  const Icon = ICON_MAP[cat.icon] || Code;
                  const color = COLOR_MAP[cat.slug] || '#6366f1';
                  const isSelected = selectedCategory === cat.slug;

                  return (
                    <InfoCard
                      key={cat._id || cat.slug}
                      title={cat.name}
                      description={cat.description || 'Skill domain questions.'}
                      icon={<Icon size={22} strokeWidth={2.2} />}
                      iconColor={color}
                      selected={isSelected}
                      onClick={() => setSelectedCategory(cat.slug)}
                    />
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
