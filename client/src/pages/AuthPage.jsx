import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Swords, Lock, Mail, User } from 'lucide-react';
import { PublicLeaderboard } from '../components/PublicLeaderboard';

export const AuthPage = ({ onRegisterSuccess, onLoginSuccess }) => {
  const { login, register, error: contextError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!formData.username.trim() || formData.username.length < 3) {
          throw new Error('Username must be at least 3 characters long.');
        }
        if (!formData.email.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        const createdUser = await register(
          formData.username.trim(),
          formData.email.trim(),
          formData.password
        );
        if (onRegisterSuccess) {
          onRegisterSuccess(createdUser);
        }
      } else {
        if (!formData.email.trim() || !formData.password) {
          throw new Error('Please enter both email and password.');
        }
        const loggedUser = await login(formData.email.trim(), formData.password);
        if (onLoginSuccess) {
          onLoginSuccess(loggedUser);
        }
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 75px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '2.5rem 1.5rem',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: 'var(--accent-gradient)',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <Swords size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            {isRegister ? 'Join the Arena' : 'Welcome Back'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isRegister
              ? 'Create your SkillDuels account to start competing'
              : 'Log in to duel peers, earn XP, and climb the leaderboard'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          role="tablist"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            padding: '0.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <button
            role="tab"
            aria-selected={!isRegister}
            type="button"
            onClick={() => {
              setIsRegister(false);
              setLocalError('');
            }}
            style={{
              padding: '0.6rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: !isRegister ? '#ffffff' : 'var(--text-muted)',
              background: !isRegister ? 'var(--bg-secondary)' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={isRegister}
            type="button"
            onClick={() => {
              setIsRegister(true);
              setLocalError('');
            }}
            style={{
              padding: '0.6rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: isRegister ? '#ffffff' : 'var(--text-muted)',
              background: isRegister ? 'var(--bg-secondary)' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {(localError || contextError) && (
          <div className="alert alert-danger" role="alert">
            <span>{localError || contextError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Player Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  placeholder="e.g. CodeMaster99"
                />
                <User
                  size={16}
                  style={{ position: 'absolute', left: '0.85rem', top: '0.9rem', color: 'var(--text-dim)' }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="name@university.edu"
              />
              <Mail
                size={16}
                style={{ position: 'absolute', left: '0.85rem', top: '0.9rem', color: 'var(--text-dim)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="At least 8 characters"
              />
              <Lock
                size={16}
                style={{ position: 'absolute', left: '0.85rem', top: '0.9rem', color: 'var(--text-dim)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Public Top 10 Hall of Fame Leaderboard */}
      <PublicLeaderboard />
    </main>
  );
};
