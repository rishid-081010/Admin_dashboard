import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Clock, Database, ShieldCheck, Sparkles, User } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NewListing from './components/NewListing';
import ListingDetail from './components/ListingDetail';
import LeadIngestionStudio from './components/LeadIngestionStudio';
import OwnerDirectory from './components/OwnerDirectory';
import OverviewDashboard from './components/OverviewDashboard';
import Buildings from './components/Buildings';
import OmniSearch from './components/OmniSearch';
import WorkflowsDirectory from './components/WorkflowsDirectory';
import SourcesDirectory from './components/SourcesDirectory';
import MyActivity from './components/MyActivity';
import VoiceAgent from './components/VoiceAgent';
import AIAgent from './components/AIAgent';
import AccountSettings from './components/AccountSettings';
import RolesManagement from './components/RolesManagement';
import Login from './components/Login';
import { authService } from './utils/authService';

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

function getTabFromUrl() {
  if (typeof window === 'undefined') return 'overview';
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = (window.location.hash || '').toLowerCase().replace(/^#\/?/, '').split('?')[0];
  
  const target = hash || path.split('/').pop() || '';
  
  if (target === 'myactivity' || target === 'activity') return 'activity';
  if (target === 'datalibrary' || target === 'sources') return 'sources';
  if (target === 'datacleaning' || target === 'leads') return 'leads';
  if (target === 'voiceagent' || target === 'voice') return 'voice';
  if (target === 'agent' || target === 'ai-agent') return 'agent';
  if (target === 'owners') return 'owners';
  if (target === 'buildings') return 'buildings';
  if (target === 'search') return 'search';
  if (target === 'team') return 'team';
  if (target === 'listing') return 'listing';
  if (target === 'roles' || target === 'role') return 'roles';
  if (target === 'settings') return 'settings';
  if (target === 'workflows' || target === 'workflow') return 'workflows';
  if (target === 'new-listing' || target === 'new') return 'new';
  if (target === 'listing-detail' || target === 'detail') return 'detail';
  return 'overview';
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
  const [activeTab, setActiveTabState] = useState(() => getTabFromUrl());
  const [selectedListingId, setSelectedListingId] = useState(() => {
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
      const tabFromUrl = getTabFromUrl();
      setActiveTabState(tabFromUrl);
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
    const currentTab = getTabFromUrl();
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
      window.history.replaceState({ tab: currentTab }, '', `${basePath}#${currentTab}`);
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
    setActiveTab('detail');
  };

  const handleSelectListing = (listing) => {
    try {
      localStorage.setItem('asquared_selected_listing_id', listing.id);
    } catch (e) {}
    setSelectedListingId(listing.id);
    setActiveTab('detail');
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

            {activeTab === 'detail' && (
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
            <OmniSearch 
              isModal={true} 
              onClose={() => setIsOmniSearchModalOpen(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
