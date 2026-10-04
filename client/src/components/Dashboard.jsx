import React, { useEffect, useState } from 'react';
import { 
  PlusCircle, Building2, Image as ImageIcon, Calendar, Trash2, 
  ArrowRight, RefreshCw, CheckCircle2, Clock, AlertTriangle, Search 
} from 'lucide-react';
import axios from 'axios';
import Toast from './Toast';

export default function Dashboard({ onNewListingClick, onSelectListing }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');

  useEffect(() => {
    let isMounted = true;

    const fetchListings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get('/api/listings');
        if (!isMounted) return;
        if (response.data.success) {
          setListings(response.data.listings || []);
        } else {
          setError('Failed to load listings');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Fetch listings error:', err);
        setError('Could not connect to server.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchListings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteListing = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this listing and all associated images?')) return;

    try {
      const response = await axios.delete(`/api/listings/${id}`);
      if (response.data.success) {
        setListings((prev) => prev.filter((item) => item.id !== id));
        setToast({ msg: 'Listing deleted successfully.', type: 'success' });
      }
    } catch (err) {
      console.error('Delete error:', err);
      setToast({ msg: 'Failed to delete listing.', type: 'error' });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 w-fit animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 w-fit">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#00284b] text-slate-300 border border-[#003d73] flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Draft
          </span>
        );
    }
  };

  const filteredListings = listings.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      !query ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.reference && item.reference.toLowerCase().includes(query)) ||
      (item.property_type && item.property_type.toLowerCase().includes(query));

    let matchStatus = true;
    if (statusFilter === 'Completed') matchStatus = item.status === 'completed';
    else if (statusFilter === 'Processing') matchStatus = item.status === 'processing';
    else if (statusFilter === 'Draft') matchStatus = item.status === 'draft' || item.status === 'queued';

    let matchType = true;
    if (typeFilter !== 'All Types') matchType = item.property_type === typeFilter;

    return matchQuery && matchStatus && matchType;
  });

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {toast.msg && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast({ msg: '', type: 'success' })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif font-bold text-white tracking-tight">
            Listings Dashboard
          </h1>
          <p className="text-slate-400 mt-1 text-xs lg:text-sm font-sans">
            Manage property photos, enhance resolution, and generate portal listings stored in Supabase.
          </p>
        </div>

        <button
          onClick={onNewListingClick}
          className="bg-[#00284b] hover:bg-[#003666] border border-[#003d73] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-blue-400" />
          <span>Create New Listing</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-5 space-y-4 rounded-2xl border border-[#00284b]">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by property name, reference (#MG-2026), or type..."
            className="w-full bg-[#001428] border border-[#00284b] rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Status Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
              STATUS:
            </span>
            {['All Status', 'Completed', 'Processing', 'Draft'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === status
                    ? 'bg-[#00284b] text-white border border-[#003d73] shadow-sm font-bold'
                    : 'bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
              TYPE:
            </span>
            {['All Types', 'Apartment', 'Villa', 'Penthouse', 'Townhouse'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`px-3.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  typeFilter === type
                    ? 'bg-[#00284b] text-white border border-[#003d73] shadow-sm font-bold'
                    : 'bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-[#00284b]">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">Loading property listings from Supabase...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center text-rose-400 rounded-2xl border border-rose-500/20">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-[#00284b]">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-serif font-bold text-white mb-1">No Listings Found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-5">
            {searchQuery || statusFilter !== 'All Status' || typeFilter !== 'All Types'
              ? 'No listings match your filter criteria.'
              : 'Create your first property listing with automated DLD Title Deed OCR and AI photo enhancement.'}
          </p>
          <button
            onClick={onNewListingClick}
            className="bg-[#00284b] hover:bg-[#003666] border border-[#003d73] text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-blue-400" />
            Create Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              onClick={() => onSelectListing(listing)}
              className="glass-card p-5 rounded-2xl border border-[#00284b] hover:border-blue-500/40 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                      {listing.property_type || 'Apartment'}
                    </span>
                    {listing.reference && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {listing.reference}
                      </span>
                    )}
                  </div>
                  {getStatusBadge(listing.status)}
                </div>

                <h3 className="text-base font-serif font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1 mb-2">
                  {listing.name || 'Untitled Luxury Listing'}
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    {listing.images?.length || 0} Photos
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(listing.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                <span className="text-blue-400 group-hover:translate-x-1 transition-transform font-semibold flex items-center gap-1">
                  Open Listing <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteListing(e, listing.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Listing"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
