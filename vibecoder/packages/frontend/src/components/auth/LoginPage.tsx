import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import './LoginPage.css';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    login(username.trim(), password);
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__logo">
          <img src="/Nimbus_Mobile_Vibe.png" alt="Nimbus Mobile Vibe" className="login__logo-img" />
        </div>

        <p className="login__subtitle">Sign in to your IDE</p>

        {error && (
          <div className="login__error">
            <span>{error}</span>
            <button className="login__error-dismiss" onClick={clearError}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__field">
            <label className="login__label" htmlFor="username">Username</label>
            <input
              id="username"
              className="login__input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="login__field">
            <label className="login__label" htmlFor="password">Password</label>
            <input
              id="password"
              className="login__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            className="login__submit"
            type="submit"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
