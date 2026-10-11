import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NewListing from './components/NewListing';
import ListingDetail from './components/ListingDetail';
import LeadIngestionStudio from './components/LeadIngestionStudio';
import OwnerDirectory from './components/OwnerDirectory';
import OverviewDashboard from './components/OverviewDashboard';
import Buildings from './components/Buildings';
import OmniSearch from './components/OmniSearch';
import SourcesDirectory from './components/SourcesDirectory';
import MyActivity from './components/MyActivity';
import TeamManagement from './components/TeamManagement';
import VoiceAgent from './components/VoiceAgent';
import AccountSettings from './components/AccountSettings';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // default to overview
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [globalAgent, setGlobalAgent] = useState('6'); // Default Melanie Admin
  const [isOmniSearchModalOpen, setIsOmniSearchModalOpen] = useState(false);
  const [agentsList, setAgentsList] = useState([
    { id: '6', name: 'Melanie Simsiman (Admin)' },
    { id: '7', name: 'Akarsh Arora' },
    { id: '186', name: 'NIDAF KHAN' }
  ]);

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

  useEffect(() => {
    // Fetch live agents for global dropdown
    axios.post('https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/user.get.json', { filter: { ACTIVE: true } })
      .then(res => {
        const bitrixUsers = res.data.result || [];
        const mapped = bitrixUsers.map(u => ({
          id: u.ID,
          name: `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim() || u.EMAIL,
          role: u.WORK_POSITION || (u.ID === '6' ? 'Admin' : 'Agent')
        })).filter(u => u.name && u.name.length > 2);
        if(mapped.length > 0) setAgentsList(mapped);
      })
      .catch(e => console.error("Could not fetch global agents", e));
  }, []);

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
      {/* Sleek Left Sidebar (Close to edge, not attached, matching Image 2) */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area - Full Screen Coverage (Matching Image 4) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Main Glassmorphic Widget Container */}
        <main className="flex-1 bg-[#021024]/60 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl p-4 lg:p-5 overflow-hidden relative flex flex-col min-h-0">
          {/* Global View As Switcher - Neatly integrated in top-right */}
          <div className="absolute top-3.5 right-4 z-20">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/15 shadow-xl rounded-xl px-3 py-1 hover:border-white/25 transition-all text-xs">
              <User className="w-3.5 h-3.5 text-white/60" />
              <span className="font-semibold text-white/60">View As:</span>
              <select 
                value={globalAgent} 
                onChange={(e) => setGlobalAgent(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
              >
                {agentsList.map(a => <option key={a.id} value={a.id} className="bg-slate-900 text-white">{a.name} {a.role && `(${a.role})`}</option>)}
              </select>
            </div>
          </div>

        {activeTab === 'overview' && <OverviewDashboard globalAgent={globalAgent} />}
        {activeTab === 'owners' && (
          <OwnerDirectory 
            globalAgentId={globalAgent}
            globalAgentName={agentsList.find(a => a.id === globalAgent)?.name?.replace(/\s*\(Admin\)/i, '') || 'Melanie Simsiman'} 
            agentsList={agentsList}
          />
        )}
        {activeTab === 'buildings' && <Buildings />}
        {activeTab === 'search' && <OmniSearch />}
        {activeTab === 'sources' && <SourcesDirectory />}
        {activeTab === 'activity' && <MyActivity globalAgent={globalAgent} />}
        {activeTab === 'voice' && <VoiceAgent />}
        {activeTab === 'team' && <TeamManagement />}

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

      {/* Global Omni Search Modal (Summoned via Ctrl + F6 or Cmd + F6) */}
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
