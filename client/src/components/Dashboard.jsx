import React, { useEffect, useState } from 'react';
import { 
  PlusCircle, Building2, Image as ImageIcon, Calendar, Trash2, 
  ArrowRight, RefreshCw, CheckCircle2, Clock, AlertTriangle, Search, 
  Tag, ArrowUpDown, X
} from 'lucide-react';
import axios from 'axios';
import Toast from './Toast';
import { sbFetch } from '../utils/supabaseClient';

export default function Dashboard({ onNewListingClick, onSelectListing }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [sortBy, setSortBy] = useState('newest');
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchListings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await sbFetch('/real_estate_listings?select=*,images:real_estate_images(id,is_cover,generated_image_location,original_image_location,display_order)&order=created_at.desc.nullslast');
        if (isMounted) setListings(data || []);
      } catch (err) {
        if (!isMounted) return;
        console.error('Fetch listings error:', err);
        setError('Could not connect to database.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchListings();

    return () => {
      isMounted = false;
    };
  }, []);

  const getCoverImageUrl = (listing) => {
    if (!listing) return null;
    if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
      const sorted = [...listing.images].sort((a, b) => {
        if (a.is_cover) return -1;
        if (b.is_cover) return 1;
        return (a.display_order ?? 0) - (b.display_order ?? 0);
      });
      const chosen = sorted[0];
      const url = chosen.generated_image_location || chosen.original_image_location;
      if (url) {
        if (url.startsWith('http') || url.startsWith('blob:')) return url;
        if (url.startsWith('/dashboard/uploads/')) return url;
        if (url.startsWith('/uploads/')) return `/dashboard${url}`;
        return `/dashboard/${url}`;
      }
    }
    return null;
  };

  const executeDeleteListing = async (id) => {
    try {
      // 1. Delete associated images in Supabase
      try {
        await sbFetch(`/real_estate_images?listing_id=eq.${id}`, { method: 'DELETE' });
      } catch (imgErr) {
        console.warn('Image deletion note:', imgErr.message);
      }

      // 2. Delete listing in Supabase
      await sbFetch(`/real_estate_listings?id=eq.${id}`, { method: 'DELETE' });

      // 3. Optional local express backend cleanup if active
      try {
        await axios.delete(`/api/listings/${id}`, { timeout: 1500 });
      } catch (ignore) {}

      setListings((prev) => prev.filter((item) => item.id !== id));
      setToast({ msg: 'Listing deleted successfully.', type: 'success' });
    } catch (err) {
      console.error('Delete listing error:', err);
      setToast({ msg: 'Failed to delete listing from database.', type: 'error' });
    } finally {
      setDeleteConfirmTarget(null);
    }
  };

  const getDerivedStatus = (item) => {
    if (!item) return 'draft';
    if (typeof item === 'string') return item;
    if (item.status === 'completed') return 'completed';
    const total = Number(item.total_images) || 0;
    const completed = Number(item.completed_images) || 0;
    const failed = Number(item.failed_images) || 0;
    if (total > 0 && (completed >= total || (completed + failed >= total && completed > 0))) {
      return 'completed';
    }
    if (item.status === 'processing') return 'processing';
    if (item.status === 'failed') return 'failed';
    return item.status || 'draft';
  };

  const getStatusBadge = (itemOrStatus) => {
    const status = getDerivedStatus(itemOrStatus);
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5 w-fit backdrop-blur-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 w-fit animate-pulse backdrop-blur-md">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 w-fit backdrop-blur-md">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.08] text-amber-300 border border-white/[0.12] flex items-center gap-1.5 w-fit backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-amber-300" /> Draft
          </span>
        );
    }
  };

  const filteredListings = listings
    .filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.reference && item.reference.toLowerCase().includes(query)) ||
        (item.building_name && item.building_name.toLowerCase().includes(query)) ||
        (item.unit_number && String(item.unit_number).toLowerCase().includes(query)) ||
        (item.community && item.community.toLowerCase().includes(query)) ||
        (item.property_type && item.property_type.toLowerCase().includes(query)) ||
        (item.purpose && item.purpose.toLowerCase().includes(query));

      const derivedStatus = getDerivedStatus(item);
      let matchStatus = true;
      if (statusFilter === 'Completed') matchStatus = derivedStatus === 'completed';
      else if (statusFilter === 'Processing') matchStatus = derivedStatus === 'processing';
      else if (statusFilter === 'Draft') matchStatus = derivedStatus === 'draft' || derivedStatus === 'queued';

      let matchType = true;
      if (typeFilter !== 'All Types') {
        if (typeFilter === 'Commercial') {
          matchType = ['Office', 'Warehouse', 'Shop', 'Commercial'].includes(item.property_type);
        } else {
          matchType = item.property_type === typeFilter;
        }
      }

      return matchQuery && matchStatus && matchType;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortBy === 'price_desc') {
        const pA = Number(a.price) || 0;
        const pB = Number(b.price) || 0;
        return pB - pA;
      }
      if (sortBy === 'price_asc') {
        const pA = Number(a.price) || 0;
        const pB = Number(b.price) || 0;
        return pA - pB;
      }
      if (sortBy === 'photos_desc') {
        const phA = a.total_images ?? (a.images?.length || 0);
        const phB = b.total_images ?? (b.images?.length || 0);
        return phB - phA;
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0c1829] border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-black/80">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Property Listing</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5">
              Are you sure you want to permanently delete <strong className="text-white">"{deleteConfirmTarget.name}"</strong>? All associated photos, AI copies, and documents will be removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteListing(deleteConfirmTarget.id)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-sans font-bold text-white tracking-tight">
            Listings Dashboard
          </h1>
          <p className="text-white/60 mt-1 text-xs lg:text-sm font-sans">
            Manage property photos, enhance resolution, and generate portal listings stored in Supabase.
          </p>
        </div>

        <button
          onClick={onNewListingClick}
          className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-blue-400" />
          <span>Create New Listing</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0c1829] border border-[#233549] p-5 space-y-4 rounded-2xl shadow-xl shadow-black/40">
        {/* Search Input & Sort Selector Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by property name, reference (#MG-2026), or type..."
              className="w-full bg-[#06111e] border border-[#1b2b3d] rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#385175] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#06111e] border border-[#1b2b3d] text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="photos_desc">Most Photos</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>
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
                className={`px-3.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'bg-[#06111e] border border-[#1b2b3d] text-slate-400 hover:text-white hover:bg-[#102035]'
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
            {['All Types', 'Apartment', 'Villa', 'Penthouse', 'Townhouse', 'Commercial', 'Land', 'Full Building'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`px-3.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === type
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'bg-[#06111e] border border-[#1b2b3d] text-slate-400 hover:text-white hover:bg-[#102035]'
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
        <div className="bg-[#0c1829] border border-[#233549] p-12 text-center rounded-2xl shadow-xl shadow-black/40">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">Loading property listings from Supabase...</p>
        </div>
      ) : error ? (
        <div className="bg-[#0c1829] border border-rose-500/30 p-8 text-center text-rose-400 rounded-2xl shadow-xl shadow-black/40">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-[#0c1829] border border-[#233549] p-12 text-center rounded-2xl shadow-xl shadow-black/40">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-sans font-bold text-white mb-1">No Listings Found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-5">
            {searchQuery || statusFilter !== 'All Status' || typeFilter !== 'All Types'
              ? 'No listings match your filter criteria.'
              : 'Create your first property listing with automated DLD Title Deed AI extraction and photo enhancement.'}
          </p>
          <button
            onClick={onNewListingClick}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredListings.map((listing) => {
            const coverImg = getCoverImageUrl(listing);
            return (
              <div
                key={listing.id}
                onClick={() => onSelectListing(listing)}
                className="bg-[#0c1829] rounded-2xl border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 transition-all cursor-pointer group flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Luxury 16:9 Cinematic Photo Banner with Overlays */}
                  <div className="relative w-full h-44 overflow-hidden bg-[#06111e]">
                    <img
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/800x450/06111e/385175?text=Luxury+Property+Photo';
                      }}
                      src={coverImg || 'https://placehold.co/800x450/06111e/385175?text=Luxury+Property+Photo'}
                      alt={listing.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1829] via-[#0c1829]/20 to-black/40" />

                    {/* Top Overlay Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-black/70 backdrop-blur-md text-slate-200 border border-white/10">
                        {listing.property_type || 'Apartment'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold backdrop-blur-md border ${
                        listing.purpose === 'For Rent' 
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' 
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {listing.purpose || 'For Sale'}
                      </span>
                      {listing.reference && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-black/70 backdrop-blur-md text-slate-300 border border-white/10">
                          {listing.reference}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 z-10">
                      {getStatusBadge(listing)}
                    </div>

                    {/* Bottom Photo Count & Price Bar */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs z-10">
                      <span className="font-bold text-white text-base drop-shadow-md">
                        {listing.price ? `AED ${Number(listing.price).toLocaleString()}` : 'Price on Application'}
                      </span>
                      <span className="text-white font-semibold text-[11px] drop-shadow-md flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/15">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                        {listing.total_images ?? (listing.images?.length || 0)} Photos
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 pb-3">
                    <h3 className="text-base font-sans font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1 mb-1.5">
                      {listing.name || 'Untitled Luxury Listing'}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span className="truncate max-w-[170px]">
                        {listing.community || 'Dubai'}
                      </span>
                      {listing.size_sqft && (
                        <span className="font-mono text-slate-300">
                          {Number(listing.size_sqft).toLocaleString()} sqft
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {listing.bedrooms || '2 Beds'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(listing.created_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-[#1b2b3d] text-xs flex items-center justify-between bg-black/20">
                  <span className="text-blue-400 group-hover:translate-x-1 transition-transform font-semibold flex items-center gap-1">
                    Open Listing <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmTarget(listing);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete Listing"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
