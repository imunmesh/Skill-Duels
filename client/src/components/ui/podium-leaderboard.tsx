"use client";

import React, { useState } from "react";
import { Crown, ChevronLeft, ChevronRight, Globe, Calendar, Search } from "lucide-react";
import { getAvatarUrl } from "@/utils/avatar";

export interface PodiumPlayer {
  id: string | number;
  position: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  xp?: number;
  weeklyXP?: number;
  totalXP?: number;
  rank?: string;
  streak?: number;
  matchesPlayed?: number;
  matchesWon?: number;
  winRate?: number;
}

export interface PodiumLeaderboardProps {
  type?: "weekly" | "global";
  onTypeChange?: (type: "weekly" | "global") => void;
  players?: PodiumPlayer[];
  currentUserId?: string | number;
  loading?: boolean;
  totalPlayers?: number;
  currentPage?: number;
  totalPages?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  className?: string;
}

// Calculate level from XP
export const calculateLevel = (xp: number = 0): number => {
  return Math.max(1, Math.floor(Math.sqrt(xp / 20)) + 1);
};

const CANONICAL_TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ace', 'Conqueror'];
const LEGACY_TIER_MAP: Record<string, string> = {
  Novice: 'Bronze',
  Apprentice: 'Silver',
  Warrior: 'Gold',
  Master: 'Platinum',
  Grandmaster: 'Conqueror',
};

export const normalizeTier = (rank?: string, xp: number = 0): string => {
  if (rank && CANONICAL_TIERS.includes(rank)) return rank;
  if (rank && LEGACY_TIER_MAP[rank]) return LEGACY_TIER_MAP[rank];
  const numXP = Number(xp) || 0;
  if (numXP >= 3500) return 'Conqueror';
  if (numXP >= 2000) return 'Ace';
  if (numXP >= 1000) return 'Diamond';
  if (numXP >= 600) return 'Platinum';
  if (numXP >= 300) return 'Gold';
  if (numXP >= 100) return 'Silver';
  return 'Bronze';
};

// Format score into "289.4k" or comma separated
export const formatScoreK = (num: number = 0): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toLocaleString();
};

export const getWeekDateRange = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
};

