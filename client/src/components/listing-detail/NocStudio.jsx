import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Phone, Mail, Home, BedDouble, Bath, 
  Calendar, ShieldCheck, DollarSign, FileCheck, FileText, 
  Download, Eye, AlertTriangle, CheckCircle2, Sparkles, Check,
  Edit3, Columns, LayoutTemplate, RefreshCw, MessageSquare, 
  ExternalLink, Calculator, Landmark, X, PenTool, Sliders,
  Crop, RotateCw, Upload, Image as ImageIcon, Trash2
} from 'lucide-react';
import { sbFetch } from '../../utils/supabaseClient';
import { generateClientRentalPdf } from '../../utils/rentalFormPdfClient';
import {
  extractTransparentSignature,
  EID_SIGNATURE_PRESETS,
  DEFAULT_EID_SIGNATURE_BOX
} from '../../utils/signatureExtractor';

export default function NocStudio({
  listing,
  rentalSpecs = {},
  onRentalSpecChange,
  onSaveRentalSpecs,
  isSavingRentalSpecs,
  onPreviewPdf,
  isPreviewingPdf,
  onDownloadPdf,
  isDownloadingPdf,
  saleSpecs,
  onSaveSaleSpecs,
  isSavingSaleSpecs,
  setSaleSpecs,
  onAiShortenBuildingName,
  isShorteningName,
}) {
  // View Modes: 'visual' (Interactive Contract Sheet) | 'form' (Structured Tabs) | 'split' (Side-by-Side Live PDF)
  const [viewMode, setViewMode] = useState('visual');
  const [rentalActiveTab, setRentalActiveTab] = useState('financials'); // 'financials' | 'landlord' | 'specs' | 'mandate'
  const [isSearchingOwner, setIsSearchingOwner] = useState(false);
  const [lookupMessage, setLookupMessage] = useState(null);
  
  // Live PDF preview state for split view
  const [splitPdfUrl, setSplitPdfUrl] = useState(null);
  const [isGeneratingSplitPdf, setIsGeneratingSplitPdf] = useState(false);

  // Signature Extraction from Emirates ID State
  const [isExtractingSignature, setIsExtractingSignature] = useState(false);
  const [signatureStatusMsg, setSignatureStatusMsg] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState('front_lower_left');
  const [rawEidImageSource, setRawEidImageSource] = useState(null);
  const [inkDarkness, setInkDarkness] = useState(115);
  const [paperThreshold, setPaperThreshold] = useState(190);
  const [showSignatureFineTuner, setShowSignatureFineTuner] = useState(false);
  const eidFileInputRef = useRef(null);

  // Helper to discover any existing Emirates ID in listing files/documents
  const getAttachedEidUrl = () => {
    if (listing?.emirates_id_files && listing.emirates_id_files.length > 0) {
      const f = listing.emirates_id_files[0];
      return typeof f === 'string' ? f : (f.url || f.path || '');
    }
    if (listing?.emirates_id_url) return listing.emirates_id_url;
    if (listing?.eid_url) return listing.eid_url;
    if (Array.isArray(listing?.documents)) {
      const eidDoc = listing.documents.find(d => /emirates|eid|id_card/i.test(d?.name || d?.title || d?.type || d?.url || ''));
      if (eidDoc) return eidDoc.url || eidDoc.path || '';
    }
    return null;
  };

  const processAndApplySignature = async (
    imgSource, 
    cropBox = DEFAULT_EID_SIGNATURE_BOX, 
    bThresh = inkDarkness, 
    wThresh = paperThreshold
  ) => {
    if (!imgSource) return;
    setIsExtractingSignature(true);
    setSignatureStatusMsg({ type: 'info', text: 'Extracting cardholder signature & removing background pattern...' });
    try {
      const result = await extractTransparentSignature(imgSource, cropBox, {
        thresholdBlack: bThresh,
        thresholdWhite: wThresh,
        inkColor: { r: 0, g: 23, b: 56 }, // Official A-Squared Navy (#001738)
      });

      if (!result || !result.signatureDataUrl) {
        throw new Error('Could not isolate signature strokes from image.');
      }

      onRentalSpecChange('landlord_signature_png', result.signatureDataUrl);
      setSignatureStatusMsg({ type: 'success', text: '✓ Signature isolated and stamped above landlord name!' });

      if (viewMode === 'split') {
        setTimeout(refreshSplitPdf, 300);
      }
    } catch (err) {
      console.error('Signature extraction error:', err);
      setSignatureStatusMsg({ type: 'error', text: 'Failed to extract signature: ' + err.message });
    } finally {
      setIsExtractingSignature(false);
    }
  };

  const handleEidFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target.result;
      setRawEidImageSource(dataUrl);
      const preset = EID_SIGNATURE_PRESETS.find(p => p.id === selectedPresetId) || EID_SIGNATURE_PRESETS[0];
      processAndApplySignature(dataUrl, preset.box);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExtractFromAttachedEid = () => {
    const url = getAttachedEidUrl();
    if (!url) {
      setSignatureStatusMsg({ type: 'error', text: 'No attached Emirates ID found on this listing. Please upload the card photo.' });
      return;
    }
    setRawEidImageSource(url);
    const preset = EID_SIGNATURE_PRESETS.find(p => p.id === selectedPresetId) || EID_SIGNATURE_PRESETS[0];
    processAndApplySignature(url, preset.box);
  };

  const handleSelectPreset = (presetId) => {
    setSelectedPresetId(presetId);
    const preset = EID_SIGNATURE_PRESETS.find(p => p.id === presetId);
    if (preset && rawEidImageSource) {
      processAndApplySignature(rawEidImageSource, preset.box, inkDarkness, paperThreshold);
    }
  };

  const handleSliderUpdate = (newDarkness, newPaper) => {
    setInkDarkness(newDarkness);
    setPaperThreshold(newPaper);
    if (rawEidImageSource) {
      const preset = EID_SIGNATURE_PRESETS.find(p => p.id === selectedPresetId) || EID_SIGNATURE_PRESETS[0];
      processAndApplySignature(rawEidImageSource, preset.box, newDarkness, newPaper);
    }
  };

  const isRental = String(listing?.purpose || '').toLowerCase().includes('rent');

  // Stamping Readiness Checklist for Rental
  const isMissingPhone = !rentalSpecs.owner_phone || !String(rentalSpecs.owner_phone).trim();
  const isMissingEmail = !rentalSpecs.owner_email || !String(rentalSpecs.owner_email).trim();
  const isMissingPrice = !rentalSpecs.price || !String(rentalSpecs.price).trim();
  const isMissingBeds = !rentalSpecs.bedrooms || !String(rentalSpecs.bedrooms).trim();
  const isMissingBaths = !rentalSpecs.bathrooms || !String(rentalSpecs.bathrooms).trim();
  const missingCount = [isMissingPhone, isMissingEmail, isMissingPrice, isMissingBeds, isMissingBaths].filter(Boolean).length;

  // Auto-calculated Financials
  const parsedPrice = Number(String(rentalSpecs.price || '0').replace(/[^0-9.]/g, '')) || 0;
  const isFurnished = String(rentalSpecs.furnishing || '').toLowerCase().includes('furnished') && !String(rentalSpecs.furnishing || '').toLowerCase().includes('un');
  const depositRate = isFurnished ? 0.10 : 0.05;
  const calculatedDeposit = Math.round(parsedPrice * depositRate);
  const calculatedCommission = Math.round(parsedPrice * 0.05);
  const calculatedVat = Math.round(calculatedCommission * 0.05);
  const totalCommissionWithVat = calculatedCommission + calculatedVat;

  // Generate live PDF for split view
  const refreshSplitPdf = async () => {
    setIsGeneratingSplitPdf(true);
    try {
      const res = await generateClientRentalPdf({
        listing,
        commercialSpecs: rentalSpecs,
        titleDeedData: listing?.title_deed_data || listing?.dossier_data || {},
        emiratesIdData: listing?.emirates_id_data || listing?.kyc_data?.emiratesIdData || {},
      });
      if (res && res.blobUrl) {
        if (splitPdfUrl) URL.revokeObjectURL(splitPdfUrl);
        setSplitPdfUrl(res.blobUrl);
      }
    } catch (err) {
      console.warn('Split PDF error:', err);
    } finally {
      setIsGeneratingSplitPdf(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'split' && !splitPdfUrl) {
      refreshSplitPdf();
    }
  }, [viewMode]);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (splitPdfUrl) URL.revokeObjectURL(splitPdfUrl);
    };
  }, [splitPdfUrl]);

  // Auto-Lookup Landlord in 3,042,722 Database Records
  const handleOwnerLookup = async () => {
    setIsSearchingOwner(true);
    setLookupMessage(null);
    try {
      const unit = rentalSpecs.unit_number || listing?.unit_number || listing?.title_deed_data?.unit_number;
      const bldg = rentalSpecs.building_name || listing?.name || listing?.title_deed_data?.building_name;
      const name = rentalSpecs.owner_name || listing?.title_deed_data?.owner_name_english;

      let records = null;

      // 1. Precise lookup by unit + building name
      if (unit && bldg) {
        const cleanBldg = bldg.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(' ')[0];
        try {
          records = await sbFetch(`/owners_data?unit_number=eq.${encodeURIComponent(unit)}&building_name=ilike.*${encodeURIComponent(cleanBldg)}*&select=name,phone,normalized_phone,email,nationality&limit=1`);
        } catch (e) {}
      }

      // 2. Fallback lookup by exact owner name
      if ((!records || records.length === 0) && name) {
        try {
          const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
          records = await sbFetch(`/owners_data?name=ilike.*${encodeURIComponent(cleanName)}*&select=name,phone,normalized_phone,email,nationality&limit=1`);
        } catch (e) {}
      }

      if (records && records.length > 0) {
        const found = records[0];
        let filledCount = 0;
        if (found.normalized_phone || found.phone) {
          onRentalSpecChange('owner_phone', found.normalized_phone || found.phone);
          filledCount++;
        }
        if (found.email) {
          onRentalSpecChange('owner_email', found.email);
          filledCount++;
        }
        if (found.nationality && !rentalSpecs.owner_nationality) {
          onRentalSpecChange('owner_nationality', found.nationality);
          filledCount++;
        }
        setLookupMessage({
          type: 'success',
          text: `✓ Auto-filled ${filledCount} field${filledCount > 1 ? 's' : ''} from verified owner: ${found.name || 'Owner'}`
        });
      } else {
        setLookupMessage({
          type: 'info',
          text: 'No matching landlord found in database. Enter details manually below.'
        });
      }
    } catch (err) {
      setLookupMessage({ type: 'error', text: 'Database lookup timed out. Please enter manually.' });
    } finally {
      setIsSearchingOwner(false);
      setTimeout(() => setLookupMessage(null), 6000);
    }
  };

  // 1-Click Commercial Presets
  const applyPreset = (presetName) => {
    if (presetName === 'standard_4') {
      onRentalSpecChange('cheques', '4 Cheques');
      onRentalSpecChange('agreement_type', 'Non-Exclusive');
      onRentalSpecChange('agreement_duration', '3 Month');
      onRentalSpecChange('furnishing', 'Unfurnished');
    } else if (presetName === 'single_cheque') {
      onRentalSpecChange('cheques', '1 Cheque');
      onRentalSpecChange('agreement_type', 'Non-Exclusive');
      onRentalSpecChange('agreement_duration', '3 Month');
    } else if (presetName === 'corporate_12') {
      onRentalSpecChange('cheques', '12 Cheques');
      onRentalSpecChange('agreement_type', 'Non-Exclusive');
      onRentalSpecChange('agreement_duration', '1 Month');
    } else if (presetName === 'furnished_luxury') {
      onRentalSpecChange('furnishing', 'Furnished');
      onRentalSpecChange('cheques', '2 Cheques');
      onRentalSpecChange('agreement_type', 'Exclusive');
      onRentalSpecChange('agreement_duration', '3 Month');
    }
  };

  if (isRental) {
    return (
      <div className="glass-card p-4 sm:p-6 mb-8 border border-blue-500/30 bg-gradient-to-br from-[#0a1322] via-[#070e1b] to-[#040812] shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5 mb-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <FileBadgeIcon className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-sans font-bold text-white tracking-tight">
                Official Dubai Land Department (DLD) Rental NOC Agreement Studio
              </h2>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/[0.08] mr-1">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'visual'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Edit directly on the visual contract document"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Visual Contract</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('form')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'form'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Structured tabbed input fields"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quick Fields</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('split');
                  refreshSplitPdf();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Side-by-side contract editor and real-time PDF preview"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Live Split</span>
              </button>
            </div>

            <button
              type="button"
              id="save-rental-specs-btn"
              name="save_rental_specs_btn"
              onClick={onSaveRentalSpecs}
              disabled={isSavingRentalSpecs}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold border border-white/[0.08] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileCheck className={`w-3.5 h-3.5 ${isSavingRentalSpecs ? 'animate-spin' : 'text-blue-400'}`} />
              <span>{isSavingRentalSpecs ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              id="preview-rental-pdf-btn"
              name="preview_rental_pdf_btn"
              onClick={onPreviewPdf}
              disabled={isPreviewingPdf}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Eye className={`w-3.5 h-3.5 ${isPreviewingPdf ? 'animate-spin' : ''}`} />
              <span>{isPreviewingPdf ? 'Generating...' : 'Preview PDF'}</span>
            </button>

            <button
              type="button"
              id="download-rental-pdf-btn"
              name="download_rental_pdf_btn"
              onClick={onDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
              title="Download official fillable AcroForm PDF"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloadingPdf ? 'animate-spin' : ''}`} />
              <span>Download Form</span>
            </button>
          </div>
        </div>

        {/* 1-Click Commercial Presets Bar */}
        <div className="mb-5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> 1-Click Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('standard_4')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition-all cursor-pointer"
            >
              💎 Standard (4 Cheques)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('single_cheque')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-all cursor-pointer"
            >
              ⚡ 1 Cheque Upfront
            </button>
            <button
              type="button"
              onClick={() => applyPreset('corporate_12')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-all cursor-pointer"
            >
              🏢 Corporate (12 Cheques)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('furnished_luxury')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-all cursor-pointer"
            >
              🛋️ Furnished Luxury (2 Cheques)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOwnerLookup}
              disabled={isSearchingOwner}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all cursor-pointer disabled:opacity-50"
              title="Auto-lookup landlord phone and email from the 3M verified owners database"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSearchingOwner ? 'animate-spin' : ''}`} />
              <span>{isSearchingOwner ? 'Searching 3M Owners...' : '✨ Auto-Fill Landlord from DB'}</span>
            </button>
          </div>
        </div>

        {/* Lookup Notification Toast */}
        {lookupMessage && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border animate-in fade-in duration-200 relative z-10 ${
            lookupMessage.type === 'success' ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' :
            lookupMessage.type === 'info' ? 'bg-blue-500/15 text-blue-200 border-blue-500/30' :
            'bg-red-500/15 text-red-200 border-red-500/30'
          }`}>
            <span>{lookupMessage.text}</span>
            <button type="button" onClick={() => setLookupMessage(null)} className="p-0.5 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Readiness Checklist */}
        <div className="mb-6 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/70">Form Stamping Readiness:</span>
            {missingCount === 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> All Critical Fields Completed
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> {missingCount} Field{missingCount > 1 ? 's' : ''} Blank (Will Print as Dashes)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={`px-2 py-0.5 rounded-md font-medium border ${!isMissingPhone ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/15 text-red-300 border-red-500/30 animate-pulse'}`}>
              Phone: {!isMissingPhone ? '✓ Ready' : '⚠️ Missing'}
            </span>
            <span className={`px-2 py-0.5 rounded-md font-medium border ${!isMissingEmail ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
              Email: {!isMissingEmail ? '✓ Ready' : '⚠️ Empty'}
            </span>
            <span className={`px-2 py-0.5 rounded-md font-medium border ${!isMissingPrice ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/15 text-red-300 border-red-500/30 animate-pulse'}`}>
              Rent Price: {!isMissingPrice ? '✓ Ready' : '⚠️ Missing'}
            </span>
            <span className={`px-2 py-0.5 rounded-md font-medium border ${!isMissingBeds ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
              Beds: {rentalSpecs.bedrooms || '⚠️ Empty'}
            </span>
            <span className={`px-2 py-0.5 rounded-md font-medium border ${!isMissingBaths ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
              Baths: {rentalSpecs.bathrooms || '⚠️ Empty'}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW MODE 1: VISUAL ON-PAGE CONTRACT EDITOR             */}
        {/* ======================================================== */}
        {viewMode === 'visual' && (
          <div className="relative z-10 animate-fade-in space-y-6">
            {/* Visual Contract Sheet */}
            <div className="rounded-2xl border border-blue-400/30 bg-[#07111e]/90 backdrop-blur-xl shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Contract Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.1] pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/50">
                    A²
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase font-sans">
                      A SQUARED REAL ESTATE — FORM A
                    </h3>
                    <p className="text-[11px] text-blue-300 font-medium">
                      DUBAI LAND DEPARTMENT (DLD) OFFICIAL RENTAL LISTING CONTRACT
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                      AGREEMENT FORM DATE
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={rentalSpecs.form_date || ''}
                        onChange={(e) => onRentalSpecChange('form_date', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="glass-input rounded-lg px-3 py-1.5 text-xs text-white font-sans tabular-nums font-bold w-32 border-blue-400/40 focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => onRentalSpecChange('form_date', new Date().toLocaleDateString('en-GB'))}
                        className="px-2 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[10px] font-bold border border-blue-500/30 cursor-pointer"
                        title="Set to today's date"
                      >
                        Today
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                      CONTRACT REF #
                    </span>
                    <span className="inline-block px-3 py-1.5 rounded-lg bg-white/[0.05] text-xs font-sans tabular-nums font-bold text-white/80 border border-white/[0.08]">
                      #{listing?.reference || 'ASQ-2026-NOC'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 1: LANDLORD LEGAL DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> 1. Landlord / Registered Owner Information
                  </span>
                  {rentalSpecs.owner_name && (
                    <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Verified Title Deed Legal Entity
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">
                      LANDLORD LEGAL FULL NAME <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={rentalSpecs.owner_name ?? ''}
                      onChange={(e) => onRentalSpecChange('owner_name', e.target.value)}
                      placeholder="e.g. Mohammed Al Hashimi"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-white font-bold text-sm border-blue-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1 flex items-center justify-between">
                      <span>MOBILE / WHATSAPP <span className="text-blue-400">*</span></span>
                      {rentalSpecs.owner_phone && (
                        <a
                          href={`https://wa.me/${String(rentalSpecs.owner_phone).replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
                          title="Open WhatsApp chat"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                      )}
                    </label>
                    <input
                      type="text"
                      value={rentalSpecs.owner_phone ?? ''}
                      onChange={(e) => onRentalSpecChange('owner_phone', e.target.value)}
                      placeholder="e.g. +971 50 123 4567"
                      className={`w-full glass-input rounded-xl px-3.5 py-2 text-white font-sans tabular-nums text-sm ${!rentalSpecs.owner_phone ? 'border-red-500/50' : 'border-blue-500/30'}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">
                      EMAIL ADDRESS <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={rentalSpecs.owner_email ?? ''}
                      onChange={(e) => onRentalSpecChange('owner_email', e.target.value)}
                      placeholder="landlord@example.com"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-white text-sm border-blue-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">
                      NATIONALITY
                    </label>
                    <input
                      type="text"
                      value={rentalSpecs.owner_nationality ?? ''}
                      onChange={(e) => onRentalSpecChange('owner_nationality', e.target.value)}
                      placeholder="e.g. United Arab Emirates"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-white text-sm border-blue-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PROPERTY IDENTIFICATION & SPECS */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> 2. Property Specifications &amp; Location
                  </span>

                  {/* Occupancy & Furnishing Toggles */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => onRentalSpecChange('occupancy_status', 'Vacant')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          !String(rentalSpecs.occupancy_status || '').toLowerCase().includes('tenant')
                            ? 'bg-emerald-600 text-white'
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        Vacant
                      </button>
                      <button
                        type="button"
                        onClick={() => onRentalSpecChange('occupancy_status', 'Tenanted')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          String(rentalSpecs.occupancy_status || '').toLowerCase().includes('tenant')
                            ? 'bg-amber-600 text-white'
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        Tenanted
                      </button>
                    </div>

                    <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => onRentalSpecChange('furnishing', 'Unfurnished')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          !isFurnished ? 'bg-blue-600 text-white' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        Unfurnished (5% Dep)
                      </button>
                      <button
                        type="button"
                        onClick={() => onRentalSpecChange('furnishing', 'Furnished')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          isFurnished ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        Furnished (10% Dep)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Property Type Pills */}
                <div>
                  <span className="block text-[10px] font-bold uppercase text-white/50 mb-1.5">
                    PROPERTY TYPE CATEGORY
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {['Apartment', 'Villa', 'Townhouse', 'Office', 'Warehouse', 'Shop', 'Full Building', 'Land'].map((type) => {
                      const isSelected = String(rentalSpecs.property_type || 'Apartment').toLowerCase() === type.toLowerCase();
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => onRentalSpecChange('property_type', type)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25 font-bold'
                              : 'bg-white/[0.03] text-white/70 hover:text-white border-white/[0.06] hover:bg-white/[0.08]'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">BUILDING / TOWER</label>
                    <input
                      type="text"
                      value={rentalSpecs.building_name ?? ''}
                      onChange={(e) => onRentalSpecChange('building_name', e.target.value)}
                      placeholder="e.g. Marina Gate 2"
                      className="w-full glass-input rounded-xl px-3 py-2 text-white font-semibold text-sm border-blue-500/30"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">UNIT NUMBER</label>
                    <input
                      type="text"
                      value={rentalSpecs.unit_number ?? ''}
                      onChange={(e) => onRentalSpecChange('unit_number', e.target.value)}
                      placeholder="e.g. 1804"
                      className="w-full glass-input rounded-xl px-3 py-2 text-white font-sans tabular-nums font-bold text-sm border-blue-500/30"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">COMMUNITY</label>
                    <input
                      type="text"
                      value={rentalSpecs.community ?? ''}
                      onChange={(e) => onRentalSpecChange('community', e.target.value)}
                      placeholder="e.g. Dubai Marina"
                      className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm border-blue-500/30"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">BEDROOMS</label>
                    <input
                      type="text"
                      value={rentalSpecs.bedrooms ?? ''}
                      onChange={(e) => onRentalSpecChange('bedrooms', e.target.value)}
                      placeholder="e.g. 2 Bedrooms"
                      className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm border-blue-500/30"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">BATHROOMS</label>
                    <input
                      type="text"
                      value={rentalSpecs.bathrooms ?? ''}
                      onChange={(e) => onRentalSpecChange('bathrooms', e.target.value)}
                      placeholder="e.g. 2 Baths"
                      className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm border-blue-500/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">BUA (SQ.FT)</label>
                    <input
                      type="text"
                      value={rentalSpecs.bua_sqft ?? ''}
                      onChange={(e) => onRentalSpecChange('bua_sqft', e.target.value)}
                      placeholder="e.g. 1,250"
                      className="w-full glass-input rounded-xl px-3 py-2 text-white font-sans tabular-nums text-sm border-blue-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">PARKING BAYS</label>
                    <input
                      type="text"
                      value={rentalSpecs.parking_bays ?? ''}
                      onChange={(e) => onRentalSpecChange('parking_bays', e.target.value)}
                      placeholder="e.g. 1 Space"
                      className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm border-blue-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">PLOT NUMBER / AREA</label>
                    <input
                      type="text"
                      value={rentalSpecs.plot_area ?? ''}
                      onChange={(e) => onRentalSpecChange('plot_area', e.target.value)}
                      placeholder="Plot / Municipality #"
                      className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm border-blue-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">CLASSIFICATION</label>
                    <select
                      value={rentalSpecs.category || 'Residential'}
                      onChange={(e) => onRentalSpecChange('category', e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm border-blue-500/30 cursor-pointer"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: COMMERCIAL TERMS & FINANCIALS */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> 3. Rental Financials &amp; Payment Schedule
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Asking Rent */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-emerald-300">
                      ANNUAL ASKING RENT (AED) <span className="text-white">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold text-sm">AED</span>
                      <input
                        type="text"
                        value={rentalSpecs.price ?? ''}
                        onChange={(e) => onRentalSpecChange('price', e.target.value)}
                        placeholder="e.g. 185,000"
                        className="w-full bg-transparent font-bold text-lg text-white placeholder-emerald-500/40 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Cheques Selector */}
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-blue-300">
                      CHEQUES (PAYMENT SCHEDULE) <span className="text-white">*</span>
                    </label>
                    <select
                      value={rentalSpecs.cheques || '4 Cheques'}
                      onChange={(e) => onRentalSpecChange('cheques', e.target.value)}
                      className="w-full bg-transparent font-bold text-sm text-white focus:outline-none cursor-pointer py-1"
                    >
                      <option value="1 Cheque" className="bg-[#0c1829] text-white">1 Cheque (Upfront Annual)</option>
                      <option value="2 Cheques" className="bg-[#0c1829] text-white">2 Cheques (Bi-Annual)</option>
                      <option value="4 Cheques" className="bg-[#0c1829] text-white">4 Cheques (Quarterly - Standard)</option>
                      <option value="6 Cheques" className="bg-[#0c1829] text-white">6 Cheques (Every 2 Months)</option>
                      <option value="12 Cheques" className="bg-[#0c1829] text-white">12 Cheques (Monthly)</option>
                      <option value="1 - 4 Cheques" className="bg-[#0c1829] text-white">1 - 4 Cheques (Negotiable)</option>
                    </select>
                  </div>

                  {/* Auto-Calculated Security Deposit */}
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-purple-300">
                      SECURITY DEPOSIT ({depositRate * 100}%)
                    </label>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-white">
                        AED {calculatedDeposit.toLocaleString()}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-sans tabular-nums">
                        {isFurnished ? 'Furnished (10%)' : 'Unfurnished (5%)'}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Calculated Commission */}
                  <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-sky-300">
                      AGENCY COMMISSION (5% + VAT)
                    </label>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-white">
                        AED {totalCommissionWithVat.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-white/50">
                        (AED {calculatedCommission.toLocaleString()} + 5% VAT)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: MANDATE & REPRESENTATION */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> 4. Brokerage Mandate &amp; Duration
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">
                      MANDATE TYPE
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onRentalSpecChange('agreement_type', 'Non-Exclusive')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          !String(rentalSpecs.agreement_type || '').toLowerCase().includes('exclusive') || String(rentalSpecs.agreement_type || '').toLowerCase().includes('non')
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25'
                            : 'bg-white/[0.03] text-white/60 border-white/[0.06]'
                        }`}
                      >
                        Non-Exclusive
                      </button>
                      <button
                        type="button"
                        onClick={() => onRentalSpecChange('agreement_type', 'Exclusive')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          String(rentalSpecs.agreement_type || '').toLowerCase().includes('exclusive') && !String(rentalSpecs.agreement_type || '').toLowerCase().includes('non')
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/25'
                            : 'bg-white/[0.03] text-white/60 border-white/[0.06]'
                        }`}
                      >
                        Exclusive
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">
                      MANDATE DURATION
                    </label>
                    <select
                      value={rentalSpecs.agreement_duration || '3 Month'}
                      onChange={(e) => onRentalSpecChange('agreement_duration', e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-white text-sm border-blue-500/30 cursor-pointer"
                    >
                      <option value="1 Month">1 Month</option>
                      <option value="2 Month">2 Month</option>
                      <option value="3 Month">3 Month (Standard)</option>
                      <option value="Or Until">Or Until (Specific Date)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">
                      ASSIGNED AGENT NAME
                    </label>
                    <input
                      type="text"
                      value={rentalSpecs.broker_agent_name ?? 'Melanie Simsiman'}
                      onChange={(e) => onRentalSpecChange('broker_agent_name', e.target.value)}
                      placeholder="e.g. Melanie Simsiman"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-white font-semibold text-sm border-blue-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-white/50 mb-1">
                      BROKERAGE FIRM &amp; BRN
                    </label>
                    <input
                      type="text"
                      value={rentalSpecs.broker_name ?? 'A Squared Real Estate LLC'}
                      onChange={(e) => onRentalSpecChange('broker_name', e.target.value)}
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-white/80 text-sm border-blue-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: SIGNATURES & OFFICIAL STAMP */}
              <div className="pt-2 border-t border-white/[0.08] space-y-4">
                {/* Hidden File Input for Emirates ID or Signature upload */}
                <input
                  ref={eidFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEidFileUpload}
                  className="hidden"
                />

                {/* Status Message */}
                {signatureStatusMsg && (
                  <div className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                    signatureStatusMsg.type === 'success' 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : signatureStatusMsg.type === 'error'
                      ? 'bg-red-500/15 border-red-500/30 text-red-300'
                      : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                  }`}>
                    <span className="flex items-center gap-2">
                      {signatureStatusMsg.type === 'info' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      {signatureStatusMsg.type === 'success' && <Check className="w-3.5 h-3.5" />}
                      {signatureStatusMsg.type === 'error' && <AlertTriangle className="w-3.5 h-3.5" />}
                      {signatureStatusMsg.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSignatureStatusMsg(null)}
                      className="p-1 hover:bg-white/10 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  {/* Landlord Signature Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-white/50 flex items-center gap-1.5">
                        <PenTool className="w-3 h-3 text-blue-400" /> FIRST PARTY: REGISTERED LANDLORD SIGNATURE
                      </span>
                      {rentalSpecs.landlord_signature_png ? (
                        <span className="text-[10px] font-sans tabular-nums px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> STAMPED ON PDF
                        </span>
                      ) : (
                        <span className="text-[10px] font-sans tabular-nums px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          AWAITING SIGNATURE
                        </span>
                      )}
                    </div>

                    {/* Interactive Signature Area */}
                    {rentalSpecs.landlord_signature_png ? (
                      <div className="relative rounded-xl border border-dashed border-emerald-500/40 bg-gradient-to-b from-[#0c1c30]/90 to-[#071322]/90 p-3 flex flex-col items-center justify-between min-h-[115px] group">
                        {/* Action buttons top-right */}
                        <div className="w-full flex items-center justify-between text-[11px] mb-1">
                          <span className="text-[10px] font-semibold text-emerald-400/90 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-300" /> Isolated Transparent Ink
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowSignatureFineTuner(!showSignatureFineTuner)}
                              className="px-2 py-0.5 rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[10px] font-semibold flex items-center gap-1 border border-blue-500/30 cursor-pointer"
                              title="Fine-tune crop region & ink darkness"
                            >
                              <Sliders className="w-2.5 h-2.5" />
                              <span>Fine-Tune</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => eidFileInputRef.current?.click()}
                              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 text-[10px] flex items-center gap-1 cursor-pointer"
                              title="Upload different ID photo"
                            >
                              <Upload className="w-2.5 h-2.5" />
                              <span>Replace</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onRentalSpecChange('landlord_signature_png', '');
                                if (viewMode === 'split') setTimeout(refreshSplitPdf, 300);
                              }}
                              className="p-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 cursor-pointer"
                              title="Remove signature"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        {/* Stamped Signature Image floating above line */}
                        <div className="my-1.5 py-1 px-4 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] flex items-center justify-center max-h-16 w-full">
                          <img
                            src={rentalSpecs.landlord_signature_png}
                            alt="Cardholder EID Signature"
                            className="max-h-14 max-w-[220px] object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                          />
                        </div>

                        {/* Dashed Printed Landlord Line */}
                        <div className="w-full pt-1 border-t border-dashed border-white/25 flex items-center justify-between text-[11px]">
                          <span className="text-white/80 font-medium">
                            {rentalSpecs.owner_name || 'Landlord Legal Name'}
                          </span>
                          <span className="text-[10px] text-white/40">Registered Owner</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-3.5 space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          {getAttachedEidUrl() && (
                            <button
                              type="button"
                              onClick={handleExtractFromAttachedEid}
                              disabled={isExtractingSignature}
                              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 cursor-pointer transition-all disabled:opacity-50"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                              <span>{isExtractingSignature ? 'Extracting Signature...' : 'Pull from Attached Emirates ID'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => eidFileInputRef.current?.click()}
                            disabled={isExtractingSignature}
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 font-semibold text-xs border border-blue-500/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Emirates ID or Signature</span>
                          </button>
                        </div>

                        {/* Printed baseline preview */}
                        <div className="pt-2 border-t border-dashed border-white/15 flex items-center justify-between text-[11px] text-white/50">
                          <span className="italic">{rentalSpecs.owner_name || 'Landlord Signature on File'}</span>
                          <span className="text-[10px]">Stamps above line in PDF</span>
                        </div>
                      </div>
                    )}

                    {/* Expandable Fine-Tuner Drawer */}
                    {showSignatureFineTuner && (
                      <div className="p-3.5 rounded-xl bg-[#091524] border border-blue-500/30 space-y-3 animate-fade-in text-xs">
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-blue-400" /> Signature Detection &amp; Ink Isolation Controls
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowSignatureFineTuner(false)}
                            className="text-white/40 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Presets */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-white/50 mb-1.5">
                            Card Signature Region Preset
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {EID_SIGNATURE_PRESETS.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectPreset(p.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-left border transition-all cursor-pointer ${
                                  selectedPresetId === p.id
                                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                                    : 'bg-white/[0.03] text-white/70 hover:bg-white/[0.07] border-white/[0.06]'
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sensitivity Sliders */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <div className="flex justify-between text-[10px] text-white/70 mb-1">
                              <span>Ink Darkness</span>
                              <span className="font-sans tabular-nums text-blue-300">{inkDarkness}</span>
                            </div>
                            <input
                              type="range"
                              min="70"
                              max="150"
                              value={inkDarkness}
                              onChange={(e) => handleSliderUpdate(Number(e.target.value), paperThreshold)}
                              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-white/70 mb-1">
                              <span>Background Clear</span>
                              <span className="font-sans tabular-nums text-blue-300">{paperThreshold}</span>
                            </div>
                            <input
                              type="range"
                              min="160"
                              max="230"
                              value={paperThreshold}
                              onChange={(e) => handleSliderUpdate(inkDarkness, Number(e.target.value))}
                              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Broker Signature Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-white/50">
                        SECOND PARTY: A SQUARED BROKERAGE SIGNATURE
                      </span>
                      <span className="text-[10px] font-sans tabular-nums px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        A² AUTHORIZED
                      </span>
                    </div>

                    <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-3 min-h-[115px] flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/50">Authorized Agent Signatory</span>
                        <span className="text-[10px] text-blue-400 font-sans tabular-nums">DLD BRN Registered</span>
                      </div>
                      <div className="py-2 text-center">
                        <span className="text-base font-serif italic text-white/90">
                          {rentalSpecs.broker_agent_name || 'Melanie Simsiman (Broker)'}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-dashed border-white/20 flex items-center justify-between text-[11px] text-white/60">
                        <span>{rentalSpecs.broker_name || 'A Squared Real Estate LLC'}</span>
                        <span className="text-[10px]">ORN #32840</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW MODE 2: STRUCTURED TABS VIEW                        */}
        {/* ======================================================== */}
        {viewMode === 'form' && (
          <div className="relative z-10 animate-fade-in">
            {/* Tab Selection Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/[0.06] pb-3">
              <button
                type="button"
                onClick={() => setRentalActiveTab('financials')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  rentalActiveTab === 'financials'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-400'
                    : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Commercials &amp; Terms</span>
              </button>

              <button
                type="button"
                onClick={() => setRentalActiveTab('landlord')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  rentalActiveTab === 'landlord'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-400'
                    : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>2. Landlord Details</span>
              </button>

              <button
                type="button"
                onClick={() => setRentalActiveTab('specs')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  rentalActiveTab === 'specs'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-400'
                    : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Property Specs</span>
              </button>

              <button
                type="button"
                onClick={() => setRentalActiveTab('mandate')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  rentalActiveTab === 'mandate'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-400'
                    : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>4. Representation &amp; Mandate</span>
              </button>
            </div>

            {/* Tab 1: Financials */}
            <div className={rentalActiveTab === 'financials' ? "grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in" : "hidden"}>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" /> AGREEMENT FORM DATE
                </label>
                <input
                  type="text"
                  value={rentalSpecs.form_date || ''}
                  onChange={(e) => onRentalSpecChange('form_date', e.target.value)}
                  placeholder="DD/MM/YYYY e.g. 20/10/2026"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <span className="text-emerald-400 font-bold">$</span> ANNUAL ASKING RENT (AED) <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={rentalSpecs.price ?? ''}
                  onChange={(e) => onRentalSpecChange('price', e.target.value)}
                  placeholder="e.g. 185,000"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  PAYMENT TERMS (CHEQUES) <span className="text-blue-500">*</span>
                </label>
                <select
                  value={rentalSpecs.cheques || '4 Cheques'}
                  onChange={(e) => onRentalSpecChange('cheques', e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-medium text-sm cursor-pointer"
                >
                  <option value="1 Cheque">1 Cheque (Upfront Annual)</option>
                  <option value="2 Cheques">2 Cheques (Bi-Annual)</option>
                  <option value="4 Cheques">4 Cheques (Quarterly - Standard)</option>
                  <option value="6 Cheques">6 Cheques (Every 2 Months)</option>
                  <option value="12 Cheques">12 Cheques (Monthly)</option>
                  <option value="1 - 4 Cheques">1 - 4 Cheques (Negotiable)</option>
                </select>
              </div>
            </div>

            {/* Tab 2: Landlord */}
            <div className={rentalActiveTab === 'landlord' ? "grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in" : "hidden"}>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  LANDLORD LEGAL NAME <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={rentalSpecs.owner_name ?? ''}
                  onChange={(e) => onRentalSpecChange('owner_name', e.target.value)}
                  placeholder="Full Legal Name on Title Deed"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> CONTACT PHONE / WHATSAPP <span className="text-blue-500">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={rentalSpecs.owner_phone ?? ''}
                  onChange={(e) => onRentalSpecChange('owner_phone', e.target.value)}
                  placeholder="e.g. +971 50 123 4567"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  LANDLORD EMAIL ADDRESS <span className="text-blue-500">*</span>
                </label>
                <input
                  type="email"
                  value={rentalSpecs.owner_email ?? ''}
                  onChange={(e) => onRentalSpecChange('owner_email', e.target.value)}
                  placeholder="landlord@example.com"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  NATIONALITY
                </label>
                <input
                  type="text"
                  value={rentalSpecs.owner_nationality ?? ''}
                  onChange={(e) => onRentalSpecChange('owner_nationality', e.target.value)}
                  placeholder="e.g. United Arab Emirates"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>
            </div>

            {/* Tab 3: Specs */}
            <div className={rentalActiveTab === 'specs' ? "space-y-4 animate-fade-in" : "hidden"}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                    <Home className="w-3.5 h-3.5 text-white/60" /> PROPERTY TYPE
                  </label>
                  <select
                    value={rentalSpecs.property_type ?? 'Apartment'}
                    onChange={(e) => onRentalSpecChange('property_type', e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm cursor-pointer"
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Land">Land (Plot)</option>
                    <option value="Office">Office</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Shop">Shop / Retail</option>
                    <option value="Building">Full Building</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                    <BedDouble className="w-3.5 h-3.5 text-white/60" /> BEDROOMS
                  </label>
                  <input
                    type="text"
                    value={rentalSpecs.bedrooms ?? ''}
                    onChange={(e) => onRentalSpecChange('bedrooms', e.target.value)}
                    placeholder="e.g. 2 Bedrooms"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5 text-white/60" /> BATHROOMS
                  </label>
                  <input
                    type="text"
                    value={rentalSpecs.bathrooms ?? ''}
                    onChange={(e) => onRentalSpecChange('bathrooms', e.target.value)}
                    placeholder="e.g. 2 Baths"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                    PARKING BAYS
                  </label>
                  <input
                    type="text"
                    value={rentalSpecs.parking_bays ?? ''}
                    onChange={(e) => onRentalSpecChange('parking_bays', e.target.value)}
                    placeholder="e.g. 1 Space"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">BUILDING NAME</label>
                  <input
                    type="text"
                    value={rentalSpecs.building_name ?? ''}
                    onChange={(e) => onRentalSpecChange('building_name', e.target.value)}
                    placeholder="e.g. Marina Gate 2"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">UNIT NUMBER</label>
                  <input
                    type="text"
                    value={rentalSpecs.unit_number ?? ''}
                    onChange={(e) => onRentalSpecChange('unit_number', e.target.value)}
                    placeholder="e.g. 1804"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">COMMUNITY</label>
                  <input
                    type="text"
                    value={rentalSpecs.community ?? ''}
                    onChange={(e) => onRentalSpecChange('community', e.target.value)}
                    placeholder="e.g. Dubai Marina"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">BUA (SQ.FT)</label>
                  <input
                    type="text"
                    value={rentalSpecs.bua_sqft ?? ''}
                    onChange={(e) => onRentalSpecChange('bua_sqft', e.target.value)}
                    placeholder="e.g. 1,250"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Tab 4: Mandate */}
            <div className={rentalActiveTab === 'mandate' ? "grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in" : "hidden"}>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">BROKERAGE FIRM</label>
                <input
                  type="text"
                  value={rentalSpecs.broker_name ?? 'A Squared Real Estate LLC'}
                  onChange={(e) => onRentalSpecChange('broker_name', e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">ASSIGNED AGENT NAME</label>
                <input
                  type="text"
                  value={rentalSpecs.broker_agent_name ?? 'Melanie Simsiman'}
                  onChange={(e) => onRentalSpecChange('broker_agent_name', e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">AGREEMENT DURATION</label>
                <select
                  value={rentalSpecs.agreement_duration || '3 Month'}
                  onChange={(e) => onRentalSpecChange('agreement_duration', e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm cursor-pointer"
                >
                  <option value="1 Month">1 Month</option>
                  <option value="2 Month">2 Month</option>
                  <option value="3 Month">3 Month</option>
                  <option value="Or Until">Or Until (Specific Date)</option>
                </select>
              </div>

              {/* Tab 4 Signature Quick Action */}
              <div className="md:col-span-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Landlord EID Signature Stamping
                    </h4>
                    <p className="text-[11px] text-white/50">
                      {rentalSpecs.landlord_signature_png ? '✓ Signature isolated and ready on PDF' : 'Pull signature from card to stamp above Landlord Name'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {rentalSpecs.landlord_signature_png ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-sans tabular-nums px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active Signature
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('visual');
                          setShowSignatureFineTuner(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Adjust in Visual Editor
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {getAttachedEidUrl() && (
                        <button
                          type="button"
                          onClick={handleExtractFromAttachedEid}
                          disabled={isExtractingSignature}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Pull from EID</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => eidFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload ID</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW MODE 3: LIVE SPLIT-SCREEN REAL-TIME PDF PREVIEW    */}
        {/* ======================================================== */}
        {viewMode === 'split' && (
          <div className="relative z-10 animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Quick visual editor */}
            <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-black/40 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Live Editor
                </span>
                <button
                  type="button"
                  onClick={refreshSplitPdf}
                  disabled={isGeneratingSplitPdf}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingSplitPdf ? 'animate-spin' : ''}`} />
                  <span>Update Live PDF</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Asking Rent (AED)</label>
                  <input
                    type="text"
                    value={rentalSpecs.price ?? ''}
                    onChange={(e) => onRentalSpecChange('price', e.target.value)}
                    placeholder="e.g. 185,000"
                    className="w-full glass-input rounded-lg px-3 py-1.5 text-white font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Cheques Terms</label>
                  <select
                    value={rentalSpecs.cheques || '4 Cheques'}
                    onChange={(e) => onRentalSpecChange('cheques', e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-1.5 text-white text-xs cursor-pointer"
                  >
                    <option value="1 Cheque">1 Cheque (Upfront)</option>
                    <option value="2 Cheques">2 Cheques</option>
                    <option value="4 Cheques">4 Cheques</option>
                    <option value="6 Cheques">6 Cheques</option>
                    <option value="12 Cheques">12 Cheques</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Landlord Name</label>
                  <input
                    type="text"
                    value={rentalSpecs.owner_name ?? ''}
                    onChange={(e) => onRentalSpecChange('owner_name', e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-1.5 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Landlord Phone</label>
                  <input
                    type="text"
                    value={rentalSpecs.owner_phone ?? ''}
                    onChange={(e) => onRentalSpecChange('owner_phone', e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-1.5 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Landlord Email</label>
                  <input
                    type="email"
                    value={rentalSpecs.owner_email ?? ''}
                    onChange={(e) => onRentalSpecChange('owner_email', e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-1.5 text-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Building</label>
                    <input
                      type="text"
                      value={rentalSpecs.building_name ?? ''}
                      onChange={(e) => onRentalSpecChange('building_name', e.target.value)}
                      className="w-full glass-input rounded-lg px-3 py-1.5 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Unit #</label>
                    <input
                      type="text"
                      value={rentalSpecs.unit_number ?? ''}
                      onChange={(e) => onRentalSpecChange('unit_number', e.target.value)}
                      className="w-full glass-input rounded-lg px-3 py-1.5 text-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Bedrooms</label>
                    <input
                      type="text"
                      value={rentalSpecs.bedrooms ?? ''}
                      onChange={(e) => onRentalSpecChange('bedrooms', e.target.value)}
                      className="w-full glass-input rounded-lg px-3 py-1.5 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Bathrooms</label>
                    <input
                      type="text"
                      value={rentalSpecs.bathrooms ?? ''}
                      onChange={(e) => onRentalSpecChange('bathrooms', e.target.value)}
                      className="w-full glass-input rounded-lg px-3 py-1.5 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Embedded Live PDF Preview Frame */}
            <div className="lg:col-span-7 rounded-2xl border border-white/[0.1] bg-black/60 overflow-hidden shadow-2xl relative min-h-[680px] flex flex-col">
              <div className="p-3 bg-black/60 border-b border-white/[0.08] flex items-center justify-between text-xs font-semibold text-white/70">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-400" /> PDF Preview
                </span>
                <button
                  type="button"
                  onClick={refreshSplitPdf}
                  className="text-blue-400 hover:text-blue-300 text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingSplitPdf ? 'animate-spin' : ''}`} /> Refresh Preview
                </button>
              </div>

              <div className="flex-1 w-full h-full min-h-[640px] bg-slate-900 flex items-center justify-center relative">
                {isGeneratingSplitPdf ? (
                  <div className="flex flex-col items-center gap-2 text-white/60">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                    <span className="text-xs">Generating live calibrated PDF...</span>
                  </div>
                ) : splitPdfUrl ? (
                  <iframe
                    src={splitPdfUrl}
                    title="Live Rental Form PDF Preview"
                    className="w-full h-full min-h-[640px] border-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={refreshSplitPdf}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
                  >
                    Click to load live preview
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SALES STUDIO (FOR SALE)
  return (
    <div className="glass-card p-6 mb-8 border border-blue-500/25 bg-gradient-to-br from-[#0c1829] via-[#071322] to-[#020b18] shadow-2xl relative overflow-hidden">
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5 mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-sans font-bold text-white tracking-tight">
              Executive Sales Commercials &amp; Portal Amenities Studio
            </h2>
          </div>
        </div>

        <button
          type="button"
          id="save-sale-specs-btn"
          name="save_sale_specs_btn"
          onClick={onSaveSaleSpecs}
          disabled={isSavingSaleSpecs}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <FileCheck className={`w-4 h-4 ${isSavingSaleSpecs ? 'animate-spin' : ''}`} />
          <span>{isSavingSaleSpecs ? 'Saving Commercials...' : 'Save Sales Commercials'}</span>
        </button>
      </div>

      {/* Form Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 relative z-10">
        <div>
          <label htmlFor="sale_asking_price" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
            ASKING PRICE (AED)
          </label>
          <input
            id="sale_asking_price"
            name="asking_price"
            type="text"
            value={saleSpecs?.asking_price || (listing?.price ? String(listing.price) : '')}
            onChange={(e) => setSaleSpecs && setSaleSpecs((prev) => ({ ...prev, asking_price: e.target.value }))}
            placeholder="e.g. 3,500,000"
            className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold text-sm focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="sale_expected_roi" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
            EXPECTED NET RENTAL YIELD (ROI %)
          </label>
          <input
            id="sale_expected_roi"
            name="expected_roi"
            type="text"
            value={saleSpecs?.expected_roi || '7.8%'}
            onChange={(e) => setSaleSpecs && setSaleSpecs((prev) => ({ ...prev, expected_roi: e.target.value }))}
            placeholder="e.g. 7.5% - 8.2%"
            className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="sale_service_charges" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
            SERVICE CHARGES (AED / SQ.FT)
          </label>
          <input
            id="sale_service_charges"
            name="service_charges"
            type="text"
            value={saleSpecs?.service_charges || '16.50'}
            onChange={(e) => setSaleSpecs && setSaleSpecs((prev) => ({ ...prev, service_charges: e.target.value }))}
            placeholder="e.g. 16.50"
            className="w-full glass-input rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// Icon helper
function FileBadgeIcon(props) {
  return <FileText {...props} />;
}
