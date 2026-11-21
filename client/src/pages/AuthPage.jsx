import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthSwitch from '../components/ui/auth-switch';
import { PublicLeaderboard } from '../components/PublicLeaderboard';
import RainingLetters from '../components/ui/modern-animated-hero-section';

export const AuthPage = ({ onRegisterSuccess, onLoginSuccess }) => {
  const { login, register, error: contextError } = useAuth();
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async ({ email, password }) => {
    setLocalError('');
    setLoading(true);
    try {
      if (!email.trim() || !password) {
        throw new Error('Please enter both email and password.');
      }
      const loggedUser = await login(email.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess(loggedUser);
      }
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async ({ username, email, password }) => {
    setLocalError('');
    setLoading(true);
    try {
      if (!username.trim() || username.length < 3) {
        throw new Error('Username must be at least 3 characters long.');
      }
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      const createdUser = await register(
        username.trim(),
        email.trim(),
        password
      );
      if (onRegisterSuccess) {
        onRegisterSuccess(createdUser);
      }
    } catch (err) {
      setLocalError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        minHeight: '100vh',
        background: 'transparent',
      }}
    >
      {/* Background Matrix Rain Animation across Auth Landing */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.9,
        }}
      >
        <RainingLetters
          overlay={true}
          showTitle={false}
          charCount={260}
          glowColor="#10b981"
        />
      </div>

      {/* Foreground Interactive Auth & Standings Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Interactive Sliding AuthSwitch Component */}
        <AuthSwitch
          onLogin={handleLogin}
          onRegister={handleRegister}
          loading={loading}
          error={localError || contextError}
        />

        {/* Public Top 10 Hall of Fame Standings */}
        <div style={{ width: '100%', maxWidth: 1000, padding: '2rem 1.5rem 4rem' }}>
          <PublicLeaderboard />
        </div>
      </div>
    </main>
  );
};

export default AuthPage;
