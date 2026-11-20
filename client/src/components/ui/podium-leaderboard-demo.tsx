import React, { useState } from "react";
import PodiumLeaderboard, { PodiumPlayer } from "@/components/ui/podium-leaderboard";

const SAMPLE_PLAYERS: PodiumPlayer[] = [
  {
    id: "1",
    position: 1,
    username: "ava_turner",
    displayName: "Ava Elizabeth Turner",
    xp: 289400,
    weeklyXP: 289400,
    totalXP: 289400,
    rank: "Diamond",
  },
  {
    id: "2",
    position: 2,
    username: "leo_h",
    displayName: "Leo Harrison",
    xp: 251800,
    weeklyXP: 251800,
    totalXP: 251800,
    rank: "Platinum",
  },
  {
    id: "3",
    position: 3,
    username: "rowan_e",
    displayName: "Rowan Elijah",
    xp: 238300,
    weeklyXP: 238300,
    totalXP: 238300,
    rank: "Gold",
  },
  {
    id: "4",
    position: 4,
    username: "maya_chen",
    displayName: "Maya Chen",
    xp: 198700,
    weeklyXP: 198700,
    totalXP: 198700,
    rank: "Silver",
  },
  {
    id: "5",
    position: 5,
    username: "you_player",
    displayName: "You",
    xp: 156200,
    weeklyXP: 156200,
    totalXP: 156200,
    rank: "Bronze",
  },
];

export default function Demo() {
  const [type, setType] = useState<"weekly" | "global">("weekly");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0d10", padding: "40px 16px", display: "flex", justifyContent: "center" }}>
      <PodiumLeaderboard
        type={type}
        onTypeChange={setType}
        players={SAMPLE_PLAYERS}
        currentUserId="5"
        currentPage={page}
        totalPages={1}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}
