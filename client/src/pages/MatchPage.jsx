import React, { useReducer, useEffect, useCallback, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Clock, Shield, CheckCircle2, XCircle, Zap, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

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

      return {
        ...state,
        playerScore: scores[currentUserId] !== undefined ? scores[currentUserId] : state.playerScore,
        opponentScore: scores[opponentId] !== undefined ? scores[opponentId] : state.opponentScore,
      };
    }

    case 'QUESTION_ENDED':
      return {
        ...state,
        phase: 'intermission',
        revealedAnswer: action.payload,
        remainingSeconds: 0,
      };

    case 'OPPONENT_DISCONNECTED':
      return {
        ...state,
        opponentDisconnected: true,
        disconnectGraceSeconds: action.payload.gracePeriodSeconds || 20,
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
    phase,
    opponentDisconnected,
  } = state;

  const [tabWarning, setTabWarning] = useState(null);
  const [opponentWarning, setOpponentWarning] = useState(null);

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
      setTabWarning(wData);
    };

    const handleOpponentTabWarning = (owData) => {
      setOpponentWarning(owData);
      setTimeout(() => {
        setOpponentWarning(null);
      }, 6000);
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

  // Timer urgency color
  const timerColor =
    remainingSeconds <= 3 ? 'var(--color-danger)' : remainingSeconds <= 6 ? 'var(--color-warning)' : 'var(--color-success)';

  return (
    <main className="container" style={{ maxWidth: 900, paddingTop: '1.5rem' }}>
      {/* Fair Play Anti-Cheat Warning Alert */}
      {tabWarning && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.18)',
            border: '2px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  letterSpacing: '0.05em',
                }}
              >
                STRIKE {tabWarning.strikeCount} / {tabWarning.maxStrikes}
              </span>
              <strong style={{ color: '#fca5a5', fontSize: '0.95rem' }}>
                ANTI-CHEAT FAIR PLAY WARNING
              </strong>
            </div>
            <p style={{ margin: 0, color: '#fecaca', fontSize: '0.875rem', fontWeight: 500 }}>
              {tabWarning.message}
            </p>
          </div>
        </div>
      )}

      {/* Opponent Tab Switch Notice */}
      {opponentWarning && (
        <div
          role="status"
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid #f59e0b',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertTriangle size={20} color="#f59e0b" />
          <div style={{ fontSize: '0.85rem', color: '#fef3c7' }}>
            <strong>Fair Play System:</strong> {opponentWarning.message}
          </div>
        </div>
      )}

      {/* Reconnect / Disconnect Warning Banner (NFR-04) */}
      {opponentDisconnected && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Opponent disconnected!</strong> Waiting up to 20 seconds for them to reconnect before forfeit victory.
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
          gap: '1rem',
          padding: '1.25rem 2rem',
          marginBottom: '2rem',
          background: 'var(--bg-secondary)',
        }}
      >
        {/* Player 1 (You) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {user?.avatarUrl ? (
            <img
              src={getAvatarUrl(user.avatarUrl)}
              alt="Avatar"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #818cf8',
              }}
            />
          ) : (
            <div
              className="match-avatar-circle"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.1rem',
              }}
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="match-user-name" style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user?.username || 'You'}</span>
              <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '0.15rem 0.45rem' }}>YOU</span>
            </div>
            <div className="match-user-score" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#818cf8', fontFamily: 'JetBrains Mono, monospace' }}>
              {playerScore} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PTS</span>
            </div>
          </div>
        </div>

        {/* Center: Server-Authoritative Countdown Timer (FR-04, AC-03) */}
        <div style={{ textAlign: 'center' }}>
          <div
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`${remainingSeconds} seconds remaining for this question`}
            className="match-timer-box"
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'var(--bg-input)',
              border: `3px solid ${timerColor}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.25rem',
              boxShadow: remainingSeconds <= 3 ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              className="match-timer-number"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: timerColor,
              }}
            >
              {remainingSeconds}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SECONDS
          </span>
        </div>

        {/* Player 2 (Opponent) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
              <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '0.15rem 0.45rem' }}>OPP</span>
              <span className="match-user-name" style={{ fontWeight: 700, fontSize: '0.95rem' }}>{opponent.username}</span>
            </div>
            <div className="match-user-score" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
              {opponentScore} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PTS</span>
            </div>
          </div>
          <div
            className="match-avatar-circle"
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '2px solid #f59e0b',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
            }}
          >
            {opponent.username.charAt(0).toUpperCase()}
          </div>
        </div>
      </section>

      {/* Question Card & Accessible Options (AC-01, NFR-05, NFR-07) */}
      {currentQuestion ? (
        <section className="card" style={{ padding: '2rem' }}>
          {/* Question Meta Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="badge badge-primary">
              Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions}
            </span>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              Category: <strong style={{ color: '#ffffff' }}>{currentQuestion.category}</strong>
            </span>
          </div>

          {/* Prompt */}
          <h2
            className="match-prompt-heading"
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              lineHeight: 1.4,
              marginBottom: '2rem',
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
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {currentQuestion.options.map((optionText, idx) => {
              const isSelected = selectedOption === idx;
              const isRevealed = revealedAnswer !== null;
              const isCorrectAnswer = isRevealed && revealedAnswer.correctOptionIndex === idx;
              const isWrongChoice = isRevealed && isSelected && !isCorrectAnswer;

              // Color styling based on state
              let btnBg = 'var(--bg-input)';
              let borderColor = 'var(--border-color)';
              let textColor = 'var(--text-main)';

              if (isSelected && !isRevealed) {
                btnBg = 'rgba(99, 102, 241, 0.2)';
                borderColor = 'var(--border-focus)';
              } else if (isCorrectAnswer) {
                btnBg = 'rgba(16, 185, 129, 0.2)';
                borderColor = 'var(--color-success)';
                textColor = '#6ee7b7';
              } else if (isWrongChoice) {
                btnBg = 'rgba(239, 68, 68, 0.2)';
                borderColor = 'var(--color-danger)';
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
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.25rem',
                    textAlign: 'left',
                    color: textColor,
                    cursor: isAnswerSubmitted ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Hotkey Badge (1-4) */}
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>

                  <span style={{ fontSize: '1rem', fontWeight: 600, flexGrow: 1 }}>{optionText}</span>

                  {/* Outcome Icons */}
                  {isCorrectAnswer && <CheckCircle2 size={20} color="var(--color-success)" />}
                  {isWrongChoice && <XCircle size={20} color="var(--color-danger)" />}
                </button>
              );
            })}
          </div>

          {/* Feedback Banner on Submission / Intermission (NFR-05) */}
          {phase === 'intermission' && revealedAnswer && (
            <div
              className={`alert ${
                selectedOption === revealedAnswer.correctOptionIndex ? 'alert-success' : 'alert-danger'
              }`}
              role="alert"
              style={{ marginTop: '1rem' }}
            >
              {selectedOption === revealedAnswer.correctOptionIndex ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} />
                  <span>
                    <strong>Correct!</strong> Speed bonus applied. Next question advancing in 3s...
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XCircle size={20} />
                  <span>
                    <strong>Incorrect.</strong> The correct answer was:{' '}
                    <strong>{revealedAnswer.correctOptionText}</strong>. Advancing in 3s...
                  </span>
                </div>
              )}
            </div>
          )}

          {isAnswerSubmitted && phase === 'active' && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Answer locked in! Waiting for timer or opponent to answer...
            </p>
          )}

          {/* Accessibility Hint */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            Tip: You can use number keys <kbd style={{ background: '#334155', padding: '0.1rem 0.35rem', borderRadius: 4 }}>1</kbd> - <kbd style={{ background: '#334155', padding: '0.1rem 0.35rem', borderRadius: 4 }}>4</kbd> on your keyboard for fast answers!
          </div>
        </section>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Preparing questions for duel...</p>
        </div>
      )}
    </main>
  );
};
