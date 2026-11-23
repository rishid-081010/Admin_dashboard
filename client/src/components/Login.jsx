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
    // Outer Canvas with Atmospheric Dubai Skyline
    <div 
      className="min-h-screen w-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-10 box-border font-sans antialiased text-[#e2e0cc] select-text overflow-hidden bg-[#040810]"
      style={{
        backgroundImage: "url('./dubai-skyline.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 35%',
      }}
    >
      {/* Balanced Vignette Overlay (Leaves Skyline Vibrant & Visible Through Glass) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(4, 8, 16, 0.40) 0%, rgba(4, 8, 16, 0.55) 50%, rgba(4, 8, 16, 0.75) 100%)'
        }}
      />

      {/* Subtle Warm Amber / Khaki Glow Behind Glass */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#b7a990]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ─── LUMINOUS FROSTED GLASS CONTAINER ──────────────────────────────── */}
      <div 
        className="w-full max-w-4xl rounded-2xl overflow-hidden border border-white/20 backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 relative z-10"
        style={{
          background: 'rgba(6, 14, 26, 0.42)',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.75), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3)'
        }}
      >
        
        {/* ─── LEFT EDITORIAL BRAND PANEL (6 Cols) ─────────────────────────── */}
        <div 
          className="lg:col-span-6 p-8 sm:p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/15"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.01) 100%)'
          }}
        >
          
          {/* Brand Identity Header: Authentic Icon + Text to the Right */}
          <div>
            <div className="flex items-center gap-3.5 mb-2">
              {/* Intertwined AS Monogram in Frosted Glass Box */}
              <div 
                className="w-12 h-12 rounded-xl border border-white/25 flex items-center justify-center p-2.5 shadow-lg backdrop-blur-md shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)'
                }}
              >
                <img 
                  src="./asquared-icon-authentic.png" 
                  alt="A SQUARED" 
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>

              {/* A SQUARED REAL ESTATE Text to the Right Beside the Logo */}
              <div className="flex flex-col justify-center">
                <div 
                  className="text-xl sm:text-2xl tracking-wider text-white font-medium uppercase drop-shadow-md leading-none"
                  style={{ fontFamily: 'var(--asq-font-editorial, Cormorant Garamond, Denton, Georgia, serif)' }}
                >
                  A SQUARED
                </div>
                <div className="text-[10px] tracking-[0.28em] text-[#b7a990] uppercase font-medium mt-1">
                  Real Estate
                </div>
              </div>
            </div>

            {/* Hairline Divider */}
            <div className="h-[1px] w-12 bg-[#b7a990]/50 my-6" />

            {/* Internal Headline Manifesto (Option 4) */}
            <p 
              className="text-2xl sm:text-3xl text-white font-normal leading-snug drop-shadow-md max-w-md"
              style={{ fontFamily: 'var(--asq-font-editorial, Cormorant Garamond, Denton, Georgia, serif)' }}
            >
              Powering the next era of Dubai real estate advisory.
            </p>
          </div>

          {/* Quiet Location Anchor */}
          <div className="pt-8 text-xs text-[#b7a990] tracking-wide font-medium drop-shadow-sm">
            Dubai, United Arab Emirates
          </div>

        </div>

        {/* ─── RIGHT FROSTED GLASS CONSOLE (6 Cols) ────────────────────────── */}
        <div 
          className="lg:col-span-6 p-8 sm:p-10 lg:p-12 flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(12, 24, 41, 0.40) 0%, rgba(6, 14, 26, 0.50) 100%)'
          }}
        >
          
          <div>
            {/* Clean Eyebrow */}
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#b7a990] font-semibold mb-2 drop-shadow-sm">
              Executive Portal
            </div>

            {/* Title */}
            <h1 
              className="text-2xl sm:text-3xl text-white font-medium tracking-tight mb-2 drop-shadow-md"
              style={{ fontFamily: 'var(--asq-font-editorial, Cormorant Garamond, Denton, Georgia, serif)' }}
            >
              Sign In
            </h1>

            {/* Subtitle */}
            <p className="text-xs text-slate-200/90 mb-6 leading-relaxed">
              Enter your authorized credentials to access the portfolio dashboard.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/25 border border-rose-500/40 text-rose-100 text-xs backdrop-blur-md">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} method="POST" className="space-y-4">
              
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-200 mb-1.5 drop-shadow-sm">
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
                  placeholder="name@asquared.ae"
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#b7a990] focus:ring-1 focus:ring-[#b7a990]/50 transition-all placeholder-slate-400 font-sans backdrop-blur-md"
                  style={{
                    background: 'rgba(4, 8, 16, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.20)',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.4)'
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-200 mb-1.5 drop-shadow-sm">
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
                  placeholder="••••••••••••"
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#b7a990] focus:ring-1 focus:ring-[#b7a990]/50 transition-all placeholder-slate-400 font-sans backdrop-blur-md"
                  style={{
                    background: 'rgba(4, 8, 16, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.20)',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.4)'
                  }}
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-lg active:scale-[0.99] text-[#e2e0cc] text-xs font-semibold tracking-wider uppercase border border-[#b7a990]/50 shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed backdrop-blur-md"
                  style={{
                    background: 'linear-gradient(135deg, rgba(24, 49, 83, 0.85) 0%, rgba(32, 66, 112, 0.85) 100%)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.25)'
                  }}
                >
                  <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                  <span className="text-sm">→</span>
                </button>
              </div>

            </form>
          </div>

          {/* Minimal, Dignified Footer */}
          <div className="pt-6 border-t border-white/15 text-[11px] text-slate-300/80 mt-6 flex items-center justify-between">
            <span>Authorized personnel only</span>
            <span>Encrypted session</span>
          </div>

        </div>

      </div>

    </div>
  );
}
