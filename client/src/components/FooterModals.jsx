import React, { useEffect } from 'react';
import { X, Swords, Zap, Award, ShieldCheck, Flame, BookOpen, FileText, CheckCircle2, Trophy, Shield, Gem, Crown } from 'lucide-react';

export const FooterModals = ({ activeModal, onClose }) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (activeModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeModal, onClose]);

  if (!activeModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="modal-dark-scroll"
        style={{
          background: 'linear-gradient(180deg, #131c2a 0%, #0c131d 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15)',
          maxWidth: '580px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#334155 #0c131d',
          padding: '2rem',
          position: 'relative',
          color: '#f8fafc',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .modal-dark-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .modal-dark-scroll::-webkit-scrollbar-track {
            background: #0c131d;
          }
          .modal-dark-scroll::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 4px;
          }
          .modal-dark-scroll::-webkit-scrollbar-thumb:hover {
            background: #475569;
          }
        `}</style>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'grid',
            placeItems: 'center',
            color: '#cbd5e1',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
        >
          <X size={18} />
        </button>

        {activeModal === 'how-it-works' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#818cf8',
                }}
              >
                <Swords size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  How SkillDuels Works
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  Rules, scoring metrics, and anti-cheat policies
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Zap size={16} color="#fbbf24" />
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>1v1 Head-to-Head Trivia</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                  Duel against a live peer in real-time. Both contestants answer synchronized multiple-choice questions
                  with real-time socket updates and round timers.
                </p>
              </div>

              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Award size={16} color="#38bdf8" />
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>Scoring & XP System</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  <div>
                    <strong style={{ color: '#818cf8' }}>Match Points (In-Game Battle Score):</strong>
                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', color: '#cbd5e1' }}>
                      <li><strong style={{ color: '#ffffff' }}>Base Score:</strong> +100 points per correct answer.</li>
                      <li><strong style={{ color: '#ffffff' }}>Speed Bonus:</strong> Up to +50 bonus points for rapid responses within the first few seconds (e.g. 425–130 final score).</li>
                    </ul>
                  </div>
                  <div>
                    <strong style={{ color: '#fcd34d' }}>Profile XP (Global Rank & Tier Progression):</strong>
                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', color: '#cbd5e1' }}>
                      <li><strong style={{ color: '#ffffff' }}>Match Victory:</strong> +50 XP awarded directly to the winner’s global profile.</li>
                      <li><strong style={{ color: '#ffffff' }}>Match Completion:</strong> +15 XP for completing a duel.</li>
                      <li><strong style={{ color: '#ffffff' }}>Daily Streak:</strong> +10 XP cumulative bonus for every consecutive daily duel played.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <ShieldCheck size={16} color="#f87171" />
                  <span style={{ fontWeight: 600, color: '#fca5a5', fontSize: '0.95rem' }}>Anti-Cheat Engine</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#fecaca', margin: 0, lineHeight: 1.5 }}>
                  Switching tabs or leaving the window triggers an automated warning strike.
                  Accumulating <strong>3 strikes</strong> automatically results in a disqualification and forfeit.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'badges' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fbbf24',
                }}
              >
                <Award size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  Badges & Achievements
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  Unlock exclusive honors by competing and conquering
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              {[
                { name: 'First Duel', icon: <Swords size={20} color="#cd7f32" />, desc: 'Participate in your very first live 1v1 battle match (Bronze Tier).' },
                { name: 'Speed Demon', icon: <Zap size={20} color="#fbbf24" />, desc: 'Lock in a correct answer within 3 seconds of the timer start.' },
                { name: 'Gold Gladiator', icon: <Trophy size={20} color="#f59e0b" />, desc: 'Attain Gold rank with 300+ XP across competitive duels.' },
                { name: 'Platinum Tactician', icon: <Shield size={20} color="#22d3ee" />, desc: 'Reach 600+ XP and conquer Platinum tier lobbies.' },
                { name: 'Diamond Master', icon: <Gem size={20} color="#818cf8" />, desc: 'Surpass 1,000+ XP and conquer Diamond tier lobbies.' },
                { name: 'Ace Champion', icon: <Award size={20} color="#ec4899" />, desc: 'Reach 2,000+ XP and claim the elite Ace rank.' },
                { name: 'Conqueror Supreme', icon: <Crown size={20} color="#ef4444" />, desc: 'Ascend to the highest echelon (3,500+ XP) — True Conqueror.' },
                { name: 'Streak Master', icon: <Flame size={20} color="#f97316" />, desc: 'Maintain an active daily duel streak for 5 consecutive days.' },
                { name: 'Moderator', icon: <ShieldCheck size={20} color="#10b981" />, desc: 'Platform Administrator credential badge for certified moderators.' },
              ].map((badge, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '10px',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {badge.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                      {badge.name}
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: '#cbd5e1', margin: 0 }}>
                      {badge.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeModal === 'privacy' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#34d399',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  Privacy Policy
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  SkillDuels Arena commitment to player privacy
                </p>
              </div>
            </div>

            <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <p>
                SkillDuels is dedicated to providing an enjoyable and transparent competitive environment. We respect your digital privacy and outline our practices below:
              </p>
              <div>
                <strong style={{ color: '#ffffff' }}>1. Data Collection:</strong> We collect your chosen username, email address, password hash (salted using bcrypt), avatar preferences, and gameplay statistics (XP, match history, win rate).
              </div>
              <div>
                <strong style={{ color: '#ffffff' }}>2. Data Usage:</strong> Your data is solely used to orchestrate live matchmaking, maintain the global and weekly leaderboards, and award badges.
              </div>
              <div>
                <strong style={{ color: '#ffffff' }}>3. Third Parties:</strong> We never sell, monetize, or transfer your personal credentials to third-party data brokers or marketing services.
              </div>
            </div>
          </div>
        )}

        {activeModal === 'terms' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#38bdf8',
                }}
              >
                <FileText size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  Terms of Use
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  Community rules & competition integrity
                </p>
              </div>
            </div>

            <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <p>
                By accessing SkillDuels Arena, you agree to abide by the competitive fair-play standards:
              </p>
              <div>
                <strong style={{ color: '#ffffff' }}>1. Fair Competition:</strong> Automated scripts, bots, scraping question banks, or coordinated win-trading is strictly prohibited and grounds for permanent leaderboard exclusion.
              </div>
              <div>
                <strong style={{ color: '#ffffff' }}>2. Account Responsibility:</strong> You are responsible for safeguarding your login credentials. Each player should duel under their personal profile.
              </div>
              <div>
                <strong style={{ color: '#ffffff' }}>3. Anti-Cheat Enforcement:</strong> In-match telemetry detects tab unfocusing and devtools execution. Contestants who forfeit due to strike violations receive standard defeat penalties.
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1.4rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#4f46e5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#6366f1')}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
