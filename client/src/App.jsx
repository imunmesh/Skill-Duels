import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import MeadowRiseFooter from './components/ui/meadow-rise-footer';
import { AuthPage } from './pages/AuthPage';
import { LobbyPage } from './pages/LobbyPage';
import { MatchPage } from './pages/MatchPage';
import { ResultPage } from './pages/ResultPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { LeaderboardPage } from './pages/LeaderboardPage';

// Wrapper to pass match ID from route param or saved session state
const MatchRouteWrapper = ({ activeMatchData, onMatchFinished }) => {
  const { id } = useParams();
  const matchPayload = activeMatchData || { matchId: id || '' };
  return <MatchPage initialMatchData={matchPayload} onMatchFinished={onMatchFinished} />;
};

export const App = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  // Restore active match session across page reloads (NFR-04)
  const [activeMatchData, setActiveMatchData] = useState(() => {
    try {
      const saved = localStorage.getItem('skillduels_active_match');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Restore final duel results across page reloads
  const [finalMatchResult, setFinalMatchResult] = useState(() => {
    try {
      const saved = localStorage.getItem('skillduels_final_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Listen for socket reconnection opportunities from server
  useEffect(() => {
    if (!socket) return;

    const handleReconnectAvailable = (data) => {
      console.log('[App] Active match detected on server:', data.matchId);
      if (!location.pathname.startsWith('/match')) {
        const matchPayload = activeMatchData || { matchId: data.matchId };
        setActiveMatchData(matchPayload);
        localStorage.setItem('skillduels_active_match', JSON.stringify(matchPayload));
        navigate(`/match/${data.matchId}`);
      }
    };

    socket.on('reconnect_available', handleReconnectAvailable);
    return () => socket.off('reconnect_available', handleReconnectAvailable);
  }, [socket, location.pathname, activeMatchData, navigate]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-muted)',
          fontSize: '1.1rem',
        }}
      >
        Initializing SkillDuels Arena...
      </div>
    );
  }

  // Derive current view for Navbar highlight
  const currentPath = location.pathname.split('/')[1] || '';
  const currentView = currentPath || (user?.role === 'admin' ? 'admin' : 'arena');

  const handleNavbarNavigate = (view) => {
    navigate(`/${view}`);
  };

  return (
    <>
      <Navbar currentView={currentView} onNavigate={handleNavbarNavigate} />

      <Routes>
        {/* Public Root Route */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              user?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/arena" replace />
              )
            ) : (
              <AuthPage
                onRegisterSuccess={() => navigate('/profile/setup')}
                onLoginSuccess={(loggedUser) =>
                  navigate(loggedUser.role === 'admin' ? '/admin' : '/arena')
                }
              />
            )
          }
        />

        {/* Profile Setup Flow after Registration */}
        <Route
          path="/profile/setup"
          element={
            !isAuthenticated ? (
              <Navigate to="/" replace />
            ) : user?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <ProfileSetupPage onComplete={() => navigate('/arena')} />
            )
          }
        />

        {/* Player Route: Home Arena */}
        <Route
          path="/arena"
          element={
            !isAuthenticated ? (
              <Navigate to="/" replace />
            ) : user?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <LobbyPage
                onMatchFound={(matchData) => {
                  setActiveMatchData(matchData);
                  localStorage.setItem('skillduels_active_match', JSON.stringify(matchData));
                  localStorage.removeItem('skillduels_final_result');
                  setFinalMatchResult(null);
                  navigate(`/match/${matchData.matchId}`);
                }}
              />
            )
          }
        />

        {/* Player Route: My Profile (Editable, Separate Page) */}
        <Route
          path="/profile"
          element={
            !isAuthenticated ? (
              <Navigate to="/" replace />
            ) : user?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <ProfilePage onBackToArena={() => navigate('/arena')} />
            )
          }
        />

        {/* Player Route: Standalone Leaderboard Page */}
        <Route
          path="/leaderboard"
          element={
            !isAuthenticated ? (
              <Navigate to="/" replace />
            ) : user?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <LeaderboardPage onBackToArena={() => navigate('/arena')} />
            )
          }
        />

        {/* Player Route: Active Match Duel */}
        <Route
          path="/match/:id"
          element={
            !isAuthenticated ? (
              <Navigate to="/" replace />
            ) : user?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <MatchRouteWrapper
                activeMatchData={activeMatchData}
                onMatchFinished={(resultData) => {
                  setFinalMatchResult(resultData);
                  localStorage.setItem('skillduels_final_result', JSON.stringify(resultData));
                  localStorage.removeItem('skillduels_active_match');
                  setActiveMatchData(null);
                  navigate(`/result/${resultData.matchId || 'duel'}`);
                }}
              />
            )
          }
        />

        {/* Player Route: Duel Result */}
        <Route
          path="/result/:id"
          element={
            !isAuthenticated ? (
              <Navigate to="/" replace />
            ) : user?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <ResultPage
                matchResult={finalMatchResult}
                onPlayAgain={() => {
                  localStorage.removeItem('skillduels_active_match');
                  localStorage.removeItem('skillduels_final_result');
                  setActiveMatchData(null);
                  setFinalMatchResult(null);
                  navigate('/arena');
                }}
              />
            )
          }
        />

        {/* Admin Route: Admin Only */}
        <Route
          path="/admin"
          element={
            !isAuthenticated ? (
              <Navigate to="/" replace />
            ) : user?.role !== 'admin' ? (
              <Navigate to="/arena" replace />
            ) : (
              <AdminPage />
            )
          }
        />

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!location.pathname.startsWith('/match') && (
        <MeadowRiseFooter
          name="SkillDuels"
          brandHref="/"
          heading={"Enter the *SkillDuels Arena*\nand dominate the leaderboards."}
          subheading="Compete in real-time 1v1 multiplayer trivia battles across frontend, backend, and cloud stacks."
          cta={{ label: "Enter Arena", href: isAuthenticated ? "/arena" : "/" }}
          tagline="Test your speed, knowledge, and intuition. Climb the global ranks and earn elite badges."
          preset="moonlit"
          columns={[
            {
              title: "Battle Arena",
              links: [
                { label: "Matchmaking Lobby", href: "/arena" },
                { label: "Global Leaderboard", href: "/leaderboard" },
                { label: "Player Profile & Badges", href: "/profile" },
              ],
            },
            {
              title: "Duel Categories",
              links: [
                { label: "JavaScript & React", href: "/arena" },
                { label: "Node.js & Backend", href: "/arena" },
                { label: "Python & Algorithms", href: "/arena" },
                { label: "System Design & DevOps", href: "/arena" },
              ],
            },
            {
              title: "Community & Docs",
              links: [
                { label: "Streak Rules & Scoring", href: "#" },
                { label: "Admin Portal", href: "/admin" },
                { label: "GitHub Repository", href: "https://github.com/imunmesh/Skill-Duels" },
              ],
            },
          ]}
          copyright="© 2026 SkillDuels Arena. All rights reserved."
        />
      )}
    </>
  );
};

export default App;
