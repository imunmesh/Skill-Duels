import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import PodiumLeaderboard from './ui/podium-leaderboard';

export const PublicLeaderboard = () => {
  const [type, setType] = useState('weekly'); // 'weekly' | 'global'
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    leaderboardAPI
      .getPublic(type, 10)
      .then((res) => {
        if (isMounted && res.success) {
          setLeaderboard(res.leaderboard || []);
        }
      })
      .catch((err) => console.warn('Could not load public standings:', err.message))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [type]);

  return (
    <PodiumLeaderboard
      type={type}
      onTypeChange={setType}
      players={leaderboard}
      loading={loading}
      totalPlayers={leaderboard.length}
      currentPage={1}
      totalPages={1}
      limit={10}
    />
  );
};

export default PublicLeaderboard;
