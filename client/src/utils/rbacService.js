// RBAC Feature & Export Visibility Service
// Restored directly from production Hostinger deployment (Nov 19, 2026)

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

export const RBAC_STORAGE_KEY = 'asq_feature_access_v1';
export const EXPORT_STORAGE_KEY = 'asq_export_access_v1';
export const FEATURE_ACCESS_EVENT = 'asq:feature-access-updated';
export const EXPORT_ACCESS_EVENT = 'asq:export-access-updated';

export const NAVIGATION_SECTIONS = [
  {
    id: 'portfolio',
    title: 'Portfolio',
    description: 'Core property, owner directory, and market search datasets.',
    features: [
      { key: 'overview', label: 'Overview Dashboard', description: 'Market aggregates, transactional trends, and performance KPIs.', iconName: 'LayoutDashboard', tab: 'overview' },
      { key: 'owners', label: 'Owners Data', description: 'Verified Dubai property owner records and contacts.', iconName: 'Users', tab: 'owners' },
      { key: 'buildings', label: 'Buildings & Communities', description: 'Buildings directory, developer info, and units.', iconName: 'Building2', tab: 'buildings' },
      { key: 'search', label: 'Search Engine', description: 'OmniSearch multi-index search across owners, buildings, and listings.', iconName: 'Search', tab: 'search' },
      { key: 'transactions', label: 'Transactions (DLD)', description: 'Direct link to the official DLD historical transactions dashboard.', iconName: 'ExternalLink', tab: 'transactions', isExternal: true },
    ]
  },
  {
    id: 'operations',
    title: 'Operations',
    description: 'Listing management, automations, and advisory communications.',
    features: [
      { key: 'workflows', label: 'Workflows', description: 'Automated data synchronization schedules and workflow runs.', iconName: 'GitBranch', tab: 'workflows' },
      { key: 'leads', label: 'Data Cleaning Studio', description: 'File upload cleaner, duplicate resolution, and raw data library.', iconName: 'Sparkles', tab: 'leads', aliases: ['sources'] },
      { key: 'listing', label: 'Listing Studio', description: 'Title Deed and Emirates ID document extraction and property creation.', iconName: 'Home', tab: 'listing', aliases: ['new', 'detail'] },
      { key: 'voice', label: 'Voice Agent Centre', description: 'AI outbound call campaigns, call analytics, and call recordings.', iconName: 'PhoneCall', tab: 'voice' },
      { key: 'agent', label: 'AI Agent Copilot', description: 'Interactive natural-language market intelligence assistant.', iconName: 'Bot', tab: 'agent' },
      { key: 'activity', label: 'My Activity & Audits', description: 'Agent audit log, listing status history, and system changes.', iconName: 'Clock', tab: 'activity' },
    ]
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'System roles, account credentials, and system settings.',
    features: [
      { key: 'roles', label: 'Roles & Permissions', description: 'User account creation, passwords, and RBAC feature visibility.', iconName: 'ShieldAlert', tab: 'roles' },
      { key: 'settings', label: 'Account & Settings', description: 'Personal profile, display preferences, and session management.', iconName: 'Settings', tab: 'settings' },
    ]
  }
];

export const ALL_FEATURE_KEYS = NAVIGATION_SECTIONS.flatMap(s => s.features.map(f => f.key));

export const DEFAULT_FEATURE_ACCESS = {
  admin: {
    overview: true,
    owners: true,
    buildings: true,
    search: true,
    transactions: true,
    workflows: true,
    leads: true,
    listing: true,
    voice: true,
    agent: true,
    activity: true,
    roles: true,
    settings: true,
  },
  agent: {
    overview: true,
    owners: true,
    buildings: true,
    search: true,
    transactions: true,
    workflows: false,
    leads: false,
    listing: true,
    voice: false,
    agent: true,
    activity: true,
    roles: false,
    settings: true,
  }
};

export const DEFAULT_EXPORT_ACCESS = {
  admin: {
    allow_owners: true,
    allow_buildings: true,
    allow_listings: true,
    max_rows: 50000,
  },
  agent: {
    allow_owners: false,
    allow_buildings: false,
    allow_listings: true,
    max_rows: 500,
  }
};

