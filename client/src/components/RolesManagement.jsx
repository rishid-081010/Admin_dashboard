import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, ShieldAlert, ShieldCheck, UserCheck, Eye, EyeOff, Plus, Trash2, 
  Check, AlertCircle, Loader2, Lock, User, Edit2, X, Sliders, LayoutDashboard, 
  Users, Building2, Search, ExternalLink, GitBranch, Sparkles, Home, PhoneCall, 
  Bot, Clock, Settings, RotateCcw, Save, CheckCircle2, CheckSquare, Square
} from 'lucide-react';
import { authService } from '../utils/authService';
import { 
  featureAccessService, 
  FEATURE_SECTIONS, 
  FEATURE_PRESETS, 
  FEATURE_ACCESS_EVENT,
  ALL_FEATURE_KEYS,
  DEFAULT_FEATURE_ACCESS
} from '../utils/featureAccessService';

const ROLE_CONFIG = {
  superadmin: {
    label: 'Super Admin',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: ShieldAlert,
    description: 'Full executive control. Can configure RBAC feature visibility and manage all accounts.'
  },
  admin: {
    label: 'Admin',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    icon: ShieldCheck,
    description: 'Operational manager. Can manage and assign Agent roles.'
  },
  agent: {
    label: 'Agent',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: UserCheck,
    description: 'Real estate advisor / agent. Restricted to features permitted by Super Admin.'
  }
};

