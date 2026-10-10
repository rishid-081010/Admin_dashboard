import React, { useState } from 'react';
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

  const handleListingCreated = (newListing) => {
    setSelectedListingId(newListing.id);
    setActiveTab('detail');
  };

  const handleSelectListing = (listing) => {
    setSelectedListingId(listing.id);
    setActiveTab('detail');
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-slate-400 p-4 lg:p-6 flex gap-6 box-border font-sans selection:bg-blue-500/30 selection:text-white">
      {/* Unified Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Pane */}
      <main className="flex-1 bg-[#0a1321] border border-[#1c2738] rounded-[28px] p-6 lg:p-8 overflow-hidden max-h-[calc(100vh-3rem)]">
        {activeTab === 'overview' && <OverviewDashboard />}
        {activeTab === 'owners' && <OwnerDirectory />}
        {activeTab === 'buildings' && <Buildings />}
        {activeTab === 'search' && <OmniSearch />}
        {activeTab === 'activity' && <MyActivity />}
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
          <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Account & Settings</h2>
            <p>Configure webhooks, API keys, and notification preferences.</p>
          </div>
        )}
      </main>
    </div>
  );
}
