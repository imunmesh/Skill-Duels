import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaderboardAPI } from '../services/api';
import { ChevronLeft } from 'lucide-react';
import PodiumLeaderboard from '../components/ui/podium-leaderboard';

export const LeaderboardPage = ({ onBackToArena }) => {
  const { user } = useAuth();
  const [leaderboardType, setLeaderboardType] = useState('weekly'); // 'weekly' | 'global'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Load Leaderboard
  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const fetchFn =
        leaderboardType === 'global' ? leaderboardAPI.getGlobal : leaderboardAPI.getWeekly;
      const res = await fetchFn(currentPage, limit);
      if (res.success) {
        setLeaderboardData(res.leaderboard || []);
        setTotalPages(res.totalPages || 1);
        setTotalPlayers(res.totalPlayers || 0);
      }
    } catch (err) {
      console.warn('Could not load leaderboard:', err.message);
    } finally {
      setLoading(false);
    }
  }, [leaderboardType, currentPage, limit]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <main className="container" style={{ maxWidth: 600, paddingTop: '1.5rem', paddingBottom: '3.5rem' }}>
      {/* Top Back Link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={onBackToArena}
          className="btn btn-secondary"
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.85rem',
            minHeight: 36,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <ChevronLeft size={16} />
          <span>Back to Arena</span>
        </button>
      </div>

      {/* Modern Podium Leaderboard Card */}
      <PodiumLeaderboard
        type={leaderboardType}
        onTypeChange={(t) => {
          setLeaderboardType(t);
          setCurrentPage(1);
        }}
        players={leaderboardData}
        currentUserId={user?._id}
        loading={loading}
        totalPlayers={totalPlayers}
        currentPage={currentPage}
        totalPages={totalPages}
        limit={limit}
        onPageChange={(page) => setCurrentPage(page)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setCurrentPage(1);
        }}
      />
    </main>
  );
};

export default LeaderboardPage;