export default function PodiumLeaderboard({
  type = "weekly",
  onTypeChange,
  players = [],
  currentUserId,
  loading = false,
  totalPlayers = 0,
  currentPage = 1,
  totalPages = 1,
  limit = 10,
  onPageChange,
  onLimitChange,
  className = "",
}: PodiumLeaderboardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Sort players by position
  const sorted = [...players].sort((a, b) => a.position - b.position);

  // Top 3 Podium Winners
  const first = sorted.find((p) => p.position === 1) || sorted[0];
  const second = sorted.find((p) => p.position === 2) || sorted[1];
  const third = sorted.find((p) => p.position === 3) || sorted[2];

  const dateRange = type === "weekly" ? getWeekDateRange() : "All-Time Standings";

  const filteredPlayers = sorted.filter((p) => {
    if (!searchQuery.trim()) return true;
    const name = (p.displayName || p.username || "").toLowerCase();
    return name.includes(searchQuery.trim().toLowerCase());
  });

  const checkTie = (idx: number, arr: PodiumPlayer[]) => {
    const currentScore = arr[idx].xp || arr[idx].weeklyXP || 0;
    const prevScore = idx > 0 ? (arr[idx - 1].xp || arr[idx - 1].weeklyXP || 0) : null;
    const nextScore = idx < arr.length - 1 ? (arr[idx + 1].xp || arr[idx + 1].weeklyXP || 0) : null;
    return currentScore > 0 && (currentScore === prevScore || currentScore === nextScore);
  };

  return (
    <div className={`podium-leaderboard-root ${className}`}>
      <style>{`
        .podium-leaderboard-root {
          width: 100%;
          max-width: 540px;
          margin: 0 auto;
          background: #121417;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 24px 20px 20px;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }

        .plb-header {
          display: flex;
          align-items: flex-start;
          justifyContent: space-between;
          margin-bottom: 24px;
        }

        .plb-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }

        .plb-subtitle {
          font-size: 0.85rem;
          color: #94a3b8;
          margin: 0;
          font-weight: 500;
        }

        .plb-toggle-pills {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.06);
          padding: 3px;
          border-radius: 12px;
          gap: 2px;
        }

        .plb-toggle-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .plb-toggle-btn.active {
          background: #6366f1;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
        }

        /* PODIUM STYLING */
        .plb-podium-container {
          display: grid;
          grid-template-columns: 1fr 1.1fr 1fr;
          align-items: flex-end;
          gap: 12px;
          padding: 10px 4px 0;
          margin-bottom: 24px;
        }

        .plb-podium-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        /* Avatar with crown overlay */
        .plb-podium-avatar-wrap {
          position: relative;
          display: inline-block;
          margin-bottom: 8px;
        }

        .plb-podium-avatar {
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }

        .plb-avatar-fallback {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #ffffff;
        }

        .plb-crown-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #141619;
          border: 1.5px solid #23272f;
        }

        .plb-crown-badge.gold {
          color: #f59e0b;
        }

        .plb-crown-badge.silver {
          color: #94a3b8;
        }

        .plb-crown-badge.bronze {
          color: #ea580c;
        }

        .plb-podium-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 90px;
          margin-bottom: 2px;
        }

        .plb-podium-score {
          font-size: 0.78rem;
          color: #94a3b8;
          font-weight: 600;
          margin-bottom: 8px;
          font-variant-numeric: tabular-nums;
        }

        .plb-pedestal {
          width: 100%;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 10px;
          box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.15);
        }

        .plb-pedestal-rank {
          font-size: 1.25rem;
          font-weight: 800;
        }

        /* 1st Place Pillar (Gold) */
        .plb-pedestal.gold {
          height: 160px;
          background: #ba8020;
          color: #fde047;
          border-radius: 14px 14px 0 0;
        }

        /* 2nd Place Pillar (Silver) */
        .plb-pedestal.silver {
          height: 115px;
          background: #373d47;
          color: #808d9e;
          border-radius: 14px 14px 0 0;
        }

        /* 3rd Place Pillar (Bronze - Distinct Warm Bronze) */
        .plb-pedestal.bronze {
          height: 82px;
          background: #783b1a;
          color: #ea7a3b;
          border-radius: 14px 14px 0 0;
        }

        .plb-search-wrap {
          position: relative;
          margin-bottom: 14px;
        }

        .plb-search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px 12px 8px 36px;
          font-size: 0.85rem;
          color: #f8fafc;
          outline: none;
          transition: all 0.2s ease;
        }

        .plb-search-input:focus {
          border-color: #818cf8;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.2);
        }

        .plb-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
        }

        .plb-tied-chip {
          font-size: 0.65rem;
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          padding: 1px 5px;
          border-radius: 4px;
          font-weight: 600;
          margin-left: 4px;
          text-transform: uppercase;
        }

        /* RANKED LIST CARD */
        .plb-list-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .plb-row {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: background 0.15s ease;
          gap: 12px;
        }

        .plb-row:last-child {
          border-bottom: none;
        }

        /* Logged In User Highlight Box */
        .plb-row.is-current-user {
          border: 1.5px solid rgba(255, 255, 255, 0.85);
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          margin: 4px;
        }

        .plb-row-rank-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 44px;
        }

        .plb-row-rank-num {
          font-size: 0.95rem;
          font-weight: 800;
          color: #ffffff;
          min-width: 16px;
        }

        .plb-row-crown {
          display: inline-flex;
          align-items: center;
        }

        .plb-row-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .plb-row-avatar-fallback {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.09);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          color: #cbd5e1;
          flex-shrink: 0;
        }

        .plb-row-info {
          flex: 1;
          min-width: 0;
        }

        .plb-row-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .plb-row-meta {
          font-size: 0.78rem;
          color: #94a3b8;
          margin: 2px 0 0;
          font-weight: 500;
        }

        .plb-row-score {
          font-size: 1rem;
          font-weight: 800;
          color: #ffffff;
          font-variant-numeric: tabular-nums;
          text-align: right;
          flex-shrink: 0;
        }

        /* FOOTER PAGINATION */
        .plb-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 4px 0;
          font-size: 0.82rem;
          color: #94a3b8;
        }

        .plb-limit-picker {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .plb-select {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 0.8rem;
          cursor: pointer;
          outline: none;
        }

        .plb-select option {
          background: #1e293b;
          color: #ffffff;
        }

        .plb-pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .plb-page-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .plb-page-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .plb-page-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .podium-leaderboard-root {
            padding: 18px 14px 16px;
            border-radius: 18px;
          }
          .plb-podium-name {
            max-width: 75px;
            font-size: 0.78rem;
          }
          .plb-pedestal.gold {
            height: 120px;
          }
          .plb-pedestal.silver {
            height: 90px;
          }
          .plb-pedestal.bronze {
            height: 70px;
          }
        }
      `}</style>

      {/* TOP HEADER */}
      <div className="plb-header">
        <div>
          <h2 className="plb-title">
            {type === "weekly" ? "Weekly Leaderboard" : "Global Leaderboard"}
          </h2>
          <p className="plb-subtitle">{dateRange}</p>
        </div>

        {onTypeChange && (
          <div className="plb-toggle-pills">
            <button
              type="button"
              className={`plb-toggle-btn ${type === "weekly" ? "active" : ""}`}
              onClick={() => onTypeChange("weekly")}
            >
              <Calendar size={13} />
              <span>Weekly</span>
            </button>
            <button
              type="button"
              className={`plb-toggle-btn ${type === "global" ? "active" : ""}`}
              onClick={() => onTypeChange("global")}
            >
              <Globe size={13} />
              <span>Global</span>
            </button>
          </div>
        )}
      </div>

      {/* TOP 3 PODIUM */}
      <div className="plb-podium-container">
        {/* 2ND PLACE (SILVER) */}
        <div className="plb-podium-column">
          {second ? (
            <>
              <div className="plb-podium-avatar-wrap">
                {second.avatarUrl ? (
                  <img
                    src={getAvatarUrl(second.avatarUrl)}
                    alt={second.displayName || second.username}
                    className="plb-podium-avatar"
                    style={{ width: 60, height: 60, border: "2px solid #94a3b8" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="plb-avatar-fallback"
                    style={{ width: 60, height: 60, background: "#334155", fontSize: "1.2rem" }}
                  >
                    {(second.displayName || second.username || "2").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="plb-crown-badge silver">
                  <Crown size={11} />
                </div>
              </div>
              <div className="plb-podium-name" title={second.displayName || second.username}>
                {second.displayName || second.username}
              </div>
              <div className="plb-podium-score">
                {(second.xp || second.weeklyXP || 0).toLocaleString()}
              </div>
            </>
          ) : (
            <div style={{ height: 110 }} />
          )}
          <div className="plb-pedestal silver">
            <span className="plb-pedestal-rank">2</span>
          </div>
        </div>

        {/* 1ST PLACE (GOLD - TALLEST) */}
        <div className="plb-podium-column">
          {first ? (
            <>
              <div className="plb-podium-avatar-wrap">
                {first.avatarUrl ? (
                  <img
                    src={getAvatarUrl(first.avatarUrl)}
                    alt={first.displayName || first.username}
                    className="plb-podium-avatar"
                    style={{ width: 72, height: 72, border: "3px solid #f59e0b" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="plb-avatar-fallback"
                    style={{ width: 72, height: 72, background: "#78350f", fontSize: "1.5rem" }}
                  >
                    {(first.displayName || first.username || "1").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="plb-crown-badge gold">
                  <Crown size={12} />
                </div>
              </div>
              <div
                className="plb-podium-name"
                style={{ fontSize: "0.95rem", fontWeight: 800 }}
                title={first.displayName || first.username}
              >
                {first.displayName || first.username}
              </div>
              <div className="plb-podium-score" style={{ color: "#fef08a", fontWeight: 700 }}>
                {(first.xp || first.weeklyXP || 0).toLocaleString()}
              </div>
            </>
          ) : (
            <div style={{ height: 130 }} />
          )}
          <div className="plb-pedestal gold">
            <span className="plb-pedestal-rank">1</span>
          </div>
        </div>

        {/* 3RD PLACE (BRONZE) */}
        <div className="plb-podium-column">
          {third ? (
            <>
              <div className="plb-podium-avatar-wrap">
                {third.avatarUrl ? (
                  <img
                    src={getAvatarUrl(third.avatarUrl)}
                    alt={third.displayName || third.username}
                    className="plb-podium-avatar"
                    style={{ width: 56, height: 56, border: "2px solid #b45309" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="plb-avatar-fallback"
                    style={{ width: 56, height: 56, background: "#451a03", fontSize: "1.1rem" }}
                  >
                    {(third.displayName || third.username || "3").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="plb-crown-badge bronze">
                  <Crown size={11} />
                </div>
              </div>
              <div className="plb-podium-name" title={third.displayName || third.username}>
                {third.displayName || third.username}
              </div>
              <div className="plb-podium-score">
                {(third.xp || third.weeklyXP || 0).toLocaleString()}
              </div>
            </>
          ) : (
            <div style={{ height: 95 }} />
          )}
          <div className="plb-pedestal bronze">
            <span className="plb-pedestal-rank">3</span>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="plb-search-wrap">
        <Search size={15} className="plb-search-icon" />
        <input
          type="text"
          className="plb-search-input"
          placeholder="Search challengers by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* RANKED LIST CARD */}
      <div className="plb-list-card">
        {loading ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#94a3b8" }}>
            Loading rankings...
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#94a3b8", lineHeight: 1.5 }}>
            {searchQuery
              ? "No challengers matched your search query."
              : type === "weekly"
              ? "No battles completed yet this week. Enter the Arena to take the #1 spot!"
              : "No challenger standings recorded yet. Start a duel to rank!"}
          </div>
        ) : (
          filteredPlayers.map((player, idx) => {
            const isMe =
              currentUserId !== undefined &&
              String(player.id) === String(currentUserId);
            const score = player.xp || player.weeklyXP || 0;
            const level = calculateLevel(player.totalXP || player.xp || 0);
            const tier = normalizeTier(player.rank, player.totalXP || player.xp || 0);
            const tied = checkTie(idx, filteredPlayers);

            return (
              <div
                key={player.id}
                className={`plb-row ${isMe ? "is-current-user" : ""}`}
              >
                {/* Position & Crown */}
                <div className="plb-row-rank-wrap">
                  <span className="plb-row-rank-num">{player.position}</span>
                  {player.position === 1 ? (
                    <span className="plb-row-crown" style={{ color: "#f59e0b" }}>
                      <Crown size={15} strokeWidth={1.8} />
                    </span>
                  ) : player.position === 2 ? (
                    <span className="plb-row-crown" style={{ color: "#94a3b8" }}>
                      <Crown size={15} strokeWidth={1.8} />
                    </span>
                  ) : player.position === 3 ? (
                    <span className="plb-row-crown" style={{ color: "#ea580c" }}>
                      <Crown size={15} strokeWidth={1.8} />
                    </span>
                  ) : (
                    <span style={{ width: 15, display: "inline-block" }} />
                  )}
                  {tied && <span className="plb-tied-chip">tied</span>}
                </div>

                {/* Avatar Bubble */}
                {player.avatarUrl ? (
                  <img
                    src={getAvatarUrl(player.avatarUrl)}
                    alt={player.displayName || player.username}
                    className="plb-row-avatar"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="plb-row-avatar-fallback">
                    {(player.displayName || player.username || "P").charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name & Level/Tier/Win Rate */}
                <div className="plb-row-info">
                  <p className="plb-row-name">
                    {isMe ? "You" : player.displayName || player.username}
                  </p>
                  <p className="plb-row-meta">
                    Level {level} – {tier}
                    {player.matchesWon !== undefined && player.matchesWon > 0 && (
                      <span style={{ color: "#64748b", marginLeft: 6 }}>
                        &bull; {player.matchesWon}W {player.winRate ? `(${player.winRate}%)` : ""}
                      </span>
                    )}
                  </p>
                </div>

                {/* Score */}
                <div
                  className="plb-row-score"
                  style={isMe ? { color: "#38bdf8", fontWeight: 800 } : {}}
                >
                  {formatScoreK(score)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER CONTROLS */}
      <div className="plb-footer">
        <div className="plb-limit-picker">
          <span>Show</span>
          <select
            className="plb-select"
            value={limit}
            onChange={(e) => onLimitChange && onLimitChange(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="plb-pagination-controls">
          <button
            type="button"
            className="plb-page-btn"
            disabled={currentPage <= 1 || loading}
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {currentPage} of {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            className="plb-page-btn"
            disabled={currentPage >= totalPages || loading}
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            aria-label="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
