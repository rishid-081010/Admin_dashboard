import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NewListing from './components/NewListing';
import ListingDetail from './components/ListingDetail';
import LeadIngestionStudio from './components/LeadIngestionStudio';
import OwnerDirectory from './components/OwnerDirectory';

export default function App() {
  const [activeTab, setActiveTab] = useState('owners'); // default to owners
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
      <main className="flex-1 bg-[#0a1321] border border-[#1c2738] rounded-[28px] p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-3rem)]">
        {activeTab === 'owners' && (
          <OwnerDirectory />
        )}

        {activeTab === 'leads' && (
          <LeadIngestionStudio />
        )}

        {(activeTab === 'listing' || activeTab === 'dashboard') && (
          <Dashboard
            onNewListingClick={() => setActiveTab('new')}
            onSelectListing={handleSelectListing}
          />
        )}

        {activeTab === 'new' && (
          <NewListing 
            onListingCreated={handleListingCreated} 
            onBack={() => setActiveTab('listing')}
          />
        )}

        {activeTab === 'detail' && (
          selectedListingId ? (
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
          )
        )}
        {activeTab === 'overview' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Overview Dashboard</h2>
            <p>High-level metrics and KPIs are currently syncing with Bitrix24.</p>
          </div>
        )}

        {activeTab === 'buildings' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Buildings Database</h2>
            <p>Aggregating 2.23 million rows by Project & Building...</p>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Global Omni-Search</h2>
            <p>Indexing phone numbers, owner names, and transaction records...</p>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">My Activity</h2>
            <p>Loading live Kanban board from Bitrix24 API...</p>
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Voice Agent Centre</h2>
            <p>Connecting to Vapi telecom infrastructure...</p>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Team Management</h2>
            <p>Admin panel for managing agent routing and permissions.</p>
          </div>
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