export const PRESETS = {
  portfolio_only: {
    label: 'Portfolio Only',
    description: 'Exposes only Portfolio tabs and Settings; completely hides Operations and Roles.',
    config: {
      overview: true,
      owners: true,
      buildings: true,
      search: true,
      transactions: true,
      workflows: false,
      leads: false,
      listing: false,
      voice: false,
      agent: false,
      activity: false,
      roles: false,
      settings: true,
    }
  },
  standard_agent: {
    label: 'Standard Agent (Recommended)',
    description: 'Full portfolio, Listing Studio, AI Copilot, and Activity. Workflows, Cleaning, Voice, and Roles hidden.',
    config: {
      overview: true,
      owners: true,
      buildings: true,
      search: true,
      transactions: true,
      workflows: false,
      leads: false,
      listing: true,
      voice: false,
      agent: true,
      activity: true,
      roles: false,
      settings: true,
    }
  },
  full_access: {
    label: 'Full Access',
    description: 'Enables every single feature across all sections.',
    config: {
      overview: true,
      owners: true,
      buildings: true,
      search: true,
      transactions: true,
      workflows: true,
      leads: true,
      listing: true,
      voice: true,
      agent: true,
      activity: true,
      roles: true,
      settings: true,
    }
  }
};

function normalizeRole(role) {
  const r = (role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (r.includes('super')) return 'superadmin';
  if (r.includes('admin')) return 'admin';
  return 'agent';
}

export const rbacService = {
  getFeatureAccess() {
    try {
      const cached = localStorage.getItem(RBAC_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.admin || parsed.agent)) {
          return {
            admin: { ...DEFAULT_FEATURE_ACCESS.admin, ...(parsed.admin || {}) },
            agent: { ...DEFAULT_FEATURE_ACCESS.agent, ...(parsed.agent || {}) },
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse local feature access cache, using defaults', e);
    }
    return DEFAULT_FEATURE_ACCESS;
  },

  async fetchFromCloud() {
    try {
      const url = `${SUPABASE_BASE_URL}/asq_dashboard_state?key=eq.dashboard_feature_access&select=key,value,updated_at&limit=1`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) throw new Error(`Cloud fetch returned status ${res.status}`);
      const data = await res.json();
      if (data && data.length > 0 && data[0].value) {
        const val = data[0].value;
        const merged = {
          admin: { ...DEFAULT_FEATURE_ACCESS.admin, ...(val.admin || {}) },
          agent: { ...DEFAULT_FEATURE_ACCESS.agent, ...(val.agent || {}) },
        };
        localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent(FEATURE_ACCESS_EVENT, { detail: merged }));
        return { success: true, config: merged, updatedAt: data[0].updated_at };
      }
    } catch (e) {
      console.warn('Feature access cloud fetch failed, continuing with cached/default values:', e);
    }
    return { success: false, config: this.getFeatureAccess() };
  },

  async saveFeatureAccess(newConfig, savedBy = 'SuperAdmin') {
    const payload = {
      admin: { ...DEFAULT_FEATURE_ACCESS.admin, ...(newConfig.admin || {}) },
      agent: { ...DEFAULT_FEATURE_ACCESS.agent, ...(newConfig.agent || {}) },
    };
    localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(FEATURE_ACCESS_EVENT, { detail: payload }));
    try {
      const nowIso = new Date().toISOString();
      const body = {
        key: 'dashboard_feature_access',
        value: payload,
        updated_at: nowIso
      };
      const url = `${SUPABASE_BASE_URL}/asq_dashboard_state`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Cloud persistence error ${res.status}: ${txt}`);
      }
      return { success: true, config: payload, updatedAt: nowIso };
    } catch (err) {
      console.error('Error saving feature access to Supabase:', err);
      return { success: false, error: err.message, config: payload };
    }
  },

  isFeatureAllowed(userRole, featureKey) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return true;
    const access = this.getFeatureAccess()[role] || DEFAULT_FEATURE_ACCESS[role] || DEFAULT_FEATURE_ACCESS.agent;
    if (featureKey in access) return !!access[featureKey];
    if (DEFAULT_FEATURE_ACCESS[role] && featureKey in DEFAULT_FEATURE_ACCESS[role]) {
      return !!DEFAULT_FEATURE_ACCESS[role][featureKey];
    }
    return true;
  },

  isTabAllowed(userRole, tabName) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return true;
    const cleanTab = (tabName || '').toLowerCase().replace(/^#+/, '').replace(/^\/+/, '').split('?')[0].split('/')[0].trim();
    if (cleanTab === 'new' || cleanTab === 'detail' || cleanTab === 'new-listing' || cleanTab === 'listing-detail' || cleanTab === 'dashboard') {
      return this.isFeatureAllowed(role, 'listing');
    }
    if (cleanTab === 'sources' || cleanTab === 'datalibrary' || cleanTab === 'datacleaning') {
      return this.isFeatureAllowed(role, 'leads');
    }
    if (cleanTab === 'myactivity') return this.isFeatureAllowed(role, 'activity');
    if (cleanTab === 'voiceagent') return this.isFeatureAllowed(role, 'voice');
    if (cleanTab === 'ai-agent') return this.isFeatureAllowed(role, 'agent');
    if (cleanTab === 'role') return this.isFeatureAllowed(role, 'roles');
    return this.isFeatureAllowed(role, cleanTab);
  },

  isSectionVisible(userRole, sectionId) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return true;
    const section = NAVIGATION_SECTIONS.find(s => s.id === sectionId);
    if (!section) return true;
    return section.features.some(f => this.isFeatureAllowed(role, f.key));
  },

  getFirstAccessibleTab(userRole) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return 'overview';
    for (const section of NAVIGATION_SECTIONS) {
      for (const feat of section.features) {
        if (!feat.isExternal && this.isFeatureAllowed(role, feat.key)) {
          return feat.tab;
        }
      }
    }
    return 'overview';
  },

  getExportAccess() {
    try {
      const cached = localStorage.getItem(EXPORT_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.admin || parsed.agent)) {
          return {
            admin: { ...DEFAULT_EXPORT_ACCESS.admin, ...(parsed.admin || {}) },
            agent: { ...DEFAULT_EXPORT_ACCESS.agent, ...(parsed.agent || {}) },
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse local export access cache, using defaults', e);
    }
    return DEFAULT_EXPORT_ACCESS;
  },

  async fetchExportAccessFromCloud() {
    try {
      const url = `${SUPABASE_BASE_URL}/asq_dashboard_state?key=eq.dashboard_export_access&select=key,value,updated_at&limit=1`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0 && data[0].value) {
          const val = data[0].value;
          const merged = {
            admin: { ...DEFAULT_EXPORT_ACCESS.admin, ...(val.admin || {}) },
            agent: { ...DEFAULT_EXPORT_ACCESS.agent, ...(val.agent || {}) },
          };
          localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent(EXPORT_ACCESS_EVENT, { detail: merged }));
          return { success: true, config: merged, updatedAt: data[0].updated_at };
        }
      }
    } catch (e) {
      console.warn('Export access cloud fetch failed, continuing with cache/default:', e);
    }
    return { success: false, config: this.getExportAccess() };
  },

  async saveExportAccess(newConfig, savedBy = 'SuperAdmin') {
    const payload = {
      admin: { ...DEFAULT_EXPORT_ACCESS.admin, ...(newConfig.admin || {}) },
      agent: { ...DEFAULT_EXPORT_ACCESS.agent, ...(newConfig.agent || {}) },
    };
    localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(EXPORT_ACCESS_EVENT, { detail: payload }));
    try {
      const nowIso = new Date().toISOString();
      const body = {
        key: 'dashboard_export_access',
        value: payload,
        updated_at: nowIso
      };
      const url = `${SUPABASE_BASE_URL}/asq_dashboard_state`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Cloud persistence error ${res.status}: ${txt}`);
      }
      return { success: true, config: payload, updatedAt: nowIso };
    } catch (err) {
      console.error('Error saving export access to Supabase:', err);
      return { success: false, error: err.message, config: payload };
    }
  },

  canExport(userRole, exportType) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return true;
    const access = this.getExportAccess()[role] || DEFAULT_EXPORT_ACCESS[role] || DEFAULT_EXPORT_ACCESS.agent;
    const key = `allow_${exportType}`;
    if (key in access) return !!access[key];
    return true;
  },

  getMaxExportRows(userRole, exportType) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return 1000000;
    const access = this.getExportAccess()[role] || DEFAULT_EXPORT_ACCESS[role] || DEFAULT_EXPORT_ACCESS.agent;
    return Number(access.max_rows) || 500;
  }
};
