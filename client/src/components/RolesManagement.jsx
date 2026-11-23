import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Shield, ShieldAlert, Plus, Check, AlertCircle, RefreshCw, Eye, EyeOff, 
  Trash2, Edit2, Play, Lock, ChevronDown, X, Loader2
} from 'lucide-react';
import { authService } from '../utils/authService';
import { ALL_FEATURE_KEYS, NAVIGATION_SECTIONS } from '../utils/rbacService';
import { roleService, ROLE_COLORS } from '../utils/roleService';

const SYSTEM_ROLES_META = {
  superadmin: {
    label: 'Super Admin',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: ShieldAlert,
    description: 'Full executive control. Can manage roles and user accounts.'
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
    description: 'Real estate advisor / agent.'
  }
};

function normalizeRole(role) {
  const r = (role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (r.includes('super')) return 'superadmin';
  if (r === 'admin') return 'admin';
  if (r === 'agent') return 'agent';
  return (role || '').toLowerCase().trim();
}

export default function RolesManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filter in User Accounts: 'all' or role key
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

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
        try {
          localStorage.setItem('asq_roles_list_cache', JSON.stringify(rolesRes.roles || []));
          window.dispatchEvent(new CustomEvent('asq-feature-access-updated', { detail: rolesRes.roles }));
        } catch (e) {}
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Role counts
  const superAdminCount = users.filter(u => normalizeRole(u.role) === 'superadmin').length;
  const adminCount = users.filter(u => normalizeRole(u.role) === 'admin').length;
  const agentCount = users.filter(u => normalizeRole(u.role) === 'agent').length;

  const defaultEditableRoles = [
    { 
      id: '4c454f87-7462-499c-8e9b-2f242f9263da', 
      name: 'Admin', 
      key: 'admin', 
      color: 'blue', 
      description: 'Operations and team manager. Full access to portfolio, workflows, listing studio, and team operations.',
      sections: 'overview;owners;buildings;search;transactions;workflows;leads;sources;listing;voice;agent;activity;settings'
    },
    { 
      id: '889c9fa9-5c8e-4eb9-8667-16bc18c28508', 
      name: 'Agent', 
      key: 'agent', 
      color: 'emerald', 
      description: 'Real estate advisor. Access to owner dossiers, buildings directory, search engine, listing studio, and personal activity queue.',
      sections: 'overview;owners;buildings;search;transactions;listing;voice;activity;settings'
    }
  ];

  const editableRolesList = (() => {
    const list = rolesList.filter(r => {
      const k = (r.key || '').toLowerCase();
      const n = (r.name || '').toLowerCase();
      return k !== 'superadmin' && n !== 'super admin';
    });
    return list.length > 0 ? list : defaultEditableRoles;
  })();

  const getCountForRole = (roleKeyOrName) => {
    const norm = (roleKeyOrName || '').toLowerCase().trim();
    if (norm === 'all') return users.length;
    if (norm === 'superadmin' || norm === 'super admin') return superAdminCount;
    if (norm === 'admin') return adminCount;
    if (norm === 'agent') return agentCount;
    return users.filter(u => {
      const r = (u.role || '').toLowerCase().trim();
      return r === norm || normalizeRole(r) === norm;
    }).length;
  };

  // Filtered users list
  const filteredUsers = users.filter(u => {
    if (selectedRoleFilter === 'all') return true;
    const normFilter = selectedRoleFilter.toLowerCase().trim();
    const userRoleNorm = (u.role || '').toLowerCase().trim();
    if (normFilter === 'superadmin' || normFilter === 'super admin') {
      return normalizeRole(u.role) === 'superadmin';
    }
    if (normFilter === 'admin') {
      return normalizeRole(u.role) === 'admin' || userRoleNorm === 'admin';
    }
    if (normFilter === 'agent') {
      return normalizeRole(u.role) === 'agent' || userRoleNorm === 'agent';
    }
    const matchedRole = rolesList.find(r => 
      (r.key && r.key.toLowerCase() === normFilter) || 
      (r.name && r.name.toLowerCase() === normFilter)
    );
    if (matchedRole) {
      const targetKey = (matchedRole.key || '').toLowerCase();
      const targetName = (matchedRole.name || '').toLowerCase();
      return userRoleNorm === targetKey || userRoleNorm === targetName || normalizeRole(u.role) === targetKey;
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
    const sections = (Array.isArray(roleItem.sections) ? roleItem.sections : (roleItem.sections || '').split(';'))
      .map(s => s.trim())
      .filter(Boolean);
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
    if (roleItem.is_system && (roleItem.key === 'superadmin' || roleItem.name?.toLowerCase() === 'super admin')) {
      alert('Cannot delete built-in Super Admin role.');
      return;
    }
    if (roleItem.key === 'superadmin' || roleItem.name?.toLowerCase() === 'super admin') {
      alert('Cannot delete built-in Super Admin role.');
      return;
    }
    const count = getCountForRole(roleItem.key || roleItem.name);
    const confirmMsg = count > 0 
      ? `Are you sure you want to delete role "${roleItem.name}"? ${count} employee(s) currently have this role and will need a new role assigned.`
      : `Are you sure you want to delete role "${roleItem.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    const res = await roleService.deleteRole(roleItem.id);
    if (res.success) {
      if (selectedRoleFilter.toLowerCase() === roleItem.name.toLowerCase() || selectedRoleFilter === roleItem.key) {
        setSelectedRoleFilter('all');
      }
      setSuccess(`Role "${roleItem.name}" deleted successfully.`);
      setTimeout(() => setSuccess(null), 3000);
      loadData();
    } else {
      setError(res.error || 'Failed to delete role.');
    }
  };

  // Selected filter display text
  const getFilterDisplayText = () => {
    if (selectedRoleFilter === 'all') return `All Roles (${users.length} total staff)`;
    if (selectedRoleFilter === 'superadmin' || selectedRoleFilter === 'super admin') {
      return `Super Admin (${superAdminCount} employees)`;
    }
    const found = rolesList.find(r => 
      (r.key && r.key.toLowerCase() === selectedRoleFilter.toLowerCase()) || 
      (r.name && r.name.toLowerCase() === selectedRoleFilter.toLowerCase())
    );
    if (found) {
      const count = getCountForRole(found.key || found.name);
      return `${found.name} (${count} employees)`;
    }
    const count = getCountForRole(selectedRoleFilter);
    return `${selectedRoleFilter.charAt(0).toUpperCase() + selectedRoleFilter.slice(1)} (${count} employees)`;
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

          {(isSuperAdmin || isAdmin) && (
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
          <div className="relative z-30 flex flex-wrap items-center justify-between gap-4 p-3.5 sm:px-5 rounded-2xl bg-[#081322]/60 border border-white/10 backdrop-blur-md">
            {/* Left: Non-AI Rounded Role Filter Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Filter Role:
              </span>

              <div className="relative z-40" ref={roleDropdownRef}>
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

                    {/* Protected Root Role */}
                    <div
                      onClick={() => { setSelectedRoleFilter('superadmin'); setIsRoleDropdownOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        selectedRoleFilter === 'superadmin' ? 'bg-[#183153] text-white font-semibold' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span>Super Admin</span>
                        <Lock className="w-3 h-3 text-slate-500 ml-0.5" title="Root Access (Protected)" />
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums">({superAdminCount} employees)</span>
                    </div>

                    <div className="h-[1px] bg-white/10 my-1" />

                    {/* Roles (Admin, Agent, and Custom Roles) - All Editable & Deletable */}
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#b7a990] flex items-center justify-between">
                      <span>Roles</span>
                      <span className="text-[10px] text-slate-400 font-normal">Edit / Delete</span>
                    </div>

                    {editableRolesList.map(roleItem => {
                      const count = getCountForRole(roleItem.key || roleItem.name);
                      const isSelected = selectedRoleFilter.toLowerCase() === (roleItem.key || roleItem.name).toLowerCase();
                      const dotColor = roleItem.color === 'emerald' ? 'bg-emerald-400' :
                                       roleItem.color === 'purple' ? 'bg-purple-400' :
                                       roleItem.color === 'amber' ? 'bg-amber-400' :
                                       roleItem.color === 'rose' ? 'bg-rose-400' :
                                       roleItem.color === 'cyan' ? 'bg-cyan-400' : 'bg-blue-400';

                      return (
                        <div
                          key={roleItem.id || roleItem.key || roleItem.name}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-colors group ${
                            isSelected ? 'bg-[#183153] text-white font-semibold' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <div 
                            onClick={() => { setSelectedRoleFilter(roleItem.key || roleItem.name); setIsRoleDropdownOpen(false); }}
                            className="flex-1 min-w-0 cursor-pointer flex items-center justify-between mr-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                              <span className="truncate">{roleItem.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 tabular-nums shrink-0 ml-1">({count} employees)</span>
                          </div>

                          {/* Inline Edit & Delete buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsRoleDropdownOpen(false);
                                openEditRoleModal(roleItem);
                              }}
                              title={`Edit ${roleItem.name}`}
                              className="p-1 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-300 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRole(roleItem);
                              }}
                              title={`Delete ${roleItem.name}`}
                              className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/25 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Force terminate all active Agent sessions across all browsers immediately"
                >
                  {revokingAllAgents && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
          <div className="ds-card relative z-10 flex flex-col overflow-hidden">
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
                              <div className="relative inline-flex items-center">
                                <select
                                  value={user.role || 'agent'}
                                  onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                  disabled={isActionBusy}
                                  className="appearance-none bg-[#06111e] hover:bg-[#0a1a2e] border border-white/15 hover:border-white/30 rounded-xl pl-3 pr-8 py-1.5 text-white text-xs focus:outline-none focus:border-blue-400 cursor-pointer capitalize transition-colors min-w-[125px]"
                                >
                                  <option value="superadmin">Super Admin</option>
                                  {editableRolesList.map(cr => (
                                    <option key={cr.id || cr.key} value={cr.key || cr.name}>
                                      {cr.name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                              </div>
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
                <div className="relative">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="ds-input capitalize cursor-pointer appearance-none pr-9"
                  >
                    <option value="superadmin">Super Admin</option>
                    {editableRolesList.map(cr => (
                      <option key={cr.id || cr.key} value={cr.key || cr.name}>
                        {cr.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
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
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Role Badge Color
                </label>
                <div className="flex items-center gap-2">
                  {ROLE_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRoleColorInput(c.id)}
                      className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        roleColorInput === c.id ? 'border-white scale-110 shadow-lg ring-2 ring-white/30' : 'border-white/20 hover:border-white/50 opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: c.id === 'purple' ? '#a855f7' :
                                         c.id === 'blue' ? '#3b82f6' :
                                         c.id === 'emerald' ? '#10b981' :
                                         c.id === 'amber' ? '#f59e0b' :
                                         c.id === 'rose' ? '#f43f5e' :
                                         c.id === 'cyan' ? '#06b6d4' : '#6366f1'
                      }}
                      title={c.label}
                    >
                      {roleColorInput === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Permitted Dashboard Sections
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-black/30 border border-white/10 max-h-56 overflow-y-auto custom-scrollbar">
                  {ALL_FEATURE_KEYS.map(key => {
                    const isChecked = roleSectionsInput.includes(key);
                    const featureMeta = NAVIGATION_SECTIONS.flatMap(s => s.features).find(f => f.key === key);
                    const label = featureMeta ? featureMeta.label : key;

                    return (
                      <label 
                        key={key} 
                        className={`flex items-center gap-2.5 text-xs rounded-lg p-2 transition-colors cursor-pointer select-none border ${
                          isChecked ? 'bg-white/[0.08] border-blue-500/30 text-white' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
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
                          className="rounded border-white/20 bg-slate-900 text-blue-500 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                        />
                        <span className="truncate">{label}</span>
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
