"use client";

import React, { useRef, useState } from "react";
import { CheckCircle2, Code } from "lucide-react";

export interface InfoCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  iconColor?: string;
  image?: string;
  selected?: boolean;
  onClick?: () => void;
  width?: number | string;
  height?: number | string;
  className?: string;
  borderColor?: string;
  cardBgColor?: string;
  textColor?: string;
  descriptionColor?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  description,
  icon,
  iconColor = "#6366f1",
  image,
  selected = false,
  onClick,
  width = "100%",
  height,
  className = "",
  borderColor = "#6366f1",
  cardBgColor = "#131b2e",
  textColor = "#ffffff",
  descriptionColor = "#94a3b8",
}) => {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for interactive rotating conic border
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const angle = Math.atan2(y, x);
    el.style.setProperty("--rotation", `${angle}rad`);
  };

  const activeColor = selected ? "#818cf8" : borderColor;
  const borderBgColor = "rgba(255, 255, 255, 0.08)";
  const borderGradient = hovered || selected
    ? `conic-gradient(from var(--rotation, 0deg), ${activeColor} 0deg, ${activeColor} 120deg, ${borderBgColor} 120deg, ${borderBgColor} 360deg)`
    : borderBgColor;

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        if (cardRef.current) {
          cardRef.current.style.setProperty("--rotation", "0deg");
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick();
        }
      }}
      className={`info-card-container ${selected ? "is-selected" : ""} ${className}`}
      style={{
        width,
        height: height || "auto",
        minHeight: 195,
        borderRadius: "20px",
        padding: "2px",
        background: borderGradient,
        boxShadow: selected
          ? `0 0 25px rgba(99, 102, 241, 0.3), inset 0 0 15px rgba(99, 102, 241, 0.05)`
          : hovered
          ? `0 10px 30px rgba(0, 0, 0, 0.4)`
          : "none",
        cursor: "pointer",
        outline: "none",
        transition: "box-shadow 0.25s ease, transform 0.2s ease",
        transform: hovered && !selected ? "translateY(-2px)" : "none",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Inner Card Container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          flexGrow: 1,
          borderRadius: "18px",
          background: cardBgColor,
          padding: "1.6rem 1.6rem 1.8rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          textAlign: "left",
          boxSizing: "border-box",
        }}
      >
        {/* Top Header Row: Squircle Icon & Selected Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: "1.25rem",
          }}
        >
          {/* Squircle Icon */}
          {icon ? (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: `${iconColor}18`,
                border: `1px solid ${iconColor}35`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: iconColor,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          ) : image ? (
            <img
              src={image}
              alt={title}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                objectFit: "cover",
                border: `1px solid rgba(255, 255, 255, 0.1)`,
              }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: `${iconColor}18`,
                border: `1px solid ${iconColor}35`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: iconColor,
                flexShrink: 0,
              }}
            >
              <Code size={24} />
            </div>
          )}

          {/* Selected Badge */}
          {selected && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#818cf8",
                fontSize: "0.92rem",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} strokeWidth={2.2} />
              <span>Selected</span>
            </div>
          )}
        </div>

        {/* Card Title */}
        <h3
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: textColor,
            marginBottom: "0.45rem",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            whiteSpace: "pre-line",
            margin: 0,
          }}
        >
          {title}
        </h3>

        {/* Card Description */}
        <p
          style={{
            fontSize: "0.88rem",
            color: descriptionColor,
            lineHeight: 1.45,
            margin: "0.45rem 0 0 0",
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

export default InfoCard;
