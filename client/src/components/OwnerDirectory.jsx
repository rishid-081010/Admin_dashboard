import React, { useState, useEffect } from 'react';
import { Search, Filter, Phone, MapPin, Building, ChevronRight, CheckCircle2, User } from 'lucide-react';
import axios from 'axios';

export default function OwnerDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We will connect to the local Node.js backend running on 5001
    const fetchLeads = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/owners');
        setLeads(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch owners:", err);
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-slate-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            OWNER DIRECTORY
          </h1>
          <p className="text-[#94a3b8] text-[15px]">
            Instantly search and prospect across 2.23 million unified Golden Rows.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-[#0f172a]/40 border border-[#1e293b] rounded-[20px] p-5 mb-8 space-y-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by owner name, building, area, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1e293b]/50 border border-[#334155] rounded-[14px] pl-12 pr-4 py-[14px] text-[15px] text-white placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-1 focus:ring-[#3b82f6]/50 transition-all"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold text-slate-400 tracking-widest uppercase">Location:</span>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20 transition-all">All Dubai</button>
              <button className="px-4 py-1.5 rounded-full text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">Downtown</button>
              <button className="px-4 py-1.5 rounded-full text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">Marina</button>
            </div>
          </div>
          <div className="w-px h-6 bg-[#334155]"></div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold text-slate-400 tracking-widest uppercase">CRM Status:</span>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20 transition-all">All</button>
              <button className="px-4 py-1.5 rounded-full text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cold (Uncontacted)</button>
              <button className="px-4 py-1.5 rounded-full text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">In Bitrix24</button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-hidden bg-[#0f172a]/40 border border-[#1e293b] rounded-[20px] flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-[14px]">
            <thead className="sticky top-0 bg-[#0f172a] border-b border-[#1e293b] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Owner Profile</th>
                <th className="px-6 py-4 font-semibold">Property</th>
                <th className="px-6 py-4 font-semibold">DLD Financials</th>
                <th className="px-6 py-4 font-semibold">CRM Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-4"></div>
                      Fetching massive database from Supabase...
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No leads found.</td>
                </tr>
              ) : (
                leads.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155] flex items-center justify-center text-white font-medium">
                          {lead.full_name ? lead.full_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-[#60a5fa] transition-colors">
                            {lead.full_name || 'Unknown Owner'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            <Phone className="w-3 h-3" />
                            {lead.phone_normalized || lead.phone_raw}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-200">{lead.building_name || lead.project || 'Standalone Property'}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <MapPin className="w-3 h-3" />
                        {lead.master_area || 'Dubai'} • Unit {lead.unit_number || 'TBA'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {lead.dld_matched ? (
                        <>
                          <div className="text-white font-medium">{lead.verified_purchase_price ? `${lead.verified_purchase_price.toLocaleString()} AED` : 'N/A'}</div>
                          <div className="text-xs text-[#10b981] flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3 h-3" /> DLD Verified
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No exact DLD match</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {lead.bitrix_id ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                          <User className="w-3 h-3" /> In Pipeline
                        </span>
                      ) : lead.master_leads_id ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f59e0b]/10 text-[#fbbf24] border border-[#f59e0b]/20">
                           Outreach Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Cold Lead
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-4 py-2 bg-white/5 hover:bg-[#3b82f6] text-slate-300 hover:text-white border border-white/10 hover:border-[#3b82f6] rounded-xl text-xs font-semibold transition-all shadow-sm">
                        Push to CRM
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
