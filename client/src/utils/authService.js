const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const AUTH_STORAGE_KEY = 'asq_dashboard_user';
const IMPERSONATION_BACKUP_KEY = 'asq_impersonator_backup';
export const AUTH_CHANGE_EVENT = 'asq:auth-changed';
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

  isImpersonating() {
    try {
      return !!sessionStorage.getItem(IMPERSONATION_BACKUP_KEY);
    } catch {
      return false;
    }
  },

  startImpersonation(targetUser) {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) return { success: false, error: 'No active session.' };
      if (!sessionStorage.getItem(IMPERSONATION_BACKUP_KEY)) {
        sessionStorage.setItem(IMPERSONATION_BACKUP_KEY, JSON.stringify(currentUser));
      }
      const impersonated = {
        ...targetUser,
        isImpersonated: true,
        impersonatorName: currentUser.name || currentUser.email
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(impersonated));
      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: impersonated }));
      return { success: true, user: impersonated };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  stopImpersonation() {
    try {
      const backup = sessionStorage.getItem(IMPERSONATION_BACKUP_KEY);
      if (!backup) return { success: false, error: 'Not impersonating.' };
      sessionStorage.removeItem(IMPERSONATION_BACKUP_KEY);
      const original = JSON.parse(backup);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(original));
      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: original }));
      return { success: true, user: original };
    } catch (e) {
      return { success: false, error: e.message };
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
      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: sessionUser }));
      return { success: true, user: sessionUser };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'Network error while authenticating.' };
    }
  },

  // Register / create new user
  async register(email, password, name = '', role = 'agent') {
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

  // Session revocation: revoke a single user
  async revokeUserSession(userId, userEmail, revokedBy = 'SuperAdmin') {
    try {
      const nowIso = new Date().toISOString();
      const getUrl = `${SUPABASE_BASE_URL}/asq_dashboard_state?key=eq.revoked_sessions&select=key,value&limit=1`;
      const resGet = await fetch(getUrl, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      let currentVal = { revoked_user_ids: [], revoked_emails: [], revoked_all_agents_at: null, history: [] };
      if (resGet.ok) {
        const rows = await resGet.json();
        if (rows && rows[0]?.value) currentVal = rows[0].value;
      }
      const cleanEmail = (userEmail || '').toLowerCase();
      const userIds = Array.from(new Set([...(currentVal.revoked_user_ids || []), userId].filter(Boolean)));
      const emails = Array.from(new Set([...(currentVal.revoked_emails || []), cleanEmail].filter(Boolean)));
      const history = [
        { target: cleanEmail || userId, revoked_at: nowIso, revoked_by: revokedBy },
        ...(currentVal.history || []).slice(0, 49)
      ];

      const saveBody = {
        key: 'revoked_sessions',
        value: { ...currentVal, revoked_user_ids: userIds, revoked_emails: emails, history },
        updated_at: nowIso
      };
      const saveRes = await fetch(`${SUPABASE_BASE_URL}/asq_dashboard_state`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(saveBody)
      });
      if (!saveRes.ok) throw new Error(`Cloud update error ${saveRes.status}`);
      return { success: true };
    } catch (e) {
      console.error('revokeUserSession error:', e);
      return { success: false, error: e.message };
    }
  },

  // Session revocation: revoke all agent sessions
  async revokeAllAgentSessions(revokedBy = 'SuperAdmin') {
    try {
      const nowIso = new Date().toISOString();
      const getUrl = `${SUPABASE_BASE_URL}/asq_dashboard_state?key=eq.revoked_sessions&select=key,value&limit=1`;
      const resGet = await fetch(getUrl, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      let currentVal = { revoked_user_ids: [], revoked_emails: [], revoked_all_agents_at: null, history: [] };
      if (resGet.ok) {
        const rows = await resGet.json();
        if (rows && rows[0]?.value) currentVal = rows[0].value;
      }
      const saveBody = {
        key: 'revoked_sessions',
        value: {
          ...currentVal,
          revoked_all_agents_at: nowIso,
          history: [
            { target: 'ALL_AGENTS', revoked_at: nowIso, revoked_by: revokedBy },
            ...(currentVal.history || []).slice(0, 49)
          ]
        },
        updated_at: nowIso
      };
      const saveRes = await fetch(`${SUPABASE_BASE_URL}/asq_dashboard_state`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(saveBody)
      });
      if (!saveRes.ok) throw new Error(`Cloud update error ${saveRes.status}`);
      return { success: true };
    } catch (e) {
      console.error('revokeAllAgentSessions error:', e);
      return { success: false, error: e.message };
    }
  },

  // Periodic check whether current session is revoked
  async checkSessionRevocation(currentUser) {
    if (!currentUser || currentUser.isImpersonated) return { isRevoked: false };
    try {
      const getUrl = `${SUPABASE_BASE_URL}/asq_dashboard_state?key=eq.revoked_sessions&select=key,value&limit=1`;
      const res = await fetch(getUrl, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows[0]?.value) {
          const val = rows[0].value;
          const userEmail = (currentUser.email || '').toLowerCase();
          const isTargeted =
            (val.revoked_user_ids && val.revoked_user_ids.includes(currentUser.id)) ||
            (val.revoked_emails && val.revoked_emails.includes(userEmail));

          let isAllAgentsRevoked = false;
          if (currentUser.role === 'agent' && val.revoked_all_agents_at) {
            const loginTime = currentUser.lastLogin ? new Date(currentUser.lastLogin).getTime() : 0;
            const revokeTime = new Date(val.revoked_all_agents_at).getTime();
            if (revokeTime > loginTime) isAllAgentsRevoked = true;
          }

          if (isTargeted || isAllAgentsRevoked) {
            // Acknowledge revocation by cleaning up target list
            const remainingEmails = (val.revoked_emails || []).filter(e => e !== userEmail);
            const remainingIds = (val.revoked_user_ids || []).filter(id => id !== currentUser.id);
            fetch(`${SUPABASE_BASE_URL}/asq_dashboard_state`, {
              method: 'POST',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                key: 'revoked_sessions',
                value: { ...val, revoked_emails: remainingEmails, revoked_user_ids: remainingIds },
                updated_at: new Date().toISOString()
              })
            }).catch(e => console.warn(e));

            sessionStorage.setItem(REVOCATION_NOTICE_KEY, 'Your session was remotely terminated by an administrator. Please log in again.');
            this.logout();
            return { isRevoked: true };
          }
        }
      }
    } catch (e) {
      console.warn('Session revocation check skipped:', e);
    }
    return { isRevoked: false };
  },

  // Logout (completely clears all persistent session credentials)
  logout() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(IMPERSONATION_BACKUP_KEY);
      localStorage.removeItem('asq_user');
      localStorage.removeItem('supabase.auth.token');
      window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: null }));
    } catch (e) {
      console.error('Error during logout:', e);
    }
  }
};
