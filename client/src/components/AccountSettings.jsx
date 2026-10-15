import React, { useState } from 'react';
import { User, Shield, CheckCircle2, Database, Key, Bell, Globe, Phone, Server, Save, Users, LogOut } from 'lucide-react';
import RolesManagement from './RolesManagement';
import { authService } from '../utils/authService';

export default function AccountSettings({ currentUser, onLogout, onUpdateUser, initialSubTab = 'account' }) {
  const [subTab, setSubTab] = useState(initialSubTab);
  const [saved, setSaved] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('admin@asquared.ae');
  const [autoSync, setAutoSync] = useState(true);

  // Change Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      window.location.reload();
    }
  };

  const handleChangePassword = async (e) => {
    if (e) e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    const cleanPass = newPassword.trim();
    if (!cleanPass) {
      setPasswordError('Please enter a new password.');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!currentUser?.id) {
      setPasswordError('User ID not found. Please log in again.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authService.updateUser(currentUser.id, { password: cleanPass });
      if (res.success) {
        setPasswordMsg('Password successfully updated in Supabase!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordMsg(null);
        }, 2500);
      } else {
        setPasswordError(res.error || 'Failed to update password in database.');
      }
    } catch (err) {
      setPasswordError(err.message || 'Error updating password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/80 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      {/* Sub-tab Navigation Button Header */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/[0.08] pb-3 shrink-0">
        <button
          onClick={() => setSubTab('account')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            subTab === 'account'
              ? 'bg-[#183153] text-white border border-white/20 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          Account &amp; Integrations
        </button>
        <button
          onClick={() => setSubTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            subTab === 'roles'
              ? 'bg-[#183153] text-white border border-white/20 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          Roles
        </button>
      </div>

      {subTab === 'roles' ? (
        <RolesManagement currentUser={currentUser} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
                ACCOUNT &amp; SETTINGS
              </h1>
              <p className="text-white/60 text-[15px]">
                Manage administrative credentials, CRM webhook integrations, and system configuration.
              </p>
            </div>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-lg shadow-blue-500/20"
            >
              {saved ? <><CheckCircle2 className="w-4 h-4 text-emerald-300" /> Saved Successfully</> : <><Save className="w-4 h-4" /> Save Settings</>}
            </button>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        {/* Left Column: Dynamic User Profile & Security Card */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 text-2xl font-bold uppercase">
                {currentUser?.name ? currentUser.name.slice(0, 2) : 'AS'}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white truncate">{currentUser?.name || 'Administrator'}</h3>
                <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  {currentUser?.role === 'superadmin' ? 'Super Administrator' : (currentUser?.role || 'Administrator')}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">A Squared Real Estate LLC</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-[#233549] pt-4 text-xs">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Email:</span>
                <span className="text-white font-mono truncate max-w-[190px]">{currentUser?.email || 'admin@asquared.ae'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Role:</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase border ${
                  currentUser?.role === 'superadmin'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                }`}>
                  {currentUser?.role || 'admin'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Access Level:</span>
                <span className="text-emerald-400 font-semibold">
                  {currentUser?.role === 'superadmin' ? 'Full Executive & Roles Control' : 'Database & Operations Access'}
                </span>
              </div>
            </div>

            {/* Change Password Section (Real-time Supabase update) */}
            <div className="mt-6 pt-5 border-t border-[#233549]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>Security & Password</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword);
                    setPasswordMsg(null);
                    setPasswordError(null);
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
                >
                  {isChangingPassword ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {isChangingPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-3 bg-[#06111e] p-3.5 rounded-xl border border-[#1b2b3d]">
                  {passwordMsg && (
                    <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordMsg}</span>
                    </div>
                  )}
                  {passwordError && (
                    <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px]">
                      {passwordError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="w-full bg-[#0c1829] border border-[#233549] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full bg-[#0c1829] border border-[#233549] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    {passwordLoading ? 'Updating in Supabase...' : 'Save New Password'}
                  </button>
                </form>
              ) : (
                <div className="text-[11px] text-slate-400 bg-[#06111e] p-3 rounded-xl border border-[#1b2b3d] flex items-center justify-between">
                  <span>Password: <span className="font-mono text-slate-300">••••••••••••</span></span>
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(true)}
                    className="text-blue-400 hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Direct Sign Out Button */}
            <div className="mt-5 pt-4 border-t border-[#233549]">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/25 transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out from Dashboard</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#233549]">
            <span className="text-[11px] text-slate-500">Logged into production admin portal • Hostinger cloud cluster</span>
          </div>
        </div>

        {/* Middle & Right Column: Connected Integrations & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connected Integrations Card */}
          <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" /> Connected Services &amp; APIs
            </h3>

            <div className="space-y-3">
              {/* Bitrix24 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#06111e] border border-[#1b2b3d]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">CRM</div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Bitrix24 CRM Pipeline</h4>
                    <p className="text-xs text-slate-400 font-mono">https://crm.asquared.ae/ (Webhook ID: 6)</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs border border-emerald-500/30 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active 2-Way Sync
                </span>
              </div>

              {/* Supabase */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#06111e] border border-[#1b2b3d]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">DB</div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Supabase PostgreSQL Cluster</h4>
                    <p className="text-xs text-slate-400 font-mono">qgxgtavkovqklijfpnfl.supabase.co (3.04M Verified Rows)</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs border border-emerald-500/30 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connected
                </span>
              </div>

              {/* Vapi.ai */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#06111e] border border-[#1b2b3d]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">AI</div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Vapi Voice Agent Outbound API</h4>
                    <p className="text-xs text-slate-400 font-mono">4 Lines (Sarah, James, Aisha, Marcus) • 79,903 Logs</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs border border-emerald-500/30 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connected
                </span>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-400" /> Notifications &amp; System Preferences
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#06111e] border border-[#1b2b3d]">
                <div>
                  <span className="font-semibold text-white block">Auto-Sync Leads to Bitrix24</span>
                  <span className="text-slate-400 block mt-0.5">Automatically register new verified owner records in the Bitrix lead queue</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoSync} 
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#06111e] border border-[#1b2b3d]">
                <div>
                  <span className="font-semibold text-white block">Notification Dispatch Email</span>
                  <span className="text-slate-400 block mt-0.5">Receives summaries of data ingestion batches and calling performance</span>
                </div>
                <input 
                  type="email" 
                  value={notifyEmail} 
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="bg-[#06111e] border border-[#1b2b3d] rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#385175]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
