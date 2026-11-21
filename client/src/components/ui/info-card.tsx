"use client";

import React, { useState } from "react";
import { CheckCircle2, Code, AlertTriangle } from "lucide-react";

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
  questionCount?: number;
  playable?: boolean;
  minQuestionsRequired?: number;
  ariaDescription?: string;
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
  borderColor = "#5562ea",
  cardBgColor = "#111625",
  textColor = "#ffffff",
  descriptionColor = "#94a3b8",
  questionCount,
  playable = true,
  minQuestionsRequired = 5,
  ariaDescription,
}) => {
  const [hovered, setHovered] = useState(false);

  const isPlayable = playable && (questionCount === undefined || questionCount >= minQuestionsRequired);

  const handleClick = () => {
    if (!isPlayable) return;
    onClick && onClick();
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      aria-disabled={!isPlayable}
      aria-description={ariaDescription || (!isPlayable ? `Category has only ${questionCount || 0} active questions. Minimum ${minQuestionsRequired} required to start battle.` : undefined)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`arena-card ${selected ? "is-selected" : ""} ${className}`}
      style={{
        width,
        height: height || "100%",
        minHeight: 200,
        borderRadius: "22px",
        background: cardBgColor,
        opacity: isPlayable ? 1 : 0.65,
        filter: isPlayable ? "none" : "grayscale(30%)",
        border: selected
          ? `2px solid ${borderColor}`
          : hovered && isPlayable
          ? "1px solid rgba(99, 102, 241, 0.45)"
          : "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: selected
          ? `0 0 0 1px rgba(85, 98, 234, 0.4), 0 0 25px rgba(85, 98, 234, 0.25)`
          : hovered && isPlayable
          ? "0 12px 28px -8px rgba(0, 0, 0, 0.45)"
          : "none",
        transform: hovered && !selected && isPlayable ? "translateY(-2px)" : "none",
        padding: "1.5rem 1.6rem 1.75rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        textAlign: "left",
        cursor: isPlayable ? "pointer" : "not-allowed",
        outline: "none",
        position: "relative",
        boxSizing: "border-box",
        transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Top Header Row: Squircle Icon, Count/Status Badge & Selected Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: "1.25rem",
        }}
      >
        {/* Squircle Icon Container */}
        {icon ? (
          <div
            style={{
              width: 46,
              height: 46,
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
              width: 46,
              height: 46,
              borderRadius: 14,
              objectFit: "cover",
              border: `1px solid rgba(255, 255, 255, 0.1)`,
            }}
          />
        ) : (
          <div
            style={{
              width: 46,
              height: 46,
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
            <Code size={22} strokeWidth={2.2} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Question Count Chip or "No questions yet" Chip */}
          {questionCount !== undefined && (
            isPlayable ? (
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#94a3b8",
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "4px 9px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {questionCount} questions
              </span>
            ) : (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#f59e0b",
                  background: "rgba(245, 158, 11, 0.12)",
                  padding: "4px 9px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <AlertTriangle size={12} />
                {questionCount === 0 ? "No questions yet" : `${questionCount}/${minQuestionsRequired} questions`}
              </span>
            )
          )}

          {/* Selected Badge */}
          {selected && isPlayable && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                color: "#818cf8",
                fontSize: "0.85rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              <CheckCircle2 size={16} strokeWidth={2.2} />
              <span>Selected</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Title */}
      <h3
        style={{
          fontSize: "1.22rem",
          fontWeight: 700,
          color: isPlayable ? textColor : "#94a3b8",
          marginBottom: "0.45rem",
          letterSpacing: "-0.015em",
          lineHeight: 1.25,
          whiteSpace: "pre-line",
          margin: "0 0 0.45rem 0",
        }}
      >
        {title}
      </h3>

      {/* Card Description */}
      <p
        style={{
          fontSize: "0.88rem",
          color: descriptionColor,
          lineHeight: 1.5,
          margin: 0,
          fontWeight: 400,
        }}
      >
        {description}
      </p>
    </div>
  );
};

export default InfoCard;
