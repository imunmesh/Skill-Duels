import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Trophy, Swords, Zap, ArrowRight, Award, ShieldAlert, Sparkles, RefreshCw, Home, Shield, Medal, Gem, Crown } from 'lucide-react';
import { RankUpModal } from '../components/ui/rank-up-modal';
import { AchievementUnlockedModal } from '../components/ui/achievement-unlocked-modal';
import { getNextTierProgress, getTierDetails, normalizeTier, TIER_ORDER, getTierFromXP } from '../constants/tiers';
import { RematchButton } from '../components/RematchButton';

export const ResultPage = ({ matchResult, onPlayAgain, onBackToArena, onMatchFound }) => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user, updateProfileXP } = useAuth();

  const currentUserId = user?._id ? user._id.toString() : '';
  const players = matchResult?.players || [];
  const playerResult = players.find((p) => p.userId?.toString() === currentUserId) || players[0];
  const opponentResult = players.find((p) => p.userId?.toString() !== currentUserId) || players[1];

  const isWinner = matchResult?.winnerId?.toString() === currentUserId;
  const isDraw = matchResult?.isDraw;
  const isForfeit = matchResult?.reason === 'opponent_forfeit' || matchResult?.reason === 'tab_switch_forfeit';

  // Calculate actual XP before and after this match
  const finalXP = Number(playerResult?.newTotalXP ?? user?.xp ?? 0);
  const xpGained = Number(playerResult?.xpAwarded ?? 0);
  const prevXP = Math.max(0, finalXP - xpGained);

  // Normalize old and new tiers to canonical hierarchy
  const rawOldRank = playerResult?.oldRank;
  const rawNewRank = playerResult?.newRank;

  const oldTier = normalizeTier(rawOldRank, prevXP);
  const newTier = normalizeTier(rawNewRank, finalXP);

  const oldIndex = TIER_ORDER.indexOf(oldTier);
  const newIndex = TIER_ORDER.indexOf(newTier);

  // Rank increased if backend flagged isRankUp OR mathematically promoted to a higher tier index
  const isRankIncreased = Boolean(
    playerResult?.isRankUp || (oldIndex !== -1 && newIndex !== -1 && newIndex > oldIndex)
  );

  const newBadgesList = playerResult?.newBadges || [];

  const [isRankUpOpen, setIsRankUpOpen] = useState(false);
  const [modalOldRank, setModalOldRank] = useState(oldTier);
  const [modalNewRank, setModalNewRank] = useState(newTier);
  const [isAchievementOpen, setIsAchievementOpen] = useState(false);
  const evaluatedRef = useRef(false);
  const badgeEvaluatedRef = useRef(false);

  const tierProgress = getNextTierProgress(finalXP);
  const currentTierDetails = getTierDetails(newTier);
  const nextTierDetails = tierProgress.nextTier ? getTierDetails(tierProgress.nextTier) : null;

  // 1. Sync updated XP and rank to AuthContext once
  useEffect(() => {
    if (playerResult?.newTotalXP) {
      updateProfileXP(playerResult.newTotalXP, newTier);
    }
  }, [playerResult?.newTotalXP, newTier]);

  // 2. Trigger Rank Up celebration modal when tier actually increases
  useEffect(() => {
    if (evaluatedRef.current) return;
    if (!matchResult && !playerResult) return;

    if (isRankIncreased) {
      evaluatedRef.current = true;
      setModalOldRank(oldTier);
      setModalNewRank(newTier);

      const timer = setTimeout(() => {
        setIsRankUpOpen(true);
      }, 350);

      return () => clearTimeout(timer);
    } else if (newBadgesList.length > 0 && !badgeEvaluatedRef.current) {
      // If no rank up but badges unlocked, trigger achievement celebration
      badgeEvaluatedRef.current = true;
      const timer = setTimeout(() => {
        setIsAchievementOpen(true);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [isRankIncreased, oldTier, newTier, matchResult, playerResult, newBadgesList]);

  // When rank up closes, show achievement modal if any badges were also unlocked
  const handleRankUpClose = () => {
    setIsRankUpOpen(false);
    if (newBadgesList.length > 0 && !badgeEvaluatedRef.current) {
      badgeEvaluatedRef.current = true;
      setTimeout(() => {
        setIsAchievementOpen(true);
      }, 300);
    }
  };

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

        {/* XP Gains & Tier Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480, margin: '0 auto 2.25rem' }}>
          {/* XP Gained Chip */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.5rem',
            }}
          >
            <Zap size={22} color="#f59e0b" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fcd34d' }}>
                +{xpGained || (isWinner ? 50 : 15)} XP Earned
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isWinner ? 'Match Victory Bonus' : 'Match Completion Bonus'} &bull; Total: {finalXP} XP
              </div>
            </div>
          </div>

          {/* Tier Progression Bar */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: currentTierDetails.color }}>
                  {newTier} Tier
                </span>
                {isRankIncreased && (
                  <span
                    className="badge badge-success animate-pulse"
                    style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', background: '#10b981' }}
                  >
                    Tier Up!
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {tierProgress.nextTier ? `Next: ${tierProgress.nextTier}` : 'Peak Tier Reached'}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, background: '#1e293b', borderRadius: 999, overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div
                style={{
                  width: `${tierProgress.progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
                  borderRadius: 999,
                  transition: 'width 0.8s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
              <span>{tierProgress.progressPercent}% to next rank</span>
              {tierProgress.nextTier ? (
                <span>{tierProgress.xpNeeded} XP needed</span>
              ) : (
                <span style={{ color: '#10b981' }}>Conqueror Supreme</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Rematch & Back to Arena */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <RematchButton
            matchId={matchResult?.matchId}
            opponentName={opponentResult?.username || 'Opponent'}
            isForfeit={isForfeit}
            onMatchFound={(matchData) => {
              if (onMatchFound) {
                onMatchFound(matchData);
              } else {
                localStorage.setItem('skillduels_active_match', JSON.stringify(matchData));
                localStorage.removeItem('skillduels_final_result');
                navigate(`/match/${matchData.matchId}`);
              }
            }}
          />

          <button
            type="button"
            onClick={() => {
              if (socket && matchResult?.matchId) {
                socket.emit('rematchDecline', { matchId: matchResult.matchId });
              }
              if (onBackToArena) onBackToArena();
              else if (onPlayAgain) onPlayAgain();
            }}
            className="btn btn-secondary"
            style={{ fontSize: '1rem', padding: '0.75rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            aria-label="Return to Arena lobby"
          >
            <Home size={17} />
            <span>Back to Arena</span>
          </button>
        </div>
      </div>

      {/* Rank Up Celebration Modal */}
      <RankUpModal
        isOpen={isRankUpOpen}
        onClose={handleRankUpClose}
        oldRank={modalOldRank}
        newRank={modalNewRank}
        newXP={playerResult?.newTotalXP ?? user?.xp}
      />

      {/* Achievement Unlocked Celebration Animation Modal */}
      <AchievementUnlockedModal
        isOpen={isAchievementOpen}
        onClose={() => setIsAchievementOpen(false)}
        badges={newBadgesList}
      />
    </main>
  );
};
