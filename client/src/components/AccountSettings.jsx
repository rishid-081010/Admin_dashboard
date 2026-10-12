import React, { useState } from 'react';
import { User, Shield, CheckCircle2, Database, Key, Bell, Globe, Phone, Server, Save } from 'lucide-react';

export default function AccountSettings() {
  const [saved, setSaved] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('admin@asquared.ae');
  const [autoSync, setAutoSync] = useState(true);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/80 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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
        {/* Left Column: Profile Card */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 text-2xl font-bold">
                MS
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Melanie Simsiman</h3>
                <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">System Administrator</span>
                <p className="text-xs text-slate-400 mt-0.5">A Squared Real Estate LLC</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-[#233549] pt-4 text-xs">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Email:</span>
                <span className="text-white font-mono">admin@asquared.ae</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Bitrix ID:</span>
                <span className="text-white font-mono">User #6 (Admin)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Role:</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold text-[10px]">Superadmin</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Access Level:</span>
                <span className="text-emerald-400 font-semibold">Full Database &amp; CRM Access</span>
              </div>
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
    </div>
  );
}
