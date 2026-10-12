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
import ReviewQueue from './components/ReviewQueue';
import DatasetComparison from './components/DatasetComparison';
import SourcesDirectory from './components/SourcesDirectory';
import MyActivity from './components/MyActivity';
import VoiceAgent from './components/VoiceAgent';
import AccountSettings from './components/AccountSettings';

const ROUTE_MAP = {
  overview: '/dashboard/overview',
  owners: '/dashboard/owners',
  activity: '/dashboard/myactivity',
  search: '/dashboard/search',
  team: '/dashboard/team',
  leads: '/dashboard/datacleaning',
  listing: '/dashboard/listing',
  voice: '/dashboard/voiceagent',
  buildings: '/dashboard/buildings',
  sources: '/dashboard/datalibrary',
  settings: '/dashboard/settings',
  reviews: '/dashboard/reviews',
  comparison: '/dashboard/comparison',
  new: '/dashboard/new-listing',
  detail: '/dashboard/listing-detail'
};

function getTabFromUrl() {
  if (typeof window === 'undefined') return 'overview';
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
  
  const target = hash || path.split('/').pop() || '';
  
  if (target === 'myactivity' || target === 'activity') return 'activity';
  if (target === 'datalibrary' || target === 'sources') return 'sources';
  if (target === 'datacleaning' || target === 'leads') return 'leads';
  if (target === 'voiceagent' || target === 'voice') return 'voice';
  if (target === 'owners') return 'owners';
  if (target === 'buildings') return 'buildings';
  if (target === 'search') return 'search';
  if (target === 'team') return 'team';
  if (target === 'listing') return 'listing';
  if (target === 'settings') return 'settings';
  if (target === 'reviews') return 'reviews';
  if (target === 'comparison') return 'comparison';
  if (target === 'new-listing') return 'new';
  if (target === 'listing-detail') return 'detail';
  return 'overview';
}

export default function App() {
  const [activeTab, setActiveTabState] = useState(() => getTabFromUrl());
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [isOmniSearchModalOpen, setIsOmniSearchModalOpen] = useState(false);

  const setActiveTab = (newTab, pushState = true) => {
    setActiveTabState(newTab);
    if (pushState && typeof window !== 'undefined') {
      const route = ROUTE_MAP[newTab] || '/dashboard/overview';
      const isDashboardBase = window.location.pathname.startsWith('/dashboard');
      const basePath = isDashboardBase ? '/dashboard' : '';
      const subpath = route.replace('/dashboard', '');
      const finalUrl = `${basePath}${subpath}` || '/dashboard/';
      window.history.pushState({ tab: newTab }, '', finalUrl);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const tabFromUrl = getTabFromUrl();
      setActiveTabState(tabFromUrl);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
    setSelectedListingId(newListing.id);
    setActiveTab('detail');
  };

  const handleSelectListing = (listing) => {
    setSelectedListingId(listing.id);
    setActiveTab('detail');
  };

  return (
    <div 
      className="h-screen w-screen text-white p-2 sm:p-2.5 flex gap-2 sm:gap-2.5 box-border font-sans antialiased overflow-hidden selection:bg-blue-500/30 selection:text-white"
      style={{
        backgroundColor: '#001428',
        backgroundImage: `radial-gradient(circle at 10% 30%, rgba(0, 162, 255, 0.12), transparent 45%), radial-gradient(circle at 90% 20%, rgba(0, 102, 255, 0.08), transparent 50%), radial-gradient(circle at 50% 90%, rgba(15, 23, 42, 0.6), transparent 60%)`
      }}
    >
      {/* Sleek Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Main Glassmorphic Container */}
        <main className="flex-1 bg-[#021024]/60 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl p-4 lg:p-5 overflow-hidden relative flex flex-col min-h-0">
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

          {activeTab === 'reviews' && (
            <ReviewQueue onNavigateToBuilding={() => setActiveTab('buildings')} />
          )}

          {activeTab === 'comparison' && <DatasetComparison />}

          {activeTab === 'sources' && <SourcesDirectory />}

          {activeTab === 'activity' && <MyActivity globalAgent="6" />}

          {activeTab === 'voice' && <VoiceAgent />}

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

          {activeTab === 'settings' && <AccountSettings />}
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
