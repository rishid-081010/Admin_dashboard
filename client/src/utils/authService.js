const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

export const AUTH_STORAGE_KEY = 'asq_dashboard_user';
export const IMPERSONATION_STORAGE_KEY = 'asq_impersonation_original';
export const IMPERSONATION_EVENT = 'asq-impersonation-changed';
export const REVOCATION_NOTICE_KEY = 'asq_revocation_notice';

export const authService = {
  // Get current active session user
  getCurrentUser() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse auth user', e);
      return null;
    }
  },

  // Login with email & password
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    try {
      const url = `${SUPABASE_BASE_URL}/dashboard_users?email=eq.${encodeURIComponent(cleanEmail)}&select=id,email,password,name,role,created_at,last_login&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!res.ok) {
        throw new Error(`Authentication service returned error ${res.status}`);
      }

      const users = await res.json();
      if (!users || users.length === 0) {
        return { success: false, error: 'No account found with this email address.' };
      }

      const user = users[0];
      if (user.password !== cleanPassword) {
        return { success: false, error: 'Incorrect password. Please verify and try again.' };
      }

      // Record last_login timestamp in background
      const nowIso = new Date().toISOString();
      fetch(`${SUPABASE_BASE_URL}/dashboard_users?email=eq.${encodeURIComponent(cleanEmail)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ last_login: nowIso })
      }).catch(err => console.warn('Non-blocking last_login update failed', err));

      const sessionUser = {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: user.role || 'admin',
        lastLogin: nowIso
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
      return { success: true, user: sessionUser };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'Network error while authenticating.' };
    }
  },

  // Register / create new user
  async register(email, password, name = '', role = 'admin') {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    try {
      const url = `${SUPABASE_BASE_URL}/dashboard_users`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          name: (name || '').trim() || cleanEmail.split('@')[0],
          role: role
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (errorText.includes('duplicate key') || errorText.includes('unique')) {
          return { success: false, error: 'An account with this email already exists.' };
        }
        throw new Error(`Failed to create account: ${res.statusText}`);
      }

      const created = await res.json();
      return { success: true, user: created[0] };
    } catch (err) {
      console.error('Register error:', err);
      return { success: false, error: err.message || 'Failed to create user.' };
    }
  },

  // Get all users from Supabase
  async getUsers() {
    try {
      const url = `${SUPABASE_BASE_URL}/dashboard_users?select=id,email,password,name,role,created_at,last_login&order=created_at.asc`;
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch users: ${res.statusText}`);
      const users = await res.json();
      return { success: true, users };
    } catch (err) {
      console.error('getUsers error:', err);
      return { success: false, error: err.message, users: [] };
    }
  },

  // Update a user's role, password, or name in Supabase
  async updateUser(id, updates) {
    try {
      const url = `${SUPABASE_BASE_URL}/dashboard_users?id=eq.${id}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error(`Failed to update user: ${res.statusText}`);
      const updated = await res.json();
      return { success: true, user: updated[0] };
    } catch (err) {
      console.error('updateUser error:', err);
      return { success: false, error: err.message };
    }
  },

  // Delete a user from Supabase
  async deleteUser(id) {
    try {
      const url = `${SUPABASE_BASE_URL}/dashboard_users?id=eq.${id}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) throw new Error(`Failed to delete user: ${res.statusText}`);
      return { success: true };
    } catch (err) {
      console.error('deleteUser error:', err);
      return { success: false, error: err.message };
    }
  },

  // Logout (completely clears all persistent session credentials so user remains logged out across browser close/reopen)
  logout() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      // Also clear any legacy keys if present
      localStorage.removeItem('asq_user');
      localStorage.removeItem('supabase.auth.token');
    } catch (e) {
      console.error('Error during logout:', e);
    }
  },

  // ─── "VIEW AS" USER IMPERSONATION ENGINE ─────────────────────────────────
  startImpersonation(targetUser) {
    try {
      const current = this.getCurrentUser();
      if (!current) return { success: false, error: 'No active session.' };

      // Save real user if not already impersonating
      if (!this.isImpersonating()) {
        localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(current));
      }

      const impersonatedSession = {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name || targetUser.email.split('@')[0],
        role: targetUser.role || 'agent',
        isImpersonated: true,
        impersonatedBy: current.email,
        lastLogin: current.lastLogin || new Date().toISOString()
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(impersonatedSession));
      window.dispatchEvent(new CustomEvent(IMPERSONATION_EVENT, { detail: impersonatedSession }));
      return { success: true, user: impersonatedSession };
    } catch (e) {
      console.error('startImpersonation error:', e);
      return { success: false, error: e.message };
    }
  },

  stopImpersonation() {
    try {
      const original = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (!original) return { success: false, error: 'No original session to restore.' };

      const parsedOriginal = JSON.parse(original);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsedOriginal));
      localStorage.removeItem(IMPERSONATION_STORAGE_KEY);

      window.dispatchEvent(new CustomEvent(IMPERSONATION_EVENT, { detail: null }));
      return { success: true, user: parsedOriginal };
    } catch (e) {
      console.error('stopImpersonation error:', e);
      return { success: false, error: e.message };
    }
  },

  isImpersonating() {
    try {
      return Boolean(localStorage.getItem(IMPERSONATION_STORAGE_KEY));
    } catch (e) {
      return false;
    }
  },

  getOriginalSuperAdmin() {
    try {
      const stored = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  // ─── REMOTE SESSION REVOCATION & FORCE LOGOUT ───────────────────────────
  async revokeUserSession(targetUserId, targetUserEmail, adminName = 'SuperAdmin') {
    try {
      const nowIso = new Date().toISOString();
      // Fetch current revoked_sessions
      const readUrl = `${SUPABASE_BASE_URL}/asq_dashboard_state?key=eq.revoked_sessions&select=key,value&limit=1`;
      const readRes = await fetch(readUrl, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      let currentVal = { revoked_user_ids: [], revoked_emails: [], revoked_all_agents_at: null, history: [] };
      if (readRes.ok) {
        const rows = await readRes.json();
        if (rows && rows[0]?.value) {
          currentVal = rows[0].value;
        }
      }

      // Add to revoked lists if not already present
      const userIds = Array.from(new Set([...(currentVal.revoked_user_ids || []), targetUserId]));
      const emails = Array.from(new Set([...(currentVal.revoked_emails || []), targetUserEmail.toLowerCase()]));
      const history = [
        {
          user_id: targetUserId,
          email: targetUserEmail,
          revoked_at: nowIso,
          revoked_by: adminName
        },
        ...(currentVal.history || []).slice(0, 49)
      ];

      const payload = {
        key: 'revoked_sessions',
        value: {
          ...currentVal,
          revoked_user_ids: userIds,
          revoked_emails: emails,
          history
        },
        updated_at: nowIso
      };

      const writeRes = await fetch(`${SUPABASE_BASE_URL}/asq_dashboard_state`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!writeRes.ok) {
        throw new Error(`Cloud update error ${writeRes.status}`);
      }

      return { success: true };
    } catch (err) {
      console.error('revokeUserSession error:', err);
      return { success: false, error: err.message };
    }
  },

  async revokeAllAgentSessions(adminName = 'SuperAdmin') {
    try {
      const nowIso = new Date().toISOString();
      const readUrl = `${SUPABASE_BASE_URL}/asq_dashboard_state?key=eq.revoked_sessions&select=key,value&limit=1`;
      const readRes = await fetch(readUrl, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      let currentVal = { revoked_user_ids: [], revoked_emails: [], revoked_all_agents_at: null, history: [] };
      if (readRes.ok) {
        const rows = await readRes.json();
        if (rows && rows[0]?.value) {
          currentVal = rows[0].value;
        }
      }

      const payload = {
        key: 'revoked_sessions',
        value: {
          ...currentVal,
          revoked_all_agents_at: nowIso,
          history: [
            {
              target: 'ALL_AGENTS',
              revoked_at: nowIso,
              revoked_by: adminName
            },
            ...(currentVal.history || []).slice(0, 49)
          ]
        },
        updated_at: nowIso
      };

      const writeRes = await fetch(`${SUPABASE_BASE_URL}/asq_dashboard_state`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!writeRes.ok) {
        throw new Error(`Cloud update error ${writeRes.status}`);
      }

      return { success: true };
    } catch (err) {
      console.error('revokeAllAgentSessions error:', err);
      return { success: false, error: err.message };
    }
  },

  // Check if current user session is revoked in cloud
  async checkSessionRevocation(user) {
    if (!user || user.isImpersonated) return { isRevoked: false };
    try {
      const readUrl = `${SUPABASE_BASE_URL}/asq_dashboard_state?key=eq.revoked_sessions&select=key,value&limit=1`;
      const readRes = await fetch(readUrl, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (readRes.ok) {
        const rows = await readRes.json();
        if (rows && rows[0]?.value) {
          const val = rows[0].value;
          const userEmail = (user.email || '').toLowerCase();
          const isDirectlyRevoked = 
            (val.revoked_user_ids && val.revoked_user_ids.includes(user.id)) ||
            (val.revoked_emails && val.revoked_emails.includes(userEmail));

          let isGlobalAgentRevoked = false;
          if (user.role === 'agent' && val.revoked_all_agents_at) {
            const loginTime = user.lastLogin ? new Date(user.lastLogin).getTime() : 0;
            const revokedTime = new Date(val.revoked_all_agents_at).getTime();
            if (revokedTime > loginTime) {
              isGlobalAgentRevoked = true;
            }
          }

          if (isDirectlyRevoked || isGlobalAgentRevoked) {
            // Un-flag user from revoked list so they can log back in later cleanly
            const nextEmails = (val.revoked_emails || []).filter(e => e !== userEmail);
            const nextUserIds = (val.revoked_user_ids || []).filter(id => id !== user.id);
            fetch(`${SUPABASE_BASE_URL}/asq_dashboard_state`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                key: 'revoked_sessions',
                value: { ...val, revoked_emails: nextEmails, revoked_user_ids: nextUserIds },
                updated_at: new Date().toISOString()
              })
            }).catch(e => console.warn(e));

            // Force local logout
            sessionStorage.setItem(REVOCATION_NOTICE_KEY, 'Your session was remotely terminated by an administrator. Please log in again.');
            this.logout();
            return { isRevoked: true };
          }
        }
      }
    } catch (e) {
      console.warn('Session revocation check skipped due to network/offline:', e);
    }
    return { isRevoked: false };
  }
};
