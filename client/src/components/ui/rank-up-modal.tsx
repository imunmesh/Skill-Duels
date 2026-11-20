"use client";

import React, { useEffect, useRef } from "react";
import { Trophy, Sparkles, ArrowRight, X, Shield, Award, Flame, Zap } from "lucide-react";

export interface RankUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldRank?: string;
  newRank?: string;
  newXP?: number;
}

const TIER_META: Record<
  string,
  { name: string; color: string; glow: string; icon: string; title: string; perk: string }
> = {
  Bronze: {
    name: "Bronze",
    color: "#cd7f32",
    glow: "rgba(205, 127, 50, 0.4)",
    icon: "🥉",
    title: "Arena Initiate",
    perk: "Unlocked competitive 1v1 matchmaking",
  },
  Silver: {
    name: "Silver",
    color: "#94a3b8",
    glow: "rgba(148, 163, 184, 0.45)",
    icon: "🥈",
    title: "Rising Challenger",
    perk: "Unlocked Weekly Leaderboard eligibility",
  },
  Gold: {
    name: "Gold",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.55)",
    icon: "🥇",
    title: "Elite Duelist",
    perk: "Unlocked Gold Podium Pedestal & Streak Multipliers",
  },
  Platinum: {
    name: "Platinum",
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.5)",
    icon: "💠",
    title: "Master Strategist",
    perk: "Unlocked Platinum Crest & Custom Profile Tag",
  },
  Diamond: {
    name: "Diamond",
    color: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.55)",
    icon: "💎",
    title: "Grand Champion",
    perk: "Unlocked Diamond Aura & Top Tier Matchmaking",
  },
  Ace: {
    name: "Ace",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.6)",
    icon: "⚡",
    title: "Apex Competitor",
    perk: "Unlocked Ace Crown Badge & Featured Profile Highlight",
  },
  Conqueror: {
    name: "Conqueror",
    color: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.65)",
    icon: "👑",
    title: "Supreme Conqueror",
    perk: "Highest tier standing & Global Arena Hall of Fame",
  },
};

export const RankUpModal: React.FC<RankUpModalProps> = ({
  isOpen,
  onClose,
  oldRank = "Silver",
  newRank = "Gold",
  newXP,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const prev = TIER_META[oldRank] || TIER_META.Silver;
  const current = TIER_META[newRank] || TIER_META.Gold;

  // Particle Confetti Burst Canvas Effect
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [current.color, "#fcd34d", "#ffffff", "#818cf8", "#38bdf8"];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      rotation: number;
      vr: number;
    }> = [];

    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2 - 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
      });
    }

    let animationId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.alpha -= 0.008;
        p.rotation += p.vr;

        if (p.alpha > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (particles.some((p) => p.alpha > 0)) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isOpen, current.color]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(5, 8, 15, 0.88)",
        backdropFilter: "blur(14px)",
      }}
    >
      <style>{`
        @keyframes rankPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 25px ${current.glow});
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 50px ${current.glow});
          }
        }
        @keyframes raysRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .rank-rays-bg {
          animation: raysRotate 24s linear infinite;
        }
        .rank-crest-anim {
          animation: rankPulse 2.8s ease-in-out infinite;
        }
        .rank-modal-box {
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Modal Card */}
      <div
        className="rank-modal-box"
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 480,
          background: "linear-gradient(160deg, #161f38 0%, #0c1222 100%)",
          border: `2px solid ${current.color}60`,
          borderRadius: 24,
          padding: "2.5rem 2rem 2rem",
          textAlign: "center",
          color: "#ffffff",
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${current.glow}`,
          overflow: "hidden",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close rank up celebration"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "none",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
          }}
        >
          <X size={18} />
        </button>

        {/* Ambient Rays Background */}
        <div
          className="rank-rays-bg"
          style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: `radial-gradient(circle, ${current.color}15 10%, transparent 60%)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Header Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: `${current.color}22`,
              border: `1px solid ${current.color}55`,
              color: current.color,
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: "0.8rem",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <Sparkles size={14} />
            <span>Tier Promotion</span>
          </div>

          <h2
            style={{
              fontSize: "2.1rem",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: "0 0 6px 0",
              color: "#ffffff",
              textShadow: `0 0 20px ${current.glow}`,
            }}
          >
            RANK UP!
          </h2>

          <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 24px 0" }}>
            Outstanding performance! You have ascended to a new skill tier.
          </p>

          {/* Rank Transition Visual */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 18,
              padding: "1.5rem 1rem",
              marginBottom: 20,
            }}
          >
            {/* Previous Rank */}
            <div style={{ opacity: 0.65, textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 4 }}>{prev.icon}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: prev.color }}>
                {prev.name}
              </div>
            </div>

            {/* Transition Arrow */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: current.color,
              }}
            >
              <Zap size={20} />
              <ArrowRight size={26} strokeWidth={2.5} />
            </div>

            {/* New Rank (Animated Crest) */}
            <div className="rank-crest-anim" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "3.2rem",
                  marginBottom: 4,
                  transform: "scale(1.05)",
                }}
              >
                {current.icon}
              </div>
              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 900,
                  color: current.color,
                  letterSpacing: "-0.01em",
                }}
              >
                {current.name} Tier
              </div>
            </div>
          </div>

          {/* Unlocked Reward Box */}
          <div
            style={{
              background: `${current.color}14`,
              border: `1px solid ${current.color}35`,
              borderRadius: 14,
              padding: "12px 16px",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${current.color}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: current.color,
                flexShrink: 0,
              }}
            >
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
                TIER UNLOCK
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ffffff" }}>
                {current.perk}
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: "0.85rem 1.5rem",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${current.color} 0%, #4338ca 100%)`,
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: `0 4px 20px ${current.glow}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "transform 0.15s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span>Claim & Enter Arena</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RankUpModal;
