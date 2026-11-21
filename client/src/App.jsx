import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import MeadowRiseFooter from './components/ui/meadow-rise-footer';
import { FooterModals } from './components/FooterModals';
import { AuthPage } from './pages/AuthPage';
import { LobbyPage } from './pages/LobbyPage';
import { MatchPage } from './pages/MatchPage';
import { ResultPage } from './pages/ResultPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import MetroHero from './components/ui/scroll-locked-video-hero';
import PromptingIsAllYouNeed from './components/ui/animated-hero-section';
import RainingLetters from './components/ui/modern-animated-hero-section';
import { SmoothCursor } from '@/registry/magicui/smooth-cursor';

const HERO_PONG_WORDS = ["SKILLDUELS", "1V1 BATTLE ARENA"];

// Wrapper to pass match ID from route param or saved session state
const MatchRouteWrapper = ({ activeMatchData, onMatchFinished }) => {
  const { id } = useParams();
  const matchPayload = activeMatchData || { matchId: id || '' };
  return <MatchPage initialMatchData={matchPayload} onMatchFinished={onMatchFinished} />;
};

// Compact one-line minimal footer for authenticated app views (Arena, Leaderboard, Profile, Admin)
const MinimalFooter = ({ onOpenModal }) => (
  <footer
    style={{
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(10, 15, 22, 0.95)',
      backdropFilter: 'blur(10px)',
      padding: '0.85rem 1.5rem',
      fontSize: '0.825rem',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      position: 'relative',
      zIndex: 10,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 600, color: '#f8fafc', letterSpacing: '-0.01em' }}>
        SkillDuels Arena
      </span>
      <span style={{ color: '#475569' }}>•</span>
      <span>© 2026</span>
      <span style={{ color: '#475569' }}>•</span>
      <span style={{ color: '#cbd5e1' }}>Built with MERN + Socket.IO</span>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => onOpenModal('how-it-works')}
        style={{
          background: 'none',
          border: 'none',
          color: '#cbd5e1',
          cursor: 'pointer',
          fontSize: '0.825rem',
          padding: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
      >
        How It Works
      </button>
      <button
        type="button"
        onClick={() => onOpenModal('badges')}
        style={{
          background: 'none',
          border: 'none',
          color: '#cbd5e1',
          cursor: 'pointer',
          fontSize: '0.825rem',
          padding: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
      >
        Badges Guide
      </button>
      <a
        href="https://github.com/imunmesh/Skill-Duels"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#cbd5e1',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
        aria-label="SkillDuels GitHub Repository"
      >
        GitHub
      </a>
      <button
        type="button"
        onClick={() => onOpenModal('privacy')}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '0.825rem',
          padding: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
      >
        Privacy Policy
      </button>
      <button
        type="button"
        onClick={() => onOpenModal('terms')}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '0.825rem',
          padding: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
      >
        Terms of Use
      </button>
    </div>
  </footer>
);

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

  // Modal dialog state for footer informational links
  const [activeModal, setActiveModal] = useState(null);

  // Cinematic scroll-locked video hero state immediately after login or sign up
  const [showLoginIntro, setShowLoginIntro] = useState(() => {
    return sessionStorage.getItem('skillduels_show_welcome') === 'true';
  });

  const handleFinishLoginIntro = () => {
    sessionStorage.removeItem('skillduels_show_welcome');
    setShowLoginIntro(false);
    const wasPostRegister = sessionStorage.getItem('skillduels_post_register') === 'true';
    sessionStorage.removeItem('skillduels_post_register');
    if (wasPostRegister) {
      navigate('/profile/setup');
    } else {
      navigate(user?.role === 'admin' ? '/admin' : '/arena');
    }
  };

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

  // Immediate full-screen scroll-locked video hero right after login
  if (showLoginIntro || (isAuthenticated && location.pathname === '/welcome')) {
    return (
      <MetroHero
        title="ENTER THE ARENA"
        tagline="1v1 Real-Time Multiplayer Trivia. Rise to Conqueror."
        scrollHint="SCROLL TO ENTER"
        onComplete={handleFinishLoginIntro}
      />
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      {/* Smooth Cursor across the entire site */}
      <SmoothCursor />

      {/* Background Animated Hero Pong Game Canvas ONLY on Landing / Login Page (Always Behind) */}
      {location.pathname === '/' && !isAuthenticated && (
        <PromptingIsAllYouNeed
          words={HERO_PONG_WORDS}
          color="#FFFFFF"
          hitColor="#333333"
          backgroundColor="transparent"
          ballColor="#FFFFFF"
          paddleColor="#FFFFFF"
          opacity={0.7}
          showPaddles={true}
          showBall={true}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 0, position: 'fixed', pointerEvents: 'none' }}
        />
      )}

      {/* Foreground App Content Wrapper (Always in Front: z-index: 1) */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
                onRegisterSuccess={() => {
                  sessionStorage.setItem('skillduels_show_welcome', 'true');
                  sessionStorage.setItem('skillduels_post_register', 'true');
                  setShowLoginIntro(true);
                }}
                onLoginSuccess={() => {
                  sessionStorage.setItem('skillduels_show_welcome', 'true');
                  sessionStorage.removeItem('skillduels_post_register');
                  setShowLoginIntro(true);
                }}
              />
            )
          }
        />

        {/* Post-Login Cinematic Scroll-Locked Video Hero Route */}
        <Route
          path="/welcome"
          element={
            <MetroHero
              title="ENTER THE ARENA"
              tagline="1v1 Real-Time Multiplayer Trivia. Rise to Conqueror."
              scrollHint="SCROLL TO ENTER"
              onComplete={handleFinishLoginIntro}
            />
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

        {/* Standalone Fullscreen Pong Game Playground Route */}
        <Route
          path="/game"
          element={
            <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)', background: '#000000', overflow: 'hidden' }}>
              <PromptingIsAllYouNeed
                words={["SKILLDUELS", "1V1 BATTLE ARENA"]}
                color="#FFFFFF"
                hitColor="#333333"
                backgroundColor="#000000"
                ballColor="#FFFFFF"
                paddleColor="#FFFFFF"
                opacity={1}
                className="w-full h-full"
                style={{ position: 'relative', zIndex: 1 }}
              />
            </div>
          }
        />

        {/* Modern Animated Hero / Matrix Raining Letters Playground Route */}
        <Route
          path="/matrix"
          element={
            <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
              <RainingLetters
                phrases={[
                  'SKILLDUELS ARENA',
                  '1V1 CODE COMBAT',
                  'REAL-TIME CS TRIVIA',
                  'PROVE YOUR KNOWLEDGE',
                  'CLIMB TO CONQUEROR',
                  'ENTER THE ARENA'
                ]}
              />
            </div>
          }
        />

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Interactive Modal Dialogs for Rules, Badges, Privacy, Terms */}
      <FooterModals activeModal={activeModal} onClose={() => setActiveModal(null)} />

      {/* Footer presentation:
          - No footer on /match/:id (undistracted trivia view)
          - Full MeadowRiseFooter with rich hero & 4 columns ONLY on landing/login (unauthenticated '/')
          - Sleek one-line MinimalFooter on authenticated app pages (/arena, /profile, /leaderboard, /admin)
      */}
      {!location.pathname.startsWith('/match') && location.pathname !== '/welcome' && (
        !isAuthenticated && location.pathname === '/' ? (
          <MeadowRiseFooter
            name="SkillDuels"
            brandHref="/"
            heading={"Enter the *SkillDuels Arena*\nand dominate the leaderboards."}
            subheading="Compete in real-time 1v1 multiplayer trivia battles across frontend, backend, and cloud stacks."
            cta={{ label: "Enter Arena", href: "/" }}
            secondaryCta={{ label: "View Leaderboard", href: "/leaderboard" }}
            tagline="1v1 tech trivia battles. Earn XP, climb the ranks, unlock badges."
            statLine="128 players · 1,240 duels played"
            statAction={{ label: "Find Opponent", href: "/" }}
            socialTitle="Follow Us"
            socials={[
              {
                icon: "github",
                href: "https://github.com/imunmesh/Skill-Duels",
                label: "SkillDuels GitHub Repository",
              },
              {
                icon: "linkedin",
                href: "https://www.linkedin.com/in/unmesh-bhangale/",
                label: "Unmesh Bhangale on LinkedIn",
              },
            ]}
            preset="moonlit"
            columns={[
              {
                title: "Battle Arena",
                links: [
                  { label: "Matchmaking Lobby", href: "/arena" },
                  { label: "Global Leaderboard", href: "/leaderboard" },
                  { label: "Weekly Rankings", href: "/leaderboard?tab=weekly" },
                  { label: "Player Profile & Badges", href: "/profile" },
                ],
              },
              {
                title: "Duel Categories",
                links: [
                  { label: "Data Structures & Algorithms", href: "/arena?category=dsa" },
                  { label: "Quantitative Aptitude", href: "/arena?category=aptitude" },
                  { label: "Logical Reasoning", href: "/arena?category=logical" },
                  { label: "Technical & CS", href: "/arena?category=technical" },
                  { label: "Web Development", href: "/arena?category=web-dev" },
                ],
              },
              {
                title: "Resources",
                links: [
                  { label: "How It Works", onClick: () => setActiveModal('how-it-works'), href: "#how-it-works" },
                  { label: "Badges Guide", onClick: () => setActiveModal('badges'), href: "#badges" },
                  ...(user?.role === 'admin' ? [{ label: "Admin Portal", href: "/admin" }] : []),
                  { label: "GitHub Repository", href: "https://github.com/imunmesh/Skill-Duels" },
                ],
              },
            ]}
            copyright="© 2026 SkillDuels Arena. Built with MERN + Socket.IO"
            legal={[
              { label: "Privacy Policy", onClick: () => setActiveModal('privacy'), href: "#privacy" },
              { label: "Terms of Use", onClick: () => setActiveModal('terms'), href: "#terms" },
            ]}
          />
        ) : (
          <MinimalFooter onOpenModal={(modalName) => setActiveModal(modalName)} />
        )
      )}
      </div>
    </div>
  );
};

export default App;
