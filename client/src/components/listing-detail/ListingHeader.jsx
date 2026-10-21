import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Download, ShieldCheck, Image as ImageIcon, 
  FolderArchive, ChevronDown, Trash2, AlertCircle 
} from 'lucide-react';

export default function ListingHeader({
  listing,
  completedCount = 0,
  onBack,
  onDownloadZip,
  onDeleteListing,
}) {
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const downloadDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(e.target)) {
        setDownloadDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formattedPrice = listing?.price 
    ? (isFinite(listing.price) ? Number(listing.price).toLocaleString() : listing.price)
    : 'POA';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 mb-3 transition-colors tracking-wide cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight">
            {listing?.name || 'Listing Detail'}
          </h1>
          {listing?.reference && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-white/[0.06] text-white/80 border border-white/[0.08]">
              #{listing.reference}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-white/60 text-xs mt-2 flex-wrap font-sans">
          <span>Type: <strong className="text-blue-400 font-semibold">{listing?.property_type || 'Apartment'}</strong></span>
          <span>•</span>
          <span>Purpose: <strong className="text-emerald-400 font-semibold">{listing?.purpose || 'For Sale'}</strong></span>
          <span>•</span>
          <span>Price: <strong className="text-white font-semibold">AED {formattedPrice}</strong></span>
          {listing?.bedrooms && (
            <>
              <span>•</span>
              <span>Beds: <strong className="text-white font-semibold">{listing.bedrooms}</strong></span>
            </>
          )}
          {listing?.bathrooms && (
            <>
              <span>•</span>
              <span>Baths: <strong className="text-white font-semibold">{listing.bathrooms}</strong></span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Luxury Download Dropdown Button */}
        <div className="relative" ref={downloadDropdownRef}>
          <button
            type="button"
            id="download-packages-btn"
            name="download_packages_btn"
            onClick={() => setDownloadDropdownOpen((prev) => !prev)}
            className="px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white shadow-xl shadow-blue-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Download Packages</span>
            <ChevronDown className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${downloadDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {downloadDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#001f3f]/95 backdrop-blur-xl border border-blue-500/30 shadow-2xl shadow-black/80 z-50 p-2 divide-y divide-white/[0.06] animate-in fade-in zoom-in-95 duration-150">
              {/* Option 1: Government & NOC Files (ZIP) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadDropdownOpen(false);
                  onDownloadZip('Government & NOC Files', 'gov_docs');
                }}
                className="w-full text-left flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                      1. Government & NOC Files
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ZIP
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
                    Title Deed, Emirates ID & 1:1 Autofilled Listing Form (NOC) in one ZIP archive.
                  </p>
                </div>
              </button>

              {/* Option 2: Enhanced Listing Images (ZIP) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadDropdownOpen(false);
                  onDownloadZip('Marketing Photos', 'marketing_photos');
                }}
                disabled={completedCount === 0}
                className={`w-full text-left flex items-start gap-3.5 p-3 rounded-xl transition-colors group cursor-pointer ${
                  completedCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.06]'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 group-hover:scale-105 transition-transform mt-0.5">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                      2. Enhanced Listing Images
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {completedCount} Photos
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
                    All enhanced architectural photos named by room category in full quality.
                  </p>
                </div>
              </button>

              {/* Option 3: Complete Combined Master Package (ZIP) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadDropdownOpen(false);
                  onDownloadZip('Master Bundle', 'master_bundle');
                }}
                className="w-full text-left flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors group bg-white/[0.02] cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-300 group-hover:scale-105 transition-transform mt-0.5">
                  <FolderArchive className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 group-hover:text-blue-200 transition-colors">
                      3. Complete Combined Package
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      All-in-One
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
                    Full master package with Government docs, NOC, copy & all enhanced images.
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Delete Listing Button */}
        {onDeleteListing && (
          <button
            type="button"
            id="delete-listing-header-btn"
            name="delete_listing_header_btn"
            onClick={onDeleteListing}
            className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-red-500/20 border border-white/[0.08] hover:border-red-500/40 text-white/60 hover:text-red-400 transition-all cursor-pointer"
            title="Delete this listing"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
