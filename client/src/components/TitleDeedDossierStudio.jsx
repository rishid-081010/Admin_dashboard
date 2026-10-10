import React, { useState, useRef } from 'react';
import {
  FileText,
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Sparkles,
  Building2,
  UserCheck,
  Layers,
  Copy,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  Sliders,
  Image as ImageIcon,
  Check,
  AlertCircle,
  FileBadge2,
  BadgePercent,
  Calendar,
  Lock,
  ArrowRight,
  FolderArchive
} from 'lucide-react';
import Toast from './Toast';

export default function TitleDeedDossierStudio({ onSelectListing }) {
  // Uploaded Files State
  const [titleDeedFile, setTitleDeedFile] = useState(null);
  const [emiratesIdFiles, setEmiratesIdFiles] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  // Extracted Data State (Live OCR)
  const [isParsingDocs, setIsParsingDocs] = useState(false);
  const [titleDeedData, setTitleDeedData] = useState(null);
  const [emiratesIdData, setEmiratesIdData] = useState(null);
  const [kycResult, setKycResult] = useState(null);

  // Commercial & Broker Customization
  const [price, setPrice] = useState('');
  const [purpose, setPurpose] = useState('For Sale');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [furnishing, setFurnishing] = useState('Furnished');
  const [brokerName, setBrokerName] = useState('A SQUARED Advisory Desk');
  const [brokerBrn, setBrokerBrn] = useState('ORN: 28491 / BRN: 54120');
  const [brokerPhone, setBrokerPhone] = useState('+971 4 000 0000');
  const [brokerEmail, setBrokerEmail] = useState('luxury@asquared.ae');
  const [commissionRate, setCommissionRate] = useState('2.0% + VAT');
  const [validityDays, setValidityDays] = useState(90);
  const [copyTone, setCopyTone] = useState('luxury');

  // Generation & Results State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState('');
  const [generatedListing, setGeneratedListing] = useState(null);
  const [activePreviewTab, setActivePreviewTab] = useState('dossier'); // 'dossier' | 'noc' | 'copy' | 'photos' | 'documents'
  const [toast, setToast] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Refs for file inputs
  const deedInputRef = useRef(null);
  const eidInputRef = useRef(null);
  const photosInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // 1. Handle Document Fast OCR Parse
  const triggerFastDocumentOcr = async (deed, eids) => {
    if (!deed && (!eids || eids.length === 0)) return;

    setIsParsingDocs(true);
    const formData = new FormData();
    if (deed) formData.append('title_deed', deed);
    if (eids && eids.length > 0) {
      eids.forEach(f => formData.append('emirates_id', f));
    }

    try {
      const res = await fetch('/api/listings/parse-documents', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        if (data.titleDeedData && !data.titleDeedData.parse_error) {
          setTitleDeedData(data.titleDeedData);
          if (data.titleDeedData.property_type && !bedrooms) {
            // Auto suggest
          }
        }
        if (data.emiratesIdData && !data.emiratesIdData.parse_error) {
          setEmiratesIdData(data.emiratesIdData);
        }
        if (data.kycResult) {
          setKycResult(data.kycResult);
        }
        showToast('Document intelligence extracted successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to parse documents.', 'error');
      }
    } catch (err) {
      console.error('OCR Parse error:', err);
      showToast('Error analyzing documents. You can still proceed with manual inputs.', 'error');
    } finally {
      setIsParsingDocs(false);
    }
  };

  // Handlers for File Selection
  const handleTitleDeedSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setTitleDeedFile(file);
      triggerFastDocumentOcr(file, emiratesIdFiles);
    }
  };

  const handleEmiratesIdSelect = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 2);
    if (files.length > 0) {
      setEmiratesIdFiles(files);
      triggerFastDocumentOcr(titleDeedFile, files);
    }
  };

  const handlePhotosSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPhotoFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
        size: (file.size / 1024 / 1024).toFixed(2),
      }));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
      showToast(`${files.length} photo(s) staged for darkroom enhancement.`, 'success');
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 2. Submit & Compile Master Dossier
  const handleGenerateMasterDossier = async () => {
    if (!titleDeedFile && !titleDeedData) {
      showToast('Please upload a Dubai Title Deed (سند ملكية) or Oqood.', 'error');
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress('Running neural OCR document analysis...');

    try {
      const formData = new FormData();
      if (titleDeedFile) formData.append('title_deed', titleDeedFile);
      emiratesIdFiles.forEach(f => formData.append('emirates_id', f));
      photoFiles.forEach(f => formData.append('images', f));

      // Append pre-parsed data if already available
      if (titleDeedData) formData.append('parsed_deed_json', JSON.stringify(titleDeedData));
      if (emiratesIdData) formData.append('parsed_eid_json', JSON.stringify(emiratesIdData));
      if (kycResult) formData.append('parsed_kyc_json', JSON.stringify(kycResult));

      // Commercial params
      formData.append('price', price);
      formData.append('purpose', purpose);
      formData.append('bedrooms', bedrooms);
      formData.append('bathrooms', bathrooms);
      formData.append('furnishing', furnishing);
      formData.append('broker_name', brokerName);
      formData.append('broker_brn', brokerBrn);
      formData.append('broker_phone', brokerPhone);
      formData.append('broker_email', brokerEmail);
      formData.append('commission_rate', commissionRate);
      formData.append('validity_days', String(validityDays));
      formData.append('copy_tone', copyTone);
      formData.append('auto_enhance', 'true');

      setSubmitProgress('Compiling DLD Form A NOC & generating bilingual copy...');

      const res = await fetch('/api/listings/create-with-dossier', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedListing(data.listing);
        if (data.listing?.title_deed_data) setTitleDeedData(data.listing.title_deed_data);
        if (data.listing?.emirates_id_data) setEmiratesIdData(data.listing.emirates_id_data);
        if (data.listing?.kyc_result) setKycResult(data.listing.kyc_result);

        showToast('Luxury Master Dossier & Form A NOC generated successfully!', 'success');
        setActivePreviewTab('dossier');
      } else {
        showToast(data.error || 'Failed to generate dossier.', 'error');
      }
    } catch (err) {
      console.error('Submission error:', err);
      showToast('Error generating dossier. Please check your network and inputs.', 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitProgress('');
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900/90 via-navy-950/90 to-black/95 border border-white/[0.1] p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-widest backdrop-blur-md">
              <FileBadge2 className="w-4 h-4" /> DLD FORM A & MASTER DOSSIER STUDIO
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              Title Deed, Emirates ID & NOC Unified Dossier
            </h1>
            <p className="text-white/80 text-sm max-w-3xl leading-relaxed">
              Upload the client's <span className="text-blue-300 font-semibold">Title Deed (سند ملكية)</span>, <span className="text-blue-300 font-semibold">Emirates ID</span>, and <span className="text-blue-300 font-semibold">Property Photos</span>. The system automatically executes OCR cross-validation, verifies legal ownership KYC, authors DLD Form A NOC marketing authorization, generates English & Arabic portal listings, and compiles an All-In-One Unified Master Transaction Dossier PDF.
            </p>
          </div>

          {generatedListing && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* 1. All-in-one Master Bundle ZIP */}
              <a
                href={`/api/listings/${generatedListing.id}/download-master-bundle-zip`}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white font-bold text-xs shadow-xl shadow-blue-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                title="Download Complete Bundle: 5-Page Dossier + NOC + Copy + Gov Docs + Enhanced Photos"
              >
                <FolderArchive className="w-4 h-4" /> ALL-IN-ONE BUNDLE (ZIP)
              </a>

              {/* 2. Official Gov Docs ZIP */}
              <a
                href={`/api/listings/${generatedListing.id}/download-gov-zip`}
                className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] text-emerald-300 font-bold text-xs transition-all"
                title="Download Official Government Files: Title Deed + Emirates ID + Form A NOC + KYC Certificate"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> GOV & NOC (ZIP)
              </a>

              {/* 3. Photos ZIP */}
              <a
                href={`/api/listings/${generatedListing.id}/download-zip`}
                className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] text-sky-300 font-bold text-xs transition-all"
                title="Download Enhanced Listing Photos"
              >
                <ImageIcon className="w-4 h-4 text-sky-400" /> PHOTOS (ZIP)
              </a>

              {/* 4. Master Dossier PDF */}
              <button
                onClick={() => window.open(`/api/listings/${generatedListing.id}/dossier-pdf`, '_blank')}
                className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 font-semibold text-xs transition-all"
              >
                <Download className="w-4 h-4 text-blue-400" /> Master PDF
              </button>

              {onSelectListing && (
                <button
                  onClick={() => onSelectListing(generatedListing)}
                  className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white/80 font-semibold text-xs transition-all"
                >
                  <Sliders className="w-4 h-4 text-blue-400" /> Open in Studio
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Workflow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Ingestion & Commercial Config (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Three Ingestion Zones */}
          <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-blue-400" /> Document & Photo Ingestion
              </h2>
              {isParsingDocs && (
                <span className="flex items-center gap-1.5 text-xs text-blue-400 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Neural OCR Analyzing...
                </span>
              )}
            </div>

            {/* Dropzone A: Title Deed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-400" /> 1. Title Deed / Oqood (سند ملكية)
                </span>
                <span className="text-blue-400/80 text-[11px] font-mono uppercase">PDF / Image (Max 1)</span>
              </div>
              <input
                ref={deedInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleTitleDeedSelect}
              />
              <div
                onClick={() => deedInputRef.current?.click()}
                className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center group ${
                  titleDeedFile || titleDeedData
                    ? 'border-white/[0.04] bg-white/[0.02] hover:bg-blue-500/10'
                    : 'border-white/[0.12] hover:border-blue-400/40 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                {titleDeedFile || titleDeedData ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {titleDeedFile?.name || `${titleDeedData?.building_name || 'Title Deed'} — Unit ${titleDeedData?.unit_number || ''}`}
                      </p>
                      <p className="text-[11px] text-blue-400 font-mono">
                        DLD Cert: {titleDeedData?.certificate_number || 'OCR Extracted'} • {titleDeedData?.total_area_sqft ? `${titleDeedData.total_area_sqft} sqft` : 'Ready'}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/20 px-2 py-1 rounded-md">
                      Verified
                    </span>
                  </div>
                ) : (
                  <div className="py-2 space-y-1">
                    <FileText className="w-6 h-6 text-white/60 mx-auto group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                    <p className="text-xs font-semibold text-white/80">Click or drop Title Deed PDF / scan here</p>
                    <p className="text-[10px] text-white/40">Auto-extracts DLD Cert #, Owner Name, Gross SqFt, Unit & Plot</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dropzone B: Emirates ID */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> 2. Emirates ID (Front & Back)
                </span>
                <span className="text-emerald-400/80 text-[11px] font-mono uppercase">PDF / Image (Max 2)</span>
              </div>
              <input
                ref={eidInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleEmiratesIdSelect}
              />
              <div
                onClick={() => eidInputRef.current?.click()}
                className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center group ${
                  emiratesIdFiles.length > 0 || emiratesIdData
                    ? 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'border-white/[0.12] hover:border-emerald-400/40 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                {emiratesIdFiles.length > 0 || emiratesIdData ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {emiratesIdData?.full_name_english || (emiratesIdFiles.length > 0 ? `${emiratesIdFiles.length} ID Card File(s)` : 'Emirates ID')}
                      </p>
                      <p className="text-[11px] text-emerald-400 font-mono">
                        EID: {emiratesIdData?.eid_number || '784-XXXX-XXXXXXX-X'} • {emiratesIdData?.nationality || 'UAE Resident'}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-md">
                      KYC Read
                    </span>
                  </div>
                ) : (
                  <div className="py-2 space-y-1">
                    <UserCheck className="w-6 h-6 text-white/60 mx-auto group-hover:text-emerald-400 group-hover:scale-110 transition-all" />
                    <p className="text-xs font-semibold text-white/80">Click or drop Emirates ID (Front / Back)</p>
                    <p className="text-[10px] text-white/40">Auto-matches legal owner name against Title Deed registry</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dropzone C: Property Photos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-sky-400" /> 3. Property Photos (Bulk Upload)
                </span>
                <span className="text-sky-400/80 text-[11px] font-mono uppercase">{photoFiles.length} Selected</span>
              </div>
              <input
                ref={photosInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handlePhotosSelect}
              />
              <div
                onClick={() => photosInputRef.current?.click()}
                className="p-4 rounded-2xl border-2 border-dashed border-white/[0.12] hover:border-sky-400/40 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
              >
                <div className="py-2 space-y-1">
                  <UploadCloud className="w-6 h-6 text-white/60 mx-auto group-hover:text-sky-400 group-hover:scale-110 transition-all" />
                  <p className="text-xs font-semibold text-white/80">Drop high-resolution property photos</p>
                  <p className="text-[10px] text-white/40">Non-destructive optical darkroom enhancement applied automatically</p>
                </div>
              </div>

              {/* Photos Preview Strip */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2 max-h-36 overflow-y-auto pr-1">
                  {photoPreviews.map((photo, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-navy-950 border border-white/[0.1]">
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(idx);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Commercial & Broker Authorization Inputs */}
          <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
              <FileBadge2 className="w-5 h-5 text-blue-400" /> Commercial Terms & Form A Parameters
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block mb-1">
                  Asking Price (AED)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4,850,000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs font-mono focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block mb-1">
                  Listing Purpose
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-navy-900 border border-white/[0.1] text-white text-xs focus:border-blue-400 focus:outline-none"
                >
                  <option value="For Sale">For Sale</option>
                  <option value="For Rent">For Rent (Annual)</option>
                  <option value="Short Term Luxury">Short Term Luxury</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block mb-1">
                  Bedrooms
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2 Beds / 3 Beds + Maid"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block mb-1">
                  Furnishing
                </label>
                <select
                  value={furnishing}
                  onChange={(e) => setFurnishing(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-navy-900 border border-white/[0.1] text-white text-xs focus:border-blue-400 focus:outline-none"
                >
                  <option value="Furnished">Furnished (Turnkey)</option>
                  <option value="Unfurnished">Unfurnished</option>
                  <option value="Semi-Furnished">Semi-Furnished</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block mb-1">
                  Broker Commission
                </label>
                <input
                  type="text"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block mb-1">
                  Form A Validity (Days)
                </label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs font-mono focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Broker Rep */}
            <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block mb-1">
                  Agent / Advisor Name
                </label>
                <input
                  type="text"
                  value={brokerName}
                  onChange={(e) => setBrokerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block mb-1">
                  RERA BRN / ORN
                </label>
                <input
                  type="text"
                  value={brokerBrn}
                  onChange={(e) => setBrokerBrn(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs font-mono focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isSubmitting || (!titleDeedFile && !titleDeedData)}
              onClick={handleGenerateMasterDossier}
              className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2.5 transition-all ${
                isSubmitting || (!titleDeedFile && !titleDeedData)
                  ? 'bg-slate-800 text-white/40 cursor-not-allowed border border-white/[0.05]'
                  : 'bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white hover:scale-[1.01] active:scale-[0.99] shadow-blue-950/40'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{submitProgress || 'Processing Unified Dossier...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate All-In-One Master Dossier & Form A NOC</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Dossier Inspector & Preview Tabs (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* KYC Match & Verification Bar */}
          {kycResult && (
            <div className={`glass-panel p-5 rounded-3xl border transition-all ${
              kycResult.status === 'VERIFIED_MATCH'
                ? 'border-emerald-500/40 bg-emerald-950/20'
                : 'border-amber-500/40 bg-amber-950/20'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base ${
                    kycResult.status === 'VERIFIED_MATCH'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {kycResult.confidence_score}%
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      DLD & KYC Verification: {kycResult.status === 'VERIFIED_MATCH' ? 'Owner Match Confirmed' : 'Verification Review Needed'}
                    </h3>
                    <p className="text-xs text-white/80">
                      Title Deed Owner: <span className="font-semibold text-white">{kycResult.title_deed_owner}</span> • EID: <span className="font-semibold text-white">{kycResult.emirates_id_name}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    kycResult.status === 'VERIFIED_MATCH'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {kycResult.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* DLD Verified Property Specs Matrix (If Extracted) */}
          {titleDeedData && !titleDeedData.parse_error && (
            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Verified DLD Property Specifications
                </h3>
                <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                  Deed #{titleDeedData.certificate_number || '2024/DXB'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] uppercase font-bold text-white/60">Building / Project</p>
                  <p className="text-xs font-bold text-white truncate mt-0.5">{titleDeedData.building_name || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] uppercase font-bold text-white/60">Unit Number</p>
                  <p className="text-xs font-bold text-blue-300 font-mono mt-0.5">{titleDeedData.unit_number || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] uppercase font-bold text-white/60">Community</p>
                  <p className="text-xs font-bold text-white truncate mt-0.5">{titleDeedData.community || 'Dubai'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] uppercase font-bold text-white/60">Total Gross Area</p>
                  <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                    {titleDeedData.total_area_sqft ? `${titleDeedData.total_area_sqft.toLocaleString()} Sq.Ft` : 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] uppercase font-bold text-white/60">Suite Area</p>
                  <p className="text-xs font-bold text-white font-mono mt-0.5">
                    {titleDeedData.suite_area_sqft ? `${titleDeedData.suite_area_sqft.toLocaleString()} Sq.Ft` : 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] uppercase font-bold text-white/60">Encumbrance / Mortgage</p>
                  <p className="text-xs font-bold text-slate-200 truncate mt-0.5">{titleDeedData.mortgage_status || 'Free & Clear'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Output Tabs */}
          <div className="glass-panel rounded-3xl border border-white/[0.08] overflow-hidden">
            {/* Tab Selector */}
            <div className="flex items-center gap-1 p-2 bg-navy-950/60 border-b border-white/[0.06] overflow-x-auto">
              <button
                onClick={() => setActivePreviewTab('dossier')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activePreviewTab === 'dossier'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> All-In-One Master PDF
              </button>
              <button
                onClick={() => setActivePreviewTab('noc')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activePreviewTab === 'noc'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <FileBadge2 className="w-3.5 h-3.5" /> Form A NOC Agreement
              </button>
              <button
                onClick={() => setActivePreviewTab('copy')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activePreviewTab === 'copy'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Bilingual Copy (EN/AR)
              </button>
              <button
                onClick={() => setActivePreviewTab('photos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  activePreviewTab === 'photos'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Photo Suite ({photoFiles.length})
              </button>
            </div>

            {/* Tab 1: Master Dossier PDF Viewer */}
            {activePreviewTab === 'dossier' && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div>
                    <h4 className="text-sm font-bold text-white">Unified Master Transaction Dossier (5 Pages)</h4>
                    <p className="text-xs text-white/60">
                      Embeds Executive Property Specs + KYC Verification + Form A NOC + English & Arabic Listing + Darkroom Photos + Scans of Title Deed & EID.
                    </p>
                  </div>
                  {generatedListing ? (
                    <div className="flex gap-2">
                      <a
                        href={`/api/listings/${generatedListing.id}/dossier-pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-white/[0.06] text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-khaki-400 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View PDF
                      </a>
                      <a
                        href={`/api/listings/${generatedListing.id}/dossier-pdf`}
                        download={`${generatedListing.name || 'Listing'}_Master_Dossier.pdf`}
                        className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-white/40 italic">Generate dossier to unlock 1-click download</span>
                  )}
                </div>

                {/* Dossier Structure Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                      <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">1</span>
                      Executive Property & KYC Sheet
                    </div>
                    <p className="text-[11px] text-white/60">
                      Official DLD certificate metrics, square footage breakdown, community stats, and matched legal ownership score.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                      <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">2</span>
                      DLD Form A Marketing NOC
                    </div>
                    <p className="text-[11px] text-white/60">
                      Ready-to-sign brokerage representation agreement with RERA regulatory terms and dual signature execution blocks.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                      <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">3</span>
                      English & Arabic Portal Copy
                    </div>
                    <p className="text-[11px] text-white/60">
                      Property Finder & Bayut formatted headlines, curated bullet points, and luxury editorial narrative in both languages.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                      <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">4</span>
                      Enhanced Darkroom Photo Gallery
                    </div>
                    <p className="text-[11px] text-white/60">
                      High-resolution visual grid showing optically balanced interior and architectural views.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Form A NOC Agreement Preview */}
            {activePreviewTab === 'noc' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h4 className="text-sm font-bold text-white">Form A — Broker Marketing Authorization & NOC</h4>
                    <p className="text-xs text-white/60">Dubai Land Department & RERA Compliant Representation Contract</p>
                  </div>
                  {generatedListing && (
                    <a
                      href={`/api/listings/${generatedListing.id}/noc-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-white/[0.06] text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download NOC PDF
                    </a>
                  )}
                </div>

                {/* Form A Preview Card */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4 text-xs">
                  <div className="flex justify-between items-center text-white/60 border-b border-white/[0.06] pb-3">
                    <span className="font-serif font-bold text-blue-400">A SQUARED REAL ESTATE • ORN 28491</span>
                    <span>Ref: {generatedListing?.reference || 'ASQ-NOC-2026'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-navy-950/60 border border-white/[0.05]">
                      <span className="text-[10px] uppercase font-bold text-white/60 block mb-1">Owner / Principal</span>
                      <p className="font-bold text-white">{titleDeedData?.owner_name_english || emiratesIdData?.full_name_english || 'Authorized Property Owner'}</p>
                      <p className="text-white/60 font-mono text-[11px]">EID: {emiratesIdData?.eid_number || '784-XXXX-XXXXXXX-X'}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-navy-950/60 border border-white/[0.05]">
                      <span className="text-[10px] uppercase font-bold text-white/60 block mb-1">Authorized Broker</span>
                      <p className="font-bold text-white">{brokerName}</p>
                      <p className="text-white/60 font-mono text-[11px]">{brokerBrn}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-navy-950/60 border border-white/[0.05] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-white/60 block">Property Representation</span>
                    <p className="font-semibold text-white">
                      {titleDeedData?.building_name || 'Property'} {titleDeedData?.unit_number ? `— Unit ${titleDeedData.unit_number}` : ''} ({titleDeedData?.community || 'Dubai'})
                    </p>
                    <p className="text-white/60">
                      Asking Price: <span className="text-blue-300 font-mono font-bold">AED {price || 'On Application'}</span> • Commission: <span className="text-white font-mono">{commissionRate}</span> • Validity: <span className="text-white font-mono">{validityDays} Days</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Bilingual Portal Copy */}
            {activePreviewTab === 'copy' && (
              <div className="p-6 space-y-6">
                {generatedListing?.copy_data ? (
                  <div className="space-y-6">
                    {/* English Copy */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">English Portal Listing (Property Finder & Bayut)</span>
                        <button
                          onClick={() => copyToClipboard(
                            `${generatedListing.copy_data.english.title}\n\n${generatedListing.copy_data.english.description}\n\nKey Features:\n${generatedListing.copy_data.english.bullet_points?.join('\n')}`,
                            'en_copy'
                          )}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white/80 flex items-center gap-1.5"
                        >
                          {copiedKey === 'en_copy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy English
                        </button>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                        <h4 className="text-sm font-bold text-white">{generatedListing.copy_data.english.title}</h4>
                        <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">{generatedListing.copy_data.english.description}</p>
                      </div>
                    </div>

                    {/* Arabic Copy */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Arabic Portal Listing (الإعلان باللغة العربية)</span>
                        <button
                          onClick={() => copyToClipboard(
                            `${generatedListing.copy_data.arabic.title}\n\n${generatedListing.copy_data.arabic.description}`,
                            'ar_copy'
                          )}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white/80 flex items-center gap-1.5"
                        >
                          {copiedKey === 'ar_copy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          نسخ النص العربي
                        </button>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3 text-right" dir="rtl">
                        <h4 className="text-sm font-bold text-white font-serif">{generatedListing.copy_data.arabic.title}</h4>
                        <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">{generatedListing.copy_data.arabic.description}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-white/60 space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-white/40" />
                    <p className="text-xs font-semibold">Generate the listing to view and copy bilingual portal copy.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Photo Gallery Preview */}
            {activePreviewTab === 'photos' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h4 className="text-sm font-bold text-white">Property Photo Suite</h4>
                    <p className="text-xs text-white/60">{photoFiles.length} photo(s) queued for optical enhancement</p>
                  </div>
                  {generatedListing && (
                    <a
                      href={`/api/listings/${generatedListing.id}/download-zip`}
                      className="px-4 py-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Photos ZIP
                    </a>
                  )}
                </div>

                {photoPreviews.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photoPreviews.map((photo, idx) => (
                      <div key={idx} className="rounded-2xl overflow-hidden bg-navy-950 border border-white/[0.08] aspect-video relative group">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-[10px] text-white font-mono truncate">{photo.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-white/60 space-y-2">
                    <ImageIcon className="w-8 h-8 mx-auto text-white/40" />
                    <p className="text-xs font-semibold">No photos uploaded yet. Drop photos on the left panel to include them.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
