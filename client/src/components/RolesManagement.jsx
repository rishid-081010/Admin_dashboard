import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, Eye, EyeOff, Plus, Trash2, Check, AlertCircle, Loader2, Lock, User, Edit2, X } from 'lucide-react';
import { authService } from '../utils/authService';

const ROLE_CONFIG = {
  superadmin: {
    label: 'Super Admin',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: ShieldAlert,
    description: 'Full executive control. Can manage Admins and Agents.'
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
    description: 'Real estate advisor / agent. Restricted to assigned listings.'
  }
};

function normalizeRole(role) {
  const r = (role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (r.includes('super')) return 'superadmin';
  if (r.includes('admin')) return 'admin';
  return 'agent';
}

export default function RolesManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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

  // Permission check: Can the logged-in user edit the role of targetUser?
  // User Requirement:
  // "As a Super Admin, I can edit the Admins and Agents roles, and as an Admin, I can edit the Agents roles."
  const canEditUserRole = (targetUser) => {
    const targetRole = normalizeRole(targetUser.role);
    if (isSuperAdmin) {
      // Super Admin can edit Admins and Agents
      return targetRole === 'admin' || targetRole === 'agent';
    }
    if (isAdmin) {
      // Admin can edit Agents roles only
      return targetRole === 'agent';
    }
    return false;
  };

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
  }, []);

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

      // Clear existing auto-hide timer if any
      if (passwordTimersRef.current[id]) {
        clearTimeout(passwordTimersRef.current[id]);
        delete passwordTimersRef.current[id];
      }

      // If making visible, auto-hide after 10 seconds (UI-020)
      if (willBeVisible) {
        passwordTimersRef.current[id] = setTimeout(() => {
          setShowPasswords(curr => ({ ...curr, [id]: false }));
          delete passwordTimersRef.current[id];
        }, 10000);
      }

      return { ...prev, [id]: willBeVisible };
    });
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

          {(isSuperAdmin || isAdmin) && (
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

      {/* Permissions Rule Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-[#0c1829] border border-[#233549] shadow-md flex items-start gap-3 text-xs leading-relaxed">
        <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white block mb-0.5">Role Permission Hierarchy</span>
          <span className="text-slate-300">
            • <strong className="text-purple-300">Super Admin:</strong> Can edit the roles of <strong className="text-blue-300">Admins</strong> and <strong className="text-emerald-300">Agents</strong>.<br />
            • <strong className="text-blue-300">Admin:</strong> Can edit the roles of <strong className="text-emerald-300">Agents</strong>.<br />
            • <strong className="text-emerald-300">Agents:</strong> Access is restricted according to assigned listings.
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
      <div className="flex-1 min-h-0 bg-[#0c1829] border border-[#233549] rounded-2xl flex flex-col shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#233549] bg-black/20 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>Configured Accounts in Supabase</span>
            <span className="text-xs font-normal text-slate-400">({users.length} accounts total)</span>
          </h2>
          <button 
            onClick={fetchUsers}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
                              placeholder="New password"
                              autoFocus
                              className="bg-[#051833] border border-blue-500 rounded px-2 py-0.5 text-xs text-white font-mono w-28 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handlePasswordUpdate(u.id, editPasswordVal);
                                setEditingPasswordId(null);
                              }}
                              disabled={isBusy || !editPasswordVal.trim()}
                              title="Save Password"
                              className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:opacity-40"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPasswordId(null)}
                              title="Cancel"
                              className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 font-mono">
                            <span className="text-slate-200 select-all">
                              {isVisible ? u.password : '••••••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              title={isVisible ? "Hide Password" : "Show Password"}
                              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPasswordId(u.id);
                                  setEditPasswordVal(u.password || '');
                                }}
                                title="Change Password in Supabase"
                                className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer p-0.5 ml-1 border-l border-white/10 pl-1.5"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Role Dropdown / Badge */}
                      <td className="px-5 py-3.5">
                        {canEdit ? (
                          <div className="inline-flex items-center gap-1.5">
                            <select
                              value={roleKey}
                              disabled={isBusy}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className={`bg-[#051833] border rounded-lg px-2.5 py-1 font-semibold text-xs focus:outline-none transition-all cursor-pointer ${config.badgeClass}`}
                            >
                              {/* If Super Admin, can assign Admin and Agent */}
                              {isSuperAdmin && (
                                <>
                                  <option value="admin" className="bg-[#0c1829] text-blue-300">Admin</option>
                                  <option value="agent" className="bg-[#0c1829] text-emerald-300">Agent</option>
                                </>
                              )}
                              {/* If Admin, can assign Agent */}
                              {isAdmin && !isSuperAdmin && (
                                <>
                                  <option value="agent" className="bg-[#0c1829] text-emerald-300">Agent</option>
                                </>
                              )}
                            </select>
                            {isBusy && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5" title={!isSuperAdmin && roleKey === 'superadmin' ? 'Requires Super Admin permissions to edit' : 'Role is locked'}>
                            <span className={`px-2.5 py-1 rounded-lg border font-semibold inline-flex items-center gap-1 ${config.badgeClass}`}>
                              <span>{config.label}</span>
                            </span>
                            {!canEdit && (
                              <Lock className="w-3 h-3 text-slate-500" title="Permission restricted" />
                            )}
                          </div>
                        )}
                      </td>

                      {/* Name / Details */}
                      <td className="px-5 py-3.5">
                        <div className="text-slate-300 font-medium">
                          {u.name || u.email.split('@')[0]}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={isBusy}
                            title="Delete Account"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
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
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50"
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
