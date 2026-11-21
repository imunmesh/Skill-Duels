"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Trophy,
  Sparkles,
  X,
  Swords,
  Target,
  Zap,
  Flame,
  Award,
  ShieldCheck,
  Shield,
  Medal,
  Gem,
  Star,
  Crown,
  CheckCircle2,
} from "lucide-react";

export interface BadgeItem {
  badgeId: string;
  name: string;
  description: string;
  icon?: string;
  unlockedAt?: string | Date;
}

export interface AchievementUnlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge?: BadgeItem | null;
  badges?: BadgeItem[];
}

const renderBadgeIcon = (iconName?: string) => {
  const size = 52;
  const color = "#ffffff";
  switch (iconName) {
    case "swords":
      return <Swords size={size} color={color} />;
    case "target":
      return <Target size={size} color={color} />;
    case "sparkles":
      return <Sparkles size={size} color={color} />;
    case "zap":
      return <Zap size={size} color={color} />;
    case "flame":
    case "fire":
      return <Flame size={size} color={color} />;
    case "shield-check":
      return <ShieldCheck size={size} color={color} />;
    case "shield":
      return <Shield size={size} color={color} />;
    case "trophy":
      return <Trophy size={size} color={color} />;
    case "medal":
      return <Medal size={size} color={color} />;
    case "diamond":
      return <Gem size={size} color={color} />;
    case "star":
      return <Star size={size} color={color} />;
    case "crown":
      return <Crown size={size} color={color} />;
    case "award":
      return <Award size={size} color={color} />;
    default:
      return <Award size={size} color={color} />;
  }
};

export const AchievementUnlockedModal: React.FC<AchievementUnlockedModalProps> = ({
  isOpen,
  onClose,
  badge,
  badges = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  const activeBadgeList = badge ? [badge] : badges;
  const currentBadge = activeBadgeList[currentIdx] || badge;

  // Particle Confetti Burst Canvas Effect
  useEffect(() => {
    if (!isOpen || !currentBadge) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#f59e0b", "#fcd34d", "#ffffff", "#818cf8", "#10b981", "#a855f7", "#ec4899"];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      rotation: number;
      vRot: number;
      shape: "rect" | "circle";
    }

    const particles: Particle[] = [];
    const count = 120;
    const originX = canvas.width / 2;
    const originY = canvas.height / 2 - 40;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const speed = 4 + Math.random() * 9;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.4 ? "rect" : "circle",
      });
    }

    let animationFrameId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.985;
        p.rotation += p.vRot;
        if (frame > 25) {
          p.alpha = Math.max(0, p.alpha - 0.015);
        }

        if (p.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (particles.some((p) => p.alpha > 0)) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, currentIdx, currentBadge]);

  if (!isOpen || !currentBadge) return null;

  const hasNext = currentIdx < activeBadgeList.length - 1;

  const handleNext = () => {
    if (hasNext) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setCurrentIdx(0);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10, 15, 29, 0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Modal Dialog Card */}
      <div
        className="achievement-popup-anim"
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 480,
          width: "100%",
          background: "linear-gradient(135deg, #182234 0%, #0f172a 100%)",
          border: "2px solid rgba(245, 158, 11, 0.5)",
          boxShadow: "0 0 50px rgba(245, 158, 11, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          borderRadius: "1.25rem",
          padding: "2.5rem 2rem 2rem",
          textAlign: "center",
          color: "#f8fafc",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle diagonal shine overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #f59e0b, #ec4899, #818cf8, #10b981)",
          }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "rgba(255, 255, 255, 0.08)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
          }}
        >
          <X size={18} />
        </button>

        {/* Header Ribbon Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.5)",
            padding: "0.35rem 0.95rem",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#fcd34d",
            textTransform: "uppercase",
            marginBottom: "1.75rem",
            boxShadow: "0 0 20px rgba(245, 158, 11, 0.2)",
          }}
        >
          <Sparkles size={14} color="#fcd34d" />
          <span>Achievement Unlocked!</span>
        </div>

        {/* Badge Hero Icon with Rotating Rays Effect */}
        <div
          style={{
            position: "relative",
            width: 130,
            height: 130,
            margin: "0 auto 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Rotating ambient rays */}
          <div
            className="animate-spin-slow"
            style={{
              position: "absolute",
              inset: -15,
              borderRadius: "50%",
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(245, 158, 11, 0.25) 45deg, transparent 90deg, rgba(245, 158, 11, 0.25) 135deg, transparent 180deg, rgba(245, 158, 11, 0.25) 225deg, transparent 270deg, rgba(245, 158, 11, 0.25) 315deg, transparent 360deg)",
              pointerEvents: "none",
            }}
          />

          {/* Badge Plaque */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: 104,
              height: 104,
              borderRadius: "1.5rem",
              background: "linear-gradient(135deg, #f59e0b 0%, #b45309 50%, #78350f 100%)",
              border: "3px solid #fef3c7",
              boxShadow: "0 0 35px rgba(245, 158, 11, 0.6), inset 0 2px 10px rgba(255, 255, 255, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {renderBadgeIcon(currentBadge.icon)}
          </div>
        </div>

        {/* Badge Details */}
        <h2
          id="achievement-modal-title"
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#ffffff",
            margin: "0 0 0.5rem",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          }}
        >
          {currentBadge.name}
        </h2>

        <p
          style={{
            fontSize: "0.95rem",
            color: "#cbd5e1",
            lineHeight: 1.5,
            maxWidth: 380,
            margin: "0 auto 1.5rem",
          }}
        >
          {currentBadge.description}
        </p>

        {/* Status Chip */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            padding: "0.3rem 0.85rem",
            borderRadius: "0.5rem",
            color: "#6ee7b7",
            fontSize: "0.8rem",
            fontWeight: 700,
            marginBottom: "1.75rem",
          }}
        >
          <CheckCircle2 size={15} color="#10b981" />
          <span>Added to your Trophy Showcase</span>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={handleNext}
            style={{
              width: "100%",
              padding: "0.85rem 1.5rem",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              border: "none",
              borderRadius: "0.75rem",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(245, 158, 11, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(245, 158, 11, 0.4)";
            }}
          >
            {hasNext ? `Next Achievement (${currentIdx + 1}/${activeBadgeList.length})` : "Claim Achievement"}
          </button>
        </div>
      </div>
    </div>
  );
};
