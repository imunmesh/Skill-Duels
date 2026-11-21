import React, { useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  Zap,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Swords,
  Sparkles,
} from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

const CATEGORY_DISPLAY_MAP = {
  dsa: 'Data Structures & Algorithms',
  logical: 'Logical Reasoning',
  ml: 'Machine Learning',
  aptitude: 'Quantitative Aptitude',
  technical: 'Technical & CS',
  'web-dev': 'Web Development',
};

const formatCategoryName = (slugOrName) => {
  if (!slugOrName) return 'DSA';
  const lower = slugOrName.toLowerCase();
  return CATEGORY_DISPLAY_MAP[lower] || slugOrName;
};

// Battle Reducer (FR-04, FR-05)
const battleReducer = (state, action) => {
  switch (action.type) {
    case 'NEW_QUESTION':
      return {
        ...state,
        currentQuestion: action.payload,
        remainingSeconds: action.payload.remainingSeconds || action.payload.timeLimit || 10,
        selectedOption: null,
        isAnswerSubmitted: false,
        revealedAnswer: null,
        opponentAnswered: false,
        phase: 'active',
      };

    case 'TIMER_TICK':
      return {
        ...state,
        remainingSeconds: action.payload.remainingSeconds,
      };

    case 'SUBMIT_LOCAL_ANSWER':
      return {
        ...state,
        selectedOption: action.payload.selectedOptionIndex,
        isAnswerSubmitted: true,
      };

    case 'SCORE_UPDATE': {
      const scores = action.payload.scores || {};
      const currentUserId = action.payload.currentUserId;
      const opponentId = action.payload.opponentId;
      const isOpponentAnswer =
        action.payload.lastAnsweredBy?.userId?.toString() === opponentId?.toString() ||
        (scores[opponentId] !== undefined && scores[opponentId] !== state.opponentScore);

      return {
        ...state,
        playerScore: scores[currentUserId] !== undefined ? scores[currentUserId] : state.playerScore,
        opponentScore: scores[opponentId] !== undefined ? scores[opponentId] : state.opponentScore,
        opponentAnswered: isOpponentAnswer ? true : state.opponentAnswered,
      };
    }

    case 'QUESTION_ENDED': {
      const revealedAnswer = action.payload;
      const qIdx = (state.currentQuestion?.questionNumber || 1) - 1;
      const isCorrect = state.selectedOption === revealedAnswer?.correctOptionIndex;
      const updatedResults = [...state.questionResults];
      updatedResults[qIdx] = state.selectedOption !== null ? (isCorrect ? 'correct' : 'wrong') : 'wrong';

      return {
        ...state,
        phase: 'intermission',
        revealedAnswer,
        remainingSeconds: 0,
        opponentAnswered: true,
        questionResults: updatedResults,
      };
    }

    case 'OPPONENT_DISCONNECTED':
      return {
        ...state,
        opponentDisconnected: true,
        disconnectGraceSeconds: action.payload.gracePeriodSeconds || 15,
      };

    case 'OPPONENT_RECONNECTED':
      return {
        ...state,
        opponentDisconnected: false,
      };

    case 'MATCH_SYNC': {
      const syncData = action.payload;
      const scores = syncData.scores || {};
      const currentUserId = action.payload.currentUserId;
      const opponentId = action.payload.opponentId;

      return {
        ...state,
        currentQuestion: syncData.currentQuestion || state.currentQuestion,
        remainingSeconds:
          syncData.remainingSeconds !== undefined ? syncData.remainingSeconds : state.remainingSeconds,
        isAnswerSubmitted: syncData.hasAnsweredCurrent || false,
        phase:
          syncData.state === 'in_progress'
            ? 'active'
            : syncData.state === 'intermission'
            ? 'intermission'
            : state.phase,
        playerScore: scores[currentUserId] !== undefined ? scores[currentUserId] : state.playerScore,
        opponentScore: scores[opponentId] !== undefined ? scores[opponentId] : state.opponentScore,
      };
    }

    default:
      return state;
  }
};

