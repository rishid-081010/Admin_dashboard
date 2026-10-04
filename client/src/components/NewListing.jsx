import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, Sparkles, Building, Hash, Home, Image as ImageIcon, 
  AlertCircle, BedDouble, Bath, Maximize2, FileText, Check, 
  ShieldCheck, Eye, Sun, Moon, Sunrise, Waves, Sliders, Wand2, Brush, Star,
  FileBadge2, UserCheck, FileCheck, RefreshCw, Layers
} from 'lucide-react';
import axios from 'axios';
import Toast from './Toast';

const ASQUARED_DEFAULT_PROMPT = `You are a real-estate property photo QA and enhancement assistant.

Review the attached property photo for portal advertising.

First assess:
- brightness
- sharpness
- natural appearance
- vertical lines and perspective
- composition
- visible people
- watermarks
- reflections
- clutter
- CGI or AI-generated appearance
- bathroom placement
- floor-plan status
- whether the photo clearly represents the property

Do not change the property or invent furniture, features, amenities or views.

Determine whether the image should be:
- used as-is
- edited
- reordered
- rejected
- sent for human review

If editing is required, edit the real-estate photo conservatively so it still looks like a natural professional photograph.

Improve only:
- exposure
- brightness
- white balance
- clarity
- straightness
- minor photographic imperfections

Preserve exactly:
- actual room layout
- finishes
- furniture
- fixtures
- architectural features
- windows
- doors
- view
- property condition

Do not:
- add furniture
- remove furniture
- add amenities
- remove amenities
- alter the room layout
- add or remove structural features
- change the view
- fabricate property features
- make the image look CGI
- make the image look AI-generated
- over-saturate
- over-sharpen
- distort proportions

If the image contains a floor plan, do not treat it as a normal room photograph. Identify it as a floor plan and evaluate whether it should be included and where it should appear in the photo sequence.

If the image contains people, watermarks, severe clutter, misleading reflections, obvious CGI, or other issues that cannot be safely corrected through conservative editing, flag the issue instead of attempting to hide or fabricate it.

For portal-ready output, target:
1200 x 900 pixels
Natural professional property-advertising style.`;

const PRESETS = [
  {
    id: 'asquared_default',
    label: '⭐ Asquared Default (QA & Strict Guardrail)',
    icon: Star,
    isPrimary: true,
    instruction: ASQUARED_DEFAULT_PROMPT
  },
  {
    id: 'retouch_overall',
    label: 'Overall Luxury Retouch',
    icon: Wand2,
    instruction: 'Professionally enhance lighting, contrast, and high-end color grading for a luxury Dubai architectural magazine finish without modifying structure.'
  },
  {
    id: 'clarity',
    label: 'Clarity & Sharpness',
    icon: Eye,
    instruction: 'Increase micro-contrast, crisp texture sharpness, and optical clarity throughout the image.'
  },
  {
    id: 'declutter',
    label: 'Clean & Declutter',
    icon: Brush,
    instruction: 'Subtly declutter and clean visible floor cables and debris while keeping genuine furniture intact.'
  },
  {
    id: 'brighten',
    label: 'Brighten Dim Interiors',
    icon: Sun,
    instruction: 'Brighten underexposed interior ceilings and lift dark shadow corners naturally.'
  },
  {
    id: 'glare',
    label: 'Balance Glare & Windows',
    icon: Moon,
    instruction: 'Balance extreme outdoor window glare so Dubai skyline views remain clear and visible.'
  },
  {
    id: 'golden_hour',
    label: 'Dubai Golden Hour',
    icon: Sunrise,
    instruction: 'Add warm, ambient golden-hour luxury warmth to window lighting and interior fixtures.'
  },
  {
    id: 'vivid_sky',
    label: 'Vivid Sky & Water',
    icon: Waves,
    instruction: 'Enrich natural sky blue tones and make balcony ocean or pool water look crystal clear.'
  }
];

// Helper to auto-format numbers with commas
const formatNumberWithCommas = (val) => {
  if (!val && val !== 0) return '';
  const clean = val.toString().replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.slice(0, 2).join('.');
};

