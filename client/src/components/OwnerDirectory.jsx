import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, User, Phone, Mail, Building2, MapPin, Database } from 'lucide-react';
import axios from 'axios';

export default function OwnerDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [locationFilter, setLocationFilter] = useState('All');
  const [crmFilter, setCrmFilter] = useState('All');

  // Slider State
  const [selectedOwner, setSelectedOwner] = useState(null);

  useEffect(() => {
    const fetchOwners = async () => {
      setLoading(true);
      try {
        const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
        const offset = (currentPage - 1) * itemsPerPage;
        
        let url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owner_intelligence_leads?select=owner_id,full_name,building_name,master_area,phone_normalized,contact_number,email_normalized,verified_bedrooms,is_golden_visa_eligible,bitrix_id&limit=${itemsPerPage}&offset=${offset}`;
        
        if (searchTerm.length > 1) {
          url += `&or=(full_name.ilike.*${encodeURIComponent(searchTerm)}*,phone_normalized.ilike.*${encodeURIComponent(searchTerm)}*,building_name.ilike.*${encodeURIComponent(searchTerm)}*)`;
        }
        
        if (filterLoc !== 'All') {
          url += `&master_area=eq.${encodeURIComponent(filterLoc)}`;
        }
        
        if (filterCrm === 'Not in CRM') {
          url += `&bitrix_id=is.null`;
        } else if (filterCrm === 'In Bitrix24') {
          url += `&bitrix_id=not.is.null`;
        }
        
        const response = await axios.get(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } });
        
        const mapped = response.data.map(row => ({
          id: row.owner_id,
          name: row.full_name || 'Unknown Owner',
          building: row.building_name || 'N/A',
          area: row.master_area || 'Dubai',
          phone: row.phone_normalized || row.contact_number || 'N/A',
          email: row.email_normalized || 'N/A',
          units: row.verified_bedrooms ? parseInt(row.verified_bedrooms) : 1,
          source: 'System Sync',
          bitrix_id: row.bitrix_id,
          portfolioValue: row.is_golden_visa_eligible ? 'Golden Visa ($2M+)' : 'Standard',
          lastContact: row.bitrix_id ? 'In Bitrix' : 'Never'
        }));
        setOwners(mapped);
      } catch (error) {
        console.error("Supabase unreachable", error);
        setOwners([]);
      } finally {
        setLoading(false);
      }
    };
    
    // Simple debounce
    const timeoutId = setTimeout(() => {
      fetchOwners();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [currentPage, searchTerm, filterLoc, filterCrm]);

  const pushToBitrix = async (lead) => {
    try {
       const w_url = 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/crm.lead.add.json';
       await axios.post(w_url, {
         fields: { TITLE: lead.name + " - " + lead.building, NAME: lead.name, PHONE: [{ VALUE: lead.phone, VALUE_TYPE: "WORK" }], COMMENTS: "Pushed from A-Squared Data Portal" }
       });
       setPushedIds(new Set([...pushedIds, lead.id]));
    } catch(err) {
       console.error("Push failed", err);
       alert("Failed to push to Bitrix");
    }
  };

  const locations = ['All', 'Downtown Dubai', 'Dubai Marina', 'JLT', 'Palm Jumeirah', 'Business Bay'];
  const crmStatuses = ['All', 'In Bitrix24', 'Not in CRM'];

  const filtered = owners; // filter removed

  return (
    <div className="w-full flex flex-col h-full animate-fade-in relative text-white/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            OWNERS DIRECTORY
          </h1>
          <p className="text-white/60 text-[15px]">
            Master view of 2,234,192 unified property owners across Dubai.
          </p>
        </div>
      </div>

      {/* Smart Filter Bar */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg relative overflow-hidden p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <input
              type="text"
              placeholder="Search by Name, Phone, Email, or Building..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-[14px] pl-12 pr-4 py-3 text-[15px] text-white placeholder-white/60 focus:outline-none focus:border-[#3b82f6]/50 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4 border-l border-white/10 pl-4">
            <div className="flex flex-col">
              <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1">Master Area</span>
              <div className="flex gap-2">
                {locations.slice(0,3).map(loc => (
                  <button 
                    key={loc}
                    onClick={() => setLocationFilter(loc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${locationFilter === loc ? 'bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30' : 'bg-black/20 text-white/60 border border-white/10 hover:text-white'}`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1">CRM Sync</span>
              <div className="flex gap-2">
                {crmStatuses.map(stat => (
                  <button 
                    key={stat}
                    onClick={() => setCrmFilter(stat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${crmFilter === stat ? 'bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30' : 'bg-black/20 text-white/60 border border-white/10 hover:text-white'}`}
                  >
                    {stat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 min-h-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg relative flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead className="bg-black/20 border-b border-white/10 text-xs uppercase tracking-wider text-white/60 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Owner Profile</th>
                <th className="px-6 py-4 font-semibold">Contact Info</th>
                <th className="px-6 py-4 font-semibold">Primary Asset</th>
                <th className="px-6 py-4 font-semibold">Data Source</th>
                <th className="px-6 py-4 font-semibold">Bitrix24 Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-12 text-white/40">Loading 2.2M Golden Rows...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-white/40">No owners found matching filters.</td></tr>
              ) : filtered.map((owner) => (
                <tr key={owner.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => setSelectedOwner(owner)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 font-bold border border-white/20">
                        {owner.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-[#3b82f6] transition-colors">{owner.name}</div>
                        <div className="text-[12px] text-white/40">ID: {owner.id.substring ? owner.id.substring(0,8) : owner.id} • {owner.units} Properties</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-2 text-white/80"><Phone className="w-3.5 h-3.5 text-white/40"/> {owner.phone}</span>
                      <span className="flex items-center gap-2 text-white/60 text-xs"><Mail className="w-3.5 h-3.5 text-white/40"/> {owner.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white/80 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-blue-400"/> {owner.building}</div>
                    <div className="text-[12px] text-white/40 flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5"/> {owner.area}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-black/40 border border-white/10 px-2.5 py-1 rounded-md text-xs font-medium text-white/60">
                      <Database className="w-3.5 h-3.5 text-purple-400" />
                      {owner.source.length > 15 ? owner.source.substring(0,15)+'...' : owner.source}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(owner.bitrix_id || pushedIds.has(owner.id)) ? (
                      <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-green-500/20">
                        ? Synced ({owner.bitrix_id})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-white/5 text-white/40 px-2.5 py-1 rounded-full text-xs font-semibold border border-white/10">
                        Not in CRM
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedOwner(owner); }}>
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
          <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between text-sm text-white/60">
            <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {((currentPage - 1) * itemsPerPage) + filtered.length} of 2.23M DB entries</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30">Previous</button>
              
              <button onClick={() => setCurrentPage(1)} className={`px-3 py-1 rounded-md font-medium ${currentPage === 1 ? 'bg-[#3b82f6] text-white' : 'bg-white/5 border border-white/10 hover:text-white transition-colors'}`}>1</button>
              
              {currentPage > 3 && <span className="px-2 py-1">...</span>}
              
              {currentPage > 2 && <button onClick={() => setCurrentPage(currentPage - 1)} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors">{currentPage - 1}</button>}
              
              {currentPage !== 1 && <button className="px-3 py-1 bg-[#3b82f6] text-white rounded-md font-medium">{currentPage}</button>}
              
              <button onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors">{currentPage + 1}</button>
              <button onClick={() => setCurrentPage(currentPage + 2)} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors">{currentPage + 2}</button>
              
              <span className="px-2 py-1">...</span>
              <button onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors">Next</button>
            </div>
          </div>
      </div>

      {/* Owner 360 Sliding Drawer */}
      <div className={`absolute top-0 right-0 h-full w-[400px] bg-black/40 backdrop-blur-xl border-l border-white/20 shadow-2xl transform transition-transform duration-300 ease-in-out z-20 ${selectedOwner ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedOwner && (
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Owner 360° Profile</h2>
              <button onClick={() => setSelectedOwner(null)} className="text-white/40 hover:text-white p-2">?</button>
            </div>
            
            <div className="flex items-center gap-4 mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-2xl font-bold border border-blue-500/30">
                {selectedOwner.name.charAt(0)}
              </div>
              <div>
                <div className="text-xl font-bold text-white">{selectedOwner.name}</div>
                <div className="text-sm text-white/60">Portfolio Est: <span className="text-[#10b981] font-bold">{selectedOwner.portfolioValue}</span></div>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Contact Details</h3>
                <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center text-sm"><span className="text-white/60">Phone:</span> <span className="font-medium text-white">{selectedOwner.phone}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-white/60">Email:</span> <span className="font-medium text-white">{selectedOwner.email}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Known Assets ({selectedOwner.units})</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-black/20 border border-white/10 rounded-xl flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-blue-400 bg-blue-400/10 p-1.5 rounded-lg" />
                    <div>
                      <div className="font-semibold text-white text-sm">{selectedOwner.building}</div>
                      <div className="text-xs text-white/60">{selectedOwner.area}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">CRM Intelligence</h3>
                <div className="bg-black/20 p-4 rounded-xl border border-white/10 text-sm space-y-3">
                  <div className="flex justify-between items-center"><span className="text-white/60">Bitrix24 Status:</span> 
                    {selectedOwner.bitrix_id ? <span className="text-green-400 font-semibold">{selectedOwner.bitrix_id}</span> : <span className="text-white/40">Not Synced</span>}
                  </div>
                  <div className="flex justify-between items-center"><span className="text-white/60">Last Contact:</span> <span className="text-white font-medium">{selectedOwner.lastContact}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 flex gap-3">
              <button 
                onClick={() => pushToBitrix(selectedOwner)}
                className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white py-3 rounded-xl font-bold transition-all shadow-lg"
              >
                Push to CRM
              </button>
              <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-bold transition-all">
                Send to Vapi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
