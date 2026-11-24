import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { REMATCH_TTL_MS } from '../constants/rules';

/**
 * Get user-friendly explanation for cancellation reasons
 */
const getCancelExplanation = (reason) => {
  switch (reason) {
    case 'declined':
      return 'Opponent declined the rematch offer.';
    case 'expired':
      return 'Rematch offer expired.';
    case 'left':
      return 'Opponent left the result screen.';
    case 'limit':
      return 'Rematch limit reached for today (max 5 duels).';
    case 'unavailable':
      return 'Rematch is unavailable for this category or match.';
    default:
      return 'Rematch offer was cancelled.';
  }
};

/**
 * RematchButton Component
 *
 * States:
 * - 'idle': "Rematch" button
 * - 'waiting': disabled "Waiting for opponent…" with a 15-second countdown
 * - 'offered': "<name> wants a rematch" with Accept and Decline buttons and a countdown
 * - 'cancelled': disabled "Rematch unavailable" plus inline toast/hint explaining why
 *
 * @param {Object} props
 * @param {string} props.matchId
 * @param {string} props.opponentName
 * @param {boolean} props.isForfeit
 * @param {Function} props.onMatchFound
 */
export const RematchButton = ({
  matchId,
  opponentName = 'Opponent',
  isForfeit = false,
  onMatchFound,
}) => {
  const { socket } = useSocket();

  const [status, setStatus] = useState('idle'); // 'idle' | 'waiting' | 'offered' | 'cancelled'
  const [offeredBy, setOfferedBy] = useState(opponentName);
  const [countdown, setCountdown] = useState(Math.round(REMATCH_TTL_MS / 1000));
  const [cancelReason, setCancelReason] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Track status in ref so unmount cleanup knows if an offer/waiting was active
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Hide button completely for forfeit results
  if (isForfeit) {
    return null;
  }

  // Socket event listeners
  useEffect(() => {
    if (!socket || !matchId) return;

    const handleRematchWaiting = (data) => {
      if (data?.matchId === matchId) {
        setStatus('waiting');
        setCountdown(Math.round(REMATCH_TTL_MS / 1000));
        setToastMessage(null);
      }
    };

    const handleRematchOffered = (data) => {
      if (data?.matchId === matchId) {
        setStatus('offered');
        setOfferedBy(data.from || opponentName || 'Opponent');
        const ttlSecs = Math.round((data.expiresInMs || REMATCH_TTL_MS) / 1000);
        setCountdown(ttlSecs > 0 ? ttlSecs : 15);
        setToastMessage(null);
      }
    };

    const handleRematchCancelled = (data) => {
      if (data?.matchId === matchId) {
        setStatus('cancelled');
        setCancelReason(data.reason);
        setToastMessage(getCancelExplanation(data.reason));
      }
    };

    const handleMatchFound = (matchData) => {
      console.log('[RematchButton] Rematch match paired by server:', matchData);
      setStatus('idle');
      if (onMatchFound) {
        onMatchFound(matchData);
      }
    };

    const handleMatchError = (data) => {
      console.warn('[RematchButton] Rematch match error:', data);
      setStatus('cancelled');
      setCancelReason('unavailable');
      setToastMessage(data?.message || 'Questions unavailable for rematch.');
    };

    socket.on('rematchWaiting', handleRematchWaiting);
    socket.on('rematchOffered', handleRematchOffered);
    socket.on('rematchCancelled', handleRematchCancelled);
    socket.on('matchFound', handleMatchFound);
    socket.on('match_start', handleMatchFound);
    socket.on('matchError', handleMatchError);

    return () => {
      socket.off('rematchWaiting', handleRematchWaiting);
      socket.off('rematchOffered', handleRematchOffered);
      socket.off('rematchCancelled', handleRematchCancelled);
      socket.off('matchFound', handleMatchFound);
      socket.off('match_start', handleMatchFound);
      socket.off('matchError', handleMatchError);
    };
  }, [socket, matchId, opponentName, onMatchFound]);

  // Decline/cancel offer on unmount (leaving result screen or navigating away)
  useEffect(() => {
    return () => {
      if (socket && matchId && (statusRef.current === 'waiting' || statusRef.current === 'offered')) {
        socket.emit('rematchDecline', { matchId });
      }
    };
  }, [socket, matchId]);

  // Countdown timer in 'waiting' or 'offered' states
  useEffect(() => {
    if (status !== 'waiting' && status !== 'offered') return;

    if (countdown <= 0) {
      setStatus('cancelled');
      setCancelReason('expired');
      setToastMessage(getCancelExplanation('expired'));
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('cancelled');
          setCancelReason('expired');
          setToastMessage(getCancelExplanation('expired'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, countdown]);

  const handleRequestRematch = () => {
    if (!socket || !matchId) return;
    socket.emit('rematchRequest', { matchId });
    if (status === 'offered') {
      setStatus('waiting');
    }
  };

  const handleDeclineRematch = () => {
    if (!socket || !matchId) return;
    socket.emit('rematchDecline', { matchId });
    setStatus('cancelled');
    setCancelReason('declined');
    setToastMessage('You declined the rematch offer.');
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* 1. IDLE STATE: "Rematch" button */}
      {status === 'idle' && (
        <button
          type="button"
          onClick={handleRequestRematch}
          className="btn btn-primary"
          style={{
            fontSize: '1rem',
            padding: '0.75rem 1.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            outline: 'none',
          }}
          aria-label="Request a rematch with opponent"
        >
          <RefreshCw size={17} />
          <span>Rematch</span>
        </button>
      )}

      {/* 2. WAITING STATE: Disabled "Waiting for opponent…" with countdown */}
      {status === 'waiting' && (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            disabled
            className="btn btn-secondary"
            style={{
              fontSize: '0.95rem',
              padding: '0.75rem 1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: 0.85,
              cursor: 'not-allowed',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#c7d2fe',
            }}
            aria-live="polite"
            aria-label={`Waiting for ${opponentName} to accept rematch (${countdown} seconds remaining)`}
          >
            <Loader2 size={16} className="animate-spin" color="#818cf8" />
            <span>Waiting for opponent… ({countdown}s)</span>
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Offer expires in {countdown}s
          </span>
        </div>
      )}

      {/* 3. OFFERED STATE: "<name> wants a rematch" with Accept and Decline buttons */}
      {status === 'offered' && (
        <div
          role="region"
          aria-live="assertive"
          aria-label="Rematch invitation from opponent"
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fcd34d', fontSize: '0.9rem', fontWeight: 700 }}>
            <Clock size={16} />
            <span>{offeredBy} wants a rematch! ({countdown}s)</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleRequestRematch}
              className="btn btn-primary"
              style={{
                fontSize: '0.9rem',
                padding: '0.5rem 1.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#10b981',
                borderColor: '#10b981',
              }}
              aria-label="Accept rematch offer"
            >
              <Check size={16} />
              <span>Accept</span>
            </button>

            <button
              type="button"
              onClick={handleDeclineRematch}
              className="btn btn-secondary"
              style={{
                fontSize: '0.9rem',
                padding: '0.5rem 1.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#f87171',
              }}
              aria-label="Decline rematch offer"
            >
              <X size={16} />
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. CANCELLED STATE: Disabled "Rematch unavailable" plus explanatory toast */}
      {status === 'cancelled' && (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            disabled
            className="btn btn-secondary"
            style={{
              fontSize: '0.95rem',
              padding: '0.75rem 1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
            aria-live="polite"
            aria-label="Rematch unavailable"
          >
            <AlertCircle size={16} />
            <span>Rematch unavailable</span>
          </button>
          {toastMessage && (
            <span
              style={{
                fontSize: '0.75rem',
                color: cancelReason === 'limit' ? '#fbbf24' : '#94a3b8',
                maxWidth: 240,
                textAlign: 'center',
              }}
              role="status"
            >
              {toastMessage}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RematchButton;
