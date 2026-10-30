import React, { useState } from 'react';
import { authService } from '../utils/authService';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('asq_remembered_email') || '';
    } catch (e) {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    try {
      const notice = sessionStorage.getItem('asq_revocation_notice');
      if (notice) {
        sessionStorage.removeItem('asq_revocation_notice');
        return notice;
      }
    } catch (e) {}
    return null;
  });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login(cleanEmail, cleanPassword);
      if (res.success) {
        try {
          localStorage.setItem('asq_remembered_email', cleanEmail);
        } catch (e) {
          // ignore
        }
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      } else {
        setError(res.error || 'Invalid email or password.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Outer Background: Deep Blue (#001d36)
    <div className="min-h-screen w-screen bg-[#001d36] flex items-center justify-center p-4 box-border font-sans antialiased text-white">
      {/* Inner Card: Dashboard Container Blue (#021328) with Simple Layout from Image 1 */}
      <div className="w-full max-w-[390px] bg-[#021328] rounded-2xl border border-white/10 shadow-2xl p-8 flex flex-col">
        {/* Title */}
        <h1 className="text-2xl font-bold text-white tracking-tight">
          A Squared
        </h1>

        {/* Subtitle */}
        <p className="text-xs text-slate-400 mt-2 mb-6">
          Sign in with your authorized dashboard account.
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Standard Form allowing browser password managers to save & remember credentials */}
        <form onSubmit={handleSubmit} method="POST" className="flex flex-col">
          {/* Email */}
          <label 
            htmlFor="email" 
            className="block text-xs font-normal text-slate-300 mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm text-white bg-[#001d36] border border-white/15 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all mb-4 placeholder-slate-500"
          />

          {/* Password */}
          <label 
            htmlFor="password" 
            className="block text-xs font-normal text-slate-300 mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm text-white bg-[#001d36] border border-white/15 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all mb-5 placeholder-slate-500"
          />

          {/* Sign In Button: Navy Blue from dashboard (#183153) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#183153] hover:bg-[#204270] active:bg-[#142845] text-white text-xs font-medium rounded-lg border border-white/15 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Footer Note */}
        <p className="text-xs text-slate-400 mt-5">
          Your data is available only after authentication.
        </p>
      </div>
    </div>
  );
}
