import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import NewListing from './components/NewListing';
import ListingDetail from './components/ListingDetail';
import LeadIngestionStudio from './components/LeadIngestionStudio';

export default function App() {
  const [activeTab, setActiveTab] = useState('listing');
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
    <div className="min-h-screen bg-[#001a36] text-[#8c9baf] p-4 lg:p-6 flex gap-6 box-border font-sans selection:bg-blue-500/30 selection:text-white">
      {/* Unified Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Pane */}
      <main className="flex-1 bg-[#001830] border border-[#00284b] rounded-[28px] p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-3rem)]">
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
      </main>
    </div>
  );
}
