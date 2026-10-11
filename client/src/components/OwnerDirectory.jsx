import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, User, Phone, Mail, Building2, MapPin, Database } from 'lucide-react';
import axios from 'axios';
import Owner360Detail from './Owner360Detail';

export default function OwnerDirectory({ globalAgentName }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [locationFilter, setLocationFilter] = useState('All');
  const [crmFilter, setCrmFilter] = useState('All');

  // Slider State
  const [selectedOwner, setSelectedOwner] = useState(null);
  
  // Pagination & Push State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [pushedIds, setPushedIds] = useState(new Set());

  useEffect(() => {
    const fetchOwners = async () => {
      setLoading(true);
      try {
        const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
        const offset = (currentPage - 1) * itemsPerPage;
        
        let url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?select=lead_id,owner_id,full_name,building_name,master_area,unit_number,phone_normalized,phone_raw,email,nationality,emirates_id,passport_expiry,reported_property_type,verified_bedrooms,verified_purchase_price,verified_purchase_date,verified_size_sqft,vendor_source_file,bitrix_id&limit=${itemsPerPage}&offset=${offset}`;
        
        if (searchTerm.length > 1) {
          url += `&or=(lead_id.ilike.*${encodeURIComponent(searchTerm)}*,full_name.ilike.*${encodeURIComponent(searchTerm)}*,phone_normalized.ilike.*${encodeURIComponent(searchTerm)}*,building_name.ilike.*${encodeURIComponent(searchTerm)}*,unit_number.ilike.*${encodeURIComponent(searchTerm)}*)`;
        }
        
        if (locationFilter !== 'All') {
          url += `&master_area=eq.${encodeURIComponent(locationFilter)}`;
        }
        
        if (crmFilter === 'Not in CRM') {
          url += `&bitrix_id=is.null`;
        } else if (crmFilter === 'In Bitrix24') {
          url += `&bitrix_id=not.is.null`;
        }
        
        const response = await axios.get(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } });
        
        if (Array.isArray(response.data)) {
          const mapped = response.data.map(row => ({
            id: row.owner_id ? String(row.owner_id) : 'UnknownID',
            lead_id: row.lead_id ? String(row.lead_id) : (row.owner_id ? String(row.owner_id) : 'LEAD-0000000'),
            name: row.full_name ? String(row.full_name) : 'Unknown Owner',
            building: row.building_name ? String(row.building_name) : 'N/A',
            area: row.master_area ? String(row.master_area) : 'Dubai',
            phone: row.phone_normalized ? String(row.phone_normalized) : (row.phone_raw ? String(row.phone_raw) : 'N/A'),
            email: row.email ? String(row.email) : 'N/A',
            units: row.verified_bedrooms ? parseInt(row.verified_bedrooms) : 1,
            unit_number: row.unit_number ? String(row.unit_number) : null,
            property_type: row.reported_property_type || null,
            nationality: row.nationality || null,
            emirates_id: row.emirates_id || null,
            passport_expiry: row.passport_expiry || null,
            verified_purchase_price: row.verified_purchase_price || null,
            verified_purchase_date: row.verified_purchase_date || null,
            verified_size_sqft: row.verified_size_sqft || null,
            vendor_source_file: row.vendor_source_file || null,
            source: 'Verified',
            bitrix_id: row.bitrix_id ? String(row.bitrix_id) : null,
            portfolioValue: row.verified_purchase_price ? `AED ${(parseFloat(row.verified_purchase_price) / 1000000).toFixed(1)}M` : 'Standard',
            lastContact: row.bitrix_id ? 'In Bitrix' : 'Never'
          }));
          setOwners(mapped);
        } else {
          console.error("Supabase returned non-array data:", response.data);
          setOwners([]);
        }
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
  }, [currentPage, searchTerm, locationFilter, crmFilter]);

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

  if (selectedOwner) {
    return (
      <Owner360Detail
        owner={selectedOwner}
        onBack={() => setSelectedOwner(null)}
        onPushToBitrix={pushToBitrix}
        isPushed={pushedIds.has(selectedOwner.id) || !!selectedOwner.bitrix_id}
        globalAgentName={globalAgentName}
      />
    );
  }

  return (
    <div className="w-full flex flex-col h-full animate-fade-in relative text-white/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            OWNERS DATA
          </h1>
          <p className="text-white/60 text-[15px]">
            Directory of 3,042,722 verified property owners across Dubai.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg relative overflow-hidden p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <input
              type="text"
              placeholder="Search by Lead ID, Name, Phone, Building, or Unit Number..."
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
              <span className="text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1">CRM Status</span>
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
            <thead className="bg-[#051833] border-b border-white/15 text-xs uppercase tracking-wider text-white/70 sticky top-0 z-20 shadow-md shadow-black/40">
              <tr>
                <th className="px-6 py-4 font-semibold bg-[#051833]">Owner Name</th>
                <th className="px-6 py-4 font-semibold bg-[#051833]">Phone & Email</th>
                <th className="px-6 py-4 font-semibold bg-[#051833]">Property & Unit</th>
                <th className="px-6 py-4 font-semibold bg-[#051833]">Source File</th>
                <th className="px-6 py-4 font-semibold bg-[#051833]">CRM Status</th>
                <th className="px-6 py-4 font-semibold text-right bg-[#051833]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-12 text-white/40">Loading owner records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-white/40">No owners found matching filters.</td></tr>
              ) : filtered.map((owner) => (
                <tr key={owner.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => setSelectedOwner(owner)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 font-bold border border-white/20 shrink-0">
                        {String(owner.name).charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-[#3b82f6] transition-colors">{owner.name}</span>
                          {owner.property_type && (
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                              owner.property_type === 'BUYER' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              owner.property_type === 'SELLER' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {owner.property_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            {owner.lead_id}
                          </span>
                        </div>
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
                    <div className="font-medium text-white/80 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-blue-400 shrink-0"/> {owner.building}</span>
                      {owner.unit_number && (
                        <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-md font-mono font-bold border border-blue-500/30">
                          Unit {owner.unit_number}
                        </span>
                      )}
                    </div>
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
                        ✓ Synced ({owner.bitrix_id})
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
            <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {((currentPage - 1) * itemsPerPage) + filtered.length} of 3.04M owner records</span>
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
    </div>
  );
}
