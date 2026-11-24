"use client";

import React, { useState, type FormEvent } from "react";
import { Mail, Lock, User, Eye, EyeOff, Swords, HelpCircle } from "lucide-react";

export interface AuthSwitchProps {
  onLogin?: (credentials: { email: string; password: string }) => void | Promise<void>;
  onRegister?: (data: { username: string; email: string; password: string }) => void | Promise<void>;
  loading?: boolean;
  error?: string;
  initialMode?: "signin" | "signup";
  className?: string;
}

export default function AuthSwitch({
  onLogin,
  onRegister,
  loading = false,
  error = "",
  initialMode = "signin",
  className = "",
}: AuthSwitchProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Sign In State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up State
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleSignInSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onLogin) {
      onLogin({ email: loginEmail, password: loginPassword });
    }
  };

  const handleSignUpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onRegister) {
      onRegister({
        username: signupUsername,
        email: signupEmail,
        password: signupPassword,
      });
    }
  };

  return (
    <div className={`auth-switch ${className}`}>
      <style>{`
        .auth-switch,
        .auth-switch * {
          box-sizing: border-box;
        }

        .auth-switch {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: transparent;
          min-height: 100vh;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .auth-switch .container {
          position: relative;
          width: 100%;
          max-width: 960px;
          min-height: 520px;
          max-height: calc(100vh - 36px);
          height: 570px;
          background: rgba(17, 24, 39, 0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(129, 140, 248, 0.25);
          border-radius: 24px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15);
          overflow: hidden;
        }

        .auth-switch .forms-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .auth-switch .signin-signup {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          left: 75%;
          width: 50%;
          transition: 1s 0.7s ease-in-out;
          display: grid;
          grid-template-columns: 1fr;
          z-index: 5;
        }

        .auth-switch form {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 4rem;
          transition: all 0.2s 0.7s;
          overflow: hidden;
          grid-column: 1 / 2;
          grid-row: 1 / 2;
          width: 100%;
        }

        .auth-switch form.sign-up-form {
          opacity: 0;
          z-index: 1;
          pointer-events: none;
        }

        .auth-switch form.sign-in-form {
          opacity: 1;
          z-index: 2;
          pointer-events: all;
        }

        .auth-switch .title {
          font-size: 2rem;
          color: #f8fafc;
          margin-bottom: 8px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .auth-switch .subtitle {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 18px;
          text-align: center;
        }

        .auth-switch .auth-error-banner {
          width: 100%;
          max-width: 380px;
          padding: 0.6rem 0.9rem;
          margin-bottom: 12px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 12px;
          color: #fca5a5;
          font-size: 0.82rem;
          text-align: center;
        }

        .auth-switch .input-field {
          max-width: 380px;
          width: 100%;
          background-color: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin: 6px 0;
          height: 48px;
          border-radius: 48px;
          display: grid;
          grid-template-columns: 14% 72% 14%;
          padding: 0 0.8rem;
          position: relative;
          transition: 0.3s;
          align-items: center;
        }

        .auth-switch .input-field:focus-within {
          background-color: rgba(30, 41, 59, 1);
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
        }

        .auth-switch .input-field i,
        .auth-switch .input-field .icon-slot {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #818cf8;
          transition: 0.3s;
        }

        .auth-switch .input-field input {
          background: none;
          outline: none;
          border: none;
          line-height: 1;
          font-weight: 500;
          font-size: 0.92rem;
          color: #f1f5f9;
          width: 100%;
        }

        .auth-switch .input-field input::placeholder {
          color: #94a3b8;
          font-weight: 400;
          opacity: 0.9;
        }

        .auth-switch .input-field button.eye-toggle-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.2s;
        }

        .auth-switch .input-field button.eye-toggle-btn:hover {
          color: #f1f5f9;
        }

        .auth-switch .forgot-password-link {
          align-self: flex-end;
          max-width: 380px;
          margin: 4px 4px 8px auto;
          font-size: 0.8rem;
          color: #818cf8;
          text-decoration: none;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .auth-switch .forgot-password-link:hover {
          color: #a5b4fc;
          text-decoration: underline;
        }

        .auth-switch .forgot-notice-banner {
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid #818cf8;
          color: #c7d2fe;
          font-size: 0.8rem;
          padding: 6px 10px;
          border-radius: 8px;
          margin-bottom: 8px;
          text-align: center;
          max-width: 380px;
          width: 100%;
        }

        .auth-switch .btn {
          width: 160px;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border: none;
          outline: none;
          height: 48px;
          border-radius: 48px;
          color: #ffffff;
          text-transform: uppercase;
          font-weight: 700;
          margin: 16px 0 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.85rem;
          letter-spacing: 0.04em;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
        }

        .auth-switch .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 22px rgba(168, 85, 247, 0.45);
          filter: brightness(1.1);
        }

        .auth-switch .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .auth-switch .panels-container {
          position: absolute;
          height: 100%;
          width: 100%;
          top: 0;
          left: 0;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }

        .auth-switch .panel {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-around;
          text-align: center;
          z-index: 6;
        }

        .auth-switch .left-panel {
          pointer-events: all;
          padding: 3rem 16% 2rem 10%;
        }

        .auth-switch .right-panel {
          pointer-events: none;
          padding: 3rem 10% 2rem 16%;
        }

        .auth-switch .panel .content {
          color: #ffffff;
          transition: transform 0.9s ease-in-out;
          transition-delay: 0.6s;
          max-width: 320px;
        }

        .auth-switch .panel h3 {
          font-weight: 800;
          line-height: 1.15;
          font-size: 1.7rem;
          margin-bottom: 10px;
          color: #ffffff;
        }

        .auth-switch .panel p {
          font-size: 0.9rem;
          padding: 0.5rem 0 1.2rem;
          color: rgba(241, 245, 249, 0.82);
          line-height: 1.5;
        }

        .auth-switch .btn.transparent {
          margin: 0;
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid rgba(255, 255, 255, 0.7);
          width: 140px;
          height: 44px;
          font-weight: 700;
          font-size: 0.82rem;
          letter-spacing: 0.04em;
          box-shadow: none;
        }

        .auth-switch .btn.transparent:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: #ffffff;
          transform: translateY(-2px);
        }

        .auth-switch .right-panel .content {
          transform: translateX(800px);
        }

        .auth-switch .container.sign-up-mode:before {
          transform: translate(100%, -50%);
          right: 52%;
        }

        .auth-switch .container.sign-up-mode .left-panel .content {
          transform: translateX(-800px);
        }

        .auth-switch .container.sign-up-mode .signin-signup {
          left: 25%;
        }

        .auth-switch .container.sign-up-mode form.sign-up-form {
          opacity: 1;
          z-index: 2;
          pointer-events: all;
        }

        .auth-switch .container.sign-up-mode form.sign-in-form {
          opacity: 0;
          z-index: 1;
          pointer-events: none;
        }

        .auth-switch .container.sign-up-mode .right-panel .content {
          transform: translateX(0%);
        }

        .auth-switch .container.sign-up-mode .left-panel {
          pointer-events: none;
        }

        .auth-switch .container.sign-up-mode .right-panel {
          pointer-events: all;
        }

        .auth-switch .container:before {
          content: "";
          position: absolute;
          height: 2000px;
          width: 2000px;
          top: -10%;
          right: 48%;
          transform: translateY(-50%);
          background: linear-gradient(-45deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%);
          transition: 1.8s ease-in-out;
          border-radius: 50%;
          z-index: 6;
          box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.2);
        }

        .auth-switch .social-text {
          padding: 0.7rem 0 0.4rem;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .auth-switch .social-media {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .auth-switch .social-icon {
          height: 42px;
          width: 42px;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          color: #818cf8;
          font-size: 1.1rem;
          background: rgba(30, 41, 59, 0.5);
          transition: 0.3s;
          cursor: pointer;
        }

        .auth-switch .social-icon:hover {
          border-color: #a855f7;
          background: rgba(99, 102, 241, 0.15);
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(99, 102, 241, 0.25);
        }

        @media (max-width: 870px) {
          .auth-switch .container {
            min-height: 820px;
            height: auto;
            max-width: 520px;
          }
          .auth-switch .signin-signup {
            width: 100%;
            top: 92%;
            transform: translate(-50%, -100%);
            transition: 1s 0.8s ease-in-out;
          }
          .auth-switch .signin-signup,
          .auth-switch .container.sign-up-mode .signin-signup {
            left: 50%;
          }
          .auth-switch .panels-container {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 2fr 1fr;
          }
          .auth-switch .panel {
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
            padding: 2.2rem 8%;
            grid-column: 1 / 2;
          }
          .auth-switch .right-panel {
            grid-row: 3 / 4;
          }
          .auth-switch .left-panel {
            grid-row: 1 / 2;
          }
          .auth-switch .panel .content {
            padding-right: 5%;
            transition: transform 0.9s ease-in-out;
            transition-delay: 0.8s;
          }
          .auth-switch .panel h3 {
            font-size: 1.3rem;
          }
          .auth-switch .panel p {
            font-size: 0.8rem;
            padding: 0.3rem 0;
          }
          .auth-switch .btn.transparent {
            width: 120px;
            height: 38px;
            font-size: 0.75rem;
          }
          .auth-switch .container:before {
            width: 1500px;
            height: 1500px;
            transform: translateX(-50%);
            left: 50%;
            bottom: 72%;
            right: initial;
            top: initial;
            transition: 2s ease-in-out;
          }
          .auth-switch .container.sign-up-mode:before {
            transform: translate(-50%, 100%);
            bottom: 28%;
            right: initial;
          }
          .auth-switch .container.sign-up-mode .left-panel .content {
            transform: translateY(-300px);
          }
          .auth-switch .container.sign-up-mode .right-panel .content {
            transform: translateY(0px);
          }
          .auth-switch .right-panel .content {
            transform: translateY(300px);
          }
          .auth-switch .container.sign-up-mode .signin-signup {
            top: 10%;
            transform: translate(-50%, 0);
          }
        }

        @media (max-width: 570px) {
          .auth-switch form {
            padding: 0 1.5rem;
          }
          .auth-switch .panel .content {
            padding: 0.5rem 0.5rem;
          }
        }
      `}</style>

      <div className={isSignUp ? "container sign-up-mode" : "container"}>
        <div className="forms-container">
          <div className="signin-signup">
            {/* SIGN IN FORM */}
            <form className="sign-in-form" onSubmit={handleSignInSubmit}>
              <h2 className="title">Sign In</h2>
              <p className="subtitle">Enter your credentials to enter SkillDuels</p>

              {error && !isSignUp ? <div className="auth-error-banner">{error}</div> : null}

              <div className="input-field">
                <span className="icon-slot">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div className="input-field">
                <span className="icon-slot">
                  <Lock size={18} />
                </span>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button type="submit" className="btn solid" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            {/* SIGN UP FORM */}
            <form className="sign-up-form" onSubmit={handleSignUpSubmit}>
              <h2 className="title">Sign Up</h2>
              <p className="subtitle">Create your challenger profile in seconds</p>

              {error && isSignUp ? <div className="auth-error-banner">{error}</div> : null}

              <div className="input-field">
                <span className="icon-slot">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  required
                  minLength={3}
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                />
              </div>

              <div className="input-field">
                <span className="icon-slot">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
              </div>

              <div className="input-field">
                <span className="icon-slot">
                  <Lock size={18} />
                </span>
                <input
                  type={showSignupPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password (min 8 chars)"
                  required
                  minLength={8}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  aria-label={showSignupPassword ? "Hide password" : "Show password"}
                >
                  {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? "Creating..." : "Sign Up"}
              </button>
            </form>
          </div>
        </div>

        {/* SIDE PANELS WITH CURVED BACKGROUND ANIMATION */}
        <div className="panels-container">
          <div className="panel left-panel">
            <div className="content">
              {/* SkillDuels Crossed Swords Branding */}
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
                    marginBottom: '0.4rem',
                  }}
                >
                  <Swords size={28} color="#ffffff" />
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Skill<span style={{ color: '#818cf8' }}>Duels</span>
                </span>
              </div>

              <h3>New Challenger?</h3>
              <p>
                Join SkillDuels today to compete in real-time 1v1 tech trivia battles,
                earn XP, and climb global leaderboards!
              </p>
              <button
                type="button"
                className="btn transparent"
                onClick={() => setIsSignUp(true)}
              >
                Sign Up
              </button>
            </div>
          </div>

          <div className="panel right-panel">
            <div className="content">
              <h3>Already Competing?</h3>
              <p>
                Welcome back! Sign in to continue your win streak and challenge online peers.
              </p>
              <button
                type="button"
                className="btn transparent"
                onClick={() => setIsSignUp(false)}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
