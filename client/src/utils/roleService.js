// Client-side Role-Based Access Control (RBAC) and Employee Management Service
// Direct integration with Supabase `roles` and `employees` tables

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

export const AVAILABLE_SECTIONS = [
  // Portfolio
  { id: 'overview', label: 'Overview', category: 'Portfolio', description: 'Executive KPIs, lead velocity & portfolio overview' },
  { id: 'owners', label: 'Owners Data', category: 'Portfolio', description: '3M+ verified property owner directory and 360 dossiers' },
  { id: 'buildings', label: 'Buildings', category: 'Portfolio', description: 'Dubai towers, master communities & building analytics' },
  { id: 'search', label: 'Search Engine', category: 'Portfolio', description: 'Omni-search across owners, buildings & transactions' },
  { id: 'transactions', label: 'Transactions', category: 'Portfolio', description: 'External DLD transaction monitoring dashboard' },

  // Operations
  { id: 'workflows', label: 'Workflows', category: 'Operations', description: 'n8n workflow clusters & automation pipelines' },
  { id: 'leads', label: 'Data Cleaning', category: 'Operations', description: 'Lead ingestion studio, normalization & deduplication' },
  { id: 'sources', label: 'Data Library', category: 'Operations', description: 'Raw datasets, data source registry & catalog' },
  { id: 'listing', label: 'Listing Studio', category: 'Operations', description: 'Rental & sale listing creation, AI copywriting & PDF dossiers' },
  { id: 'voice', label: 'Voice Agent Centre', category: 'Operations', description: 'AI telephony dialer, call audits, recordings & transcripts' },
  { id: 'agent', label: 'AI Agent', category: 'Operations', description: 'Autonomous real estate copilot & operational reasoning' },

  // Admin
  { id: 'roles', label: 'Roles', category: 'Admin', description: 'RBAC role creation, section permissions & employee management' },
  { id: 'settings', label: 'Account & Settings', category: 'Admin', description: 'User account security, credentials & preferences' }
];

