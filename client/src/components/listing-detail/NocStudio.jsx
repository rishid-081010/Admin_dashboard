import React, { useState } from 'react';
import { 
  Building2, Phone, Mail, Home, BedDouble, Bath, 
  Calendar, ShieldCheck, DollarSign, FileCheck, FileText, 
  Download, Eye, AlertTriangle, CheckCircle2, Sparkles, Check 
} from 'lucide-react';

export default function NocStudio({
  listing,
  rentalSpecs,
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
  const [rentalActiveTab, setRentalActiveTab] = useState('financials'); // 'financials' | 'landlord' | 'specs' | 'mandate'
  const [saleActiveTab, setSaleActiveTab] = useState('commercials'); // 'commercials' | 'amenities' | 'title'

  const isRental = String(listing?.purpose || '').toLowerCase().includes('rent');

  // Stamping Readiness Checklist for Rental
  const isMissingPhone = !rentalSpecs.owner_phone || !String(rentalSpecs.owner_phone).trim();
  const isMissingEmail = !rentalSpecs.owner_email || !String(rentalSpecs.owner_email).trim();
  const isMissingPrice = !rentalSpecs.price || !String(rentalSpecs.price).trim();
  const isMissingBeds = !rentalSpecs.bedrooms || !String(rentalSpecs.bedrooms).trim();
  const isMissingBaths = !rentalSpecs.bathrooms || !String(rentalSpecs.bathrooms).trim();
  const missingCount = [isMissingPhone, isMissingEmail, isMissingPrice, isMissingBeds, isMissingBaths].filter(Boolean).length;

  if (isRental) {
    return (
      <div className="glass-card p-6 mb-8 border border-blue-500/30 bg-gradient-to-br from-[#0c1829] via-[#071322] to-[#020b18] shadow-2xl relative overflow-hidden">
        {/* Glow Element */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5 mb-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <FileBadgeIcon className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-sans font-bold text-white tracking-tight">
                Official Dubai Land Department (DLD) Rental NOC Agreement Studio
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                1:1 Calibrated PDF Overlay
              </span>
            </div>
            <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
              Edit the official agreement terms below. All fields automatically synchronize and stamp directly onto the official A SQUARED DLD Rental Form template.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
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
              <span>{isPreviewingPdf ? 'Generating PDF...' : 'Preview Stamped PDF'}</span>
            </button>

            <button
              type="button"
              id="download-rental-pdf-btn"
              name="download_rental_pdf_btn"
              onClick={onDownloadPdf}
              disabled={isDownloadingPdf}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer disabled:opacity-60"
              title="Direct download Rental Form PDF"
            >
              <Download className={`w-4 h-4 ${isDownloadingPdf ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div className="mb-5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3 relative z-10">
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

        {/* Tab Selection Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/[0.06] pb-3 relative z-10">
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
            <span>1. Rental Commercials &amp; Terms</span>
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
            <span>2. Landlord Contact Details</span>
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
            <span>3. Property Physical Specs</span>
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
        <div className={rentalActiveTab === 'financials' ? "grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 animate-fade-in" : "hidden"}>
          <div>
            <label htmlFor="form_date_field" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> AGREEMENT FORM DATE
            </label>
            <input
              id="form_date_field"
              name="form_date"
              type="text"
              value={rentalSpecs.form_date || ''}
              onChange={(e) => onRentalSpecChange('form_date', e.target.value)}
              placeholder="DD/MM/YYYY e.g. 20/10/2026"
              className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold placeholder-slate-500 focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="rent_price_field" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">$</span> ANNUAL ASKING RENT (AED) <span className="text-blue-500">*</span>
            </label>
            <input
              id="rent_price_field"
              name="rent_price"
              type="text"
              value={rentalSpecs.price ?? ''}
              onChange={(e) => onRentalSpecChange('price', e.target.value)}
              placeholder="e.g. 185,000"
              className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold placeholder-slate-500 focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="cheques_field" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
              PAYMENT TERMS (CHEQUES) <span className="text-blue-500">*</span>
            </label>
            <select
              id="cheques_field"
              name="cheques"
              value={rentalSpecs.cheques}
              onChange={(e) => onRentalSpecChange('cheques', e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none transition-all text-sm cursor-pointer"
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
        <div className={rentalActiveTab === 'landlord' ? "grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10 animate-fade-in" : "hidden"}>
          <div>
            <label htmlFor="owner_name_field" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
              LANDLORD LEGAL NAME (TITLE DEED / EID) <span className="text-blue-500">*</span>
            </label>
            <input
              id="owner_name_field"
              name="owner_name"
              type="text"
              value={rentalSpecs.owner_name ?? ''}
              onChange={(e) => onRentalSpecChange('owner_name', e.target.value)}
              placeholder="Full Legal Name as shown on Title Deed"
              className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold placeholder-slate-500 focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="owner_phone_field" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> CONTACT MOBILE / WHATSAPP <span className="text-blue-500">*</span>
              </span>
              {!rentalSpecs.owner_phone && (
                <span className="text-[10px] text-red-400 font-bold uppercase animate-pulse">Required</span>
              )}
            </label>
            <input
              id="owner_phone_field"
              name="owner_phone"
              type="text"
              value={rentalSpecs.owner_phone ?? ''}
              onChange={(e) => onRentalSpecChange('owner_phone', e.target.value)}
              placeholder="e.g. +971 50 123 4567"
              className={`w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm ${!rentalSpecs.owner_phone ? 'border-red-500/40' : ''}`}
            />
          </div>

          <div>
            <label htmlFor="owner_email_field" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-400" /> LANDLORD EMAIL ADDRESS <span className="text-blue-500">*</span>
              </span>
            </label>
            <input
              id="owner_email_field"
              name="owner_email"
              type="email"
              value={rentalSpecs.owner_email ?? ''}
              onChange={(e) => onRentalSpecChange('owner_email', e.target.value)}
              placeholder="e.g. landlord@example.com"
              className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="owner_nationality_field" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
              NATIONALITY
            </label>
            <input
              id="owner_nationality_field"
              name="owner_nationality"
              type="text"
              value={rentalSpecs.owner_nationality ?? ''}
              onChange={(e) => onRentalSpecChange('owner_nationality', e.target.value)}
              placeholder="e.g. United Arab Emirates"
              className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Tab 3: Specs */}
        <div className={rentalActiveTab === 'specs' ? "space-y-4 relative z-10 animate-fade-in" : "hidden"}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="rental_property_type" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-white/60" /> PROPERTY TYPE
              </label>
              <select
                id="rental_property_type"
                name="property_type"
                value={rentalSpecs.property_type ?? 'Apartment'}
                onChange={(e) => onRentalSpecChange('property_type', e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm cursor-pointer"
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
              <label htmlFor="rental_beds" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5 text-white/60" /> BEDROOMS
              </label>
              <input
                id="rental_beds"
                name="bedrooms"
                type="text"
                value={rentalSpecs.bedrooms ?? ''}
                onChange={(e) => onRentalSpecChange('bedrooms', e.target.value)}
                placeholder="e.g. 2 Bedrooms or Studio"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="rental_baths" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-white/60" /> BATHROOMS
              </label>
              <input
                id="rental_baths"
                name="bathrooms"
                type="text"
                value={rentalSpecs.bathrooms ?? ''}
                onChange={(e) => onRentalSpecChange('bathrooms', e.target.value)}
                placeholder="e.g. 2 Baths"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="rental_parking" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                PARKING BAYS
              </label>
              <input
                id="rental_parking"
                name="parking_bays"
                type="text"
                value={rentalSpecs.parking_bays ?? ''}
                onChange={(e) => onRentalSpecChange('parking_bays', e.target.value)}
                placeholder="e.g. 1 Space"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="rental_bldg" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                BUILDING NAME
              </label>
              <input
                id="rental_bldg"
                name="building_name"
                type="text"
                value={rentalSpecs.building_name ?? ''}
                onChange={(e) => onRentalSpecChange('building_name', e.target.value)}
                placeholder="e.g. Marina Gate 2"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="rental_unit" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                UNIT NUMBER
              </label>
              <input
                id="rental_unit"
                name="unit_number"
                type="text"
                value={rentalSpecs.unit_number ?? ''}
                onChange={(e) => onRentalSpecChange('unit_number', e.target.value)}
                placeholder="e.g. 1804"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="rental_comm" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                COMMUNITY
              </label>
              <input
                id="rental_comm"
                name="community"
                type="text"
                value={rentalSpecs.community ?? ''}
                onChange={(e) => onRentalSpecChange('community', e.target.value)}
                placeholder="e.g. Dubai Marina"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="rental_bua" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                BUA (SQ.FT)
              </label>
              <input
                id="rental_bua"
                name="bua_sqft"
                type="text"
                value={rentalSpecs.bua_sqft ?? ''}
                onChange={(e) => onRentalSpecChange('bua_sqft', e.target.value)}
                placeholder="e.g. 1,250"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
            </div>
          </div>
        </div>

        {/* Tab 4: Mandate */}
        <div className={rentalActiveTab === 'mandate' ? "grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 animate-fade-in" : "hidden"}>
          <div>
            <label htmlFor="broker_firm" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
              BROKERAGE FIRM
            </label>
            <input
              id="broker_firm"
              name="broker_firm"
              type="text"
              value={rentalSpecs.broker_name ?? ''}
              onChange={(e) => onRentalSpecChange('broker_name', e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="agent_name" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
              ASSIGNED AGENT NAME
            </label>
            <input
              id="agent_name"
              name="agent_name"
              type="text"
              value={rentalSpecs.broker_agent_name ?? ''}
              onChange={(e) => onRentalSpecChange('broker_agent_name', e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="agency_brn" className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
              AGENCY REGISTRATION / BRN
            </label>
            <input
              id="agency_brn"
              name="agency_brn"
              type="text"
              value={rentalSpecs.broker_brn ?? ''}
              onChange={(e) => onRentalSpecChange('broker_brn', e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
            />
          </div>
        </div>
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
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-sans font-bold text-white tracking-tight">
              Executive Sales Commercials &amp; Portal Amenities Studio
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> For Sale Specifications Active
            </span>
          </div>
          <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
            Define sales pricing, expected ROI yields, transfer fee terms, and select verified portal amenities.
          </p>
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
