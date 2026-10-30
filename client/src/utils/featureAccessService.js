// Feature Access & Visibility Service for Role-Based Access Control (RBAC)
// Manages granular feature visibility across SuperAdmin, Admin, and Agent roles.
// Synced with Supabase (asq_dashboard_state) and cached in localStorage.

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

export const FEATURE_STORAGE_KEY = 'asq_dashboard_feature_access';
export const EXPORT_STORAGE_KEY = 'asq_dashboard_export_access';
export const FEATURE_ACCESS_EVENT = 'asq-feature-access-updated';
export const EXPORT_ACCESS_EVENT = 'asq-export-access-updated';

export function normalizeRole(role) {
  const r = (role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (r.includes('super')) return 'superadmin';
  if (r.includes('admin')) return 'admin';
  return 'agent';
}

// Complete Catalog of Dashboard Sections and Features
export const FEATURE_SECTIONS = [
  {
    id: 'portfolio',
    title: 'Portfolio',
    description: 'Core property, owner directory, and market search datasets.',
    features: [
      {
        key: 'overview',
        label: 'Overview Dashboard',
        description: 'Market aggregates, transactional trends, and performance KPIs.',
        iconName: 'LayoutDashboard',
        tab: 'overview'
      },
      {
        key: 'owners',
        label: 'Owners Data',
        description: '3,056,970+ verified Dubai property owner records and contacts.',
        iconName: 'Users',
        tab: 'owners'
      },
      {
        key: 'buildings',
        label: 'Buildings & Communities',
        description: '69,719+ buildings directory, developer info, and units.',
        iconName: 'Building2',
        tab: 'buildings'
      },
      {
        key: 'search',
        label: 'Search Engine',
        description: 'OmniSearch multi-index search across owners, buildings, and listings.',
        iconName: 'Search',
        tab: 'search'
      },
      {
        key: 'transactions',
        label: 'Transactions (DLD)',
        description: 'Direct link to the official DLD historical transactions dashboard.',
        iconName: 'ExternalLink',
        tab: 'transactions',
        isExternal: true
      }
    ]
  },
  {
    id: 'operations',
    title: 'Operations',
    description: 'Listing pipelines, automations, telemetry, and communications.',
    features: [
      {
        key: 'workflows',
        label: 'Workflows (n8n)',
        description: 'Automated data ingestion pipelines, sync schedules, and webhook runs.',
        iconName: 'GitBranch',
        tab: 'workflows'
      },
      {
        key: 'leads',
        label: 'Data Cleaning Studio',
        description: 'File upload cleaner, duplicate resolution, and raw data library.',
        iconName: 'Sparkles',
        tab: 'leads',
        aliases: ['sources']
      },
      {
        key: 'listing',
        label: 'Listing Studio',
        description: 'AI Title Deed / Emirates ID OCR document extraction and property creation.',
        iconName: 'Home',
        tab: 'listing',
        aliases: ['new', 'detail']
      },
      {
        key: 'voice',
        label: 'Voice Agent Centre',
        description: 'AI outbound call campaigns, Vapi assistant telemetry, and recordings.',
        iconName: 'PhoneCall',
        tab: 'voice'
      },
      {
        key: 'agent',
        label: 'AI Agent Copilot',
        description: 'Interactive natural-language market intelligence assistant.',
        iconName: 'Bot',
        tab: 'agent'
      },
      {
        key: 'activity',
        label: 'My Activity & Audits',
        description: 'Agent audit log, listing status history, and system changes.',
        iconName: 'Clock',
        tab: 'activity'
      }
    ]
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'System roles, account credentials, and system settings.',
    features: [
      {
        key: 'roles',
        label: 'Roles & Permissions',
        description: 'User account creation, passwords, and RBAC feature visibility.',
        iconName: 'ShieldAlert',
        tab: 'roles'
      },
      {
        key: 'settings',
        label: 'Account & Settings',
        description: 'Personal profile, display preferences, and session management.',
        iconName: 'Settings',
        tab: 'settings'
      }
    ]
  }
];

// Flat list of all feature keys
export const ALL_FEATURE_KEYS = FEATURE_SECTIONS.flatMap(s => s.features.map(f => f.key));

// Factory Default Configurations
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
    settings: true
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
    settings: true
  }
};

// Factory Default Export Guardrails
export const DEFAULT_EXPORT_ACCESS = {
  admin: {
    allow_owners: true,
    allow_buildings: true,
    allow_listings: true,
    max_rows: 50000
  },
  agent: {
    allow_owners: false,
    allow_buildings: false,
    allow_listings: true,
    max_rows: 500
  }
};

