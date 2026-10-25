// Production Build: v2.1.3-rental-form-agent-name-20261025-172000
import React, { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { Search, Clock, Database, ShieldCheck, Sparkles, User, Loader2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import OverviewDashboard from './components/OverviewDashboard';
import Login from './components/Login';
import { authService } from './utils/authService';

// Lazy-loaded routes for sub-400kB initial bundle and instant page startup
const Dashboard = lazy(() => import('./components/Dashboard'));
const NewListing = lazy(() => import('./components/NewListing'));
const ListingDetail = lazy(() => import('./components/ListingDetail'));
const LeadIngestionStudio = lazy(() => import('./components/LeadIngestionStudio'));
const OwnerDirectory = lazy(() => import('./components/OwnerDirectory'));
const Buildings = lazy(() => import('./components/Buildings'));
const OmniSearch = lazy(() => import('./components/OmniSearch'));
const WorkflowsDirectory = lazy(() => import('./components/WorkflowsDirectory'));
const SourcesDirectory = lazy(() => import('./components/SourcesDirectory'));
const MyActivity = lazy(() => import('./components/MyActivity'));
const VoiceAgent = lazy(() => import('./components/VoiceAgent'));
const AIAgent = lazy(() => import('./components/AIAgent'));
const AccountSettings = lazy(() => import('./components/AccountSettings'));
const RolesManagement = lazy(() => import('./components/RolesManagement'));

function TabLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[360px] w-full p-8 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-4 shadow-xl shadow-blue-500/10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
      <div className="h-3.5 w-36 bg-white/10 rounded-full animate-pulse mb-2.5" />
      <div className="h-2.5 w-24 bg-white/5 rounded-full animate-pulse" />
    </div>
  );
}

const ROUTE_MAP = {
  overview: '/dashboard/overview',
  owners: '/dashboard/owners',
  activity: '/dashboard/myactivity',
  search: '/dashboard/search',
  team: '/dashboard/team',
  leads: '/dashboard/datacleaning',
  listing: '/dashboard/listing',
  voice: '/dashboard/voiceagent',
  agent: '/dashboard/agent',
  buildings: '/dashboard/buildings',
  sources: '/dashboard/datalibrary',
  roles: '/dashboard/roles',
  settings: '/dashboard/settings',
  workflows: '/dashboard/workflows',
  new: '/dashboard/new-listing',
  detail: '/dashboard/listing-detail'
};

