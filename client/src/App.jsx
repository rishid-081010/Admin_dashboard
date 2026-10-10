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
import MyActivity from './components/MyActivity';
import TeamManagement from './components/TeamManagement';
import VoiceAgent from './components/VoiceAgent';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // default to overview
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [globalAgent, setGlobalAgent] = useState('6'); // Default Melanie Admin
  const [agentsList, setAgentsList] = useState([
    { id: '6', name: 'Melanie Simsiman (Admin)' },
    { id: '7', name: 'Akarsh Arora' },
    { id: '186', name: 'NIDAF KHAN' }
  ]);

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
      className="min-h-screen text-white p-4 lg:p-6 flex gap-6 box-border font-sans antialiased selection:bg-blue-500/30 selection:text-white"
      style={{
        backgroundColor: '#001935',
        backgroundImage: `radial-gradient(circle at 0% 40%, rgba(0, 162, 255, 0.15), transparent 40%), radial-gradient(circle at 100% 20%, rgba(0, 102, 255, 0.1), transparent 50%)`
      }}
    >
      {/* Unified Left Sidebar */}
      <div className="bg-black/20 backdrop-blur-md border border-white/[0.15] rounded-[32px] shadow-2xl flex-shrink-0">
         <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Main Content Pane */}
      <main className="flex-1 bg-black/20 backdrop-blur-md border border-white/[0.15] rounded-[32px] shadow-2xl p-6 lg:p-8 overflow-hidden max-h-[calc(100vh-3rem)] relative flex flex-col">
        
        {/* Global View As Switcher */}
        <div className="absolute top-6 lg:top-8 right-6 lg:right-8 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/20 shadow-xl rounded-xl px-4 py-2">
           <User className="w-4 h-4 text-white/60" />
           <span className="text-sm font-semibold text-white/60">View As:</span>
           <select 
             value={globalAgent} 
             onChange={(e) => setGlobalAgent(e.target.value)}
             className="bg-transparent text-white font-bold outline-none cursor-pointer text-sm"
           >
             {agentsList.map(a => <option key={a.id} value={a.id} className="bg-black text-white">{a.name} {a.role && `(${a.role})`}</option>)}
           </select>
        </div>

        {activeTab === 'overview' && <OverviewDashboard globalAgent={globalAgent} />}
        {activeTab === 'owners' && <OwnerDirectory />}
        {activeTab === 'buildings' && <Buildings />}
        {activeTab === 'search' && <OmniSearch />}
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

        {activeTab === 'settings' && (
          <div className="flex flex-col items-center justify-center h-full text-white/60 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Account & Settings</h2>
            <p>Configure webhooks, API keys, and notification preferences.</p>
          </div>
        )}
      </main>
    </div>
  );
}
