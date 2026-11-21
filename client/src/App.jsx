import React, { useState, useEffect, lazy, Suspense, Component } from 'react';
import axios from 'axios';
import { Loader2, ShieldAlert } from 'lucide-react';
import Sidebar from './components/Sidebar';
import OverviewDashboard from './components/OverviewDashboard';
import Login from './components/Login';
import { authService, AUTH_CHANGE_EVENT } from './utils/authService';
import { rbacService, FEATURE_ACCESS_EVENT } from './utils/rbacService';

// Lazy-loaded routes for optimal chunk loading
const Dashboard = lazy(() => import('./components/Dashboard'));
const NewListing = lazy(() => import('./components/NewListing'));
const ListingDetail = lazy(() => import('./components/ListingDetail'));
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

function getInitialRoute() {
  if (typeof window === 'undefined') return { tab: 'overview', id: null };
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash || '';
  const [hashTab, hashParams] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(hashParams || window.location.search || '');
  const id = params.get('id') || params.get('listing_id');
  const raw = (hashTab || path.split('/').pop() || '').toLowerCase();

  if (raw === 'myactivity' || raw === 'activity') return { tab: 'activity', id };
  if (raw === 'datalibrary' || raw === 'sources') return { tab: 'leads', id, autoOpenLibrary: true };
  if (raw === 'datacleaning' || raw === 'leads') return { tab: 'leads', id };
  if (raw === 'voiceagent' || raw === 'voice') return { tab: 'voice', id };
  if (raw === 'agent' || raw === 'ai-agent') return { tab: 'agent', id };
  if (raw === 'owners') return { tab: 'owners', id };
  if (raw === 'buildings') return { tab: 'buildings', id };
  if (raw === 'search') return { tab: 'search', id };
  if (raw === 'listing') return { tab: 'listing', id };
  if (raw === 'roles' || raw === 'role') return { tab: 'roles', id };
  if (raw === 'settings') return { tab: 'settings', id };
  if (raw === 'workflows' || raw === 'workflow') return { tab: 'workflows', id };
  if (raw === 'new-listing' || raw === 'new') return { tab: 'new', id };
  if (raw === 'listing-detail' || raw === 'detail') return { tab: 'detail', id };
  return { tab: 'overview', id };
}

class TabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Tab render error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10 text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">View Encountered an Error</h2>
          <p className="text-xs text-slate-400 max-w-md mb-5 font-sans tabular-nums bg-black/30 p-3 rounded-xl border border-white/5">
            {this.state.error?.message || 'An unexpected error occurred while rendering this subtab.'}
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
  const [isImpersonating, setIsImpersonating] = useState(() => authService.isImpersonating());
  const initRoute = getInitialRoute();
  const [activeTab, setActiveTabState] = useState(() => initRoute.tab);
  const [selectedListingId, setSelectedListingId] = useState(() => {
    if (initRoute.id) return initRoute.id;
    try {
      return localStorage.getItem('asquared_selected_listing_id') || '62b2e8ce-7bcf-4c2a-875a-a8dd10ac1d96';
    } catch {
      return '62b2e8ce-7bcf-4c2a-875a-a8dd10ac1d96';
    }
  });
  const [omniSearchModalOpen, setOmniSearchModalOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const handleExitPreviewMode = () => {
    const res = authService.stopImpersonation();
    if (res.success) {
      setCurrentUser(res.user);
      setIsImpersonating(false);
      setActiveTab('roles');
    }
  };

  useEffect(() => {
    const syncAuth = () => {
      setCurrentUser(authService.getCurrentUser());
      setIsImpersonating(authService.isImpersonating());
    };
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuth);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, syncAuth);
  }, []);

  // Periodic session revocation check
  useEffect(() => {
    if (!currentUser) return;
    const check = async () => {
      const res = await authService.checkSessionRevocation(currentUser);
      if (res?.isRevoked) setCurrentUser(null);
    };
    check();
    const interval = setInterval(check, 15000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser]);

  const setActiveTab = (tab, pushState = true) => {
    setActiveTabState(tab);
    if (pushState && typeof window !== 'undefined') {
      const prefix = window.location.pathname.startsWith('/public/dashboard')
        ? '/public/dashboard/'
        : window.location.pathname.startsWith('/dashboard')
          ? '/dashboard/'
          : '/';
      window.history.pushState({ tab }, '', `${prefix}#${tab}`);
    }
  };

  useEffect(() => {
    const handlePop = () => {
      const route = getInitialRoute();
      setActiveTabState(route.tab);
      if (route.id) {
        setSelectedListingId(route.id);
        try {
          localStorage.setItem('asquared_selected_listing_id', route.id);
        } catch {}
      }
    };
    window.addEventListener('popstate', handlePop);
    window.addEventListener('hashchange', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('hashchange', handlePop);
    };
  }, []);

  // Enforce RBAC permission checks on tab
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role || 'admin';
    if (!rbacService.isTabAllowed(role, activeTab)) {
      const fallback = rbacService.getFirstAccessibleTab(role);
      setActiveTab(fallback, false);
      if (typeof window !== 'undefined') {
        const prefix = window.location.pathname.startsWith('/public/dashboard')
          ? '/public/dashboard/'
          : window.location.pathname.startsWith('/dashboard')
            ? '/dashboard/'
            : '/';
        window.history.replaceState({ tab: fallback }, '', `${prefix}#${fallback}`);
      }
    }
  }, [activeTab, currentUser]);

  // OmniSearch shortcut (Ctrl+F6 / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'F6' || e.code === 'F6' || e.key === 'k' || e.key === 'K')) {
        const role = currentUser?.role || 'admin';
        if (!rbacService.isFeatureAllowed(role, 'search')) return;
        e.preventDefault();
        setOmniSearchModalOpen(prev => !prev);
      } else if (e.key === 'Escape' && omniSearchModalOpen) {
        setOmniSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [omniSearchModalOpen, currentUser]);

  const handleSelectListing = (listing) => {
    try {
      localStorage.setItem('asquared_selected_listing_id', listing.id);
    } catch {}
    setSelectedListingId(listing.id);
    setActiveTab(`detail?id=${listing.id}`);
  };

  const handleListingCreated = (listing) => {
    try {
      localStorage.setItem('asquared_selected_listing_id', listing.id);
    } catch {}
    setSelectedListingId(listing.id);
    setActiveTab(`detail?id=${listing.id}`);
  };

  if (!currentUser) {
    return <Login onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  const userRole = currentUser?.role || 'admin';
  const isAllowed = (tab) => rbacService.isTabAllowed(userRole, tab);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* SuperAdmin Preview Mode Banner */}
      {isImpersonating && (
        <div className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-xl z-50 shrink-0 select-none animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-black animate-pulse shrink-0" />
            <span className="truncate">
              <strong>SuperAdmin Preview Mode:</strong> Viewing dashboard through the role and permissions of{' '}
              <strong>{currentUser?.name || currentUser?.email}</strong> (
              <span className="capitalize">{currentUser?.role || 'agent'}</span>)
            </span>
          </div>
          <button
            onClick={handleExitPreviewMode}
            className="bg-black hover:bg-neutral-900 text-amber-300 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 ml-2"
          >
            Exit Preview Mode
          </button>
        </div>
      )}

      {/* Main Luxury Container with Fixed Dubai Skyline Scrim */}
      <div 
        className="flex-1 min-h-0 w-full text-[#e2e0cc] p-2 sm:p-2.5 flex gap-2 sm:gap-2.5 box-border font-sans antialiased overflow-hidden selection:bg-[#183153] selection:text-white relative bg-[#040810]"
        style={{
          backgroundImage: "url('./dubai-skyline.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Scrim Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(4, 8, 16, 0.45) 0%, rgba(4, 8, 16, 0.60) 50%, rgba(4, 8, 16, 0.82) 100%)'
          }}
        />

        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Workspace Frame */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
          <main 
            className={`flex-1 rounded-2xl p-4 lg:p-6 relative flex flex-col min-h-0 backdrop-blur-2xl border border-white/15 shadow-2xl ${
              activeTab === 'overview' ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'
            }`}
            style={{
              background: 'rgba(12, 24, 41, 0.48)',
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.85), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)'
            }}
          >
            <TabErrorBoundary key={activeTab} onReset={() => setActiveTab('overview')}>
              <Suspense fallback={<TabLoadingSkeleton />}>
                {activeTab === 'overview' && isAllowed('overview') && (
                  <OverviewDashboard onNavigate={(tab) => isAllowed(tab) && setActiveTab(tab)} />
                )}

                {activeTab === 'owners' && isAllowed('owners') && (
                  <OwnerDirectory 
                    globalAgentId="6"
                    globalAgentName="Melanie Simsiman" 
                    agentsList={[]}
                  />
                )}

                {activeTab === 'buildings' && isAllowed('buildings') && <Buildings />}

                {activeTab === 'search' && isAllowed('search') && <OmniSearch />}

                {activeTab === 'workflows' && isAllowed('workflows') && <WorkflowsDirectory />}

                {activeTab === 'sources' && isAllowed('leads') && <SourcesDirectory initialOpenLibrary={true} />}

                {activeTab === 'activity' && isAllowed('activity') && <MyActivity currentUser={currentUser} />}

                {activeTab === 'voice' && isAllowed('voice') && <VoiceAgent />}

                {activeTab === 'agent' && isAllowed('agent') && <AIAgent setActiveTab={setActiveTab} />}

                {activeTab === 'leads' && isAllowed('leads') && (
                  <SourcesDirectory initialOpenLibrary={initRoute?.autoOpenLibrary} />
                )}

                {activeTab === 'listing' && isAllowed('listing') && (
                  <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                    <Dashboard
                      onNewListingClick={() => setActiveTab('new')}
                      onSelectListing={handleSelectListing}
                    />
                  </div>
                )}

                {activeTab === 'new' && isAllowed('listing') && (
                  <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                    <NewListing 
                      onListingCreated={handleListingCreated} 
                      onBack={() => setActiveTab('listing')}
                    />
                  </div>
                )}

                {(activeTab === 'detail' || activeTab.startsWith('detail')) && isAllowed('listing') && (
                  <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                    {selectedListingId ? (
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
                    )}
                  </div>
                )}

                {activeTab === 'roles' && isAllowed('roles') && (
                  <RolesManagement currentUser={currentUser} />
                )}

                {activeTab === 'settings' && isAllowed('settings') && (
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
      </div>

      {/* Global Quick Search Modal (Ctrl+F6 / Ctrl+K) */}
      {omniSearchModalOpen && isAllowed('search') && (
        <div 
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setOmniSearchModalOpen(false)}
        >
          <div 
            className="w-full max-w-5xl h-[88vh] bg-[#070e1c]/80 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden p-4 sm:p-5"
            style={{
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.85), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense fallback={<TabLoadingSkeleton />}>
              <OmniSearch isModal={true} onClose={() => setOmniSearchModalOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
