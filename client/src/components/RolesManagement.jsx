import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, ShieldAlert, ShieldCheck, UserCheck, Eye, EyeOff, Plus, Trash2, 
  Check, AlertCircle, Loader2, Lock, User, Edit2, X, Sliders, LayoutDashboard, 
  Users, Building2, Search, ExternalLink, GitBranch, Sparkles, Home, PhoneCall, 
  Bot, Clock, Settings, RotateCcw, Save, CheckCircle2, CheckSquare, Square,
  Download, LogOut, Radio, AlertTriangle, RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { authService } from '../utils/authService';
import { 
  featureAccessService, 
  FEATURE_SECTIONS, 
  FEATURE_PRESETS, 
  FEATURE_ACCESS_EVENT,
  ALL_FEATURE_KEYS,
  DEFAULT_FEATURE_ACCESS,
  DEFAULT_EXPORT_ACCESS,
  EXPORT_ACCESS_EVENT
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

  // Tab mode: 'accounts' (User Accounts) vs 'access' (Feature Visibility & Guardrails)
  const [activeTabMode, setActiveTabMode] = useState('accounts');

  // Role currently being edited in the Feature Access matrix ('agent' or 'admin')
  const [selectedRoleConfig, setSelectedRoleConfig] = useState('agent');

  // Feature Access Configuration Map { admin: {...}, agent: {...} }
  const [featureAccessMap, setFeatureAccessMap] = useState(() => featureAccessService.getFeatureAccess());
  const [exportAccessMap, setExportAccessMap] = useState(() => featureAccessService.getExportAccess());
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [accessSuccessMsg, setAccessSuccessMsg] = useState(null);
  const [accessErrorMsg, setAccessErrorMsg] = useState(null);

  // Password visibility map { [userId]: boolean } with 10s auto-hide timer (UI-020)
  const [showPasswords, setShowPasswords] = useState({});
  const passwordTimersRef = useRef({});

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
  const [revokingUserId, setRevokingUserId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const myRole = normalizeRole(currentUser?.role || 'admin');
  const isSuperAdmin = myRole === 'superadmin';
  const isAdmin = myRole === 'admin';

  // Clean up auto-hide timers on unmount
  useEffect(() => {
    return () => {
      Object.values(passwordTimersRef.current).forEach(clearTimeout);
    };
  }, []);

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

    // Refresh cloud feature & export access
    featureAccessService.fetchFromCloud().then(res => {
      if (res.success && res.config) {
        setFeatureAccessMap(res.config);
      }
    });

    featureAccessService.fetchExportAccessFromCloud().then(res => {
      if (res.success && res.config) {
        setExportAccessMap(res.config);
      }
    });

    const handleFeatureSync = (e) => {
      if (e.detail) {
        setFeatureAccessMap(e.detail);
      }
    };

    const handleExportSync = (e) => {
      if (e.detail) {
        setExportAccessMap(e.detail);
      }
    };

    window.addEventListener(FEATURE_ACCESS_EVENT, handleFeatureSync);
    window.addEventListener(EXPORT_ACCESS_EVENT, handleExportSync);

    return () => {
      window.removeEventListener(FEATURE_ACCESS_EVENT, handleFeatureSync);
      window.removeEventListener(EXPORT_ACCESS_EVENT, handleExportSync);
    };
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

  // ─── SUPERADMIN EXECUTIVE ACTION 1: "VIEW AS" USER IMPERSONATION ──────
  const handleStartImpersonation = (targetUser) => {
    const res = authService.startImpersonation(targetUser);
    if (res.success) {
      setSuccessMsg(`SuperAdmin Preview Mode enabled: Viewing as ${targetUser.name || targetUser.email} (${targetUser.role}).`);
    } else {
      setError(res.error || 'Could not start preview mode.');
    }
  };

  // ─── SUPERADMIN EXECUTIVE ACTION 2: REMOTE FORCE LOGOUT ──────────────
  const handleRevokeSession = async (targetUser) => {
    if (!window.confirm(`Are you sure you want to FORCE LOGOUT ${targetUser.email}? Their active session will be immediately terminated.`)) return;
    setRevokingUserId(targetUser.id);
    setSuccessMsg(null);
    setError(null);

    const res = await authService.revokeUserSession(targetUser.id, targetUser.email, currentUser?.name || 'SuperAdmin');
    if (res.success) {
      setSuccessMsg(`Session revoked for ${targetUser.email}. User has been forcefully logged out.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setError(res.error || 'Failed to revoke user session.');
    }
    setRevokingUserId(null);
  };

  const handleRevokeAllAgents = async () => {
    if (!window.confirm('CRITICAL ACTION: Are you sure you want to FORCE LOGOUT ALL AGENTS? All active agent sessions across all devices will be immediately terminated.')) return;
    setRevokingAll(true);
    setSuccessMsg(null);
    setError(null);

    const res = await authService.revokeAllAgentSessions(currentUser?.name || 'SuperAdmin');
    if (res.success) {
      setSuccessMsg('All active Agent sessions have been forcefully terminated across all devices.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setError(res.error || 'Failed to revoke all agent sessions.');
    }
    setRevokingAll(false);
  };

  // ─── SUPERADMIN EXECUTIVE ACTION 3: BULK EXPORT RESTRICTIONS ──────────
  const handleToggleExportSetting = (role, key) => {
    setExportAccessMap(prev => {
      const currentRole = prev[role] || DEFAULT_EXPORT_ACCESS[role] || DEFAULT_EXPORT_ACCESS.agent;
      const nextVal = !currentRole[key];
      return {
        ...prev,
        [role]: {
          ...currentRole,
          [key]: nextVal
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleMaxRowsChange = (role, val) => {
    const num = parseInt(val, 10) || 500;
    setExportAccessMap(prev => {
      const currentRole = prev[role] || DEFAULT_EXPORT_ACCESS[role] || DEFAULT_EXPORT_ACCESS.agent;
      return {
        ...prev,
        [role]: {
          ...currentRole,
          max_rows: num
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  // ─── FEATURE ACCESS HANDLERS (RBAC) ──
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

    const [resFeature, resExport] = await Promise.all([
      featureAccessService.saveFeatureAccess(featureAccessMap, currentUser?.name || 'SuperAdmin'),
      featureAccessService.saveExportAccess(exportAccessMap, currentUser?.name || 'SuperAdmin')
    ]);

    if (resFeature.success && resExport.success) {
      setHasUnsavedChanges(false);
      setAccessSuccessMsg(`Permissions and export limits for ${selectedRoleConfig.toUpperCase()} updated successfully.`);
      setTimeout(() => setAccessSuccessMsg(null), 4000);
    } else {
      setAccessErrorMsg(`Sync notice: ${resFeature.error || resExport.error || 'Local cache updated.'}`);
      setTimeout(() => setAccessErrorMsg(null), 5000);
    }
    setIsSavingAccess(false);
  };

  const handleRevertChanges = () => {
    setFeatureAccessMap(featureAccessService.getFeatureAccess());
    setExportAccessMap(featureAccessService.getExportAccess());
    setHasUnsavedChanges(false);
  };

  // Stats for the currently selected role
  const totalFeatureCount = ALL_FEATURE_KEYS.length;
  const visibleFeatureCount = ALL_FEATURE_KEYS.filter(k => Boolean(activeRolePerms[k])).length;
  const hiddenFeatureCount = totalFeatureCount - visibleFeatureCount;

  const agentUserCount = users.filter(u => normalizeRole(u.role) === 'agent').length;
  const adminUserCount = users.filter(u => normalizeRole(u.role) === 'admin').length;
  const superAdminUserCount = users.filter(u => normalizeRole(u.role) === 'superadmin').length;

  return (
    <div className="w-full flex flex-col h-full min-h-0 animate-fade-in text-white/90 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ds-page-title">
              Roles &amp; Permissions
            </h1>
          </div>
        </div>

        {/* Current User Role Pill & Add Account Button */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Your Access:</span>
            <span className="text-white font-semibold capitalize">
              {ROLE_CONFIG[myRole]?.label || myRole}
            </span>
          </div>

          {(isSuperAdmin || isAdmin) && activeTabMode === 'accounts' && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="ds-btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </button>
          )}
        </div>
      </div>

      {/* SuperAdmin Main View Switcher: User Accounts vs Feature Visibility & Guardrails */}
      {isSuperAdmin && (
        <div className="flex items-center gap-1.5 p-1 bg-[#06111e]/55 backdrop-blur-md border border-white/10 rounded-xl mb-6 w-fit shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTabMode('accounts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400/50 ${
              activeTabMode === 'accounts'
                ? 'bg-blue-600/25 text-blue-200 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <User className="w-4 h-4 text-blue-400" />
            <span>User Accounts ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTabMode('access')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-400/50 ${
              activeTabMode === 'access'
                ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4 text-purple-300" />
            <span>Feature Access &amp; Permissions</span>
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
          <div className="ds-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-[#06111e]/60 border border-white/10 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setSelectedRoleConfig('agent')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedRoleConfig === 'agent'
                    ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Agent Permissions ({agentUserCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRoleConfig('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedRoleConfig === 'admin'
                    ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Permissions ({adminUserCount})</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset(selectedRoleConfig, 'portfolio_only')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Only Portfolio tabs visible; Operations and Roles completely hidden"
              >
                Portfolio Only
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(selectedRoleConfig, 'standard_agent')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Recommended Agent layout: Portfolio + Listing Studio + AI Agent"
              >
                Standard Agent
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(selectedRoleConfig, 'full_access')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Enable all 13 features"
              >
                Full Access
              </button>
              <button
                type="button"
                onClick={handleRevertChanges}
                disabled={!hasUnsavedChanges}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 transition-all flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer ml-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert</span>
              </button>
            </div>

            {/* Live Visibility Counter */}
            <div className="flex items-center gap-3 text-xs text-slate-400 font-sans tabular-nums pl-1 lg:pl-4 lg:border-l lg:border-white/10">
              <div>
                <span className="text-white font-semibold">{visibleFeatureCount}</span>
                <span className="text-slate-500"> / {totalFeatureCount} Visible</span>
              </div>
              {hiddenFeatureCount > 0 && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-slate-400">{hiddenFeatureCount} Hidden</span>
                </>
              )}
            </div>
          </div>

          {/* Bulk Data Export Guardrails Card */}
          <div className="ds-card p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans tabular-nums">
                  Export Permissions &amp; Limits
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Owners Export */}
              <div
                onClick={() => handleToggleExportSetting(selectedRoleConfig, 'allow_owners')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  exportAccessMap[selectedRoleConfig]?.allow_owners
                    ? 'bg-white/[0.05] border-white/20'
                    : 'bg-[#061220]/60 border-white/[0.06] opacity-60 hover:opacity-85'
                }`}
              >
                <span className="text-xs font-medium text-white">Owners Directory</span>
                <span className={`text-[10px] font-sans tabular-nums font-semibold px-2 py-0.5 rounded ${
                  exportAccessMap[selectedRoleConfig]?.allow_owners ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400'
                }`}>
                  {exportAccessMap[selectedRoleConfig]?.allow_owners ? 'Allowed' : 'Blocked'}
                </span>
              </div>

              {/* Buildings Export */}
              <div
                onClick={() => handleToggleExportSetting(selectedRoleConfig, 'allow_buildings')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  exportAccessMap[selectedRoleConfig]?.allow_buildings
                    ? 'bg-white/[0.05] border-white/20'
                    : 'bg-[#061220]/60 border-white/[0.06] opacity-60 hover:opacity-85'
                }`}
              >
                <span className="text-xs font-medium text-white">Buildings 360</span>
                <span className={`text-[10px] font-sans tabular-nums font-semibold px-2 py-0.5 rounded ${
                  exportAccessMap[selectedRoleConfig]?.allow_buildings ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400'
                }`}>
                  {exportAccessMap[selectedRoleConfig]?.allow_buildings ? 'Allowed' : 'Blocked'}
                </span>
              </div>

              {/* Listings Export */}
              <div
                onClick={() => handleToggleExportSetting(selectedRoleConfig, 'allow_listings')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  exportAccessMap[selectedRoleConfig]?.allow_listings
                    ? 'bg-white/[0.05] border-white/20'
                    : 'bg-[#061220]/60 border-white/[0.06] opacity-60 hover:opacity-85'
                }`}
              >
                <span className="text-xs font-medium text-white">Listings Export</span>
                <span className={`text-[10px] font-sans tabular-nums font-semibold px-2 py-0.5 rounded ${
                  exportAccessMap[selectedRoleConfig]?.allow_listings ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400'
                }`}>
                  {exportAccessMap[selectedRoleConfig]?.allow_listings ? 'Allowed' : 'Blocked'}
                </span>
              </div>

              {/* Max Rows Cap Dropdown */}
              <div className="p-3 rounded-xl border border-white/10 bg-[#061220]/60 flex flex-col justify-center">
                <div className="text-[11px] font-medium text-slate-400 mb-1">Max Rows Per Export</div>
                <select
                  value={exportAccessMap[selectedRoleConfig]?.max_rows || (selectedRoleConfig === 'admin' ? 50000 : 500)}
                  onChange={(e) => handleMaxRowsChange(selectedRoleConfig, e.target.value)}
                  className="bg-[#0c1829] border border-white/15 rounded-lg px-2.5 py-1 text-white text-xs font-sans tabular-nums font-semibold focus:outline-none focus:border-white/30 cursor-pointer"
                >
                  <option value="100">100 rows</option>
                  <option value="500">500 rows</option>
                  <option value="1000">1,000 rows</option>
                  <option value="5000">5,000 rows</option>
                  <option value="10000">10,000 rows</option>
                  <option value="50000">50,000 rows</option>
                  <option value="100000">100,000 rows</option>
                </select>
              </div>
            </div>
          </div>

          {/* Subtle Stealth Access Note */}
          <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Restricted features are completely hidden from the <strong className="text-white capitalize">{selectedRoleConfig}</strong> sidebar.</span>
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
                  className={`ds-card p-5 transition-all ${
                    sectionAllHidden ? 'border-white/5 opacity-55' : 'border-white/15'
                  }`}
                >
                  {/* Section Master Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.08]">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans tabular-nums">
                          {section.title} Section
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-sans tabular-nums font-medium bg-white/[0.05] text-slate-300 border border-white/10">
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
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {allSectionEnabled ? (
                        <>
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                          <span>Hide Entire {section.title}</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
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
                              ? 'bg-[#081220]/80 border-white/15 hover:border-white/25 shadow-sm'
                              : 'bg-[#061220]/60 border-white/[0.05] opacity-50 hover:opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                              isEnabled 
                                ? 'bg-white/10 text-white border-white/15' 
                                : 'bg-white/[0.03] text-slate-500 border-white/5'
                            }`}>
                              <FeatureIcon name={feat.iconName} className="w-3.5 h-3.5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold truncate ${
                                  isEnabled ? 'text-white' : 'text-slate-400'
                                }`}>
                                  {feat.label}
                                </span>
                                {feat.isExternal && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-sans tabular-nums rounded bg-white/10 text-slate-400">
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
                          <div className="shrink-0 flex items-center">
                            <div className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                              isEnabled ? 'bg-blue-600' : 'bg-slate-800 border border-white/15'
                            }`}>
                              <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
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
          <div className="sticky bottom-2 z-20 ds-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                accessSuccessMsg ? 'bg-emerald-400' :
                hasUnsavedChanges ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`} />
              <div className="text-xs">
                {accessSuccessMsg ? (
                  <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{accessSuccessMsg}</span>
                  </span>
                ) : (
                  <span className="text-white font-semibold">
                    {hasUnsavedChanges 
                      ? `Unsaved feature & export changes pending for ${selectedRoleConfig.toUpperCase()}`
                      : `Active permissions in sync with Supabase for ${selectedRoleConfig.toUpperCase()}`}
                  </span>
                )}
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
                className="px-6 py-2.5 rounded-xl bg-[#183153] hover:bg-[#203a63] border border-[#b7a990]/50 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSavingAccess ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing with Supabase...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Feature &amp; Export Access</span>
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
        <div className="flex flex-col gap-6 animate-fade-in pb-12">
          {/* Notifications */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Executive Stat Strip & Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 sm:px-5 rounded-2xl bg-[#081322]/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span className="text-slate-400 font-medium">Super Admins:</span>
                <span className="text-white font-bold font-sans tabular-nums">{superAdminUserCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-slate-400 font-medium">Admins:</span>
                <span className="text-white font-bold font-sans tabular-nums">{adminUserCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="text-slate-400 font-medium">Agents:</span>
                <span className="text-white font-bold font-sans tabular-nums">{agentUserCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {isSuperAdmin && (
                <button
                  onClick={handleRevokeAllAgents}
                  disabled={revokingAll}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/25 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Force terminate all active Agent sessions across all browsers immediately"
                >
                  {revokingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>Force Logout All Agents</span>
                </button>
              )}
              <button 
                onClick={fetchUsers}
                className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10"
                title="Refresh user accounts list"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Accounts & Roles Table */}
          <div className="ds-card flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans tabular-nums">
                Configured Accounts ({users.length})
              </h2>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Fetching accounts &amp; roles...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No accounts found.
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
                            <div className="font-sans tabular-nums text-white font-medium select-all">
                              {u.email}
                            </div>
                          </td>

                          {/* Password */}
                          <td className="px-5 py-3.5">
                            {editingPasswordId === u.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editPasswordVal}
                                  onChange={(e) => setEditPasswordVal(e.target.value)}
                                  className="bg-[#051833] border border-blue-500 rounded px-2 py-1 text-white font-sans tabular-nums text-xs w-32 focus:outline-none"
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
                                <span className="font-sans tabular-nums text-slate-300 bg-black/30 px-2 py-0.5 rounded border border-white/5">
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
                                  className="bg-[#061220] border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs font-medium focus:outline-none focus:border-white/30 cursor-pointer capitalize"
                                >
                                  {isSuperAdmin && <option value="admin" className="bg-[#061220] text-white">Admin</option>}
                                  <option value="agent" className="bg-[#061220] text-white">Agent</option>
                                  {isSuperAdmin && <option value="superadmin" className="bg-[#061220] text-white">Super Admin</option>}
                                </select>
                                {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                              </div>
                            ) : (
                              <span className="font-semibold text-purple-300 text-xs">
                                Super Admin
                              </span>
                            )}
                          </td>

                          {/* Name / Created */}
                          <td className="px-5 py-3.5">
                            <div className="text-white font-medium">
                              {u.name || 'Unnamed Account'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {u.last_login ? `Active: ${new Date(u.last_login).toLocaleDateString()}` : '—'}
                            </div>
                          </td>

                          {/* Actions: View As, Force Logout, Delete */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View As Option */}
                              {isSuperAdmin && u.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleStartImpersonation(u)}
                                  className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/15 transition-all cursor-pointer"
                                  title={`View As: Preview dashboard as ${u.name || u.email}`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Force Logout Option */}
                              {isSuperAdmin && u.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleRevokeSession(u)}
                                  disabled={revokingUserId === u.id}
                                  className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all cursor-pointer disabled:opacity-50"
                                  title={`Force logout ${u.name || u.email}`}
                                >
                                  {revokingUserId === u.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <LogOut className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Delete Account Option */}
                              {isSuperAdmin && u.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  disabled={isBusy}
                                  className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-all cursor-pointer"
                                  title="Remove User Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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
          className="ds-modal-overlay"
          onClick={() => setIsAddOpen(false)}
        >
          <div 
            className="w-full max-w-md ds-card p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-1">Add Authorized Account</h3>
            <p className="text-xs text-slate-400 mb-5">
              Assign an access role to create a new team account.
            </p>

            {addError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
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
                  className="ds-input"
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
                  className="ds-input font-sans tabular-nums"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Melanie Simsiman"
                  className="ds-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="ds-input font-semibold"
                >
                  {isSuperAdmin && <option value="admin">Admin</option>}
                  <option value="agent">Agent</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="ds-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="ds-btn-primary"
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