function normalizeRole(role) {
  const r = (role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (r.includes('super')) return 'superadmin';
  if (r.includes('admin')) return 'admin';
  return 'agent';
}

function FeatureIcon({ name, className = "w-4 h-4" }) {
  switch (name) {
    case 'LayoutDashboard': return <LayoutDashboard className={className} />;
    case 'Users': return <Users className={className} />;
    case 'Building2': return <Building2 className={className} />;
    case 'Search': return <Search className={className} />;
    case 'ExternalLink': return <ExternalLink className={className} />;
    case 'GitBranch': return <GitBranch className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Home': return <Home className={className} />;
    case 'PhoneCall': return <PhoneCall className={className} />;
    case 'Bot': return <Bot className={className} />;
    case 'Clock': return <Clock className={className} />;
    case 'ShieldAlert': return <ShieldAlert className={className} />;
    case 'Settings': return <Settings className={className} />;
    default: return <Sparkles className={className} />;
  }
}

export default function RolesManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Tab mode: 'accounts' (User Accounts) vs 'access' (Feature Visibility & Access Matrix)
  const [activeTabMode, setActiveTabMode] = useState('accounts');

  // Role currently being edited in the Feature Access matrix ('agent' or 'admin')
  const [selectedRoleConfig, setSelectedRoleConfig] = useState('agent');

  // Feature Access Configuration Map { admin: {...}, agent: {...} }
  const [featureAccessMap, setFeatureAccessMap] = useState(() => featureAccessService.getFeatureAccess());
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [accessSuccessMsg, setAccessSuccessMsg] = useState(null);
  const [accessErrorMsg, setAccessErrorMsg] = useState(null);

  // Password visibility map { [userId]: boolean } with 10s auto-hide timer (UI-020)
  const [showPasswords, setShowPasswords] = useState({});
  const passwordTimersRef = useRef({});

  // Clean up auto-hide timers on unmount
  useEffect(() => {
    return () => {
      Object.values(passwordTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  // Password in-line editing map { [userId]: string }
  const [editingPasswordId, setEditingPasswordId] = useState(null);
  const [editPasswordVal, setEditPasswordVal] = useState('');

  // Add User Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('agent');
  const [newName, setNewName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  // In-line editing states
  const [updatingId, setUpdatingId] = useState(null);

  const myRole = normalizeRole(currentUser?.role || 'admin');
  const isSuperAdmin = myRole === 'superadmin';
  const isAdmin = myRole === 'admin';

  // Fetch users and feature access on mount
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const res = await authService.getUsers();
    if (res.success) {
      setUsers(res.users);
    } else {
      setError(res.error || 'Failed to fetch users from Supabase.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // Refresh cloud feature access
    featureAccessService.fetchFromCloud().then(res => {
      if (res.success && res.config) {
        setFeatureAccessMap(res.config);
      }
    });

    const handleFeatureSync = (e) => {
      if (e.detail) {
        setFeatureAccessMap(e.detail);
      }
    };
    window.addEventListener(FEATURE_ACCESS_EVENT, handleFeatureSync);
    return () => window.removeEventListener(FEATURE_ACCESS_EVENT, handleFeatureSync);
  }, []);

  // Permission check: Can the logged-in user edit the role of targetUser?
  const canEditUserRole = (targetUser) => {
    const targetRole = normalizeRole(targetUser.role);
    if (isSuperAdmin) {
      return targetRole === 'admin' || targetRole === 'agent';
    }
    if (isAdmin) {
      return targetRole === 'agent';
    }
    return false;
  };

  const handleRoleChange = async (userId, newRoleValue) => {
    setUpdatingId(userId);
    setSuccessMsg(null);
    setError(null);

    const res = await authService.updateUser(userId, { role: newRoleValue });
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRoleValue } : u));
      setSuccessMsg(`Role updated to ${ROLE_CONFIG[newRoleValue]?.label || newRoleValue} successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setError(res.error || 'Failed to update role in Supabase.');
    }
    setUpdatingId(null);
  };

  const handlePasswordUpdate = async (userId, updatedPassword) => {
    if (!updatedPassword || !updatedPassword.trim()) return;
    setUpdatingId(userId);
    const res = await authService.updateUser(userId, { password: updatedPassword.trim() });
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: updatedPassword.trim() } : u));
      setSuccessMsg('Password updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setError(res.error || 'Failed to update password.');
    }
    setUpdatingId(null);
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to remove account ${userEmail}?`)) return;
    setUpdatingId(userId);
    const res = await authService.deleteUser(userId);
    if (res.success) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSuccessMsg(`Account ${userEmail} removed.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setError(res.error || 'Failed to delete account.');
    }
    setUpdatingId(null);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setAddError(null);
    if (!newEmail.trim() || !newPassword.trim()) {
      setAddError('Please provide both Email and Password.');
      return;
    }

    setAddLoading(true);
    const res = await authService.register(newEmail, newPassword, newName, newRole);
    if (res.success) {
      setIsAddOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('agent');
      setSuccessMsg(`Account created and linked to Supabase.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      fetchUsers();
    } else {
      setAddError(res.error || 'Failed to create user in Supabase.');
    }
    setAddLoading(false);
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswords(prev => {
      const willBeVisible = !prev[id];
      if (passwordTimersRef.current[id]) {
        clearTimeout(passwordTimersRef.current[id]);
        delete passwordTimersRef.current[id];
      }
      if (willBeVisible) {
        passwordTimersRef.current[id] = setTimeout(() => {
          setShowPasswords(curr => ({ ...curr, [id]: false }));
          delete passwordTimersRef.current[id];
        }, 10000);
      }
      return { ...prev, [id]: willBeVisible };
    });
  };

  // ── FEATURE ACCESS HANDLERS (RBAC) ──
  const activeRolePerms = featureAccessMap[selectedRoleConfig] || DEFAULT_FEATURE_ACCESS[selectedRoleConfig] || {};

  const handleToggleFeature = (role, featureKey) => {
    setFeatureAccessMap(prev => {
      const currentRoleState = prev[role] || DEFAULT_FEATURE_ACCESS[role];
      const nextVal = !currentRoleState[featureKey];
      return {
        ...prev,
        [role]: {
          ...currentRoleState,
          [featureKey]: nextVal
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleToggleSection = (role, sectionId) => {
    const section = FEATURE_SECTIONS.find(s => s.id === sectionId);
    if (!section) return;

    setFeatureAccessMap(prev => {
      const currentRoleState = prev[role] || DEFAULT_FEATURE_ACCESS[role];
      // If all items in this section are currently true, toggle them all off; otherwise turn them all on!
      const allCurrentlyTrue = section.features.every(f => Boolean(currentRoleState[f.key]));
      const targetVal = !allCurrentlyTrue;

      const updatedSectionPerms = {};
      section.features.forEach(f => {
        updatedSectionPerms[f.key] = targetVal;
      });

      return {
        ...prev,
        [role]: {
          ...currentRoleState,
          ...updatedSectionPerms
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleApplyPreset = (role, presetKey) => {
    const preset = FEATURE_PRESETS[presetKey];
    if (!preset) return;

    setFeatureAccessMap(prev => ({
      ...prev,
      [role]: { ...preset.config }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveFeatureAccess = async () => {
    setIsSavingAccess(true);
    setAccessSuccessMsg(null);
    setAccessErrorMsg(null);

    const res = await featureAccessService.saveFeatureAccess(featureAccessMap, currentUser?.name || 'SuperAdmin');
    if (res.success) {
      setHasUnsavedChanges(false);
      setAccessSuccessMsg(`Feature access for ${selectedRoleConfig.toUpperCase()} saved & synced globally to Supabase.`);
      setTimeout(() => setAccessSuccessMsg(null), 4000);
    } else {
      setAccessErrorMsg(`Failed to sync to Supabase: ${res.error}. Local cache updated.`);
      setTimeout(() => setAccessErrorMsg(null), 5000);
    }
    setIsSavingAccess(false);
  };

  const handleRevertChanges = () => {
    setFeatureAccessMap(featureAccessService.getFeatureAccess());
    setHasUnsavedChanges(false);
  };

  // Stats for the currently selected role
  const totalFeatureCount = ALL_FEATURE_KEYS.length;
  const visibleFeatureCount = ALL_FEATURE_KEYS.filter(k => Boolean(activeRolePerms[k])).length;
  const hiddenFeatureCount = totalFeatureCount - visibleFeatureCount;

  const agentUserCount = users.filter(u => normalizeRole(u.role) === 'agent').length;
  const adminUserCount = users.filter(u => normalizeRole(u.role) === 'admin').length;

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              ROLES &amp; PERMISSIONS
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              Live Supabase Sync
            </span>
          </div>
          <p className="text-white/60 text-xs sm:text-sm">
            Manage system access across Super Admin, Admin, and Agents.
          </p>
        </div>

        {/* Current User Role Pill & Add Account Button */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Your Access:</span>
            <span className={`px-2 py-0.5 rounded-md font-semibold capitalize border ${
              isSuperAdmin ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
              isAdmin ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
              'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {ROLE_CONFIG[myRole]?.label || myRole}
            </span>
          </div>

          {(isSuperAdmin || isAdmin) && activeTabMode === 'accounts' && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </button>
          )}
        </div>
      </div>

      {/* SuperAdmin Main View Switcher: User Accounts vs Feature Access Matrix */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2 mb-6 p-1.5 rounded-2xl bg-[#0c1829] border border-[#233549] w-fit shadow-md">
          <button
            onClick={() => setActiveTabMode('accounts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTabMode === 'accounts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>User Accounts ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTabMode('access')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTabMode === 'access'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sliders className="w-4 h-4 text-purple-200" />
            <span>Feature Visibility &amp; Access</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono uppercase font-bold text-white">
              SuperAdmin
            </span>
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW 1: FEATURE VISIBILITY & ACCESS MATRIX (SUPERADMIN EXCLUSIVE)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTabMode === 'access' && isSuperAdmin && (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
          {/* Notifications */}
          {accessSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{accessSuccessMsg}</span>
            </div>
          )}

          {accessErrorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shadow-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{accessErrorMsg}</span>
            </div>
          )}

          {/* Role Selector & Presets Toolbar */}
          <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Role Switcher Pills */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                1. Select Role to Configure
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRoleConfig('agent')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                    selectedRoleConfig === 'agent'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/15'
                      : 'bg-white/[0.02] text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Agent Role</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] text-emerald-300">
                    {agentUserCount} Users
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRoleConfig('admin')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                    selectedRoleConfig === 'admin'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-lg shadow-blue-500/15'
                      : 'bg-white/[0.02] text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Role</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-[10px] text-blue-300">
                    {adminUserCount} Users
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                2. Quick Presets
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(selectedRoleConfig, 'portfolio_only')}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Only Portfolio tabs visible; Operations and Roles completely hidden"
                >
                  Portfolio Only
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(selectedRoleConfig, 'standard_agent')}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Recommended Agent layout: Portfolio + Listing Studio + AI Agent"
                >
                  Standard Agent
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(selectedRoleConfig, 'full_access')}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Enable all 13 features"
                >
                  Full Access
                </button>
                <button
                  type="button"
                  onClick={handleRevertChanges}
                  disabled={!hasUnsavedChanges}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 transition-all flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert</span>
                </button>
              </div>
            </div>

            {/* Live Visibility Counter */}
            <div className="bg-[#051833] border border-white/10 rounded-xl p-3 flex items-center gap-4 shrink-0">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  Configured Visibility
                </div>
                <div className="text-sm font-semibold text-white mt-0.5 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-mono font-bold">{visibleFeatureCount}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-300 font-mono">{totalFeatureCount}</span>
                  <span className="text-slate-400 text-xs">Features Visible</span>
                </div>
              </div>
              <div className="text-right border-l border-white/10 pl-4">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  Stealth Hidden
                </div>
                <div className="text-sm font-semibold text-rose-400 font-mono mt-0.5">
                  {hiddenFeatureCount} Hidden
                </div>
              </div>
            </div>
          </div>

          {/* Informational Guidance Alert */}
          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3 text-xs leading-relaxed shadow-md">
            <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block mb-0.5">Complete Stealth Guardrail Active</span>
              <p className="text-purple-200/80">
                Any feature toggled <span className="text-rose-400 font-semibold font-mono">OFF</span> is completely removed from the 
                <strong className="text-white capitalize"> {selectedRoleConfig}</strong> sidebar (zero buttons, zero lock icons). 
                If an entire section has all features turned off, the section header automatically collapses. 
                If a user navigates directly to a hidden URL (e.g. <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-white">#workflows</span>), 
                the dashboard silently redirects them to Overview with no error screens.
              </p>
            </div>
          </div>

          {/* Feature Sections & Granular Toggles */}
          <div className="flex flex-col gap-6">
            {FEATURE_SECTIONS.map((section) => {
              const sectionFeatures = section.features;
              const sectionVisibleCount = sectionFeatures.filter(f => Boolean(activeRolePerms[f.key])).length;
              const allSectionEnabled = sectionVisibleCount === sectionFeatures.length;
              const sectionAllHidden = sectionVisibleCount === 0;

              return (
                <div 
                  key={section.id} 
                  className={`bg-[#0c1829] border rounded-2xl p-5 shadow-xl transition-all ${
                    sectionAllHidden ? 'border-rose-500/20 bg-[#081220]/70' : 'border-[#233549]'
                  }`}
                >
                  {/* Section Master Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.08]">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                          <span>{section.title} Section</span>
                        </h3>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold border ${
                          allSectionEnabled 
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                            : sectionAllHidden
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        }`}>
                          {sectionVisibleCount} of {sectionFeatures.length} visible
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {section.description}
                      </p>
                    </div>

                    {/* Section Master Switch Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleSection(selectedRoleConfig, section.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        allSectionEnabled
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}
                    >
                      {allSectionEnabled ? (
                        <>
                          <Square className="w-3.5 h-3.5" />
                          <span>Hide Entire {section.title}</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Show All in {section.title}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Individual Feature Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sectionFeatures.map((feat) => {
                      const isEnabled = Boolean(activeRolePerms[feat.key]);

                      return (
                        <div
                          key={feat.key}
                          onClick={() => handleToggleFeature(selectedRoleConfig, feat.key)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none group ${
                            isEnabled
                              ? 'bg-gradient-to-br from-blue-950/30 to-indigo-950/20 border-blue-500/30 hover:border-blue-400/60 shadow-md'
                              : 'bg-[#061220]/70 border-white/[0.06] hover:border-white/20 opacity-55 hover:opacity-85'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                              isEnabled 
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm' 
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}>
                              <FeatureIcon name={feat.iconName} className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold truncate ${
                                  isEnabled ? 'text-white' : 'text-slate-400'
                                }`}>
                                  {feat.label}
                                </span>
                                {feat.isExternal && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-white/10 text-slate-400">
                                    Link
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {feat.description}
                              </p>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <div className="shrink-0 flex items-center gap-2">
                            <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                              isEnabled ? 'text-emerald-400' : 'text-slate-500'
                            }`}>
                              {isEnabled ? 'ON' : 'OFF'}
                            </span>
                            <div className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                              isEnabled ? 'bg-blue-600' : 'bg-slate-800 border border-white/15'
                            }`}>
                              <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Save Changes Action Bar */}
          <div className="sticky bottom-2 z-20 bg-[#0c1829]/95 backdrop-blur-xl border border-[#233549] rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${hasUnsavedChanges ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <div className="text-xs">
                <span className="text-white font-semibold">
                  {hasUnsavedChanges 
                    ? `Unsaved changes pending for ${selectedRoleConfig.toUpperCase()}`
                    : `Active permissions in sync with Supabase for ${selectedRoleConfig.toUpperCase()}`}
                </span>
                <span className="text-slate-400 block text-[11px]">
                  Changes are applied immediately across all active agent dashboard sessions upon saving.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleRevertChanges}
                disabled={!hasUnsavedChanges}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFeatureAccess}
                disabled={isSavingAccess}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSavingAccess ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing with Supabase...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Feature Access</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW 2: USER ACCOUNTS & CREDENTIALS MANAGEMENT (STANDARD)
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTabMode === 'accounts' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Permissions Rule Banner */}
          <div className="mb-5 p-4 rounded-2xl bg-[#0c1829] border border-[#233549] shadow-md flex items-start gap-3 text-xs leading-relaxed">
            <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block mb-0.5">Role Permission Hierarchy</span>
              <span className="text-slate-300">
                • <strong className="text-purple-300">Super Admin:</strong> Can edit the roles of <strong className="text-blue-300">Admins</strong> and <strong className="text-emerald-300">Agents</strong>, and configure feature visibility.<br />
                • <strong className="text-blue-300">Admin:</strong> Can edit the roles of <strong className="text-emerald-300">Agents</strong>.<br />
                • <strong className="text-emerald-300">Agents:</strong> Access is restricted according to permissions configured by Super Admin.
              </span>
            </div>
          </div>

          {/* Notifications */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Roles Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {Object.entries(ROLE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const count = users.filter(u => normalizeRole(u.role) === key).length;
              return (
                <div key={key} className="bg-[#0c1829] border border-[#233549] rounded-2xl p-4 shadow-lg flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      {config.label}
                    </div>
                    <div className="text-2xl font-bold text-white tracking-tight">
                      {count}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                      {config.description}
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${config.badgeClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Accounts & Roles Table */}
          <div className="flex-1 min-h-0 bg-[#0c1829] border border-[#233549] rounded-2xl flex flex-col shadow-xl overflow-hidden mb-6">
            <div className="p-4 border-b border-[#233549] bg-black/20 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Configured Accounts in Supabase</span>
                <span className="text-xs font-normal text-slate-400">({users.length} accounts total)</span>
              </h2>
              <button 
                onClick={fetchUsers}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                Refresh List
              </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Fetching roles &amp; accounts from Supabase...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No accounts found in Supabase.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#051833] border-b border-white/10 uppercase tracking-wider text-[11px] font-semibold text-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Password</th>
                      <th className="px-5 py-3.5">Assigned Role</th>
                      <th className="px-5 py-3.5">Account Holder</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {users.map((u) => {
                      const roleKey = normalizeRole(u.role);
                      const config = ROLE_CONFIG[roleKey] || ROLE_CONFIG.agent;
                      const canEdit = canEditUserRole(u);
                      const isBusy = updatingId === u.id;
                      const isVisible = !!showPasswords[u.id];

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Email */}
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-white font-medium select-all">
                              {u.email}
                            </div>
                          </td>

                          {/* Password (with real-time inline change option) */}
                          <td className="px-5 py-3.5">
                            {editingPasswordId === u.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editPasswordVal}
                                  onChange={(e) => setEditPasswordVal(e.target.value)}
                                  className="bg-[#051833] border border-blue-500 rounded px-2 py-1 text-white font-mono text-xs w-32 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={async () => {
                                    await handlePasswordUpdate(u.id, editPasswordVal);
                                    setEditingPasswordId(null);
                                  }}
                                  className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                                  title="Save Password"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingPasswordId(null)}
                                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-300 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                                  {isVisible ? u.password : '••••••••••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(u.id)}
                                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                                  title={isVisible ? "Hide Password" : "Show Password (auto-hides in 10s)"}
                                >
                                  {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => {
                                      setEditingPasswordId(u.id);
                                      setEditPasswordVal(u.password || '');
                                    }}
                                    className="text-slate-400 hover:text-blue-400 transition-colors ml-1 cursor-pointer"
                                    title="Edit Password"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Role Selector */}
                          <td className="px-5 py-3.5">
                            {canEdit ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={roleKey}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                  disabled={isBusy}
                                  className="bg-[#051833] border border-white/10 rounded-lg px-2.5 py-1 text-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer capitalize"
                                >
                                  {isSuperAdmin && <option value="admin">Admin</option>}
                                  <option value="agent">Agent</option>
                                  {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                                </select>
                                {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                              </div>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${config.badgeClass}`}>
                                <config.icon className="w-3.5 h-3.5" />
                                <span>{config.label}</span>
                              </span>
                            )}
                          </td>

                          {/* Name / Created */}
                          <td className="px-5 py-3.5">
                            <div className="text-white font-medium">
                              {u.name || 'Unnamed Account'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {u.last_login ? `Active: ${new Date(u.last_login).toLocaleDateString()}` : 'Never logged in'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            {isSuperAdmin && u.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                disabled={isBusy}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                                title="Remove User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {isAddOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsAddOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-1">Add Authorized Account</h3>
            <p className="text-xs text-slate-400 mb-5">
              The new account will be linked directly to Supabase with the chosen role.
            </p>

            {addError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@asquared.ae"
                  required
                  className="w-full bg-[#051833] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Secure password"
                  required
                  className="w-full bg-[#051833] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Melanie Simsiman"
                  className="w-full bg-[#051833] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-[#051833] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-semibold"
                >
                  {isSuperAdmin && <option value="admin">Admin</option>}
                  <option value="agent">Agent</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {addLoading ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