function getRouteInfo() {
  if (typeof window === 'undefined') return { tab: 'overview', id: null };
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash || '';
  const [hashPath, hashQuery] = hash.replace(/^#\/?/, '').split('?');
  const searchParams = new URLSearchParams(hashQuery || window.location.search || '');
  const listingId = searchParams.get('id') || searchParams.get('listing_id');

  const target = (hashPath || path.split('/').pop() || '').toLowerCase();
  
  if (target === 'myactivity' || target === 'activity') return { tab: 'activity', id: listingId };
  if (target === 'datalibrary' || target === 'sources') return { tab: 'sources', id: listingId };
  if (target === 'datacleaning' || target === 'leads') return { tab: 'leads', id: listingId };
  if (target === 'voiceagent' || target === 'voice') return { tab: 'voice', id: listingId };
  if (target === 'agent' || target === 'ai-agent') return { tab: 'agent', id: listingId };
  if (target === 'owners') return { tab: 'owners', id: listingId };
  if (target === 'buildings') return { tab: 'buildings', id: listingId };
  if (target === 'search') return { tab: 'search', id: listingId };
  if (target === 'team') return { tab: 'team', id: listingId };
  if (target === 'listing') return { tab: 'listing', id: listingId };
  if (target === 'roles' || target === 'role') return { tab: 'roles', id: listingId };
  if (target === 'settings') return { tab: 'settings', id: listingId };
  if (target === 'workflows' || target === 'workflow') return { tab: 'workflows', id: listingId };
  if (target === 'new-listing' || target === 'new') return { tab: 'new', id: listingId };
  if (target === 'listing-detail' || target === 'detail') return { tab: 'detail', id: listingId };
  return { tab: 'overview', id: listingId };
}

function getTabFromUrl() {
  return getRouteInfo().tab;
}

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Tab view render error caught by TabErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10 text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">View Encountered an Error</h2>
          <p className="text-xs text-slate-400 max-w-md mb-5 font-mono bg-black/30 p-3 rounded-xl border border-white/5">
            {this.state.error?.message || "An unexpected error occurred while rendering this subtab."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="px-5 py-2.5 bg-[#183153] hover:bg-[#224470] border border-white/20 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
          >
            Return to Overview
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const initialRoute = getRouteInfo();
  const [activeTab, setActiveTabState] = useState(() => initialRoute.tab);
  const [selectedListingId, setSelectedListingId] = useState(() => {
    if (initialRoute.id) return initialRoute.id;
    try {
      return localStorage.getItem('asquared_selected_listing_id') || '62b2e8ce-7bcf-4c2a-875a-a8dd10ac1d96';
    } catch (e) {
      return '62b2e8ce-7bcf-4c2a-875a-a8dd10ac1d96';
    }
  });
  const [isOmniSearchModalOpen, setIsOmniSearchModalOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const setActiveTab = (newTab, pushState = true) => {
    setActiveTabState(newTab);
    if (pushState && typeof window !== 'undefined') {
      const isDashboardBase = window.location.pathname.startsWith('/public/dashboard')
        ? '/public/dashboard/'
        : window.location.pathname.startsWith('/dashboard')
        ? '/dashboard/'
        : '/';
      const finalUrl = `${isDashboardBase}#${newTab}`;
      window.history.pushState({ tab: newTab }, '', finalUrl);
    }
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const currentRoute = getRouteInfo();
      setActiveTabState(currentRoute.tab);
      if (currentRoute.id) {
        setSelectedListingId(currentRoute.id);
        try {
          localStorage.setItem('asquared_selected_listing_id', currentRoute.id);
        } catch (e) {}
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Normalize legacy pathname route (e.g. /dashboard/overview) to resilient hash URL to prevent 404 on refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentRoute = getRouteInfo();
    const currentTab = currentRoute.tab;
    const isPathRoute = window.location.pathname.includes('/overview') ||
                        window.location.pathname.includes('/workflows') ||
                        window.location.pathname.includes('/owners') ||
                        window.location.pathname.includes('/buildings') ||
                        window.location.pathname.includes('/myactivity') ||
                        window.location.pathname.includes('/search') ||
                        window.location.pathname.includes('/voiceagent') ||
                        window.location.pathname.includes('/roles') ||
                        window.location.pathname.includes('/settings');
    if (isPathRoute) {
      const basePath = window.location.pathname.startsWith('/public/dashboard')
        ? '/public/dashboard/'
        : '/dashboard/';
      const hashSuffix = currentRoute.id ? `${currentTab}?id=${currentRoute.id}` : currentTab;
      window.history.replaceState({ tab: currentTab }, '', `${basePath}#${hashSuffix}`);
    }
  }, []);

  // Global Keyboard Shortcut: Ctrl + F6 or Cmd + F6 (and Ctrl + K / Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'F6' || e.code === 'F6' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOmniSearchModalOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOmniSearchModalOpen) {
        setIsOmniSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOmniSearchModalOpen]);

  const handleListingCreated = (newListing) => {
    try {
      localStorage.setItem('asquared_selected_listing_id', newListing.id);
    } catch (e) {}
    setSelectedListingId(newListing.id);
    setActiveTab(`detail?id=${newListing.id}`);
  };

  const handleSelectListing = (listing) => {
    try {
      localStorage.setItem('asquared_selected_listing_id', listing.id);
    } catch (e) {}
    setSelectedListingId(listing.id);
    setActiveTab(`detail?id=${listing.id}`);
  };

  // If user is not authenticated, display luxury login screen
  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div 
      className="h-screen w-screen text-white p-2 sm:p-2.5 flex gap-2 sm:gap-2.5 box-border font-sans antialiased overflow-hidden selection:bg-blue-500/30 selection:text-white"
      style={{
        backgroundColor: '#001428',
        backgroundImage: `radial-gradient(circle at 10% 30%, rgba(0, 162, 255, 0.12), transparent 45%), radial-gradient(circle at 90% 20%, rgba(0, 102, 255, 0.08), transparent 50%), radial-gradient(circle at 50% 90%, rgba(15, 23, 42, 0.6), transparent 60%)`
      }}
    >
      {/* Sleek Left Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Main Glassmorphic Container */}
        <main className={`flex-1 bg-[#021024]/60 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl p-4 lg:p-6 relative flex flex-col min-h-0 ${
          activeTab === 'overview' ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'
        }`}>
          <TabErrorBoundary key={activeTab} onReset={() => setActiveTab('overview')}>
            <Suspense fallback={<TabLoadingSkeleton />}>
              {/* Tab Views */}
              {activeTab === 'overview' && (
                <OverviewDashboard onNavigate={(tab) => setActiveTab(tab)} />
              )}

              {activeTab === 'owners' && (
                <OwnerDirectory 
                  globalAgentId="6"
                  globalAgentName="Melanie Simsiman" 
                  agentsList={[]}
                />
              )}

              {activeTab === 'buildings' && <Buildings />}

              {activeTab === 'search' && <OmniSearch />}

              {activeTab === 'workflows' && <WorkflowsDirectory />}

              {activeTab === 'sources' && <SourcesDirectory />}

              {activeTab === 'activity' && <MyActivity currentUser={currentUser} />}

              {activeTab === 'voice' && <VoiceAgent />}

              {activeTab === 'agent' && <AIAgent setActiveTab={setActiveTab} />}

              {activeTab === 'leads' && (
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><LeadIngestionStudio /></div>
              )}

              {activeTab === 'listing' && (
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><Dashboard
                  onNewListingClick={() => setActiveTab('new')}
                  onSelectListing={handleSelectListing}
                /></div>
              )}

              {activeTab === 'new' && (
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><NewListing 
                  onListingCreated={handleListingCreated} 
                  onBack={() => setActiveTab('listing')}
                /></div>
              )}

              {(activeTab === 'detail' || activeTab.startsWith('detail')) && (
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar">{selectedListingId ? (
                  <ListingDetail
                    listingId={selectedListingId}
                    onBack={() => {
                      setActiveTab('listing');
                      setSelectedListingId(null);
                    }}
                  />
                ) : (
                  <Dashboard
                    onNewListingClick={() => setActiveTab('new')}
                    onSelectListing={handleSelectListing}
                  />
                )}</div>
              )}

              {activeTab === 'roles' && (
                <RolesManagement currentUser={currentUser} />
              )}

              {activeTab === 'settings' && (
                <AccountSettings 
                  currentUser={currentUser} 
                  onLogout={handleLogout}
                  onUpdateUser={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))}
                />
              )}
            </Suspense>
          </TabErrorBoundary>
        </main>
      </div>

      {/* Global Omni Search Modal (Summoned via Ctrl + F6 or Cmd + F6 or Top Bar) */}
      {isOmniSearchModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setIsOmniSearchModalOpen(false)}
        >
          <div 
            className="w-full max-w-5xl h-[88vh] bg-[#001428] border border-blue-500/40 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden p-4 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense fallback={<TabLoadingSkeleton />}>
              <OmniSearch 
                isModal={true} 
                onClose={() => setIsOmniSearchModalOpen(false)} 
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