export const MatchPage = ({ initialMatchData, onMatchFinished }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const currentUserId = user?._id ? user._id.toString() : '';
  const opponent = initialMatchData?.opponent || { userId: '', username: 'Opponent' };

  const [state, dispatch] = useReducer(battleReducer, {
    currentQuestion: null,
    remainingSeconds: 10,
    playerScore: 0,
    opponentScore: 0,
    selectedOption: null,
    isAnswerSubmitted: false,
    revealedAnswer: null,
    opponentAnswered: false,
    questionResults: [],
    phase: 'waiting',
    opponentDisconnected: false,
    disconnectGraceSeconds: 0,
  });

  const {
    currentQuestion,
    remainingSeconds,
    playerScore,
    opponentScore,
    selectedOption,
    isAnswerSubmitted,
    revealedAnswer,
    opponentAnswered,
    questionResults,
    phase,
    opponentDisconnected,
    disconnectGraceSeconds,
  } = state;

  // Strike count & Fair play banners
  const [userStrikes, setUserStrikes] = useState(0);
  const [opponentStrikes, setOpponentStrikes] = useState(0);
  const [tabWarning, setTabWarning] = useState(null);
  const [opponentWarning, setOpponentWarning] = useState(null);

  // Score popups (+100 animation beside score)
  const [playerPop, setPlayerPop] = useState(null);
  const [opponentPop, setOpponentPop] = useState(null);
  const prevPlayerScoreRef = useRef(0);
  const prevOpponentScoreRef = useRef(0);

  // Disconnect countdown timer
  const [disconnectRemaining, setDisconnectRemaining] = useState(15);

  // Pre-match 3-2-1 countdown screen
  const [preCountdown, setPreCountdown] = useState(3);
  const [isCountdownDone, setIsCountdownDone] = useState(false);

  // Auto-dismiss fair-play banners after 5 seconds
  useEffect(() => {
    if (tabWarning) {
      const t = setTimeout(() => setTabWarning(null), 5000);
      return () => clearTimeout(t);
    }
  }, [tabWarning]);

  useEffect(() => {
    if (opponentWarning) {
      const t = setTimeout(() => setOpponentWarning(null), 5000);
      return () => clearTimeout(t);
    }
  }, [opponentWarning]);

  // Handle score popups on change
  useEffect(() => {
    if (playerScore > prevPlayerScoreRef.current) {
      const diff = playerScore - prevPlayerScoreRef.current;
      setPlayerPop(`+${diff}`);
      const t = setTimeout(() => setPlayerPop(null), 1400);
      return () => clearTimeout(t);
    }
    prevPlayerScoreRef.current = playerScore;
  }, [playerScore]);

  useEffect(() => {
    if (opponentScore > prevOpponentScoreRef.current) {
      const diff = opponentScore - prevOpponentScoreRef.current;
      setOpponentPop(`+${diff}`);
      const t = setTimeout(() => setOpponentPop(null), 1400);
      return () => clearTimeout(t);
    }
    prevOpponentScoreRef.current = opponentScore;
  }, [opponentScore]);

  // Disconnect grace countdown
  useEffect(() => {
    let interval;
    if (opponentDisconnected) {
      setDisconnectRemaining(disconnectGraceSeconds || 15);
      interval = setInterval(() => {
        setDisconnectRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [opponentDisconnected, disconnectGraceSeconds]);

  // Pre-match 3-2-1 countdown sequence: strictly waits for questions payload from server
  useEffect(() => {
    if (isCountdownDone) return;
    if ((!initialMatchData?.questions || initialMatchData.questions.length === 0) && !currentQuestion) {
      return; // Never run countdown until match questions payload is delivered
    }
    const interval = setInterval(() => {
      setPreCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsCountdownDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 750);
    return () => clearInterval(interval);
  }, [isCountdownDone, initialMatchData?.questions, currentQuestion]);

  // Fair Play Anti-Cheat: Detect Tab Switching (Page Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && phase === 'active' && socket && initialMatchData?.matchId) {
        console.warn('[Anti-Cheat] Tab switch detected by browser. Notifying server...');
        socket.emit('tab_switch_detected', { matchId: initialMatchData.matchId });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [phase, socket, initialMatchData?.matchId]);

  // Submit Answer handler
  const handleSelectOption = useCallback(
    (optionIndex) => {
      if (isAnswerSubmitted || phase !== 'active' || !currentQuestion || !socket) return;

      dispatch({ type: 'SUBMIT_LOCAL_ANSWER', payload: { selectedOptionIndex: optionIndex } });

      socket.emit('submit_answer', {
        matchId: initialMatchData.matchId,
        questionIndex: currentQuestion.questionNumber - 1,
        selectedOptionIndex: optionIndex,
      });
    },
    [isAnswerSubmitted, phase, currentQuestion, socket, initialMatchData.matchId]
  );

  // Keyboard Navigation & Hotkeys: Keys 1, 2, 3, 4 (NFR-07 Accessibility)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const optionIdx = parseInt(e.key, 10) - 1;
        if (currentQuestion && optionIdx < currentQuestion.options.length) {
          handleSelectOption(optionIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectOption, currentQuestion]);

  // Socket event listeners (FR-04, FR-05, AC-01, AC-02, AC-03)
  useEffect(() => {
    if (!socket) return;

    const handleNewQuestion = (qData) => {
      setIsCountdownDone(true);
      dispatch({ type: 'NEW_QUESTION', payload: qData });
    };

    const handleTimerTick = (tData) => {
      dispatch({ type: 'TIMER_TICK', payload: tData });
    };

    const handleScoreUpdate = (sData) => {
      dispatch({
        type: 'SCORE_UPDATE',
        payload: {
          scores: sData.scores,
          currentUserId,
          opponentId: opponent.userId,
          lastAnsweredBy: sData.lastAnsweredBy,
        },
      });
    };

    const handleQuestionEnded = (endedData) => {
      dispatch({ type: 'QUESTION_ENDED', payload: endedData });
    };

    const handleMatchEnded = (finalData) => {
      console.log('[Match] Match completed:', finalData);
      onMatchFinished(finalData);
    };

    const handleOpponentDisconnect = (discData) => {
      dispatch({ type: 'OPPONENT_DISCONNECTED', payload: discData });
    };

    const handleOpponentReconnect = () => {
      dispatch({ type: 'OPPONENT_RECONNECTED' });
    };

    const handleMatchSync = (syncData) => {
      setIsCountdownDone(true);
      dispatch({
        type: 'MATCH_SYNC',
        payload: {
          ...syncData,
          currentUserId,
          opponentId: opponent?.userId,
        },
      });
    };

    const handleTabWarning = (wData) => {
      const strikes = wData.strikeCount || 1;
      setUserStrikes(strikes);
      const remaining = Math.max(0, 3 - strikes);
      setTabWarning({
        strikeCount: strikes,
        maxStrikes: wData.maxStrikes || 3,
        message:
          strikes >= 3
            ? 'You have been disqualified for 3 strike violations.'
            : `Fair Play: You left the quiz window! You have ${remaining} strike${remaining === 1 ? '' : 's'} left.`,
      });
    };

    const handleOpponentTabWarning = (owData) => {
      const strikes = owData.strikeCount || 1;
      setOpponentStrikes(strikes);
      setOpponentWarning({
        strikeCount: strikes,
        maxStrikes: owData.maxStrikes || 3,
        message: `Fair Play: ${opponent.username} left the quiz window (Strike ${strikes}/3)`,
      });
    };

    socket.on('new_question', handleNewQuestion);
    socket.on('timer_tick', handleTimerTick);
    socket.on('score_update', handleScoreUpdate);
    socket.on('question_ended', handleQuestionEnded);
    socket.on('match_ended', handleMatchEnded);
    socket.on('opponent_disconnected', handleOpponentDisconnect);
    socket.on('opponent_reconnected', handleOpponentReconnect);
    socket.on('match_sync', handleMatchSync);
    socket.on('tab_warning', handleTabWarning);
    socket.on('opponent_tab_warning', handleOpponentTabWarning);

    // Request match state sync in case of page reload during an active duel (NFR-04)
    socket.emit('reconnect_match');

    return () => {
      socket.off('new_question', handleNewQuestion);
      socket.off('timer_tick', handleTimerTick);
      socket.off('score_update', handleScoreUpdate);
      socket.off('question_ended', handleQuestionEnded);
      socket.off('match_ended', handleMatchEnded);
      socket.off('opponent_disconnected', handleOpponentDisconnect);
      socket.off('opponent_reconnected', handleOpponentReconnect);
      socket.off('match_sync', handleMatchSync);
      socket.off('tab_warning', handleTabWarning);
      socket.off('opponent_tab_warning', handleOpponentTabWarning);
    };
  }, [socket, currentUserId, opponent.userId, onMatchFinished]);

  // Timer urgency color & pulse
  const timerColor =
    remainingSeconds <= 4 ? '#ef4444' : remainingSeconds <= 9 ? '#f59e0b' : '#818cf8';

  const timeLimitTotal = currentQuestion?.timeLimit || 10;
  const timerRadius = 40;
  const timerCircumference = 2 * Math.PI * timerRadius; // ~251.33
  const timerProgress = Math.max(0, remainingSeconds) / timeLimitTotal;
  const strokeDashoffset = timerCircumference - timerCircumference * timerProgress;

  // Category formatted
  const displayCategory = formatCategoryName(currentQuestion?.category || initialMatchData?.category);

  // Guard: Never show question screen, countdown, or timer unless matchFound with questions payload was received
  if ((!initialMatchData?.questions || initialMatchData.questions.length === 0) && !currentQuestion) {
    return (
      <main className="container" style={{ maxWidth: 640, paddingTop: '5.5rem', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', marginBottom: '1.25rem' }}>
            <Swords size={36} color="#818cf8" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Awaiting Match Questions...
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 450, margin: '0 auto' }}>
            The duel will begin as soon as verified questions from category <strong>{displayCategory}</strong> are delivered by the battle server.
          </p>
        </div>
      </main>
    );
  }

  // Pre-Match 3-2-1 Countdown Screen (AC-01)
  if (!isCountdownDone && (!currentQuestion || phase === 'waiting')) {
    return (
      <main className="container" style={{ maxWidth: 700, paddingTop: '4rem', paddingBottom: '3rem' }}>
        <style>{`
          @keyframes countdownPop {
            0% { transform: scale(0.6); opacity: 0; }
            50% { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3.5rem 2rem',
            background: 'linear-gradient(180deg, #131b2e 0%, #0c131d 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(99, 102, 241, 0.2)',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Swords size={20} color="#818cf8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#818cf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              1v1 Battle Arena
            </span>
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
            Category: <span style={{ color: '#818cf8' }}>{displayCategory}</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2.5rem' }}>
            Synchronizing live battle arena... Duel commences in
          </p>

          {/* Big Pulsing 3-2-1 Badge */}
          <div
            key={preCountdown}
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              margin: '0 auto 2.5rem',
              display: 'grid',
              placeItems: 'center',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '3px solid #818cf8',
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.4), inset 0 0 20px rgba(99, 102, 241, 0.2)',
              animation: 'countdownPop 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span
              style={{
                fontSize: preCountdown === 0 ? '1.75rem' : '3.5rem',
                fontWeight: 900,
                color: '#ffffff',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '-0.02em',
              }}
            >
              {preCountdown === 0 ? 'DUEL!' : preCountdown}
            </span>
          </div>

          {/* Player vs Opponent Chips */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#6366f1',
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                {(user?.username || 'Y').charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 800 }}>YOU</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{user?.username}</div>
              </div>
            </div>

            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#475569' }}>VS</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#f59e0b',
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                {opponent.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 800 }}>OPPONENT</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{opponent.username}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ maxWidth: 920, paddingTop: '1.25rem', paddingBottom: '2.5rem' }}>
      <style>{`
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.4)); }
          50% { transform: scale(1.06); filter: drop-shadow(0 0 16px rgba(239, 68, 68, 0.9)); }
        }
        @keyframes scoreFloatUp {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          25% { transform: translateY(-4px) scale(1.15); opacity: 1; }
          100% { transform: translateY(-22px) scale(0.95); opacity: 0; }
        }
        .match-option-button:focus-visible {
          outline: 2px solid #818cf8 !important;
          outline-offset: 2px !important;
        }
      `}</style>

      {/* Fair Play Anti-Cheat Warning Alert (Auto-dismisses in 5s) */}
      {tabWarning && (
        <div
          role="alert"
          style={{
            background: 'rgba(245, 158, 11, 0.16)',
            border: '2px solid #f59e0b',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#f59e0b',
              display: 'grid',
              placeItems: 'center',
              color: '#1e293b',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#fef3c7', fontSize: '0.9rem', display: 'block', marginBottom: '0.15rem' }}>
              Fair Play Warning (Auto-dismissing)
            </strong>
            <p style={{ margin: 0, color: '#fde68a', fontSize: '0.85rem', fontWeight: 500 }}>
              {tabWarning.message}
            </p>
          </div>
        </div>
      )}

      {/* Opponent Tab Switch Notice (Auto-dismisses in 5s) */}
      {opponentWarning && (
        <div
          role="status"
          style={{
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid #818cf8',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <AlertTriangle size={18} color="#818cf8" />
          <div style={{ fontSize: '0.85rem', color: '#e0e7ff' }}>
            {opponentWarning.message}
          </div>
        </div>
      )}

      {/* Reconnect / Disconnect Warning Banner (NFR-04) */}
      {opponentDisconnected && (
        <div
          className="alert alert-danger"
          role="alert"
          style={{
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(239, 68, 68, 0.18)',
            border: '2px solid #ef4444',
          }}
        >
          <AlertCircle size={22} color="#ef4444" />
          <div>
            <strong>Opponent disconnected!</strong> Waiting up to <strong>{disconnectRemaining}s</strong> for them to reconnect before forfeit victory.
          </div>
        </div>
      )}

      {/* Head-to-Head HUD (Live Scores - FR-05, AC-02) */}
      <section
        aria-label="Match Live Scoreboard"
        className="card match-hud-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '1.25rem',
          padding: '1.25rem 1.75rem',
          marginBottom: '1.5rem',
          background: '#131b2e',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
        }}
      >
        {/* Player 1 (You) - Left Side, Indigo Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user?.avatarUrl ? (
            <img
              src={getAvatarUrl(user.avatarUrl)}
              alt="Avatar"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              style={{
                width: 48,
                height: 48,
                minWidth: 48,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #6366f1',
              }}
            />
          ) : (
            <div
              className="match-avatar-circle"
              style={{
                width: 48,
                height: 48,
                minWidth: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: '2px solid #6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.2rem',
                color: '#ffffff',
              }}
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
              <span className="badge" style={{ background: '#6366f1', color: '#ffffff', fontSize: '0.65rem', padding: '0.15rem 0.45rem', fontWeight: 800 }}>
                YOU
              </span>
              <span className="match-user-name" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                {user?.username || 'You'}
              </span>
              {/* Strike dots for You */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '3px' }} title={`${userStrikes}/3 Strikes`}>
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: s <= userStrikes ? '#ef4444' : '#334155',
                      boxShadow: s <= userStrikes ? '0 0 6px #ef4444' : 'none',
                      display: 'inline-block',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Score & Pop */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
              <div className="match-user-score" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#818cf8', fontFamily: 'JetBrains Mono, monospace' }}>
                {playerScore} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PTS</span>
              </div>
              {playerPop && (
                <span
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '-6px',
                    marginLeft: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#10b981',
                    animation: 'scoreFloatUp 1.2s ease-out forwards',
                  }}
                >
                  {playerPop}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Large 96px Countdown Timer (FR-04, AC-03) */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`${remainingSeconds} seconds remaining`}
            className="match-timer-box"
            style={{
              position: 'relative',
              width: 96,
              height: 96,
              margin: '0 auto',
              animation: remainingSeconds <= 3 && phase === 'active' ? 'timerPulse 0.6s infinite ease-in-out' : 'none',
            }}
          >
            <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background ring */}
              <circle cx="48" cy="48" r={timerRadius} fill="#0c131d" stroke="#1e293b" strokeWidth="6" />
              {/* Animated Progress ring */}
              <circle
                cx="48"
                cy="48"
                r={timerRadius}
                fill="transparent"
                stroke={timerColor}
                strokeWidth="6"
                strokeDasharray={timerCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s ease' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  color: timerColor,
                  lineHeight: 1,
                }}
              >
                {Math.max(0, remainingSeconds)}
              </span>
              <span style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase' }}>
                {timeLimitTotal}s Total
              </span>
            </div>
          </div>
        </div>

        {/* Player 2 (Opponent) - Right Side, Amber Theme */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', marginBottom: '0.15rem' }}>
              {/* Strike dots for Opponent */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginRight: '3px' }} title={`${opponentStrikes}/3 Strikes`}>
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: s <= opponentStrikes ? '#ef4444' : '#334155',
                      boxShadow: s <= opponentStrikes ? '0 0 6px #ef4444' : 'none',
                      display: 'inline-block',
                    }}
                  />
                ))}
              </div>
              <span className="match-user-name" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                {opponent.username}
              </span>
              <span
                className="badge"
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#f59e0b',
                  border: '1px solid #f59e0b',
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.45rem',
                  fontWeight: 800,
                }}
              >
                OPP
              </span>
            </div>

            {/* Live Opponent Status Indicator (Thinking / Answered) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.2rem' }}>
              {opponentAnswered ? (
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={13} />
                  Answered
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    className="animate-pulse"
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}
                  />
                  Thinking…
                </span>
              )}
            </div>

            {/* Score & Pop */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '0.35rem' }}>
              {opponentPop && (
                <span
                  style={{
                    position: 'absolute',
                    right: '100%',
                    top: '-6px',
                    marginRight: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#f59e0b',
                    animation: 'scoreFloatUp 1.2s ease-out forwards',
                  }}
                >
                  {opponentPop}
                </span>
              )}
              <div className="match-user-score" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                {opponentScore} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PTS</span>
              </div>
            </div>
          </div>

          <div
            className="match-avatar-circle"
            style={{
              width: 48,
              height: 48,
              minWidth: 48,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '2px solid #f59e0b',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
            }}
          >
            {opponent.username.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Live Head-to-Head Score Bar with Center Notch */}
        <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.45rem' }}>
            <span style={{ fontWeight: 600 }}>You vs {opponent.username}</span>
            <span
              style={{
                fontWeight: 700,
                color:
                  playerScore === opponentScore
                    ? '#94a3b8'
                    : playerScore > opponentScore
                    ? '#818cf8'
                    : '#f59e0b',
              }}
            >
              {playerScore === opponentScore
                ? 'Scores Tied'
                : playerScore > opponentScore
                ? `You lead by ${playerScore - opponentScore}`
                : `${opponent.username} leads by ${opponentScore - playerScore}`}
            </span>
          </div>

          <div style={{ position: 'relative', height: 8, background: '#1e293b', borderRadius: 999, overflow: 'visible', display: 'flex' }}>
            {/* You bar (Indigo) */}
            <div
              style={{
                width: `${playerScore + opponentScore > 0 ? (playerScore / (playerScore + opponentScore)) * 100 : 50}%`,
                background: '#6366f1',
                borderRadius: '999px 0 0 999px',
                transition: 'width 0.4s ease',
              }}
            />
            {/* Opponent bar (Amber) */}
            <div
              style={{
                width: `${playerScore + opponentScore > 0 ? (opponentScore / (playerScore + opponentScore)) * 100 : 50}%`,
                background: '#f59e0b',
                borderRadius: '0 999px 999px 0',
                transition: 'width 0.4s ease',
              }}
            />
            {/* Center Notch Indicator (instead of stray cursor) */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: -3,
                transform: 'translateX(-50%)',
                width: 4,
                height: 14,
                borderRadius: 2,
                background: '#ffffff',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.9)',
                zIndex: 2,
              }}
              title="Tied midpoint"
            />
          </div>
        </div>
      </section>

      {/* Question Card & Accessible Options (AC-01, NFR-05, NFR-07) */}
      {currentQuestion ? (
        <section
          className="card"
          style={{
            padding: '1.75rem 2rem 2.25rem',
            background: '#131b2e',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
          }}
        >
          {/* Question Meta Header & Step Dots */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
                Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions || 5}
              </span>
              {/* Question Run Progress Dots */}
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                {Array.from({ length: currentQuestion.totalQuestions || 5 }).map((_, stepIdx) => {
                  const stepNum = stepIdx + 1;
                  const isCurrent = stepNum === currentQuestion.questionNumber;
                  const pastResult = questionResults[stepIdx];

                  let dotColor = '#334155';
                  if (pastResult === 'correct') dotColor = '#10b981';
                  else if (pastResult === 'wrong') dotColor = '#ef4444';
                  else if (isCurrent) dotColor = '#818cf8';

                  return (
                    <div
                      key={stepIdx}
                      style={{
                        width: isCurrent ? 24 : 14,
                        height: 7,
                        borderRadius: 4,
                        background: dotColor,
                        boxShadow: isCurrent ? '0 0 8px rgba(129, 140, 248, 0.6)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                      title={
                        pastResult
                          ? `Question ${stepNum}: ${pastResult}`
                          : isCurrent
                          ? `Question ${stepNum}: Active`
                          : `Question ${stepNum}`
                      }
                    />
                  );
                })}
              </div>
            </div>

            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Category: <strong style={{ color: '#ffffff' }}>{displayCategory}</strong>
            </span>
          </div>

          {/* Question Prompt */}
          <h2
            className="match-prompt-heading"
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              lineHeight: 1.45,
              marginBottom: '1.75rem',
              color: '#f8fafc',
            }}
          >
            {currentQuestion.prompt}
          </h2>

          {/* 4 Accessible Option Buttons */}
          <div
            role="radiogroup"
            aria-label="Answer options"
            className="match-options-container"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '0.9rem',
              marginBottom: '1rem',
            }}
          >
            {currentQuestion.options.map((optionText, idx) => {
              const isSelected = selectedOption === idx;
              const isRevealed = revealedAnswer !== null;
              const isCorrectAnswer = isRevealed && revealedAnswer.correctOptionIndex === idx;
              const isWrongChoice = isRevealed && isSelected && !isCorrectAnswer;

              // Color styling based on state
              let btnBg = '#182234';
              let borderColor = 'rgba(255, 255, 255, 0.08)';
              let textColor = '#f1f5f9';

              if (isSelected && !isRevealed) {
                btnBg = 'rgba(99, 102, 241, 0.25)';
                borderColor = '#818cf8';
              } else if (isCorrectAnswer) {
                btnBg = 'rgba(16, 185, 129, 0.25)';
                borderColor = '#10b981';
                textColor = '#6ee7b7';
              } else if (isWrongChoice) {
                btnBg = 'rgba(239, 68, 68, 0.25)';
                borderColor = '#ef4444';
                textColor = '#fca5a5';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Option ${idx + 1}: ${optionText}`}
                  disabled={isAnswerSubmitted || phase === 'intermission'}
                  onClick={() => handleSelectOption(idx)}
                  className="match-option-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    background: btnBg,
                    border: `2px solid ${borderColor}`,
                    borderRadius: 14,
                    padding: '0.95rem 1.25rem',
                    textAlign: 'left',
                    color: textColor,
                    cursor: isAnswerSubmitted || phase === 'intermission' ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Hotkey Badge (1-4) */}
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: isSelected ? '#818cf8' : '#94a3b8',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>

                  <span style={{ fontSize: '0.975rem', fontWeight: 600, flexGrow: 1 }}>{optionText}</span>

                  {/* Lock icon on chosen answer */}
                  {isSelected && !isRevealed && (
                    <span title="Answer locked in" style={{ color: '#818cf8' }}>
                      <Lock size={16} />
                    </span>
                  )}

                  {/* Outcome Icons */}
                  {isCorrectAnswer && <CheckCircle2 size={20} color="#10b981" />}
                  {isWrongChoice && <XCircle size={20} color="#ef4444" />}
                </button>
              );
            })}
          </div>

          {/* Waiting for Opponent Status Line */}
          {isAnswerSubmitted && phase === 'active' && (
            <p
              style={{
                textAlign: 'center',
                color: '#818cf8',
                fontSize: '0.9rem',
                fontWeight: 600,
                margin: '0.75rem 0 0',
              }}
            >
              Answer locked in! Waiting for opponent to answer…
            </p>
          )}

          {/* Feedback Banner on Intermission */}
          {phase === 'intermission' && revealedAnswer && (
            <div
              className={`alert ${
                selectedOption === revealedAnswer.correctOptionIndex ? 'alert-success' : 'alert-danger'
              }`}
              role="alert"
              style={{ marginTop: '1rem', borderRadius: 12 }}
            >
              {selectedOption === revealedAnswer.correctOptionIndex ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} />
                  <span>
                    <strong>Correct!</strong> Speed bonus applied. Next round advancing in 3s...
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XCircle size={20} />
                  <span>
                    <strong>Incorrect.</strong> The correct answer was:{' '}
                    <strong>{revealedAnswer.correctOptionText}</strong>. Next round advancing in 3s...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Accessibility Keyboard Hint */}
          <div
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.8rem',
            }}
          >
            Tip: Use keys <kbd style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: 4, color: '#e2e8f0' }}>1</kbd> – <kbd style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: 4, color: '#e2e8f0' }}>4</kbd> on your keyboard to instantly lock in your answers!
          </div>
        </section>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', background: '#131b2e' }}>
          <p style={{ color: 'var(--text-muted)' }}>Preparing questions for duel...</p>
        </div>
      )}
    </main>
  );
};
