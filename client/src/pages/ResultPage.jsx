import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Swords, Zap, ArrowRight, Award, ShieldAlert, Sparkles } from 'lucide-react';
import { RankUpModal } from '../components/ui/rank-up-modal';

export const ResultPage = ({ matchResult, onPlayAgain }) => {
  const { user, updateProfileXP } = useAuth();

  const currentUserId = user?._id ? user._id.toString() : '';
  const players = matchResult?.players || [];
  const playerResult = players.find((p) => p.userId?.toString() === currentUserId) || players[0];
  const opponentResult = players.find((p) => p.userId?.toString() !== currentUserId) || players[1];

  const isWinner = matchResult?.winnerId?.toString() === currentUserId;
  const isDraw = matchResult?.isDraw;

  const [isRankUpOpen, setIsRankUpOpen] = useState(false);
  const [modalOldRank, setModalOldRank] = useState(playerResult?.oldRank || 'Silver');
  const [modalNewRank, setModalNewRank] = useState(playerResult?.newRank || 'Gold');

  // Automatically trigger the Rank Up animation directly without requiring preview tabs/buttons
  useEffect(() => {
    if (playerResult?.newTotalXP) {
      updateProfileXP(playerResult.newTotalXP);
    }
    if (playerResult?.isRankUp || !matchResult) {
      setModalOldRank(playerResult?.oldRank || 'Silver');
      setModalNewRank(playerResult?.newRank || 'Gold');
      const timer = setTimeout(() => {
        setIsRankUpOpen(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [playerResult, matchResult, updateProfileXP]);

  return (
    <main className="container" style={{ maxWidth: 720, paddingTop: '5.25rem', paddingBottom: '3.5rem' }}>
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2.5rem' }}>
        {/* Victory / Defeat Badge */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: isWinner
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : isDraw
                ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isWinner ? '0 0 35px rgba(245, 158, 11, 0.4)' : 'none',
              marginBottom: '1rem',
            }}
          >
            {isWinner ? (
              <Trophy size={44} color="#ffffff" />
            ) : isDraw ? (
              <Sparkles size={44} color="#ffffff" />
            ) : (
              <Swords size={44} color="#94a3b8" />
            )}
          </div>

          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
              color: isWinner ? '#fcd34d' : isDraw ? '#a5b4fc' : '#f8fafc',
            }}
          >
            {matchResult?.reason === 'tab_switch_forfeit'
              ? isWinner
                ? 'Victory by Forfeit!'
                : 'Disqualified!'
              : isWinner
              ? 'Victory!'
              : isDraw
              ? 'Honorable Draw!'
              : 'Battle Ended'}
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            {matchResult?.reason === 'tab_switch_forfeit'
              ? isWinner
                ? 'Your opponent was disqualified for tab switching (3 strikes). Victory awarded to you!'
                : 'You were kicked from the duel for switching tabs 3 times. Fair play rules strictly forbid navigating away.'
              : matchResult?.reason === 'opponent_forfeit'
              ? isWinner
                ? 'Your opponent forfeited by disconnecting. Victory awarded to you!'
                : 'You forfeited the match by disconnecting.'
              : isWinner
              ? 'Outstanding performance! You outscored your opponent.'
              : isDraw
              ? 'Both players finished with an identical score!'
              : 'Good duel! Review questions and sharpen your skills for next time.'}
          </p>
        </div>

        {/* Scoreboard Card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Player Score */}
          <div
            style={{
              borderRight: '1px solid var(--border-color)',
              paddingRight: '1rem',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {playerResult?.username || 'You'}
            </span>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: isWinner ? '#fcd34d' : '#818cf8',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {playerResult?.score || 0}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>POINTS EARNED</span>
          </div>

          {/* Opponent Score */}
          <div style={{ paddingLeft: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {opponentResult?.username || 'Opponent'}
            </span>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: opponentResult?.isWinner ? '#fcd34d' : 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {opponentResult?.score || 0}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>POINTS EARNED</span>
          </div>
        </div>

        {/* XP Gains & Rank Up Banner */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.75rem',
              marginBottom: '2.5rem',
            }}
          >
            <Zap size={22} color="#f59e0b" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fcd34d' }}>
                +{playerResult?.xpAwarded || 15} XP Earned
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Profile Total: {playerResult?.newTotalXP ?? user?.xp ?? 0} XP
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={onPlayAgain}
            className="btn btn-primary"
            style={{ fontSize: '1.05rem', padding: '0.85rem 2.5rem' }}
            aria-label="Return to lobby to play another duel"
          >
            <span>Play Another Duel</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Rank Up Celebration Modal */}
      <RankUpModal
        isOpen={isRankUpOpen}
        onClose={() => setIsRankUpOpen(false)}
        oldRank={modalOldRank}
        newRank={modalNewRank}
        newXP={playerResult?.newTotalXP ?? user?.xp}
      />
    </main>
  );
};
