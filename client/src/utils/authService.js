const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const AUTH_STORAGE_KEY = 'asq_dashboard_user';

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
  }
};