export default function NewListing({ onListingCreated, onBack }) {
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [purpose, setPurpose] = useState('For Sale');
  const [price, setPrice] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [bedrooms, setBedrooms] = useState('2 Bedrooms');
  const [bathrooms, setBathrooms] = useState('2 Baths');
  const [sizeSqft, setSizeSqft] = useState('');
  const [roughNotes, setRoughNotes] = useState('');

  const [selectedPresets, setSelectedPresets] = useState(['asquared_default']);
  const [compiledPrompt, setCompiledPrompt] = useState(ASQUARED_DEFAULT_PROMPT);
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [isDragging, setIsDragging] = useState(false);

  const [titleDeedFile, setTitleDeedFile] = useState(null);
  const [emiratesIdFiles, setEmiratesIdFiles] = useState([]);
  const [isParsingDocs, setIsParsingDocs] = useState(false);
  const [parsedDeedData, setParsedDeedData] = useState(null);
  const [parsedEidData, setParsedEidData] = useState(null);
  const [kycResult, setKycResult] = useState(null);

  const fileInputRef = useRef(null);
  const deedInputRef = useRef(null);
  const eidInputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
  };

  const triggerDocumentAutoFill = async (deed, eids) => {
    if (!deed && (!eids || eids.length === 0)) return;
    setIsParsingDocs(true);
    setError(null);

    const formData = new FormData();
    if (deed) formData.append('title_deed', deed);
    if (eids && eids.length > 0) {
      eids.forEach((f) => formData.append('emirates_id', f));
    }

    try {
      const res = await axios.post('/api/listings/parse-documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        const { titleDeedData, emiratesIdData, kycResult: kyc } = res.data;
        if (titleDeedData && !titleDeedData.parse_error) {
          setParsedDeedData(titleDeedData);
          const bName = titleDeedData.building_name || 'Luxury Property';
          const uNum = titleDeedData.unit_number ? `Unit ${titleDeedData.unit_number}` : '';
          const comm = titleDeedData.community || 'Dubai';
          setName(`${bName} ${uNum} — ${comm}`.trim());

          const slug = (titleDeedData.building_name || 'DXB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
          setReference(`ASQ-${slug}-${titleDeedData.unit_number || Date.now().toString().slice(-4)}`);

          if (titleDeedData.property_type) {
            setPropertyType(titleDeedData.property_type);
          }
          if (titleDeedData.total_area_sqft || titleDeedData.suite_area_sqft) {
            setSizeSqft(formatNumberWithCommas(String(titleDeedData.total_area_sqft || titleDeedData.suite_area_sqft)));
          }

          const highlights = [
            `Building: ${titleDeedData.building_name || 'N/A'}`,
            `Unit: ${titleDeedData.unit_number || 'N/A'}`,
            `Community: ${titleDeedData.community || 'Dubai'}`,
            `Plot #: ${titleDeedData.plot_number || 'N/A'}`,
            `DLD Deed #: ${titleDeedData.certificate_number || 'N/A'}`,
            `Total Gross Area: ${titleDeedData.total_area_sqft ? titleDeedData.total_area_sqft + ' sqft' : 'N/A'}`,
            `Suite Area: ${titleDeedData.suite_area_sqft ? titleDeedData.suite_area_sqft + ' sqft' : 'N/A'}`,
            `Allocated Parking: ${titleDeedData.parking_bays?.[0] || '1 Space'}`,
            `Mortgage: ${titleDeedData.mortgage_status || 'Free & Clear'}`,
            `Registered Owner: ${titleDeedData.owner_name_english || ''}`
          ].filter(Boolean).join(' | ');

          setRoughNotes(highlights);
        }

        if (emiratesIdData && !emiratesIdData.parse_error) {
          setParsedEidData(emiratesIdData);
        }
        if (kyc) {
          setKycResult(kyc);
        }

        showToast('✨ Details auto-filled instantly from Title Deed & Emirates ID!', 'success');
      } else {
        showToast(res.data.error || 'Failed to auto-parse documents.', 'error');
      }
    } catch (err) {
      console.error('Auto-fill parse error:', err);
      showToast('Could not automatically parse documents. You can still type details manually.', 'error');
    } finally {
      setIsParsingDocs(false);
    }
  };

  const handleTitleDeedUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setTitleDeedFile(file);
      triggerDocumentAutoFill(file, emiratesIdFiles);
    }
  };

  const handleEmiratesIdUpload = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 2);
    if (files.length > 0) {
      setEmiratesIdFiles(files);
      triggerDocumentAutoFill(titleDeedFile, files);
    }
  };

  const handlePriceChange = (e) => {
    setPrice(formatNumberWithCommas(e.target.value));
  };

  const handleSizeChange = (e) => {
    setSizeSqft(formatNumberWithCommas(e.target.value));
  };

  const togglePreset = (presetId) => {
    if (presetId === 'asquared_default') {
      setSelectedPresets(['asquared_default']);
      setCompiledPrompt(ASQUARED_DEFAULT_PROMPT);
      return;
    }

    const withoutDefault = selectedPresets.filter((id) => id !== 'asquared_default');
    const isCurrentlySelected = withoutDefault.includes(presetId);
    const newSelected = isCurrentlySelected
      ? withoutDefault.filter((id) => id !== presetId)
      : [...withoutDefault, presetId];

    if (newSelected.length === 0) {
      setSelectedPresets(['asquared_default']);
      setCompiledPrompt(ASQUARED_DEFAULT_PROMPT);
      return;
    }

    setSelectedPresets(newSelected);

    const activeInstructions = newSelected
      .map((id) => PRESETS.find((p) => p.id === id)?.instruction)
      .filter(Boolean);

    setCompiledPrompt(activeInstructions.join('\n\n') + '\n\nSTRICT REQUIREMENT: Preserve 100% of the actual property layout, room structure, real furniture, and authentic view.');
  };

  const handleFilesAdded = (filesArray) => {
    setError(null);
    const validFiles = [];
    const validPreviews = [];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    Array.from(filesArray).forEach((file) => {
      if (allowedTypes.includes(file.type)) {
        validFiles.push(file);
        validPreviews.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        });
      }
    });

    if (validFiles.length < filesArray.length) {
      setError('Some files were skipped. Only JPG, PNG, and WEBP formats are supported.');
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...validPreviews]);
  };

  // Clipboard Paste Support (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        handleFilesAdded(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (index) => {
    URL.revokeObjectURL(previews[index].url);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a listing or property name (or drop Title Deed to auto-fill).');
      return;
    }
    if (selectedFiles.length === 0) {
      setError('Please upload at least one property image.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('reference', reference);
    formData.append('purpose', purpose);
    formData.append('price', price);
    formData.append('property_type', propertyType);
    formData.append('bedrooms', bedrooms);
    formData.append('bathrooms', bathrooms);
    formData.append('size_sqft', sizeSqft);
    formData.append('rough_notes', roughNotes);
    formData.append('prompt', compiledPrompt);

    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    try {
      let response;
      if (titleDeedFile || parsedDeedData) {
        if (titleDeedFile) formData.append('title_deed', titleDeedFile);
        emiratesIdFiles.forEach((f) => formData.append('emirates_id', f));
        if (parsedDeedData) formData.append('parsed_deed_json', JSON.stringify(parsedDeedData));
        if (parsedEidData) formData.append('parsed_eid_json', JSON.stringify(parsedEidData));
        if (kycResult) formData.append('parsed_kyc_json', JSON.stringify(kycResult));
        formData.append('auto_enhance', 'true');

        response = await axios.post('/api/listings/create-with-dossier', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await axios.post('/api/listings', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (response.data.success) {
        if (onListingCreated) {
          onListingCreated(response.data.listing);
        }
      } else {
        setError(response.data.error || 'Failed to create listing.');
      }
    } catch (err) {
      console.error('Create listing error:', err);
      setError(err.response?.data?.error || 'Failed to connect to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-2 sm:px-4">
      {/* Page Title & Back Button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif font-bold text-white tracking-tight">
            Create Property Listing & AI Package
          </h1>
          <p className="text-slate-400 mt-1 text-xs lg:text-sm font-sans">
            Select photo presets, enter property details, and drag & drop or paste photos from clipboard.
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-[#00284b] hover:bg-[#003666] border border-[#003d73] text-white text-xs font-semibold transition-all shrink-0"
          >
            ← Back to Listings
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SMART DOCUMENT AUTO-FILL INGESTION CARD */}
        <div className="glass-card p-6 border border-blue-500/30 bg-gradient-to-br from-navy-900/60 via-navy-950/60 to-black/60 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08] mb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Zero-Typing Smart Auto-Fill
              </div>
              <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <FileBadge2 className="w-5 h-5 text-blue-400" /> Auto-Fill Listing from Title Deed & Emirates ID
              </h2>
              <p className="text-xs text-slate-400">
                Drop the Title Deed (سند ملكية) and Emirates ID below. Neural OCR will instantly extract all metrics and populate the listing form below automatically.
              </p>
            </div>
            {isParsingDocs && (
              <span className="flex items-center gap-2 text-xs font-bold text-blue-400 animate-pulse bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Neural OCR Extracting...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deed Dropzone */}
            <div>
              <input
                ref={deedInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleTitleDeedUpload}
              />
              <div
                onClick={() => deedInputRef.current?.click()}
                className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-3.5 ${
                  titleDeedFile || parsedDeedData
                    ? 'border-[#003d73]/60 bg-blue-500/10'
                    : 'border-white/[0.12] hover:border-blue-400/40 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  {titleDeedFile || parsedDeedData ? <FileCheck className="w-5 h-5" /> : <FileBadge2 className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-white truncate">
                    {titleDeedFile?.name || (parsedDeedData ? `${parsedDeedData.building_name} (Deed #${parsedDeedData.certificate_number})` : '1. Upload Title Deed / Oqood (سند ملكية)')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {parsedDeedData ? `✓ ${parsedDeedData.total_area_sqft || parsedDeedData.suite_area_sqft} sqft • ${parsedDeedData.community || 'Dubai'}` : 'Click or drop PDF / image scan to auto-fill specs'}
                  </p>
                </div>
                {parsedDeedData && (
                  <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-md">
                    Parsed
                  </span>
                )}
              </div>
            </div>

            {/* EID Dropzone */}
            <div>
              <input
                ref={eidInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleEmiratesIdUpload}
              />
              <div
                onClick={() => eidInputRef.current?.click()}
                className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-3.5 ${
                  emiratesIdFiles.length > 0 || parsedEidData
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-white/[0.12] hover:border-emerald-400/40 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  {emiratesIdFiles.length > 0 || parsedEidData ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-white truncate">
                    {parsedEidData?.full_name_english || (emiratesIdFiles.length > 0 ? `${emiratesIdFiles.length} Emirates ID File(s)` : '2. Upload Emirates ID (Front & Back)')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {parsedEidData ? `✓ EID: ${parsedEidData.eid_number || 'Valid'} (${parsedEidData.nationality})` : 'Click or drop ID card to auto-verify KYC'}
                  </p>
                </div>
                {kycResult && (
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                    KYC {kycResult.confidence_score}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1 — Property Listing Information */}
        <div className="glass-card p-6">
          <h2 className="text-base font-serif font-bold text-white mb-5 flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Building className="w-5 h-5 text-blue-500" /> STEP 1 — Property Listing Information
          </h2>

          <div className="space-y-5">
            {/* Row 1: Name & Reference */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  PROPERTY / BUILDING NAME <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marina Gate 2, Dubai Marina"
                  required
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-bone-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  # REFERENCE (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. MG-2026-09"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-bone-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Row 2: Listing Purpose, Price, Property Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  LISTING PURPOSE
                </label>
                <div className="grid grid-cols-2 gap-2 glass-pill p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPurpose('For Sale')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      purpose === 'For Sale'
                        ? 'bg-[#00284b] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    For Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurpose('For Rent')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      purpose === 'For Rent'
                        ? 'bg-[#00284b] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    For Rent
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <span className="text-blue-500 font-bold">$</span> PRICE (AED)
                </label>
                <input
                  type="text"
                  value={price}
                  onChange={handlePriceChange}
                  placeholder="e.g. 2,850,000"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-bone-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-slate-400" /> PROPERTY TYPE
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-bone-100 focus:outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
            </div>

            {/* Row 3: Bedrooms, Bathrooms, Size */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-slate-400" /> BEDROOMS
                </label>
                <select
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-bone-100 focus:outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="Studio">Studio</option>
                  <option value="1 Bedroom">1 Bedroom</option>
                  <option value="2 Bedrooms">2 Bedrooms</option>
                  <option value="3 Bedrooms">3 Bedrooms</option>
                  <option value="4 Bedrooms">4 Bedrooms</option>
                  <option value="5+ Bedrooms">5+ Bedrooms</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5 text-slate-400" /> BATHROOMS
                </label>
                <select
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-bone-100 focus:outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="1 Bath">1 Bath</option>
                  <option value="2 Baths">2 Baths</option>
                  <option value="3 Baths">3 Baths</option>
                  <option value="4 Baths">4 Baths</option>
                  <option value="5+ Baths">5+ Baths</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> SIZE (SQ. FT.)
                </label>
                <input
                  type="text"
                  value={sizeSqft}
                  onChange={handleSizeChange}
                  placeholder="e.g. 1,450"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-bone-100 placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Row 4: Rough Notes */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-500" /> ROUGH NOTES & HIGHLIGHTS (FOR BAYUT & PROPERTY FINDER GENERATOR)
              </label>
              <textarea
                rows={3}
                value={roughNotes}
                onChange={(e) => setRoughNotes(e.target.value)}
                placeholder="e.g. Full Marina view, high floor, chiller free, upgraded kitchen, vacant on transfer, infinity pool access, 2 mins to tram..."
                className="w-full glass-input rounded-xl p-3.5 text-bone-100 text-sm placeholder-slate-500 focus:outline-none transition-all leading-relaxed"
              ></textarea>
            </div>
          </div>
        </div>

        {/* STEP 2 — Upload Listing Photos */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-5">
            <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-500" /> STEP 2 — Upload Listing Photos
            </h2>
            <span className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full font-medium border border-blue-500/25">
              {previews.length} photos selected
            </span>
          </div>

          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-400 bg-blue-500/10 scale-[0.99]'
                : 'border-white/[0.12] hover:border-[#003d73]/50 bg-black/20 hover:bg-black/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
            />

            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-black/40">
              <Upload className="w-7 h-7" />
            </div>

            <p className="text-sm font-semibold text-white">
              Drag & drop property images, or <span className="text-blue-400 underline decoration-khaki-400/50 underline-offset-4">browse files</span>
            </p>
            <p className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1 flex-wrap font-sans">
              <span>✨ Direct Clipboard Paste supported:</span>
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 glass-pill rounded text-[11px] font-mono text-blue-400">Ctrl + V</kbd>
              <span>anywhere to paste photos directly from WhatsApp or email!</span>
            </p>
          </div>

          {/* Image Previews */}
          {previews.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Uploaded Photos ({previews.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    previews.forEach((p) => URL.revokeObjectURL(p.url));
                    setPreviews([]);
                    setSelectedFiles([]);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {previews.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative group bg-black/40 rounded-xl overflow-hidden border border-white/[0.08] shadow-md hover:border-blue-500/40 transition-all"
                  >
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-md transition-colors shadow-md"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="p-1.5 bg-black/60 border-t border-white/[0.06]">
                      <p className="text-[10px] font-medium text-bone-100 truncate">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* STEP 3 — AI Enhancement Presets & Prompt */}
        <div className="glass-card p-6">
          <div className="border-b border-white/[0.06] pb-3 mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" /> STEP 3 — Real Estate Photo QA & Enhancement Preset
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Non-destructive conservative enhancement. Zero structural alterations or hallucinations.
              </p>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Hard Guardrails Active
            </span>
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {PRESETS.map((preset) => {
              const isSelected = selectedPresets.includes(preset.id);
              const IconComp = preset.icon;
              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => togglePreset(preset.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-500/15 border-[#003d73] text-white shadow-sm'
                      : 'glass-pill text-slate-300 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <IconComp className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-300' : 'text-slate-200'}`}>
                      {preset.label}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0 ml-1 stroke-[3]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* COMPILED AI INSTRUCTIONS (EDITABLE) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center justify-between">
              <span>ACTIVE QA & ENHANCEMENT PROMPT (EDITABLE)</span>
              <span className="text-[10px] text-slate-400 font-normal">Strict Real Estate Protocol</span>
            </label>
            <textarea
              rows={8}
              value={compiledPrompt}
              onChange={(e) => setCompiledPrompt(e.target.value)}
              placeholder="QA & enhancement prompt instructions..."
              className="w-full glass-input rounded-xl p-3.5 text-bone-100 text-xs font-mono placeholder-slate-500 focus:outline-none transition-all leading-relaxed"
            ></textarea>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || selectedFiles.length === 0}
            className={`px-8 py-4 rounded-2xl font-bold text-white text-base flex items-center gap-3 transition-all shadow-xl ${
              isSubmitting || selectedFiles.length === 0
                ? 'bg-navy-800 text-slate-500 cursor-not-allowed border border-white/[0.08]'
                : 'bg-gradient-to-r from-[#00284b] to-[#003d73] hover:from-[#003666] hover:to-[#004b8c] shadow-blue-950/40 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            {isSubmitting ? 'Evaluating QA & Enhancing Photos...' : `RUN QA & ENHANCE ${selectedFiles.length} PHOTOS`}
          </button>
        </div>
      </form>

      {/* Clean popup toast */}
      <Toast
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast({ msg: '', type: 'success' })}
      />
    </div>
  );
}