// Preset Profiles for 1-Click Setup
export const FEATURE_PRESETS = {
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
      settings: true
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
      settings: true
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
      settings: true
    }
  }
};

export const featureAccessService = {
  // Get active cached feature access mapping
  getFeatureAccess() {
    try {
      const stored = localStorage.getItem(FEATURE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.admin || parsed.agent)) {
          return {
            admin: { ...DEFAULT_FEATURE_ACCESS.admin, ...(parsed.admin || {}) },
            agent: { ...DEFAULT_FEATURE_ACCESS.agent, ...(parsed.agent || {}) }
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse local feature access cache, using defaults', e);
    }
    return DEFAULT_FEATURE_ACCESS;
  },

  // Asynchronously fetch latest config from Supabase and refresh cache
  async fetchFromCloud() {
    try {
      const url = `${SUPABASE_BASE_URL}/asq_dashboard_state?key=eq.dashboard_feature_access&select=key,value,updated_at&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!res.ok) {
        throw new Error(`Cloud fetch returned status ${res.status}`);
      }

      const rows = await res.json();
      if (rows && rows.length > 0 && rows[0].value) {
        const cloudConfig = rows[0].value;
        const merged = {
          admin: { ...DEFAULT_FEATURE_ACCESS.admin, ...(cloudConfig.admin || {}) },
          agent: { ...DEFAULT_FEATURE_ACCESS.agent, ...(cloudConfig.agent || {}) }
        };
        localStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent(FEATURE_ACCESS_EVENT, { detail: merged }));
        return { success: true, config: merged, updatedAt: rows[0].updated_at };
      }
    } catch (err) {
      console.warn('Feature access cloud fetch failed, continuing with cached/default values:', err);
    }
    return { success: false, config: this.getFeatureAccess() };
  },

  // Save updated feature access to both Supabase and localStorage
  async saveFeatureAccess(newConfig, updatedBy = 'SuperAdmin') {
    const sanitized = {
      admin: { ...DEFAULT_FEATURE_ACCESS.admin, ...(newConfig.admin || {}) },
      agent: { ...DEFAULT_FEATURE_ACCESS.agent, ...(newConfig.agent || {}) }
    };

    // Update localStorage immediately
    localStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(FEATURE_ACCESS_EVENT, { detail: sanitized }));

    // Persist to Supabase asq_dashboard_state
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        key: 'dashboard_feature_access',
        value: sanitized,
        updated_at: nowIso
      };

      const url = `${SUPABASE_BASE_URL}/asq_dashboard_state`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Cloud persistence error ${res.status}: ${errorText}`);
      }

      return { success: true, config: sanitized, updatedAt: nowIso };
    } catch (err) {
      console.error('Error saving feature access to Supabase:', err);
      // Even if cloud write had an issue, local changes are active
      return { success: false, error: err.message, config: sanitized };
    }
  },

  // Check if a specific feature key is allowed for a given user role
  isFeatureAllowed(userRole, featureKey) {
    const role = normalizeRole(userRole);
    // SuperAdmin possesses permanent wildcard access to all features
    if (role === 'superadmin') return true;

    const accessMap = this.getFeatureAccess();
    const roleConfig = accessMap[role] || DEFAULT_FEATURE_ACCESS[role] || DEFAULT_FEATURE_ACCESS.agent;

    // Direct check
    if (featureKey in roleConfig) {
      return Boolean(roleConfig[featureKey]);
    }

    // Fall back to factory default for this role if key known, otherwise true
    if (DEFAULT_FEATURE_ACCESS[role] && featureKey in DEFAULT_FEATURE_ACCESS[role]) {
      return Boolean(DEFAULT_FEATURE_ACCESS[role][featureKey]);
    }

    return true;
  },

  // Check if an activeTab or route name is allowed (handles aliases like 'sources' -> 'leads', 'new'/'detail' -> 'listing')
  isTabAllowed(userRole, tabName) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return true;

    // Strip hash, query params, and leading/trailing slashes
    const raw = (tabName || '').toLowerCase().replace(/^#+/, '').replace(/^\/+/, '').split('?')[0].split('/')[0].trim();

    // Map sub-tabs & aliases to parent feature key
    if (raw === 'new' || raw === 'detail' || raw === 'new-listing' || raw === 'listing-detail' || raw === 'dashboard') {
      return this.isFeatureAllowed(role, 'listing');
    }
    if (raw === 'sources' || raw === 'datalibrary' || raw === 'datacleaning') {
      return this.isFeatureAllowed(role, 'leads');
    }
    if (raw === 'myactivity') {
      return this.isFeatureAllowed(role, 'activity');
    }
    if (raw === 'voiceagent') {
      return this.isFeatureAllowed(role, 'voice');
    }
    if (raw === 'ai-agent') {
      return this.isFeatureAllowed(role, 'agent');
    }
    if (raw === 'role') {
      return this.isFeatureAllowed(role, 'roles');
    }

    return this.isFeatureAllowed(role, raw);
  },

  // Check if at least one feature in a section is visible (if not, whole section header is hidden)
  isSectionVisible(userRole, sectionId) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return true;

    const section = FEATURE_SECTIONS.find(s => s.id === sectionId);
    if (!section) return true;

    // Check if at least one feature in this section is allowed
    return section.features.some(feature => this.isFeatureAllowed(role, feature.key));
  },

  // Get the first accessible tab for a role (used for silent fallback redirect)
  getFirstAccessibleTab(userRole) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return 'overview';

    for (const section of FEATURE_SECTIONS) {
      for (const feature of section.features) {
        if (!feature.isExternal && this.isFeatureAllowed(role, feature.key)) {
          return feature.tab;
        }
      }
    }
    return 'overview';
  },

  // ─── EXPORT GUARDRAILS (Anti-Data Theft) ──────────────────────────────────
  getExportAccess() {
    try {
      const stored = localStorage.getItem(EXPORT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.admin || parsed.agent)) {
          return {
            admin: { ...DEFAULT_EXPORT_ACCESS.admin, ...(parsed.admin || {}) },
            agent: { ...DEFAULT_EXPORT_ACCESS.agent, ...(parsed.agent || {}) }
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
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0 && rows[0].value) {
          const cloudConfig = rows[0].value;
          const merged = {
            admin: { ...DEFAULT_EXPORT_ACCESS.admin, ...(cloudConfig.admin || {}) },
            agent: { ...DEFAULT_EXPORT_ACCESS.agent, ...(cloudConfig.agent || {}) }
          };
          localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent(EXPORT_ACCESS_EVENT, { detail: merged }));
          return { success: true, config: merged, updatedAt: rows[0].updated_at };
        }
      }
    } catch (err) {
      console.warn('Export access cloud fetch failed, continuing with cache/default:', err);
    }
    return { success: false, config: this.getExportAccess() };
  },

  async saveExportAccess(newExportConfig, updatedBy = 'SuperAdmin') {
    const sanitized = {
      admin: { ...DEFAULT_EXPORT_ACCESS.admin, ...(newExportConfig.admin || {}) },
      agent: { ...DEFAULT_EXPORT_ACCESS.agent, ...(newExportConfig.agent || {}) }
    };

    localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(EXPORT_ACCESS_EVENT, { detail: sanitized }));

    try {
      const nowIso = new Date().toISOString();
      const payload = {
        key: 'dashboard_export_access',
        value: sanitized,
        updated_at: nowIso
      };

      const url = `${SUPABASE_BASE_URL}/asq_dashboard_state`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Cloud persistence error ${res.status}: ${errorText}`);
      }

      return { success: true, config: sanitized, updatedAt: nowIso };
    } catch (err) {
      console.error('Error saving export access to Supabase:', err);
      return { success: false, error: err.message, config: sanitized };
    }
  },

  canExport(userRole, resourceType) {
    const role = normalizeRole(userRole);
    // SuperAdmin always possesses unrestricted export capability
    if (role === 'superadmin') return true;

    const accessMap = this.getExportAccess();
    const roleConfig = accessMap[role] || DEFAULT_EXPORT_ACCESS[role] || DEFAULT_EXPORT_ACCESS.agent;

    const key = `allow_${resourceType}`;
    if (key in roleConfig) {
      return Boolean(roleConfig[key]);
    }
    return true;
  },

  getMaxExportRows(userRole, resourceType) {
    const role = normalizeRole(userRole);
    if (role === 'superadmin') return 1000000;

    const accessMap = this.getExportAccess();
    const roleConfig = accessMap[role] || DEFAULT_EXPORT_ACCESS[role] || DEFAULT_EXPORT_ACCESS.agent;

    return Number(roleConfig.max_rows) || 500;
  }
};