export const ROLE_COLORS = [
  { id: 'purple', label: 'Royal Purple', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { id: 'blue', label: 'Ocean Blue', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { id: 'emerald', label: 'Emerald Green', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { id: 'amber', label: 'Warm Amber', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'rose', label: 'Ruby Rose', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  { id: 'cyan', label: 'Cyber Cyan', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { id: 'indigo', label: 'Deep Indigo', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' }
];

export const roleService = {
  // ---------------------------------------------------------------------------
  // 1. ROLES MANAGEMENT
  // ---------------------------------------------------------------------------

  // Fetch all roles from Supabase
  async getRoles() {
    try {
      const res = await fetch(`${SUPABASE_BASE_URL}/roles?select=*&order=created_at.asc`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch roles: ${res.statusText}`);
      const roles = await res.json();
      return { success: true, roles };
    } catch (err) {
      console.error('getRoles error:', err);
      return { success: false, error: err.message, roles: [] };
    }
  },

  // Create a new role with semicolon-separated sections
  async createRole({ name, key, description = '', sections = [], color = 'blue' }) {
    try {
      const cleanName = (name || '').trim();
      const cleanKey = (key || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')).trim();
      
      // Store sections as ';' separated string as per requirement
      const sectionsString = Array.isArray(sections) ? sections.join(';') : String(sections || '');

      if (!cleanName) {
        return { success: false, error: 'Role name is required.' };
      }

      const res = await fetch(`${SUPABASE_BASE_URL}/roles`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: cleanName,
          key: cleanKey,
          description: description.trim(),
          sections: sectionsString,
          color: color || 'blue',
          is_system: false
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        if (errText.includes('duplicate') || errText.includes('unique')) {
          return { success: false, error: 'A role with this name or key already exists.' };
        }
        throw new Error(`Failed to create role: ${res.statusText}`);
      }

      const created = await res.json();
      return { success: true, role: created[0] };
    } catch (err) {
      console.error('createRole error:', err);
      return { success: false, error: err.message };
    }
  },

  // Update an existing role (name, description, sections string, color)
  async updateRole(id, updates) {
    try {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      
      // If sections is passed as an array, join with ';'
      if (Array.isArray(payload.sections)) {
        payload.sections = payload.sections.join(';');
      }

      const res = await fetch(`${SUPABASE_BASE_URL}/roles?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Failed to update role: ${res.statusText}`);
      const updated = await res.json();
      return { success: true, role: updated[0] };
    } catch (err) {
      console.error('updateRole error:', err);
      return { success: false, error: err.message };
    }
  },

  // Delete a role (protects built-in Super Admin role)
  async deleteRole(id) {
    try {
      // First verify role is not superadmin
      const checkRes = await fetch(`${SUPABASE_BASE_URL}/roles?id=eq.${id}&select=id,is_system,name,key`, { headers });
      const checkData = await checkRes.json();
      const role = checkData && checkData[0];
      if (role && (role.key === 'superadmin' || role.name?.toLowerCase() === 'super admin')) {
        return { success: false, error: 'Cannot delete built-in Super Admin role.' };
      }

      const res = await fetch(`${SUPABASE_BASE_URL}/roles?id=eq.${id}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) throw new Error(`Failed to delete role: ${res.statusText}`);
      return { success: true };
    } catch (err) {
      console.error('deleteRole error:', err);
      return { success: false, error: err.message };
    }
  },

  // ---------------------------------------------------------------------------
  // 2. EMPLOYEES MANAGEMENT
  // ---------------------------------------------------------------------------

  // Fetch all employees with their role
  async getEmployees() {
    try {
      const res = await fetch(`${SUPABASE_BASE_URL}/employees?select=*&order=created_at.asc`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch employees: ${res.statusText}`);
      const employees = await res.json();
      return { success: true, employees };
    } catch (err) {
      console.error('getEmployees error:', err);
      return { success: false, error: err.message, employees: [] };
    }
  },

  // Create a new employee
  async createEmployee({ name, email, role = 'agent', role_id = null, password = '', phone = '', department = 'Operations' }) {
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (name || '').trim();

      if (!cleanEmail || !cleanName) {
        return { success: false, error: 'Name and email are required.' };
      }

      const res = await fetch(`${SUPABASE_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          ...headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          role: role,
          role_id: role_id,
          password: password || 'Asquared@123',
          phone: phone || '',
          department: department || 'Operations',
          status: 'active'
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        if (errText.includes('duplicate') || errText.includes('unique')) {
          return { success: false, error: 'An employee with this email already exists.' };
        }
        throw new Error(`Failed to create employee: ${res.statusText}`);
      }

      const created = await res.json();
      return { success: true, employee: created[0] };
    } catch (err) {
      console.error('createEmployee error:', err);
      return { success: false, error: err.message };
    }
  },

  // Update employee (role, department, password, status, name)
  async updateEmployee(id, updates) {
    try {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      const res = await fetch(`${SUPABASE_BASE_URL}/employees?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Failed to update employee: ${res.statusText}`);
      const updated = await res.json();
      return { success: true, employee: updated[0] };
    } catch (err) {
      console.error('updateEmployee error:', err);
      return { success: false, error: err.message };
    }
  },

  // Delete employee
  async deleteEmployee(id) {
    try {
      const res = await fetch(`${SUPABASE_BASE_URL}/employees?id=eq.${id}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) throw new Error(`Failed to delete employee: ${res.statusText}`);
      return { success: true };
    } catch (err) {
      console.error('deleteEmployee error:', err);
      return { success: false, error: err.message };
    }
  },

  // ---------------------------------------------------------------------------
  // 3. PERMISSIONS RESOLVER
  // ---------------------------------------------------------------------------

  // Resolves the list of allowed section IDs for a given role key
  async getAllowedSectionsForRole(roleKey) {
    if (!roleKey) return ['overview'];
    const normalized = roleKey.toLowerCase().replace(/[\s_-]+/g, '');
    
    // Superadmin always has unrestricted access to all 14 sections
    if (normalized.includes('super')) {
      return AVAILABLE_SECTIONS.map(s => s.id);
    }

    try {
      const res = await fetch(`${SUPABASE_BASE_URL}/roles?key=eq.${encodeURIComponent(roleKey)}&select=sections&limit=1`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]?.sections) {
          return data[0].sections.split(';').map(s => s.trim()).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch role sections from DB, falling back to defaults:', e);
    }

    // Default fallback
    if (normalized.includes('admin')) {
      return ['overview', 'owners', 'buildings', 'search', 'transactions', 'workflows', 'leads', 'sources', 'listing', 'voice', 'agent', 'settings'];
    }
    return ['overview', 'owners', 'buildings', 'search', 'transactions', 'listing', 'voice', 'settings'];
  }
};
