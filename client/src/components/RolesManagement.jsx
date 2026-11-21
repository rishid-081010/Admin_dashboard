import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Shield, ShieldAlert, Plus, Check, AlertCircle, RefreshCw, Eye, EyeOff, 
  Trash2, Edit2, Play, Lock, Sliders, ChevronDown, Download, Globe, CheckSquare, 
  Square, ShieldCheck, Sparkles, Building2, Search, ExternalLink, GitBranch, 
  Home, PhoneCall, Bot, Clock, Settings, X, Loader2
} from 'lucide-react';
import { authService } from '../utils/authService';
import { 
  rbacService, NAVIGATION_SECTIONS, ALL_FEATURE_KEYS, DEFAULT_FEATURE_ACCESS, 
  DEFAULT_EXPORT_ACCESS, PRESETS, FEATURE_ACCESS_EVENT, EXPORT_ACCESS_EVENT 
} from '../utils/rbacService';
import { roleService } from '../utils/roleService';

const SYSTEM_ROLES_META = {
  superadmin: {
    label: 'Super Admin',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: ShieldAlert,
    description: 'Full executive control. Can configure RBAC feature visibility and manage all accounts.'
  },
  admin: {
    label: 'Admin',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    icon: Shield,
    description: 'Operational manager. Can manage and assign Agent roles.'
  },
  agent: {
    label: 'Agent',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: Users,
    description: 'Real estate advisor / agent. Restricted to features permitted by Super Admin.'
  }
};

