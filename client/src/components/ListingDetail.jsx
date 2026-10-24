import React, { useEffect, useState, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import Toast from './Toast';
import ListingHeader from './listing-detail/ListingHeader';
import PhotoStudio from './listing-detail/PhotoStudio';
import CopyStudio from './listing-detail/CopyStudio';
import NocStudio from './listing-detail/NocStudio';
import ComparisonModal from './listing-detail/ComparisonModal';
import { previewRentalPdfInNewTab, downloadRentalPdf, generateClientRentalPdf } from '../utils/rentalFormPdfClient';
import { sbFetch, uploadListingImage, uploadEnhancedListingImage } from '../utils/supabaseClient';
import { enhancePhotoWithAI, enhanceListingBatch } from '../utils/aiEnhanceService';

const normalizeAgreementDuration = (val) => {
  if (!val) return '3 Month';
  const str = String(val).toLowerCase();
  if (str.includes('1') && str.includes('month')) return '1 Month';
  if (str.includes('2') && str.includes('month')) return '2 Month';
  if (str.includes('3') && str.includes('month')) return '3 Month';
  if (str.includes('until') || str.includes('date') || str.includes('custom')) return 'Or Until';
  return '3 Month';
};

const getInitialRentalSpecs = (id) => {
  let cached = {};
  if (typeof window !== 'undefined' && id) {
    try {
      const stored = localStorage.getItem(`listing_rental_specs_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') cached = parsed;
      }
    } catch (e) {}
  }

  return {
    form_date: cached.form_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    owner_name: cached.owner_name != null ? String(cached.owner_name) : '',
    owner_phone: cached.owner_phone != null ? String(cached.owner_phone) : '',
    owner_email: cached.owner_email != null ? String(cached.owner_email) : '',
    owner_nationality: cached.owner_nationality != null ? String(cached.owner_nationality) : 'United Arab Emirates',
    property_type: cached.property_type || 'Apartment',
    category: cached.category || 'Residential',
    building_name: cached.building_name != null ? String(cached.building_name) : '',
    community: cached.community != null ? String(cached.community) : 'Dubai',
    unit_number: cached.unit_number != null ? String(cached.unit_number) : '',
    bedrooms: cached.bedrooms || '2 Bedrooms',
    bathrooms: cached.bathrooms || '2 Baths',
    parking_bays: cached.parking_bays || '1 Space',
    bua_sqft: cached.bua_sqft != null ? String(cached.bua_sqft) : '',
    plot_area: cached.plot_area != null ? String(cached.plot_area) : '00',
    price: cached.price != null ? String(cached.price) : '',
    cheques: cached.cheques || '4 Cheques',
    security_deposit: cached.security_deposit != null ? String(cached.security_deposit) : '5%',
    occupancy_status: cached.occupancy_status != null ? String(cached.occupancy_status) : 'Vacant',
    furnishing: cached.furnishing != null ? String(cached.furnishing) : 'Unfurnished',
    agreement_type: cached.agreement_type != null ? String(cached.agreement_type) : 'Non-Exclusive',
    agreement_duration: normalizeAgreementDuration(cached.agreement_duration),
    agreement_until_date: cached.agreement_until_date != null ? String(cached.agreement_until_date) : '',
    commission_rate: cached.commission_rate != null ? String(cached.commission_rate) : '5% + VAT',
    broker_name: cached.broker_name != null ? String(cached.broker_name) : 'A SQUARED REAL ESTATE',
    broker_agent_name: cached.broker_agent_name != null ? String(cached.broker_agent_name) : 'Melanie Simsiman',
    broker_brn: cached.broker_brn != null ? String(cached.broker_brn) : 'ORN: 28491 / BRN: 54120',
    broker_phone: cached.broker_phone != null ? String(cached.broker_phone) : '+971 4 000 0000',
  };
};

export default function ListingDetail({ listingId, onBack }) {
  const [listing, setListing] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  // Comparison & modal states
  const [comparisonModalImage, setComparisonModalImage] = useState(null);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [sliderMode, setSliderMode] = useState('orig-vs-refined');

  // Enhancement & processing states
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [isRetrying, setIsRetrying] = useState({});
  const [customPrompt, setCustomPrompt] = useState('');

  // Copywriter state
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Rental Specs & PDF states
  const [rentalSpecs, setRentalSpecs] = useState(() => getInitialRentalSpecs(listingId));
  const [isSavingRentalSpecs, setIsSavingRentalSpecs] = useState(false);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Sales Specs states
  const [saleSpecs, setSaleSpecs] = useState({
    asking_price: '',
    expected_roi: '7.8%',
    service_charges: '16.50',
    amenities: [],
  });
  const [isSavingSaleSpecs, setIsSavingSaleSpecs] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
  };

  // Helper with cache buster
  const withTimestamp = (url) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^[0-9]+;/, '');
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}t=${Date.now()}`;
  };

  // Fetch listing & images
  const fetchListingDetails = async (showLoading = true) => {
    if (!listingId) return;
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const listingData = await sbFetch(`/real_estate_listings?id=eq.${listingId}&select=*`);
      if (!listingData || listingData.length === 0) {
        throw new Error('Listing not found');
      }
      const currentListing = listingData[0];
      setListing(currentListing);

      // Hydrate rental specs from listing if present
      if (currentListing.commercial_specs || currentListing.rental_specs) {
        const specs = currentListing.commercial_specs || currentListing.rental_specs;
        setRentalSpecs((prev) => ({ ...prev, ...specs }));
      }
      if (currentListing.price && !rentalSpecs.price) {
        setRentalSpecs((prev) => ({ ...prev, price: String(currentListing.price) }));
      }

      // Fetch images with resilient sorting
      try {
        const imagesData = await sbFetch(`/real_estate_images?listing_id=eq.${listingId}&select=*&order=display_order.asc,order_index.asc,created_at.asc`);
        setImages(imagesData || []);
      } catch (imgErr) {
        console.warn('Compound image order query failed, attempting created_at fallback:', imgErr);
        try {
          const fallbackData = await sbFetch(`/real_estate_images?listing_id=eq.${listingId}&select=*&order=created_at.asc`);
          setImages(fallbackData || []);
        } catch (innerErr) {
          console.error('Failed to load listing images:', innerErr);
          setImages([]);
        }
      }
    } catch (err) {
      console.error('Failed to load listing:', err);
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchListingDetails(true);
  }, [listingId]);

  // Handle single photo enhancement
  const handleSingleEnhance = async (image, modelTier = 'flare', directive = '') => {
    if (!image) return;
    setIsRetrying((prev) => ({ ...prev, [image.id]: true }));
    showToast(`Enhancing photo with ${modelTier === 'sunburst' ? 'Sunburst Luxury' : 'Flare'}...`, 'info');

    try {
      const res = await enhancePhotoWithAI({
        imageId: image.id,
        imageUrl: image.original_image_location || image.url,
        listingId,
        modelTier,
        prompt: customPrompt,
        directive,
      });

      if (res && res.generated_image_location) {
        showToast('Photo enhanced successfully!', 'success');
        await fetchListingDetails(false);
      }
    } catch (err) {
      console.error('Single enhancement failed:', err);
      showToast(err.message || 'Enhancement failed.', 'error');
    } finally {
      setIsRetrying((prev) => ({ ...prev, [image.id]: false }));
    }
  };

  // Handle batch enhancement with concurrent queue
  const handleBatchEnhance = async (modelTier = 'flare') => {
    if (images.length === 0) return;
    setIsProcessingBatch(true);
    setBatchProgress({
      current: 0,
      total: images.length,
      pct: 0,
      message: `Starting concurrent neural enhancement (${modelTier === 'sunburst' ? 'Sunburst Luxury' : 'Flare 2.5'})...`,
      modelTier
    });

    try {
      const { completed, failed } = await enhanceListingBatch({
        listingId,
        images,
        modelTier,
        prompt: customPrompt,
        concurrency: 2,
        onProgress: (cur, tot, msg) => {
          const pct = Math.round((cur / (tot || 1)) * 100);
          setBatchProgress({
            current: cur,
            total: tot,
            pct,
            message: msg,
            modelTier
          });
        },
      });

      showToast(`Batch completed: ${completed} enhanced, ${failed} failed.`, completed > 0 ? 'success' : 'error');
      await fetchListingDetails(false);
    } catch (err) {
      showToast(err.message || 'Batch enhancement failed.', 'error');
    } finally {
      setIsProcessingBatch(false);
      setTimeout(() => setBatchProgress(null), 4000);
    }
  };

  // Handle AI Copy Generation
  const handleGenerateCopy = async (tone = 'luxury') => {
    if (!listing) return;
    setIsGeneratingCopy(true);
    showToast('Synthesizing luxury marketing copy with GPT-4o...', 'info');

    try {
      const payload = {
        name: listing.name,
        reference: listing.reference,
        property_type: listing.property_type,
        purpose: listing.purpose,
        price: listing.price,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        size_sqft: listing.size_sqft,
        furnishing: rentalSpecs.furnishing || 'Unfurnished',
        community: rentalSpecs.community || 'Dubai',
        rough_notes: listing.rough_notes || '',
        tone,
      };

      const copyUrl = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? 'http://localhost:5000/api_ai_copywriter.php'
        : (window.location.origin + window.location.pathname.replace(/\/([^\/]*)$/, '/') + 'api_ai_copywriter.php');

      const res = await fetch(copyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Copy generation failed (${res.status})`);
      }

      const data = await res.json();
      if (data && data.copyData) {
        // Save to Supabase
        await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            copy_data: data.copyData,
            updated_at: new Date().toISOString(),
          }),
        });

        setListing((prev) => ({ ...prev, copy_data: data.copyData }));
        showToast('Marketing copy generated & saved!', 'success');
      }
    } catch (err) {
      console.error('Copy generation error:', err);
      showToast(err.message || 'Failed to generate copy.', 'error');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // Copy to clipboard helper
  const handleCopyText = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`${fieldName} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Rental Specs update handler
  const handleRentalSpecChange = (field, val) => {
    setRentalSpecs((prev) => {
      const updated = { ...prev, [field]: val };
      try {
        localStorage.setItem(`listing_rental_specs_${listingId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Save Rental Specs to Supabase
  const handleSaveRentalSpecs = async () => {
    setIsSavingRentalSpecs(true);
    try {
      await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          commercial_specs: rentalSpecs,
          updated_at: new Date().toISOString(),
        }),
      });
      showToast('Rental Form specs saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save rental specs.', 'error');
    } finally {
      setIsSavingRentalSpecs(false);
    }
  };

  // Save Sale Specs to Supabase
  const handleSaveSaleSpecs = async () => {
    setIsSavingSaleSpecs(true);
    try {
      await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          commercial_specs: saleSpecs,
          updated_at: new Date().toISOString(),
        }),
      });
      showToast('Sales Commercials saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save sales specs.', 'error');
    } finally {
      setIsSavingSaleSpecs(false);
    }
  };

  // Preview Rental PDF
  const handlePreviewPdf = async () => {
    setIsPreviewingPdf(true);
    try {
      await previewRentalPdfInNewTab({
        listing,
        commercialSpecs: rentalSpecs,
        titleDeedData: listing?.title_deed_data || listing?.dossier_data,
        emiratesIdData: listing?.emirates_id_data || listing?.kyc_data?.emiratesIdData,
      });
      showToast('Opened official stamped PDF in new tab.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to preview PDF.', 'error');
    } finally {
      setIsPreviewingPdf(false);
    }
  };

  // Download Rental PDF
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadRentalPdf({
        listing,
        commercialSpecs: rentalSpecs,
        titleDeedData: listing?.title_deed_data || listing?.dossier_data,
        emiratesIdData: listing?.emirates_id_data || listing?.kyc_data?.emiratesIdData,
      });
      showToast('Downloaded official stamped Rental Form PDF.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to download PDF.', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Upload Additional Photos
  const handleUploadPhotos = async (files) => {
    if (!files || files.length === 0) return;
    showToast(`Uploading ${files.length} photos...`, 'info');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadListingImage(file, listingId);
        if (res && res.publicUrl) {
          await sbFetch('/real_estate_images', {
            method: 'POST',
            body: JSON.stringify({
              listing_id: listingId,
              original_image_location: res.publicUrl,
              original_filename: file.name,
              display_order: images.length + i,
              order_index: images.length + i,
              status: 'queued',
              room_type: 'Property_Photo',
              created_at: new Date().toISOString(),
            }),
          });
        }
      }
      showToast('Photos uploaded successfully! Triggering enhancement...', 'success');
      await fetchListingDetails(false);
    } catch (err) {
      showToast('Failed to upload photos.', 'error');
    }
  };

  // Set Cover Photo
  const handleSetCover = async (imageId) => {
    try {
      const selectedImg = images.find((i) => i.id === imageId);
      const coverUrl = selectedImg?.generated_image_location || selectedImg?.original_image_location;
      await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          cover_image_id: imageId,
          cover_image_url: coverUrl,
          updated_at: new Date().toISOString(),
        }),
      });
      setListing((prev) => ({ ...prev, cover_image_id: imageId, cover_image_url: coverUrl }));
      showToast('Cover photo updated!', 'success');
    } catch (err) {
      showToast('Failed to set cover photo.', 'error');
    }
  };

  // Reorder Photos
  const handleReorder = async (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    setImages(reordered);
    try {
      for (let i = 0; i < reordered.length; i++) {
        await sbFetch(`/real_estate_images?id=eq.${reordered[i].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ display_order: i, order_index: i }),
        });
      }
    } catch (ignore) {}
  };

  // Delete Photo
  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Delete this photo permanently from the listing?')) return;
    try {
      await sbFetch(`/real_estate_images?id=eq.${imageId}`, {
        method: 'DELETE',
      });
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      showToast('Photo removed from listing.', 'info');
    } catch (err) {
      showToast('Failed to delete photo.', 'error');
    }
  };

  // Download Packages ZIP
  const handleDownloadZip = async (title, packageType) => {
    showToast(`Preparing ${title} ZIP package...`, 'info');
    try {
      const zip = new JSZip();

      if (packageType === 'marketing_photos' || packageType === 'master_bundle') {
        const photoFolder = packageType === 'master_bundle' ? zip.folder('Enhanced_Photos') : zip;
        await Promise.all(
          images.map(async (img, idx) => {
            const rawUrl = img.generated_image_location || img.original_image_location;
            if (!rawUrl) return;
            try {
              const res = await fetch(withTimestamp(rawUrl));
              if (res.ok) {
                const blob = await res.blob();
                const cat = (img.room_type || 'Photo').replace(/\s+/g, '_');
                const paddedIdx = String(idx + 1).padStart(2, '0');
                photoFolder.file(`${paddedIdx}_${cat}.jpg`, blob);
              }
            } catch (ignore) {}
          })
        );
      }

      if (packageType === 'gov_docs' || packageType === 'master_bundle') {
        const docFolder = packageType === 'master_bundle' ? zip.folder('Government_NOC_Files') : zip;
        try {
          const pdfRes = await generateClientRentalPdf({
            listing,
            commercialSpecs: rentalSpecs,
            titleDeedData: listing?.title_deed_data || listing?.dossier_data,
            emiratesIdData: listing?.emirates_id_data || listing?.kyc_data?.emiratesIdData,
          });
          if (pdfRes && pdfRes.pdfBytes) {
            docFolder.file(pdfRes.filename || '01_A_SQUARED_Rental_Form_NOC.pdf', pdfRes.pdfBytes);
          }
        } catch (ignore) {}
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const safeName = (listing?.name || 'Listing').replace(/[^a-zA-Z0-9_-]/g, '_');
      saveAs(content, `${safeName}_${packageType}.zip`);
      showToast(`${title} downloaded successfully!`, 'success');
    } catch (err) {
      showToast('Failed to create ZIP package.', 'error');
    }
  };

  // Download Single Photo
  const handleDownloadSingle = async (url, filename) => {
    if (!url) return;
    try {
      const res = await fetch(withTimestamp(url));
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      saveAs(blob, filename);
    } catch (err) {
      showToast('Failed to download photo.', 'error');
    }
  };

  // Delete entire listing
  const handleDeleteListing = async () => {
    if (!window.confirm(`Permanently delete "${listing?.name}" and all associated photos and documents?`)) return;
    try {
      await sbFetch(`/real_estate_images?listing_id=eq.${listingId}`, { method: 'DELETE' });
      await sbFetch(`/real_estate_listings?id=eq.${listingId}`, { method: 'DELETE' });
      showToast('Listing deleted successfully.', 'success');
      onBack();
    } catch (err) {
      showToast('Failed to delete listing.', 'error');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
        <p className="text-white/60 text-sm font-sans">Loading property listing details...</p>
      </div>
    );
  }

  // Error state
  if (error || !listing) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center animate-fade-in">
        <div className="bg-[#0c1829] border border-red-500/30 rounded-3xl p-8 text-center max-w-md mx-auto mb-5 shadow-2xl shadow-black/80">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3 border border-red-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-white mb-1.5">Property Listing Not Found</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'This listing may have been deleted, moved, or the link has expired.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Listings Dashboard
        </button>
      </div>
    );
  }

  const completedImages = images.filter((i) => i.status === 'completed' || i.generated_image_location);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* 1. Header & Quick Actions */}
      <ListingHeader
        listing={listing}
        completedCount={completedImages.length}
        onBack={onBack}
        onDownloadZip={handleDownloadZip}
        onDeleteListing={handleDeleteListing}
      />

      {/* Active Batch Queue Progress Card */}
      {batchProgress && (
        <div className="mb-6 bg-gradient-to-r from-blue-950/70 via-[#0a1b33] to-[#041224] border border-blue-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl animate-fade-in relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Neural Enhancement Queue: {batchProgress.current} / {batchProgress.total} Complete ({batchProgress.pct}%)
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-300">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30">
                Parallel Concurrency: 2 active
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                A-Squared Branding Applied
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10 mb-2">
            <div 
              style={{ width: `${batchProgress.pct}%` }}
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300 rounded-full"
            />
          </div>

          <p className="text-xs text-slate-300 truncate">
            {batchProgress.message}
          </p>
        </div>
      )}

      {/* 2. Photo Processing & Management Studio */}
      <PhotoStudio
        images={images}
        listingId={listingId}
        selectedCoverId={listing.cover_image_id}
        onSetCover={handleSetCover}
        onReorder={handleReorder}
        onDeleteImage={handleDeleteImage}
        onUploadPhotos={handleUploadPhotos}
        onBatchEnhance={handleBatchEnhance}
        isProcessingBatch={isProcessingBatch}
        customPrompt={customPrompt}
        setCustomPrompt={setCustomPrompt}
        onOpenComparison={(img) => {
          setComparisonModalImage(img);
          const idx = completedImages.findIndex((i) => i.id === img.id);
          setSliderIndex(idx >= 0 ? idx : 0);
        }}
        onSingleEnhance={handleSingleEnhance}
        isRetrying={isRetrying}
        onDownloadSingle={handleDownloadSingle}
      />

      {/* 3. Official DLD NOC Agreement & Specifications Studio */}
      <div className="mt-8">
        <NocStudio
          listing={listing}
          rentalSpecs={rentalSpecs}
          onRentalSpecChange={handleRentalSpecChange}
          onSaveRentalSpecs={handleSaveRentalSpecs}
          isSavingRentalSpecs={isSavingRentalSpecs}
          onPreviewPdf={handlePreviewPdf}
          isPreviewingPdf={isPreviewingPdf}
          onDownloadPdf={handleDownloadPdf}
          isDownloadingPdf={isDownloadingPdf}
          saleSpecs={saleSpecs}
          onSaveSaleSpecs={handleSaveSaleSpecs}
          isSavingSaleSpecs={isSavingSaleSpecs}
          setSaleSpecs={setSaleSpecs}
        />
      </div>

      {/* 4. AI Multi-Channel Marketing Copy Studio */}
      <div className="mt-8">
        <CopyStudio
          listing={listing}
          copyData={listing.copy_data}
          isGenerating={isGeneratingCopy}
          onGenerateCopy={handleGenerateCopy}
          onCopyText={handleCopyText}
          copiedField={copiedField}
        />
      </div>

      {/* 5. Before/After Comparison Modal */}
      {comparisonModalImage && (
        <ComparisonModal
          isOpen={!!comparisonModalImage}
          onClose={() => setComparisonModalImage(null)}
          image={comparisonModalImage}
          currentIndex={sliderIndex}
          totalCount={completedImages.length}
          sliderMode={sliderMode}
          setSliderMode={setSliderMode}
          onPrev={() => {
            if (completedImages.length <= 1) return;
            const newIdx = sliderIndex > 0 ? sliderIndex - 1 : completedImages.length - 1;
            setSliderIndex(newIdx);
            setComparisonModalImage(completedImages[newIdx]);
          }}
          onNext={() => {
            if (completedImages.length <= 1) return;
            const newIdx = sliderIndex < completedImages.length - 1 ? sliderIndex + 1 : 0;
            setSliderIndex(newIdx);
            setComparisonModalImage(completedImages[newIdx]);
          }}
          onSingleEnhance={handleSingleEnhance}
          isRetrying={isRetrying[comparisonModalImage?.id]}
        />
      )}

      {/* Global Toast */}
      {toast.msg && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast({ msg: '', type: 'success' })}
        />
      )}
    </div>
  );
}
