import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { categoryAPI } from '../services/api';
import { QUESTIONS_PER_MATCH, ERROR_CODES } from '../constants/rules';
import { Swords, Code, Brain, Compass, Globe, Layers, Sparkles, Loader2, AlertCircle, AlertTriangle, Cpu, X } from 'lucide-react';
import { ServiceCard } from '@/components/ui/service-card';
import RainingLetters, { ScrambledTitle } from '../components/ui/modern-animated-hero-section';

const ICON_MAP = {
  Code,
  Compass,
  Brain,
  Globe,
  Layers,
  Cpu,
};

const COLOR_MAP = {
  technical: '#3b82f6',
  aptitude: '#10b981',
  logical: '#f59e0b',
  'web-dev': '#06b6d4',
  dsa: '#a855f7',
  ml: '#6366f1',
};

const CATEGORY_IMAGE_MAP = {
  dsa: {
    imgSrc: '/images/categories/dsa.jpg',
    imgAlt: 'Data Structures and Algorithms - Binary Tree and Big-O Complexity',
    variant: 'purple',
  },
  logical: {
    imgSrc: '/images/categories/logical.jpg',
    imgAlt: 'Logical Reasoning - Glowing Puzzle Lightbulb and Rubiks Cube',
    variant: 'amber',
  },
  ml: {
    imgSrc: '/images/categories/ml.jpg',
    imgAlt: 'Machine Learning - AI Cybernetic Robot and Neural Network',
    variant: 'blue',
  },
  aptitude: {
    imgSrc: '/images/categories/aptitude.jpg',
    imgAlt: 'Quantitative Aptitude - Financial Calculator and Growth Analytics',
    variant: 'emerald',
  },
  technical: {
    imgSrc: '/images/categories/technical.jpg',
    imgAlt: 'Technical & CS - Laptop, OS, DBMS, COA and Gears',
    variant: 'cyan',
  },
  'web-dev': {
    imgSrc: '/images/categories/web-dev.jpg',
    imgAlt: 'Web Development - Laptop with HTML, CSS, JS, React',
    variant: 'default',
  },
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
    questionCount: 0,
    playable: false,
  },
  {
    _id: 'logical',
    slug: 'logical',
    name: 'Logical Reasoning',
    displayName: 'Logical Reasoning',
    description: 'Sequences, patterns, deductions, syllogisms, and critical reasoning.',
    icon: 'Brain',
    color: '#f59e0b',
    questionCount: 0,
    playable: false,
  },
  {
    _id: 'ml',
    slug: 'ml',
    name: 'Machine Learning',
    displayName: 'Machine Learning',
    description: 'Supervised learning, neural networks, classification, gradient descent, and model evaluation metrics.',
    icon: 'Cpu',
    color: '#6366f1',
    questionCount: 0,
    playable: false,
  },
  {
    _id: 'aptitude',
    slug: 'aptitude',
    name: 'Quantitative Aptitude',
    displayName: 'Quantitative Aptitude',
    description: 'Arithmetic, speed, distance, time, percentages, and problem solving.',
    icon: 'Compass',
    color: '#10b981',
    questionCount: 0,
    playable: false,
  },
  {
    _id: 'technical',
    slug: 'technical',
    name: 'Technical & CS',
    displayName: 'Technical & CS',
    description: 'Core computer science fundamentals, OS, memory, and programming concepts.',
    icon: 'Code',
    color: '#6366f1',
    questionCount: 0,
    playable: false,
  },
  {
    _id: 'web-dev',
    slug: 'web-dev',
    name: 'Web Development',
    displayName: 'Web Development',
    description: 'HTML5, CSS3, modern JavaScript, browser DOM, and HTTP protocols.',
    icon: 'Globe',
    color: '#06b6d4',
    questionCount: 0,
    playable: false,
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

  // Match Error Feedback (Toast + Inline banner)
  const [matchError, setMatchError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Load real categories with questionCount & playable flag from MongoDB API (FR-08)
  const loadLiveCategories = useCallback(async () => {
    try {
      const res = await categoryAPI.getAll(false);
      let catList = [...CANONICAL_CATEGORIES];
      if (res.success && res.categories?.length > 0) {
        const dbMap = new Map(res.categories.map((c) => [c.slug, c]));
        catList = CANONICAL_CATEGORIES.map((canonical) => {
          const fromDb = dbMap.get(canonical.slug);
          return fromDb
            ? {
                ...canonical,
                ...fromDb,
                name: canonical.name,
                questionCount: fromDb.questionCount ?? 0,
                playable: fromDb.playable ?? (fromDb.questionCount >= QUESTIONS_PER_MATCH),
              }
            : canonical;
        });
        res.categories.forEach((c) => {
          // Never display test categories or temporary pools on the public frontend
          if (
            c.slug?.startsWith('test-') ||
            c.slug?.startsWith('rematch-test') ||
            /test|rematch pool/i.test(c.name || '')
          ) {
            return;
          }

          if (!catList.find((item) => item.slug === c.slug)) {
            catList.push({
              ...c,
              questionCount: c.questionCount ?? 0,
              playable: c.playable ?? (c.questionCount >= QUESTIONS_PER_MATCH),
            });
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

      // Auto-select preferred category if valid and playable, otherwise keep match or first playable
      const match = categoryParam && catList.find((c) => c.slug === categoryParam);
      if (match && match.playable) {
        setSelectedCategory(match.slug);
      } else if (!catList.find((c) => c.slug === selectedCategory)?.playable) {
        const firstPlayable = catList.find((c) => c.playable);
        if (firstPlayable) {
          setSelectedCategory(firstPlayable.slug);
        }
      }
    } catch (err) {
      console.error('[Lobby] Failed to load categories from database:', err);
      setCategories(CANONICAL_CATEGORIES);
    } finally {
      setLoadingCategories(false);
    }
  }, [categoryParam, selectedCategory]);

  useEffect(() => {
    loadLiveCategories();
  }, [loadLiveCategories]);

  // Sync selected category if URL search query changes
  useEffect(() => {
    if (categoryParam && categories.length > 0) {
      const match = categories.find((c) => c.slug === categoryParam);
      if (match && selectedCategory !== match.slug && match.playable) {
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

    const handleMatchFound = (matchData) => {
      console.log('[Lobby] Match verified and paired by server:', matchData);
      setIsSearching(false);
      setMatchError(null);
      onMatchFound(matchData);
    };

    const handleMatchError = (data) => {
      console.warn('[Lobby] Battle queue error:', data);
      setIsSearching(false);

      let msg = data?.message || 'Cannot start duel.';
      if (data?.code === ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS) {
        msg = `No questions found for ${data.category || 'this category'}. Please choose another category or check back later.`;
      } else if (data?.code === ERROR_CODES.CATEGORY_NOT_ENOUGH_QUESTIONS) {
        msg = `${data.category || 'This category'} doesn't have enough questions yet (${data.available || 0} of ${data.required || QUESTIONS_PER_MATCH}).`;
      }

      setMatchError(msg);
      showToast(msg);

      // Refresh category counts from server
      loadLiveCategories();
    };

    const handleQueueLeft = () => {
      setIsSearching(false);
    };

    socket.on('matchFound', handleMatchFound);
    socket.on('match_start', handleMatchFound);
    socket.on('matchError', handleMatchError);
    socket.on('queue_error', handleMatchError);
    socket.on('queue_left', handleQueueLeft);

    return () => {
      socket.off('matchFound', handleMatchFound);
      socket.off('match_start', handleMatchFound);
      socket.off('matchError', handleMatchError);
      socket.off('queue_error', handleMatchError);
      socket.off('queue_left', handleQueueLeft);
    };
  }, [socket, onMatchFound, loadLiveCategories]);

  const selectedCategoryDoc = categories.find((c) => c.slug === selectedCategory);
  const isSelectedPlayable = Boolean(
    selectedCategoryDoc &&
      (selectedCategoryDoc.playable !== false) &&
      (selectedCategoryDoc.questionCount === undefined || selectedCategoryDoc.questionCount >= QUESTIONS_PER_MATCH)
  );

  const handleStartSearch = () => {
    if (isSearching) return; // Prevent double click

    if (!selectedCategoryDoc || !isSelectedPlayable) {
      const msg = selectedCategoryDoc?.questionCount === 0
        ? `No questions found for ${selectedCategoryDoc?.name || 'this category'}. Please choose another category or check back later.`
        : `${selectedCategoryDoc?.name || 'This category'} doesn't have enough questions yet (${selectedCategoryDoc?.questionCount || 0} of ${QUESTIONS_PER_MATCH}).`;
      setMatchError(msg);
      showToast(msg);
      return;
    }

    if (!socket || !connected) {
      alert('Connecting to live battle server... Please ensure backend is running.');
      return;
    }

    setMatchError(null);
    setIsSearching(true);
    socket.emit('findOpponent', { category: selectedCategory });
  };

  const handleCancelSearch = () => {
    if (!socket) return;
    socket.emit('leave_queue');
    setIsSearching(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#ef4444',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: 420,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              marginLeft: 'auto',
              padding: 2,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Ambient Matrix Raining Letters Animation inside Arena */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          opacity: 0.35,
        }}
      >
        <RainingLetters
          overlay={true}
          showTitle={false}
          charCount={280}
          glowColor="#10b981"
        />
      </div>

      <main className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1040, paddingTop: '5.25rem', paddingBottom: '3.5rem' }}>
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
          justifyContent: flex-start;
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

      {/* Match Error Inline Notice */}
      {matchError && (
        <div
          className="alert alert-warning"
          role="alert"
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <span>{matchError}</span>
          </div>
          <button
            type="button"
            onClick={() => setMatchError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fbbf24',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <section style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="badge badge-primary">
            <Sparkles size={12} /> Competitive Arena
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
        <div style={{ minHeight: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScrambledTitle
            phrases={[
              'LIVE 1V1 QUIZ BATTLES',
              'SKILLDUELS ARENA',
              'REAL-TIME CODE COMBAT',
              'PROVE YOUR KNOWLEDGE',
              'CLIMB TO CONQUEROR',
              'ENTER THE ARENA'
            ]}
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
              color: '#ffffff',
              textShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
            }}
          />
        </div>
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
            Searching… 14 in queue
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Category: <strong style={{ color: '#818cf8', textTransform: 'capitalize' }}>{selectedCategoryDoc?.name || selectedCategory}</strong>
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
            <span>Time in queue: {searchTime}s (Pairing with rival...)</span>
          </div>

          <div>
            <button
              type="button"
              onClick={handleCancelSearch}
              className="btn btn-secondary"
              aria-label="Cancel searching for an opponent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Category Selection & Action Card */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)' }}>
              1. Choose Skill Domain
            </h2>

            {loadingCategories ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading categories from database...
              </div>
            ) : categories.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No active categories found. Please create categories and add questions via the Admin Panel.
              </div>
            ) : (
              <div
                className="arena-category-grid"
                role="radiogroup"
                aria-label="Skill domain categories"
              >
                {categories.map((cat) => {
                  const Icon = ICON_MAP[cat.icon] || Code;
                  const color = COLOR_MAP[cat.slug] || '#6366f1';
                  const isSelected = selectedCategory === cat.slug;
                  const isPlayable = Boolean(
                    cat.playable !== false &&
                    (cat.questionCount === undefined || cat.questionCount >= QUESTIONS_PER_MATCH)
                  );
                  const meta = CATEGORY_IMAGE_MAP[cat.slug] || {
                    imgSrc: 'https://images.unsplash.com/photo-1516116211227-bbc13fcf359d?w=400&auto=format&fit=crop&q=80',
                    imgAlt: `${cat.name} domain illustration`,
                    variant: 'default',
                  };

                  return (
                    <div
                      key={cat._id || cat.slug}
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={!isPlayable}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          if (isPlayable) setSelectedCategory(cat.slug);
                        }
                      }}
                      style={{ outline: 'none' }}
                    >
                      <ServiceCard
                        title={cat.name}
                        description={cat.description || 'Skill domain questions.'}
                        icon={<Icon size={22} strokeWidth={2.2} />}
                        iconColor={color}
                        selected={isSelected && isPlayable}
                        questionCount={cat.questionCount}
                        playable={isPlayable}
                        minQuestionsRequired={QUESTIONS_PER_MATCH}
                        imgSrc={meta.imgSrc}
                        imgAlt={meta.imgAlt}
                        variant={meta.variant}
                        actionText={isSelected && isPlayable ? 'SELECTED' : isPlayable ? 'SELECT DOMAIN' : 'UNDER QUOTA'}
                        className="min-h-[220px]"
                        onClick={() => {
                          if (isPlayable) {
                            setSelectedCategory(cat.slug);
                            setMatchError(null);
                          }
                        }}
                      />
                    </div>
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
                  {selectedCategoryDoc?.name || selectedCategory}
                </strong>
                {selectedCategoryDoc && (
                  <span style={{ marginLeft: 8, color: isSelectedPlayable ? '#10b981' : '#f59e0b', fontSize: '0.85rem' }}>
                    ({selectedCategoryDoc.questionCount || 0} questions available)
                  </span>
                )}
              </p>
              {!isSelectedPlayable && selectedCategoryDoc && (
                <p style={{ color: '#f59e0b', fontSize: '0.825rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} />
                  <span>This category needs at least {QUESTIONS_PER_MATCH} active questions to start a duel.</span>
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={!connected || loadingCategories || !isSelectedPlayable || isSearching}
              onClick={handleStartSearch}
              className="btn btn-primary lobby-action-button"
              style={{
                fontSize: '1.05rem',
                padding: '0.85rem 2rem',
                opacity: (!connected || loadingCategories || !isSelectedPlayable || isSearching) ? 0.5 : 1,
                cursor: (!connected || loadingCategories || !isSelectedPlayable || isSearching) ? 'not-allowed' : 'pointer',
              }}
              aria-label="Find an opponent and start duel"
            >
              <Swords size={20} />
              <span>Find Opponent</span>
            </button>
          </div>
        </div>
      )}
    </main>
    </div>
  );
};