function normalizeRole(role) {
  const r = (role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (r.includes('super')) return 'superadmin';
  if (r.includes('admin')) return 'admin';
  return 'agent';
}

function SectionFeatureIcon({ name, className = 'w-4 h-4' }) {
  switch (name) {
    case 'LayoutDashboard': return <Building2 className={className} />;
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
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Top Tabs: 'accounts' | 'access'
  const [activeTopTab, setActiveTopTab] = useState('accounts');

  // Filter in User Accounts: 'all' or role key
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  // Feature Access Tab State
  const [targetRbacRole, setTargetRbacRole] = useState('agent');
  const [featureConfig, setFeatureConfig] = useState(() => rbacService.getFeatureAccess());
  const [exportConfig, setExportConfig] = useState(() => rbacService.getExportAccess());
  const [savingAccess, setSavingAccess] = useState(false);
  const [isAccessDirty, setIsAccessDirty] = useState(false);
  const [accessSuccess, setAccessSuccess] = useState(null);
  const [accessError, setAccessError] = useState(null);

  // Accounts Tab: Modals & Editing
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const passwordTimeouts = useRef({});
  const [editingPasswordId, setEditingPasswordId] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('agent');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountFormError, setAccountFormError] = useState(null);

  // Custom Roles: Create & Edit Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState('create'); // 'create' | 'edit'
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleNameInput, setRoleNameInput] = useState('');
  const [roleDescInput, setRoleDescInput] = useState('');
  const [roleColorInput, setRoleColorInput] = useState('blue');
  const [roleSectionsInput, setRoleSectionsInput] = useState([]);
  const [roleModalError, setRoleModalError] = useState(null);
  const [savingRole, setSavingRole] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [revokingUserId, setRevokingUserId] = useState(null);
  const [revokingAllAgents, setRevokingAllAgents] = useState(false);

  const normalizedUserRole = normalizeRole(currentUser?.role || 'admin');
  const isSuperAdmin = normalizedUserRole === 'superadmin';
  const isAdmin = normalizedUserRole === 'admin';

  // Close custom dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        authService.getUsers(),
        roleService.getRoles()
      ]);

      if (usersRes.success) {
        setUsers(usersRes.users || []);
      } else {
        setError(usersRes.error || 'Failed to fetch users from database.');
      }

      if (rolesRes.success) {
        setRolesList(rolesRes.roles || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    rbacService.fetchFromCloud().then(res => {
      if (res.success && res.config) setFeatureConfig(res.config);
    });
    rbacService.fetchExportAccessFromCloud().then(res => {
      if (res.success && res.config) setExportConfig(res.config);
    });

    const handleFeatureEvt = (e) => { if (e.detail) setFeatureConfig(e.detail); };
    const handleExportEvt = (e) => { if (e.detail) setExportConfig(e.detail); };
    window.addEventListener(FEATURE_ACCESS_EVENT, handleFeatureEvt);
    window.addEventListener(EXPORT_ACCESS_EVENT, handleExportEvt);
    return () => {
      window.removeEventListener(FEATURE_ACCESS_EVENT, handleFeatureEvt);
      window.removeEventListener(EXPORT_ACCESS_EVENT, handleExportEvt);
    };
  }, []);

  // Role counts
  const superAdminCount = users.filter(u => normalizeRole(u.role) === 'superadmin').length;
  const adminCount = users.filter(u => normalizeRole(u.role) === 'admin').length;
  const agentCount = users.filter(u => normalizeRole(u.role) === 'agent').length;

  const getCountForRole = (roleKey) => {
    const norm = (roleKey || '').toLowerCase();
    if (norm === 'all') return users.length;
    if (norm === 'superadmin' || norm === 'super admin') return superAdminCount;
    if (norm === 'admin') return adminCount;
    if (norm === 'agent') return agentCount;
    return users.filter(u => (u.role || '').toLowerCase() === norm).length;
  };

  // Filtered users list
  const filteredUsers = users.filter(u => {
    if (selectedRoleFilter === 'all') return true;
    const normFilter = selectedRoleFilter.toLowerCase();
    const userRoleNorm = (u.role || '').toLowerCase();
    if (normFilter === 'superadmin' || normFilter === 'super admin') {
      return normalizeRole(u.role) === 'superadmin';
    }
    if (normFilter === 'admin') {
      return normalizeRole(u.role) === 'admin';
    }
    if (normFilter === 'agent') {
      return normalizeRole(u.role) === 'agent';
    }
    return userRoleNorm === normFilter;
  });

  // Account Actions
  const handleUpdateRole = async (userId, targetRole) => {
    setActionLoadingId(userId);
    setSuccess(null);
    setError(null);
    const res = await authService.updateUser(userId, { role: targetRole });
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));
      setSuccess(`Role updated to ${targetRole} successfully.`);
      setTimeout(() => setSuccess(null), 3500);
    } else {
      setError(res.error || 'Failed to update role.');
    }
    setActionLoadingId(null);
  };

  const handleSavePassword = async (userId, password) => {
    if (!password || !password.trim()) return;
    setActionLoadingId(userId);
    const res = await authService.updateUser(userId, { password: password.trim() });
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: password.trim() } : u));
      setSuccess('Password updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(res.error || 'Failed to update password.');
    }
    setActionLoadingId(null);
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to permanently delete account ${email}?`)) return;
    setActionLoadingId(userId);
    const res = await authService.deleteUser(userId);
    if (res.success) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess(`Account ${email} deleted.`);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(res.error || 'Failed to delete account.');
    }
    setActionLoadingId(null);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setAccountFormError(null);
    if (!newEmail.trim() || !newPassword.trim()) {
      setAccountFormError('Please provide both Email and Password.');
      return;
    }
    setCreatingAccount(true);
    const res = await authService.register(newEmail, newPassword, newName, newRole);
    if (res.success) {
      setShowAddAccountModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('agent');
      setSuccess('Account created and linked to Supabase.');
      setTimeout(() => setSuccess(null), 3500);
      loadData();
    } else {
      setAccountFormError(res.error || 'Failed to create user in Supabase.');
    }
    setCreatingAccount(false);
  };

  const handleTogglePassword = (userId) => {
    setShowPasswordMap(prev => {
      const next = !prev[userId];
      if (passwordTimeouts.current[userId]) {
        clearTimeout(passwordTimeouts.current[userId]);
        delete passwordTimeouts.current[userId];
      }
      if (next) {
        passwordTimeouts.current[userId] = setTimeout(() => {
          setShowPasswordMap(p => ({ ...p, [userId]: false }));
          delete passwordTimeouts.current[userId];
        }, 10000);
      }
      return { ...prev, [userId]: next };
    });
  };

  const handleStartImpersonation = (targetUser) => {
    const res = authService.startImpersonation(targetUser);
    if (res.success) {
      setSuccess(`SuperAdmin Preview Mode enabled: Viewing as ${targetUser.name || targetUser.email} (${targetUser.role}).`);
    } else {
      setError(res.error || 'Could not start preview mode.');
    }
  };

  const handleForceLogoutUser = async (user) => {
    if (!window.confirm(`Are you sure you want to FORCE LOGOUT ${user.email}? Their active session will be immediately terminated.`)) return;
    setRevokingUserId(user.id);
    setSuccess(null);
    setError(null);
    const res = await authService.revokeUserSession(user.id, user.email, currentUser?.name || 'SuperAdmin');
    if (res.success) {
      setSuccess(`Session revoked for ${user.email}. User has been forcefully logged out.`);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(res.error || 'Failed to revoke user session.');
    }
    setRevokingUserId(null);
  };

  const handleForceLogoutAllAgents = async () => {
    if (!window.confirm('CRITICAL ACTION: Are you sure you want to FORCE LOGOUT ALL AGENTS? All active agent sessions across all devices will be immediately terminated.')) return;
    setRevokingAllAgents(true);
    setSuccess(null);
    setError(null);
    const res = await authService.revokeAllAgentSessions(currentUser?.name || 'SuperAdmin');
    if (res.success) {
      setSuccess('All active Agent sessions have been forcefully terminated across all devices.');
      setTimeout(() => setSuccess(null), 5000);
    } else {
      setError(res.error || 'Failed to revoke all agent sessions.');
    }
    setRevokingAllAgents(false);
  };

  // Custom Roles Actions (Create / Edit / Delete)
  const openCreateRoleModal = () => {
    setRoleModalMode('create');
    setEditingRoleId(null);
    setRoleNameInput('');
    setRoleDescInput('');
    setRoleColorInput('blue');
    setRoleSectionsInput(['overview', 'owners', 'buildings', 'search', 'transactions', 'listing']);
    setRoleModalError(null);
    setShowRoleModal(true);
  };

  const openEditRoleModal = (roleItem) => {
    setRoleModalMode('edit');
    setEditingRoleId(roleItem.id);
    setRoleNameInput(roleItem.name || '');
    setRoleDescInput(roleItem.description || '');
    setRoleColorInput(roleItem.color || 'blue');
    const sections = (roleItem.sections || '').split(';').map(s => s.trim()).filter(Boolean);
    setRoleSectionsInput(sections);
    setRoleModalError(null);
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleNameInput.trim()) {
      setRoleModalError('Role name is required.');
      return;
    }
    setSavingRole(true);
    setRoleModalError(null);

    if (roleModalMode === 'create') {
      const res = await roleService.createRole({
        name: roleNameInput.trim(),
        description: roleDescInput.trim(),
        sections: roleSectionsInput,
        color: roleColorInput
      });
      if (res.success) {
        setShowRoleModal(false);
        setSuccess(`Role "${roleNameInput}" created successfully.`);
        setTimeout(() => setSuccess(null), 3500);
        loadData();
      } else {
        setRoleModalError(res.error || 'Failed to create role.');
      }
    } else {
      const res = await roleService.updateRole(editingRoleId, {
        name: roleNameInput.trim(),
        description: roleDescInput.trim(),
        sections: roleSectionsInput,
        color: roleColorInput
      });
      if (res.success) {
        setShowRoleModal(false);
        setSuccess(`Role "${roleNameInput}" updated successfully.`);
        setTimeout(() => setSuccess(null), 3500);
        loadData();
      } else {
        setRoleModalError(res.error || 'Failed to update role.');
      }
    }
    setSavingRole(false);
  };

  const handleDeleteRole = async (roleItem) => {
    if (roleItem.is_system) {
      alert('Cannot delete built-in system role.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete role "${roleItem.name}"?`)) return;
    const res = await roleService.deleteRole(roleItem.id);
    if (res.success) {
      if (selectedRoleFilter.toLowerCase() === roleItem.name.toLowerCase() || selectedRoleFilter === roleItem.key) {
        setSelectedRoleFilter('all');
      }
      setSuccess(`Role "${roleItem.name}" deleted.`);
      setTimeout(() => setSuccess(null), 3000);
      loadData();
    } else {
      setError(res.error || 'Failed to delete role.');
    }
  };

  // Feature Access Tab Handlers
  const currentFeatures = featureConfig[targetRbacRole] || DEFAULT_FEATURE_ACCESS[targetRbacRole] || {};
  const currentExports = exportConfig[targetRbacRole] || DEFAULT_EXPORT_ACCESS[targetRbacRole] || DEFAULT_EXPORT_ACCESS.agent;

  const handleToggleFeature = (roleKey, featKey) => {
    setFeatureConfig(prev => {
      const current = prev[roleKey] || DEFAULT_FEATURE_ACCESS[roleKey];
      const toggled = !current[featKey];
      return { ...prev, [roleKey]: { ...current, [featKey]: toggled } };
    });
    setIsAccessDirty(true);
  };

  const handleToggleSectionAll = (roleKey, sectionId) => {
    const section = NAVIGATION_SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    setFeatureConfig(prev => {
      const current = prev[roleKey] || DEFAULT_FEATURE_ACCESS[roleKey];
      const allActive = section.features.every(f => !!current[f.key]);
      const nextState = !allActive;
      const updates = {};
      section.features.forEach(f => { updates[f.key] = nextState; });
      return { ...prev, [roleKey]: { ...current, ...updates } };
    });
    setIsAccessDirty(true);
  };

  const handleToggleExport = (roleKey, type) => {
    setExportConfig(prev => {
      const current = prev[roleKey] || DEFAULT_EXPORT_ACCESS[roleKey] || DEFAULT_EXPORT_ACCESS.agent;
      const toggled = !current[type];
      return { ...prev, [roleKey]: { ...current, [type]: toggled } };
    });
    setIsAccessDirty(true);
  };

  const handleChangeMaxRows = (roleKey, val) => {
    const num = parseInt(val, 10) || 500;
    setExportConfig(prev => {
      const current = prev[roleKey] || DEFAULT_EXPORT_ACCESS[roleKey] || DEFAULT_EXPORT_ACCESS.agent;
      return { ...prev, [roleKey]: { ...current, max_rows: num } };
    });
    setIsAccessDirty(true);
  };

  const handleApplyPreset = (roleKey, presetId) => {
    const preset = PRESETS[presetId];
    if (preset) {
      setFeatureConfig(prev => ({
        ...prev,
        [roleKey]: { ...preset.config }
      }));
      setIsAccessDirty(true);
    }
  };

  const handleSaveFeatureAccess = async () => {
    setSavingAccess(true);
    setAccessSuccess(null);
    setAccessError(null);
    const [resFeat, resExp] = await Promise.all([
      rbacService.saveFeatureAccess(featureConfig, currentUser?.name || 'SuperAdmin'),
      rbacService.saveExportAccess(exportConfig, currentUser?.name || 'SuperAdmin')
    ]);

    if (resFeat.success && resExp.success) {
      setIsAccessDirty(false);
      setAccessSuccess(`Permissions and export limits for ${targetRbacRole.toUpperCase()} updated successfully.`);
      setTimeout(() => setAccessSuccess(null), 4000);
    } else {
      setAccessError(`Sync notice: ${resFeat.error || resExp.error || 'Local cache updated.'}`);
      setTimeout(() => setAccessError(null), 5000);
    }
    setSavingAccess(false);
  };

  const handleRevertAccess = () => {
    setFeatureConfig(rbacService.getFeatureAccess());
    setExportConfig(rbacService.getExportAccess());
    setIsAccessDirty(false);
  };

  const totalVisibleFeats = ALL_FEATURE_KEYS.filter(k => !!currentFeatures[k]).length;
  const totalHiddenFeats = ALL_FEATURE_KEYS.length - totalVisibleFeats;

  // Selected filter display text
  const getFilterDisplayText = () => {
    if (selectedRoleFilter === 'all') return `All Roles (${users.length} total staff)`;
    if (selectedRoleFilter === 'superadmin') return `Super Admin (${superAdminCount} employees)`;
    if (selectedRoleFilter === 'admin') return `Admin (${adminCount} employees)`;
    if (selectedRoleFilter === 'agent') return `Agent (${agentCount} employees)`;
    const found = rolesList.find(r => r.key === selectedRoleFilter || r.name.toLowerCase() === selectedRoleFilter.toLowerCase());
    if (found) {
      const count = getCountForRole(found.key || found.name);
      return `${found.name} (${count} employees)`;
    }
    return selectedRoleFilter;
  };

  return (
    <div className="w-full flex flex-col h-full min-h-0 animate-fade-in text-white/90 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="ds-page-title">Roles &amp; Permissions</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Your Access:</span>
            <span className="text-white font-semibold capitalize">
              {SYSTEM_ROLES_META[normalizedUserRole]?.label || normalizedUserRole}
            </span>
          </div>

          {(isSuperAdmin || isAdmin) && activeTopTab === 'accounts' && (
            <div className="flex items-center gap-2">
              <button
                onClick={openCreateRoleModal}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 text-purple-300" />
                <span>Create Role</span>
              </button>

              <button
                onClick={() => setShowAddAccountModal(true)}
                className="ds-btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Navigation Tabs */}
      {isSuperAdmin && (
        <div className="flex items-center gap-1.5 p-1 bg-[#06111e]/55 backdrop-blur-md border border-white/10 rounded-xl mb-6 w-fit shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTopTab('accounts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus:outline-none ${
              activeTopTab === 'accounts'
                ? 'bg-blue-600/25 text-blue-200 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>User Accounts ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTopTab('access')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus:outline-none ${
              activeTopTab === 'access'
                ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4 text-purple-300" />
            <span>Feature Access &amp; Permissions</span>
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: USER ACCOUNTS & CUSTOM ROLE DROPDOWN                                */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTopTab === 'accounts' && (
        <div className="flex flex-col gap-6 animate-fade-in pb-12">
          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Controls Bar with Custom Rounded Non-AI Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 sm:px-5 rounded-2xl bg-[#081322]/60 border border-white/10 backdrop-blur-md">
            {/* Left: Non-AI Rounded Role Filter Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Filter Role:
              </span>

              <div className="relative" ref={roleDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(prev => !prev)}
                  className="px-4 py-2 rounded-2xl bg-[#06111e]/85 hover:bg-[#0a1a2e] border border-white/15 hover:border-[#b7a990]/50 text-white text-xs font-medium flex items-center gap-2.5 transition-all shadow-md cursor-pointer min-w-[220px] justify-between"
                >
                  <span className="truncate">{getFilterDisplayText()}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {/* Custom Rounded-2xl Menu with Inline Edit & Delete */}
                {isRoleDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-[#071220]/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-50 p-2 space-y-1 animate-fade-in">
                    {/* All Roles */}
                    <div
                      onClick={() => { setSelectedRoleFilter('all'); setIsRoleDropdownOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        selectedRoleFilter === 'all' ? 'bg-[#183153] text-white font-semibold' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span>All Roles ({users.length} total staff)</span>
                    </div>

                    <div className="h-[1px] bg-white/10 my-1" />

                    {/* Built-in System Roles */}
                    <div
                      onClick={() => { setSelectedRoleFilter('superadmin'); setIsRoleDropdownOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        selectedRoleFilter === 'superadmin' ? 'bg-[#183153] text-white font-semibold' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span>Super Admin</span>
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums">({superAdminCount} employees)</span>
                    </div>

                    <div
                      onClick={() => { setSelectedRoleFilter('admin'); setIsRoleDropdownOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        selectedRoleFilter === 'admin' ? 'bg-[#183153] text-white font-semibold' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>Admin</span>
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums">({adminCount} employees)</span>
                    </div>

                    <div
                      onClick={() => { setSelectedRoleFilter('agent'); setIsRoleDropdownOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        selectedRoleFilter === 'agent' ? 'bg-[#183153] text-white font-semibold' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Agent</span>
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums">({agentCount} employees)</span>
                    </div>

                    {/* Custom Created Roles with Inline Edit and Delete */}
                    {rolesList.filter(r => !r.is_system).length > 0 && (
                      <>
                        <div className="h-[1px] bg-white/10 my-1" />
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#b7a990]">
                          Custom Roles
                        </div>
                        {rolesList.filter(r => !r.is_system).map(roleItem => {
                          const count = getCountForRole(roleItem.key || roleItem.name);
                          const isSelected = selectedRoleFilter.toLowerCase() === (roleItem.key || roleItem.name).toLowerCase();
                          return (
                            <div
                              key={roleItem.id}
                              className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-colors group ${
                                isSelected ? 'bg-[#183153] text-white font-semibold' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                              }`}
                            >
                              <div 
                                onClick={() => { setSelectedRoleFilter(roleItem.key || roleItem.name); setIsRoleDropdownOpen(false); }}
                                className="flex-1 min-w-0 cursor-pointer flex items-center justify-between mr-2"
                              >
                                <span className="truncate">{roleItem.name}</span>
                                <span className="text-[11px] text-slate-400 tabular-nums shrink-0 ml-1">({count} employees)</span>
                              </div>

                              {/* Clean small inline Edit & Delete buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRoleDropdownOpen(false);
                                    openEditRoleModal(roleItem);
                                  }}
                                  title="Edit Role"
                                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRole(roleItem);
                                  }}
                                  title="Delete Role"
                                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Actions */}
            <div className="flex items-center gap-2.5">
              {isSuperAdmin && (
                <button
                  onClick={handleForceLogoutAllAgents}
                  disabled={revokingAllAgents}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/25 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Force terminate all active Agent sessions across all browsers immediately"
                >
                  {revokingAllAgents ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>Force Logout All Agents</span>
                </button>
              )}

              <button
                onClick={loadData}
                className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10"
                title="Refresh user accounts list"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="ds-card flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10 bg-black/20 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans tabular-nums">
                Configured Accounts ({filteredUsers.length} shown of {users.length})
              </h2>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Fetching accounts &amp; roles...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No accounts found under this role.
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
                    {filteredUsers.map((user) => {
                      const isCurrentUser = currentUser?.id === user.id;
                      const isActionBusy = actionLoadingId === user.id;
                      const isPasswordRevealed = !!showPasswordMap[user.id];

                      return (
                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-sans tabular-nums text-white font-medium select-all">
                              {user.email}
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            {editingPasswordId === user.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={tempPassword}
                                  onChange={(e) => setTempPassword(e.target.value)}
                                  className="bg-[#051833] border border-blue-500 rounded px-2 py-1 text-white font-sans tabular-nums text-xs w-32 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={async () => {
                                    await handleSavePassword(user.id, tempPassword);
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
                                  {isPasswordRevealed ? user.password : '••••••••••••'}
                                </span>
                                <button
                                  onClick={() => handleTogglePassword(user.id)}
                                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                                  title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}
                                >
                                  {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => {
                                      setEditingPasswordId(user.id);
                                      setTempPassword(user.password || '');
                                    }}
                                    className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer ml-1"
                                    title="Edit Password"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-3.5">
                            {isSuperAdmin && !isCurrentUser ? (
                              <select
                                value={user.role || 'agent'}
                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                disabled={isActionBusy}
                                className="bg-[#06111e] border border-white/15 rounded-xl px-2.5 py-1 text-white text-xs focus:outline-none focus:border-blue-400 cursor-pointer capitalize"
                              >
                                <option value="superadmin">Super Admin</option>
                                <option value="admin">Admin</option>
                                <option value="agent">Agent</option>
                                {rolesList.filter(r => !r.is_system).map(cr => (
                                  <option key={cr.id} value={cr.key || cr.name}>
                                    {cr.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="capitalize font-medium text-slate-300">
                                {user.role || 'agent'}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="text-slate-300">{user.name || '—'}</span>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isSuperAdmin && !isCurrentUser && (
                                <button
                                  onClick={() => handleStartImpersonation(user)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 flex items-center gap-1 transition-all cursor-pointer text-[11px] font-semibold shadow-sm"
                                  title="Enter Preview Mode as this user"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>Preview</span>
                                </button>
                              )}

                              {isSuperAdmin && !isCurrentUser && (
                                <button
                                  onClick={() => handleForceLogoutUser(user)}
                                  disabled={revokingUserId === user.id}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                                  title="Force Logout Session"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isSuperAdmin && !isCurrentUser && (
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                                  title="Delete Account"
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

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: FEATURE ACCESS & PERMISSIONS (RESTORED FRIEND'S EXACT RBAC UI)      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTopTab === 'access' && isSuperAdmin && (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
          {accessSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{accessSuccess}</span>
            </div>
          )}

          {accessError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shadow-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{accessError}</span>
            </div>
          )}

          {/* Role Target Selector + Presets */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#081322]/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setTargetRbacRole('agent')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  targetRbacRole === 'agent'
                    ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Agent Permissions ({agentCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetRbacRole('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  targetRbacRole === 'admin'
                    ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Permissions ({adminCount})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset(targetRbacRole, 'portfolio_only')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Only Portfolio tabs visible; Operations and Roles completely hidden"
              >
                Portfolio Only
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(targetRbacRole, 'standard_agent')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Recommended Agent layout: Portfolio + Listing Studio + AI Agent"
              >
                Standard Agent
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(targetRbacRole, 'full_access')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Full Access
              </button>

              {isAccessDirty && (
                <button
                  type="button"
                  onClick={handleRevertAccess}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 ml-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Revert</span>
                </button>
              )}
            </div>

            <div className="text-xs text-slate-400 tabular-nums">
              <span className="text-emerald-400 font-bold">{totalVisibleFeats}</span> / {ALL_FEATURE_KEYS.length} Visible
              {' · '}
              <span className="text-slate-400">{totalHiddenFeats} Hidden</span>
            </div>
          </div>

          {/* Export Permissions & Limits Card */}
          <div className="ds-card p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <Download className="w-4 h-4 text-[#b7a990]" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">
                Export Permissions &amp; Limits
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => handleToggleExport(targetRbacRole, 'allow_owners')}
                className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
              >
                <span className="text-xs text-slate-300 font-medium">Owners Directory</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentExports.allow_owners ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {currentExports.allow_owners ? 'Allowed' : 'Blocked'}
                </span>
              </div>

              <div 
                onClick={() => handleToggleExport(targetRbacRole, 'allow_buildings')}
                className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
              >
                <span className="text-xs text-slate-300 font-medium">Buildings 360</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentExports.allow_buildings ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {currentExports.allow_buildings ? 'Allowed' : 'Blocked'}
                </span>
              </div>

              <div 
                onClick={() => handleToggleExport(targetRbacRole, 'allow_listings')}
                className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
              >
                <span className="text-xs text-slate-300 font-medium">Listings Export</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentExports.allow_listings ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {currentExports.allow_listings ? 'Allowed' : 'Blocked'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium mb-1">Max Rows Per Export</span>
                <select
                  value={currentExports.max_rows || 500}
                  onChange={(e) => handleChangeMaxRows(targetRbacRole, e.target.value)}
                  className="bg-[#051833] border border-white/15 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-blue-400 cursor-pointer font-sans tabular-nums"
                >
                  <option value="100">100 rows</option>
                  <option value="250">250 rows</option>
                  <option value="500">500 rows</option>
                  <option value="1000">1,000 rows</option>
                  <option value="2500">2,500 rows</option>
                  <option value="5000">5,000 rows</option>
                  <option value="10000">10,000 rows</option>
                  <option value="50000">50,000 rows</option>
                </select>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 px-1 flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Restricted features are completely hidden from the Agent sidebar.</span>
          </div>

          {/* Section Toggles */}
          {NAVIGATION_SECTIONS.map((section) => {
            const sectionVisibleCount = section.features.filter(f => !!currentFeatures[f.key]).length;
            const allActive = sectionVisibleCount === section.features.length;

            return (
              <div key={section.id} className="ds-card p-5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                        {section.title} Section
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-300 tabular-nums">
                        {sectionVisibleCount} of {section.features.length} visible
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSectionAll(targetRbacRole, section.id)}
                    className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    {allActive ? (
                      <>
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hide Entire {section.title}</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span>Show All in {section.title}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.features.map((feat) => {
                    const isEnabled = !!currentFeatures[feat.key];

                    return (
                      <div
                        key={feat.key}
                        onClick={() => handleToggleFeature(targetRbacRole, feat.key)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isEnabled
                            ? 'bg-[#061426]/75 border-blue-500/30 shadow-sm'
                            : 'bg-black/25 border-white/[0.06] opacity-65 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isEnabled ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400'
                          }`}>
                            <SectionFeatureIcon name={feat.iconName} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-semibold text-white truncate">{feat.label}</h4>
                              {feat.isExternal && (
                                <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-1 rounded">Link</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{feat.description}</p>
                          </div>
                        </div>

                        {/* iOS-style toggle pill */}
                        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                          isEnabled ? 'bg-blue-600' : 'bg-slate-700'
                        }`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Sticky Save Footer */}
          <div className="p-4 rounded-2xl bg-[#081322]/80 border border-white/15 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span>Active permissions in sync with Supabase for <strong className="uppercase text-white">{targetRbacRole}</strong></span>
            </div>

            <div className="flex items-center gap-3">
              {isAccessDirty && (
                <button
                  type="button"
                  onClick={handleRevertAccess}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveFeatureAccess}
                disabled={savingAccess}
                className="ds-btn-primary px-5 py-2.5 text-xs cursor-pointer shadow-lg disabled:opacity-50"
              >
                {savingAccess ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Supabase...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Feature &amp; Export Access</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: ADD ACCOUNT                                                       */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showAddAccountModal && (
        <div className="ds-modal-overlay">
          <div className="ds-modal p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <h3 className="text-base font-bold text-white tracking-tight">Create New User Account</h3>
              <button 
                onClick={() => setShowAddAccountModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {accountFormError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs">
                {accountFormError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="ds-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@asquared.ae"
                  className="ds-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Secure password"
                  className="ds-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="ds-input capitalize cursor-pointer"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                  {rolesList.filter(r => !r.is_system).map(cr => (
                    <option key={cr.id} value={cr.key || cr.name}>
                      {cr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="ds-btn-primary"
                >
                  {creatingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CREATE / EDIT ROLE (NO REDUNDANT ROLE KEY)                         */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showRoleModal && (
        <div className="ds-modal-overlay">
          <div className="ds-modal p-6 max-w-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <h3 className="text-base font-bold text-white tracking-tight">
                {roleModalMode === 'create' ? 'Create New Role' : 'Edit Role'}
              </h3>
              <button 
                onClick={() => setShowRoleModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {roleModalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs">
                {roleModalError}
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={roleNameInput}
                  onChange={(e) => setRoleNameInput(e.target.value)}
                  placeholder="e.g. Telesales Specialist, Senior Listing Agent"
                  className="ds-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={roleDescInput}
                  onChange={(e) => setRoleDescInput(e.target.value)}
                  placeholder="Briefly describe what this role does..."
                  className="ds-input resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Permitted Dashboard Sections
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-black/30 border border-white/10 max-h-48 overflow-y-auto custom-scrollbar">
                  {ALL_FEATURE_KEYS.map(key => {
                    const isChecked = roleSectionsInput.includes(key);
                    return (
                      <label 
                        key={key} 
                        className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none p-1 rounded hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setRoleSectionsInput(prev => prev.filter(k => k !== key));
                            } else {
                              setRoleSectionsInput(prev => [...prev, key]);
                            }
                          }}
                          className="rounded border-white/20 bg-slate-900 text-blue-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="capitalize">{key}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="ds-btn-primary"
                >
                  {savingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{roleModalMode === 'create' ? 'Create Role' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
