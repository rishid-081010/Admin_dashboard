import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import React, { useEffect, useState, useRef } from 'react';
import { 
  ArrowLeft, Download, RefreshCw, CheckCircle2, AlertTriangle, 
  Clock, Sparkles, Building2, FolderArchive, RotateCcw, X, 
  Copy, Check, FileText, Share2, Tag, ChevronUp, ChevronDown, Sliders, ChevronLeft, ChevronRight, Wand2,
  Instagram, Mail, Globe, Upload, Plus, Trash2, Image as ImageIcon, MessageSquare, Send, History,
  FileBadge2, Layers, ShieldCheck, Phone, Eye, ExternalLink, FileCheck, DollarSign, Home, BedDouble, Bath,
  Calendar, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import BeforeAfterSlider from './BeforeAfterSlider';
import Toast from './Toast';
import { previewRentalPdfInNewTab, downloadRentalPdf } from '../utils/rentalFormPdfClient';
import { cleanBuildingNameOffline, shortenPropertyNameWithAI } from '../utils/aiPropertyShortener';
import { sbFetch, uploadListingImage, SUPABASE_BASE_URL, SUPABASE_KEY, SUPABASE_STORAGE_URL } from '../utils/supabaseClient';

const ROOM_CATEGORIES = [
  'Living_Room',
  'Master_Bedroom',
  'Bedroom',
  'Modern_Kitchen',
  'Balcony_Skyline_View',
  'Luxury_Bathroom',
  'Dining_Area',
  'Infinity_Pool',
  'Building_Exterior',
  'Foyer_Entrance',
  'Walk_in_Closet',
  'Terrace_Lounge',
  'Property_Photo'
];

const QUICK_DIRECTIVES = [
  { label: '☀️ Lift Dark Shadows', text: 'Lift deep shadows and dark corners on the floor while preserving black depth' },
  { label: '🪟 Pull Window Glare', text: 'Compress harsh window glare to reveal the exterior skyline and balcony view' },
  { label: '❄️ Neutralize Yellow Tint', text: 'Strip warm tungsten ceiling bulb cast to clean 3500K warm-white architectural lighting' },
  { label: '✨ Ultra Texture Crispness', text: 'Enhance micro-contrast on marble veining, joinery, and structural details' },
  { label: '🌅 Subtle Warm Glow', text: 'Add a subtle golden-hour ambient luxury warmth across the room' },
  { label: '🌊 Rich Balcony Pool/Sky', text: 'Enrich natural sky blue and pool water clarity without altering architecture' },
];

// Dropdown and spec normalization helpers to prevent dropdown snap-backs
const normalizeBedrooms = (val) => {
  if (!val) return '2 Bedrooms';
  const str = String(val).toLowerCase().trim();
  if (str.includes('studio') || str === '0') return 'Studio';
  if (str.startsWith('1')) return '1 Bedroom';
  if (str.startsWith('2')) return '2 Bedrooms';
  if (str.startsWith('3')) return '3 Bedrooms';
  if (str.startsWith('4')) return '4 Bedrooms';
  if (str.startsWith('5')) return '5 Bedrooms';
  if (str.startsWith('6') || str.startsWith('7') || str.startsWith('8')) return '6+ Bedrooms';
  return '2 Bedrooms';
};

const normalizeBathrooms = (val) => {
  if (!val) return '2 Baths';
  const str = String(val).toLowerCase().trim();
  if (str.startsWith('1')) return '1 Bath';
  if (str.startsWith('2')) return '2 Baths';
  if (str.startsWith('3')) return '3 Baths';
  if (str.startsWith('4')) return '4 Baths';
  if (str.startsWith('5') || str.startsWith('6')) return '5+ Baths';
  return '2 Baths';
};

const normalizeParking = (val) => {
  if (!val) return '1 Space';
  const str = String(val).toLowerCase().trim();
  if (str.startsWith('0') || str.includes('none') || str.includes('no')) return '0 Spaces';
  if (str.startsWith('1')) return '1 Space';
  if (str.startsWith('2')) return '2 Spaces';
  if (str.startsWith('3')) return '3 Spaces';
  if (str.startsWith('4') || str.startsWith('5')) return '4+ Spaces';
  return '1 Space';
};

const normalizePropertyType = (val) => {
  if (!val) return 'Apartment';
  const str = String(val).toLowerCase().trim();
  if (str.includes('apart') || str.includes('flat') || str.includes('unit')) return 'Apartment';
  if (str.includes('villa')) return 'Villa';
  if (str.includes('townhouse') || str.includes('town house')) return 'Townhouse';
  if (str.includes('land') || str.includes('plot')) return 'Land';
  if (str.includes('office')) return 'Office';
  if (str.includes('ware') || str.includes('storage')) return 'Warehouse';
  if (str.includes('shop') || str.includes('retail')) return 'Shop';
  if (str.includes('building') || str.includes('tower')) return 'Building';
  return 'Apartment';
};

const normalizeCheques = (val) => {
  if (!val) return '4 Cheques';
  const str = String(val).toLowerCase().trim();
  if (str.startsWith('1 -') || str.includes('negotiable')) return '1 - 4 Cheques';
  if (str.startsWith('12')) return '12 Cheques';
  if (str.startsWith('1')) return '1 Cheque';
  if (str.startsWith('2')) return '2 Cheques';
  if (str.startsWith('6')) return '6 Cheques';
  if (str.startsWith('4')) return '4 Cheques';
  return '4 Cheques';
};

const normalizeAgreementDuration = (val) => {
  if (!val) return '3 Month';
  const str = String(val).toLowerCase().trim();
  if (str.includes('until') || str.includes('date')) return 'Or Until';
  if (str.startsWith('1')) return '1 Month';
  if (str.startsWith('2')) return '2 Month';
  if (str.startsWith('3')) return '3 Month';
  return '3 Month';
};

const cleanDefaultBuildingName = (str) => {
  if (!str) return '';
  const cleaned = cleanBuildingNameOffline(str);
  return cleaned || String(str).trim();
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
    owner_name: cached.owner_name ?? '',
    owner_phone: cached.owner_phone ?? '',
    owner_email: cached.owner_email ?? '',
    owner_nationality: cached.owner_nationality ?? 'United Arab Emirates',
    property_type: normalizePropertyType(cached.property_type),
    category: cached.category || (['Office', 'Shop', 'Warehouse'].includes(cached.property_type) ? 'Commercial' : 'Residential'),
    building_name: cached.building_name ?? '',
    community: cached.community ?? 'Dubai',
    unit_number: cached.unit_number ?? '',
    bedrooms: normalizeBedrooms(cached.bedrooms),
    bathrooms: normalizeBathrooms(cached.bathrooms),
    parking_bays: normalizeParking(cached.parking_bays),
    bua_sqft: cached.bua_sqft ?? '',
    plot_area: cached.plot_area ?? '00',
    price: cached.price ?? '',
    cheques: normalizeCheques(cached.cheques),
    security_deposit: cached.security_deposit ?? '5%',
    occupancy_status: cached.occupancy_status ?? 'Vacant',
    furnishing: cached.furnishing ?? 'Unfurnished',
    agreement_type: cached.agreement_type ?? 'Non-Exclusive',
    agreement_duration: normalizeAgreementDuration(cached.agreement_duration),
    agreement_until_date: cached.agreement_until_date ?? '',
    commission_rate: cached.commission_rate ?? '5% + VAT',
    broker_name: cached.broker_name ?? 'A SQUARED REAL ESTATE',
    broker_agent_name: cached.broker_agent_name ?? 'Melanie Simsiman',
    broker_brn: cached.broker_brn ?? 'ORN: 28491 / BRN: 54120',
    broker_phone: cached.broker_phone ?? '+971 4 000 0000',
  };
};

export default function ListingDetail({ listingId, onBack }) {
  const [listing, setListing] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [sliderModalImage, setSliderModalImage] = useState(null);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isRetrying, setIsRetrying] = useState({});
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isReProcessingAll, setIsReProcessingAll] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [copyTab, setCopyTab] = useState('portal');
  const [copiedField, setCopiedField] = useState(null);

  // Official A-SQUARED Rental Listing Form & NOC Studio State
  const [rentalSpecs, setRentalSpecs] = useState(() => getInitialRentalSpecs(listingId));
  const [isSavingRentalSpecs, setIsSavingRentalSpecs] = useState(false);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isShorteningName, setIsShorteningName] = useState(false);
  const [rentalFormGenerated, setRentalFormGenerated] = useState(false);
  const [rentalActiveTab, setRentalActiveTab] = useState('financials'); // 'financials' | 'landlord' | 'specs' | 'mandate'
  const hasInitializedRentalSpecsRef = useRef(null);
  const hasUserEditedRentalSpecsRef = useRef(false);
  const autoSaveDebounceRef = useRef(null);

  // Staged additional photos state
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [additionalPreviews, setAdditionalPreviews] = useState([]);
  const [isUploadingMore, setIsUploadingMore] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState({});
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);
  const downloadDropdownRef = useRef(null);

  // Per-Image AI Refinement Studio state (ChatGPT-style & 3-Way Comparison)
  const [refineModalImage, setRefineModalImage] = useState(null);
  const [adminDirective, setAdminDirective] = useState('');
  const [generativeDirective, setGenerativeDirective] = useState('');
  const [isRefiningImage, setIsRefiningImage] = useState(false);
  const [isResettingRefine, setIsResettingRefine] = useState(false);
  const [refineMode, setRefineMode] = useState('orig-vs-refined'); // 'orig-vs-refined' | 'baseline-vs-refined' | 'orig-vs-baseline'
  const [sliderMode, setSliderMode] = useState('orig-vs-refined'); // For fullscreen compare modal
  const [refineStudioTab, setRefineStudioTab] = useState('optical'); // 'optical' | 'generative' | 'sliders'
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [sliderValues, setSliderValues] = useState({
    brightness: 1.0,
    gamma: 1.05,
    clahe_max_slope: 3,
    hue: 0,
    saturation: 1.05,
    sharpness: 1.0,
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
  };

  const DEFAULT_SEQUENCE = [
    'Living_Room',
    'Balcony_Skyline_View',
    'Master_Bedroom',
    'Modern_Kitchen',
    'Luxury_Bathroom',
    'Dining_Area',
    'Bedroom',
    'Infinity_Pool',
    'Terrace_Lounge',
    'Walk_in_Closet',
    'Foyer_Entrance',
    'Building_Exterior',
    'Living_Room',
    'Bedroom',
    'Luxury_Bathroom',
    'Balcony_Skyline_View',
    'Property_Photo'
  ];

  const parsePromptMetadata = (promptStr) => {
    let metadata = {};
    let customPromptText = '';
    if (promptStr) {
      if (typeof promptStr === 'string' && promptStr.trim().startsWith('{')) {
        try {
          metadata = JSON.parse(promptStr);
          customPromptText = metadata.customPrompt || '';
        } catch (e) {
          customPromptText = promptStr;
        }
      } else {
        customPromptText = promptStr;
      }
    }
    return { metadata, customPromptText };
  };

  const enrichImages = (rawImages, promptStr) => {
    const { metadata } = parsePromptMetadata(promptStr);
    let cachedMeta = {};
    try {
      const cached = localStorage.getItem(`listing_meta_${listingId}`);
      if (cached) cachedMeta = JSON.parse(cached);
    } catch (e) {}

    const roomTypesMap = {
      ...(cachedMeta.roomTypes || {}),
      ...(metadata.roomTypes || {})
    };

    let cachedOrder = [];
    try {
      const ord = localStorage.getItem(`listing_order_${listingId}`);
      if (ord) cachedOrder = JSON.parse(ord);
    } catch (e) {}

    const orderList = metadata.imagesOrder || cachedOrder || [];

    const mapped = (rawImages || []).map((img, idx) => {
      const tag = roomTypesMap[img.id] || img.room_type || DEFAULT_SEQUENCE[idx % DEFAULT_SEQUENCE.length] || 'Property_Photo';
      return {
        ...img,
        room_type: tag,
        status: img.status || 'completed'
      };
    });

    if (orderList && orderList.length > 0) {
      mapped.sort((a, b) => {
        const idxA = orderList.indexOf(a.id);
        const idxB = orderList.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    return mapped;
  };

  const withTimestamp = (url) => {
    if (!url) return '';
    let resolvedUrl = url;
    if (resolvedUrl.startsWith('/uploads/')) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.includes('/dashboard')) {
          resolvedUrl = '/dashboard' + resolvedUrl;
        }
      }
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const fullUrl = (baseUrl && resolvedUrl.startsWith('/') && !resolvedUrl.startsWith('//')) 
      ? baseUrl + resolvedUrl 
      : resolvedUrl;
    return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}t=${cacheBuster}`;
  };

  const getComparisonUrls = (img, mode = 'orig-vs-refined') => {
    if (!img) return { leftUrl: '', rightUrl: '', leftLabel: '', rightLabel: '' };
    const orig = withTimestamp(img.original_image_location);
    const baseline = withTimestamp(img.baseline_image_location || img.generated_image_location);
    const refined = withTimestamp(img.custom_refined_location || img.generated_image_location);

    if (mode === 'baseline-vs-refined') {
      return {
        leftUrl: baseline,
        rightUrl: refined,
        leftLabel: '🤖 AUTO-ENHANCED',
        rightLabel: '✨ CUSTOM REFINED',
      };
    }
    if (mode === 'orig-vs-baseline') {
      return {
        leftUrl: orig,
        rightUrl: baseline,
        leftLabel: '📸 ORIGINAL RAW',
        rightLabel: '🤖 AUTO-ENHANCED',
      };
    }
    // Default: orig-vs-refined
    return {
      leftUrl: orig,
      rightUrl: refined,
      leftLabel: '📸 ORIGINAL RAW',
      rightLabel: img.custom_refined_location ? '✨ CUSTOM REFINED' : '✨ AUTO-ENHANCED',
    };
  };

  const isMountedRef = useRef(true);

  const fetchListingDetails = async (isInitial = false) => {
    if (isInitial) setLoading(true);

    try {
      const [listings, rawImages] = await Promise.all([
        sbFetch(`/real_estate_listings?id=eq.${listingId}&select=*&limit=1`),
        sbFetch(`/real_estate_images?listing_id=eq.${listingId}&select=*&order=display_order.asc.nullslast,created_at.asc`)
      ]);

      if (!isMountedRef.current) return;
      const sbListing = listings?.[0] || null;

      if (sbListing) {
        let commSpecs = sbListing.commercial_specs || {};
        let rentSpecs = sbListing.rental_specs || {};
        let deedData = sbListing.dossier_data || {};
        let eidData = sbListing.kyc_data?.emiratesIdData || {};
        let copyPayload = sbListing.copy_data || null;

        if (sbListing.prompt && typeof sbListing.prompt === 'string' && sbListing.prompt.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(sbListing.prompt);
            if (Object.keys(commSpecs).length === 0) commSpecs = parsed.commercialSpecs || parsed.commercial_specs || {};
            if (Object.keys(rentSpecs).length === 0) rentSpecs = parsed.rentalSpecs || parsed.rental_specs || commSpecs;
            if (Object.keys(deedData).length === 0) deedData = parsed.titleDeedData || parsed.title_deed_data || {};
            if (Object.keys(eidData).length === 0) eidData = parsed.emiratesIdData || parsed.emirates_id_data || {};
            if (!copyPayload) copyPayload = parsed.copyData || parsed.copy_data || null;
          } catch (e) {}
        }

        sbListing.commercial_specs = commSpecs;
        sbListing.rental_specs = rentSpecs;
        sbListing.title_deed_data = deedData;
        sbListing.emirates_id_data = eidData;
        if (copyPayload) sbListing.copy_data = copyPayload;

        setListing(sbListing);

        const enriched = (rawImages || []).map((img, idx) => ({
          ...img,
          room_type: img.room_type || DEFAULT_SEQUENCE[idx % DEFAULT_SEQUENCE.length] || 'Property_Photo',
          status: img.status || 'completed'
        }));
        setImages(enriched);

        if (sbListing.prompt && !customPrompt && !sbListing.prompt.startsWith('{')) {
          setCustomPrompt(sbListing.prompt);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Fetch listing details error:', err);
      try {
        const response = await axios.get(`/api/listings/${listingId}`, { timeout: 2000 });
        if (response.data && response.data.success) {
          setListing(response.data.listing);
          const enriched = enrichImages(response.data.images || [], response.data.listing?.prompt);
          setImages(enriched);
          return;
        }
      } catch (localErr) {}
      setError('Failed to fetch listing details.');
    } finally {
      if (isMountedRef.current && isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchListingDetails(true);

    const interval = setInterval(() => {
      if (!isMountedRef.current) return;
      fetchListingDetails(false);
    }, 8000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [listingId]);

  // Synchronize rental specs ONLY once when listing first loads for this listingId
  useEffect(() => {
    if (!listing) return;
    if (hasInitializedRentalSpecsRef.current === listingId) return;

    // Check if user has already edited or has a localStorage draft
    let hasDraft = false;
    let cached = {};
    try {
      const stored = localStorage.getItem(`listing_rental_specs_${listingId}`);
      if (stored) {
        cached = JSON.parse(stored) || {};
        if (Object.keys(cached).length > 0) hasDraft = true;
      }
    } catch (e) {}

    hasInitializedRentalSpecsRef.current = listingId;

    if (hasUserEditedRentalSpecsRef.current || hasDraft) {
      // User is editing or already has draft in localStorage -> preserve user draft!
      if (cached && Object.keys(cached).length > 0) {
        setRentalSpecs((prev) => ({ ...prev, ...cached }));
      }
      setRentalFormGenerated(true);
      return;
    }

    const c = (cached && Object.keys(cached).length > 0) ? cached : (listing.commercial_specs || {});
    const d = listing.title_deed_data || {};
    const e = listing.emirates_id_data || {};
    const p = listing.property_specs || {};

    const initial = {
      form_date: c.form_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      owner_name: c.owner_name || d.owner_name_english || e.full_name_english || '',
      owner_phone: c.owner_phone || e.phone || '',
      owner_email: c.owner_email || '',
      owner_nationality: c.owner_nationality || e.nationality || d.nationality || 'United Arab Emirates',
      property_type: normalizePropertyType(c.property_type || listing.property_type || d.property_type),
      category: c.category || (['Office', 'Shop', 'Warehouse'].includes(c.property_type || listing.property_type) ? 'Commercial' : 'Residential'),
      building_name: (() => {
        const rawBn = c.building_name || d.building_name || listing.name || '';
        return (rawBn.includes('Unit') || rawBn.includes(' - ') || rawBn.length > 25)
          ? cleanDefaultBuildingName(rawBn)
          : rawBn;
      })(),
      community: c.community || d.community || 'Dubai',
      unit_number: c.unit_number || d.unit_number || '',
      bedrooms: normalizeBedrooms(c.bedrooms || p.bedrooms || listing.bedrooms),
      bathrooms: normalizeBathrooms(c.bathrooms || p.bathrooms || listing.bathrooms),
      parking_bays: normalizeParking(c.parking_bays || c.parking || d.parking_bays?.[0]),
      bua_sqft: c.bua_sqft || d.total_area_sqft || d.suite_area_sqft || p.size_sqft || '',
      plot_area: c.plot_area || d.plot_number || '00',
      price: c.price || c.asking_price || listing.price || '',
      cheques: normalizeCheques(c.cheques),
      security_deposit: c.security_deposit || '5%',
      occupancy_status: c.occupancy_status || 'Vacant',
      furnishing: c.furnishing || p.furnishing || 'Unfurnished',
      agreement_type: c.agreement_type || 'Non-Exclusive',
      agreement_duration: normalizeAgreementDuration(c.agreement_duration),
      agreement_until_date: c.agreement_until_date || c.until_date || '',
      commission_rate: c.commission_rate || '5% + VAT',
      broker_name: c.broker_name || 'A SQUARED REAL ESTATE',
      broker_agent_name: c.broker_agent_name || 'Melanie Simsiman',
      broker_brn: c.broker_brn || 'ORN: 28491 / BRN: 54120',
      broker_phone: c.broker_phone || '+971 4 000 0000',
    };

    setRentalSpecs(initial);
    if (c.form_status === 'verified_custom' || c.owner_phone || c.cheques) {
      setRentalFormGenerated(true);
    }
  }, [listing, listingId]);

  const handleRentalSpecChange = (field, value) => {
    hasUserEditedRentalSpecsRef.current = true;
    setRentalSpecs(prev => {
      const updated = { ...prev, [field]: value };
      if (typeof window !== 'undefined' && listingId) {
        try {
          localStorage.setItem(`listing_rental_specs_${listingId}`, JSON.stringify(updated));
        } catch (err) {}
      }
      return updated;
    });

    // 1.5s Debounced background sync to Supabase so edits persist to the database without requiring manual save
    if (autoSaveDebounceRef.current) {
      clearTimeout(autoSaveDebounceRef.current);
    }
    autoSaveDebounceRef.current = setTimeout(async () => {
      try {
        if (!listingId) return;
        const stored = localStorage.getItem(`listing_rental_specs_${listingId}`);
        if (!stored) return;
        const specsToSave = JSON.parse(stored);

        const getRes = await fetch(`${SUPABASE_BASE_URL}/real_estate_listings?id=eq.${listingId}&select=prompt&limit=1`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (getRes.ok) {
          const rows = await getRes.json();
          let promptPayload = {};
          if (rows[0]?.prompt && rows[0].prompt.trim().startsWith('{')) {
            try { promptPayload = JSON.parse(rows[0].prompt); } catch {}
          }
          promptPayload.commercialSpecs = specsToSave;
          promptPayload.commercial_specs = specsToSave;
          promptPayload.lastEditedAt = new Date().toISOString();

          await fetch(`${SUPABASE_BASE_URL}/real_estate_listings?id=eq.${listingId}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ prompt: JSON.stringify(promptPayload) })
          });
        }
      } catch (e) {
        // Silent fail for debounced background save
      }
    }, 1500);
  };

  const handlePullFromDocuments = () => {
    hasUserEditedRentalSpecsRef.current = true;
    const d = listing?.title_deed_data || {};
    const e = listing?.emirates_id_data || {};
    const p = listing?.property_specs || {};
    setRentalSpecs(prev => {
      const updated = {
        ...prev,
        owner_name: d.owner_name_english || e.full_name_english || prev.owner_name,
        owner_phone: e.phone || prev.owner_phone,
        owner_nationality: e.nationality || d.nationality || prev.owner_nationality,
        building_name: d.building_name ? cleanDefaultBuildingName(d.building_name) : prev.building_name,
        unit_number: d.unit_number || prev.unit_number,
        community: d.community || prev.community,
        bua_sqft: d.total_area_sqft || d.suite_area_sqft || p.size_sqft || prev.bua_sqft,
        plot_area: d.plot_number || prev.plot_area || '00',
        parking_bays: d.parking_bays?.[0] || prev.parking_bays,
        property_type: d.property_type || prev.property_type,
        price: prev.price || listing?.price || '',
        bedrooms: prev.bedrooms || p.bedrooms || listing?.bedrooms || '2 Bedrooms',
        bathrooms: prev.bathrooms || p.bathrooms || listing?.bathrooms || '2 Baths',
      };
      try {
        localStorage.setItem(`listing_rental_specs_${listingId}`, JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    showToast('✨ Pulled base specs from Title Deed & Emirates ID!', 'success');
  };

  const handleAiShortenBuildingName = async () => {
    const raw = rentalSpecs.building_name || listing?.name || '';
    if (!raw) return;
    setIsShorteningName(true);
    try {
      const shortened = await shortenPropertyNameWithAI(raw);
      if (shortened) {
        handleRentalSpecChange('building_name', shortened);
        showToast(`✨ Shortened building name to "${shortened}"`, 'success');
      }
    } catch (e) {
      console.warn('AI shorten error:', e);
    } finally {
      setIsShorteningName(false);
    }
  };

  const handleSaveAndGenerateRentalForm = async () => {
    setIsSavingRentalSpecs(true);
    try {
      try {
        localStorage.setItem(`listing_rental_specs_${listingId}`, JSON.stringify(rentalSpecs));
      } catch {}

      // Direct persist to Supabase relational columns
      await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          rental_specs: rentalSpecs,
          commercial_specs: rentalSpecs,
          updated_at: new Date().toISOString()
        })
      });

      // Optional local Express save if active
      try {
        await axios.put(`/api/listings/${listingId}/rental-specs`, rentalSpecs, { timeout: 1500 });
      } catch (ignore) {}

      setListing(prev => prev ? { ...prev, rental_specs: rentalSpecs, commercial_specs: rentalSpecs } : prev);
      setRentalFormGenerated(true);
      showToast('✨ Official A-SQUARED Rental Form saved! Click Preview PDF to review.', 'success');
    } catch (err) {
      console.warn('Backend save note, cached locally:', err.message);
      setRentalFormGenerated(true);
      showToast('Rental specs saved. Form is ready for preview.', 'success');
    } finally {
      setIsSavingRentalSpecs(false);
    }
  };

  const handlePreviewPdf = async () => {
    setIsPreviewingPdf(true);
    try {
      await previewRentalPdfInNewTab({
        listing,
        commercialSpecs: rentalSpecs,
        titleDeedData: listing?.title_deed_data,
        emiratesIdData: listing?.emirates_id_data,
      });
    } catch (err) {
      console.error('PDF preview error:', err);
      showToast('Failed to preview PDF: ' + (err.message || 'Error rendering PDF'), 'error');
    } finally {
      setIsPreviewingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadRentalPdf({
        listing,
        commercialSpecs: rentalSpecs,
        titleDeedData: listing?.title_deed_data,
        emiratesIdData: listing?.emirates_id_data,
      });
      showToast('Official Rental Form PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF download error:', err);
      showToast('Failed to download PDF: ' + (err.message || 'Error downloading PDF'), 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!sliderModalImage) return;
      if (e.key === 'Escape') setSliderModalImage(null);
      if (e.key === 'ArrowRight') handleNextSlider();
      if (e.key === 'ArrowLeft') handlePrevSlider();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sliderModalImage, sliderIndex, images]);

  // Global Clipboard Paste Support (Ctrl + V)
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
        handleAdditionalFilesAdded(pastedFiles);
        showToast(`${pastedFiles.length} photo(s) pasted from clipboard!`, 'info');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Close download dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
        setDownloadDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdditionalFilesAdded = (filesArray) => {
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
      showToast('Some files were skipped. Only JPG, PNG, and WEBP are supported.', 'error');
    }

    setAdditionalFiles((prev) => [...prev, ...validFiles]);
    setAdditionalPreviews((prev) => [...prev, ...validPreviews]);
  };

  const handleRemoveAdditionalPreview = (index) => {
    URL.revokeObjectURL(additionalPreviews[index].url);
    setAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadMoreImages = async () => {
    if (additionalFiles.length === 0) return;
    setIsUploadingMore(true);

    try {
      const uploadedImages = [];
      const currentCount = images.length;

      for (let i = 0; i < additionalFiles.length; i++) {
        const file = additionalFiles[i];
        showToast(`Uploading photo ${i + 1} of ${additionalFiles.length}...`, 'info');
        try {
          const { publicUrl } = await uploadListingImage(file, listingId);
          uploadedImages.push({ filename: file.name, url: publicUrl });
        } catch (uErr) {
          console.warn(`Storage upload warning for ${file.name}:`, uErr.message);
          uploadedImages.push({ filename: file.name, url: additionalPreviews[i]?.url || URL.createObjectURL(file) });
        }
      }

      const newRows = uploadedImages.map((img, idx) => ({
        listing_id: listingId,
        original_filename: img.filename,
        original_image_location: img.url,
        generated_image_location: img.url,
        baseline_image_location: img.url,
        room_type: DEFAULT_SEQUENCE[(currentCount + idx) % DEFAULT_SEQUENCE.length] || 'Property_Photo',
        display_order: currentCount + idx,
        is_cover: false,
        status: 'completed',
        created_at: new Date().toISOString()
      }));

      await sbFetch('/real_estate_images', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(newRows)
      });

      // Update total_images in real_estate_listings
      await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          total_images: currentCount + newRows.length,
          completed_images: currentCount + newRows.length,
          updated_at: new Date().toISOString()
        })
      });

      showToast(`✨ ${additionalFiles.length} new photo(s) added successfully!`, 'success');
      additionalPreviews.forEach((p) => URL.revokeObjectURL(p.url));
      setAdditionalFiles([]);
      setAdditionalPreviews([]);
      fetchListingDetails(false);
    } catch (err) {
      console.error('Upload more images error:', err);
      showToast('Failed to upload additional photos: ' + err.message, 'error');
    } finally {
      setIsUploadingMore(false);
    }
  };

  const handleDeleteImage = async (imageId, originalName) => {
    if (!window.confirm(`Are you sure you want to remove "${originalName || 'this photo'}" from this listing?`)) return;

    setIsDeletingImage((prev) => ({ ...prev, [imageId]: true }));
    try {
      // 1. Delete image in Supabase
      await sbFetch(`/real_estate_images?id=eq.${imageId}`, { method: 'DELETE' });

      // 2. Decrement total_images
      const remainingCount = Math.max(0, images.length - 1);
      await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          total_images: remainingCount,
          completed_images: remainingCount,
          updated_at: new Date().toISOString()
        })
      });

      // 3. Optional local Express backend delete if active
      try {
        await axios.delete(`/api/images/${imageId}`, { timeout: 1500 });
      } catch (ignore) {}

      setImages((prev) => prev.filter((img) => img.id !== imageId));
      showToast('Photo removed from listing.', 'success');
    } catch (err) {
      console.error('Delete image error:', err);
      showToast('Failed to delete photo: ' + err.message, 'error');
    } finally {
      setIsDeletingImage((prev) => ({ ...prev, [imageId]: false }));
    }
  };

  const openRefineModal = (img) => {
    setRefineModalImage(img);
    setAdminDirective('');
    setGenerativeDirective('');
    setRefineMode('orig-vs-refined');
    setRefineStudioTab('optical');
    
    // Seed slider values if previous adjustments exist
    const prevAdj = img.qa_report?.adjustments;
    if (prevAdj) {
      setSliderValues({
        brightness: prevAdj.brightness ?? 1.0,
        gamma: prevAdj.gamma ?? 1.05,
        clahe_max_slope: prevAdj.clahe_max_slope ?? 3,
        hue: prevAdj.hue ?? 0,
        saturation: prevAdj.saturation ?? 1.05,
        sharpness: prevAdj.sharpness ?? 1.0,
      });
    } else {
      setSliderValues({
        brightness: 1.0,
        gamma: 1.05,
        clahe_max_slope: 3,
        hue: 0,
        saturation: 1.05,
        sharpness: 1.0,
      });
    }
  };

  const handleApplyDirective = async (directiveText) => {
    const textToApply = directiveText || adminDirective;
    if (!textToApply || !textToApply.trim() || !refineModalImage) return;

    setIsRefiningImage(true);
    try {
      const response = await axios.post(`/api/images/${refineModalImage.id}/refine`, {
        directive: textToApply.trim(),
      });

      if (response.data.success) {
        showToast('AI Optical Refinement applied to photo!', 'success');
        setCacheBuster(Date.now());
        const updatedImg = {
          ...refineModalImage,
          generated_image_location: response.data.image.generated_image_location,
          baseline_image_location: response.data.image.baseline_image_location || refineModalImage.baseline_image_location,
          custom_refined_location: response.data.image.custom_refined_location || response.data.image.generated_image_location,
          is_generative: false,
          qa_report: response.data.image.qa_report,
          refinements: response.data.image.refinements || [],
        };
        setRefineModalImage(updatedImg);
        setImages((prev) => prev.map((img) => (img.id === updatedImg.id ? updatedImg : img)));
        setAdminDirective('');
        fetchListingDetails();
      } else {
        showToast(response.data.error || 'Failed to refine image.', 'error');
      }
    } catch (err) {
      console.error('Refine image error:', err);
      showToast('Failed to apply refinement.', 'error');
    } finally {
      setIsRefiningImage(false);
    }
  };

  const [selectedBbox, setSelectedBbox] = useState(null);

  const handleApplyGenerative = async () => {
    if (!generativeDirective || !generativeDirective.trim() || !refineModalImage) return;

    setIsRefiningImage(true);
    try {
      const response = await axios.post(`/api/images/${refineModalImage.id}/generative-refine`, {
        directive: generativeDirective.trim(),
        bbox: selectedBbox,
      });

      if (response.data.success) {
        showToast('AI Virtual Staging generated and applied!', 'success');
        setCacheBuster(Date.now());
        const updatedImg = {
          ...refineModalImage,
          generated_image_location: response.data.image.generated_image_location,
          baseline_image_location: response.data.image.baseline_image_location || refineModalImage.baseline_image_location,
          custom_refined_location: response.data.image.custom_refined_location || response.data.image.generated_image_location,
          is_generative: true,
          qa_report: response.data.image.qa_report,
          refinements: response.data.image.refinements || [],
        };
        setRefineModalImage(updatedImg);
        setImages((prev) => prev.map((img) => (img.id === updatedImg.id ? updatedImg : img)));
        setGenerativeDirective('');
        fetchListingDetails();
      } else {
        showToast(response.data.error || 'Failed to generate virtual staging.', 'error');
      }
    } catch (err) {
      console.error('Generative staging error:', err);
      showToast(err.response?.data?.error || 'Failed to generate virtual staging.', 'error');
    } finally {
      setIsRefiningImage(false);
    }
  };

  const handleManualRefine = async () => {
    if (!refineModalImage) return;

    setIsRefiningImage(true);
    try {
      const response = await axios.post(`/api/images/${refineModalImage.id}/manual-refine`, sliderValues);

      if (response.data.success) {
        showToast('Manual darkroom adjustments applied!', 'success');
        setCacheBuster(Date.now());
        const updatedImg = {
          ...refineModalImage,
          generated_image_location: response.data.image.generated_image_location,
          baseline_image_location: response.data.image.baseline_image_location || refineModalImage.baseline_image_location,
          custom_refined_location: response.data.image.custom_refined_location || response.data.image.generated_image_location,
          qa_report: response.data.image.qa_report,
          refinements: response.data.image.refinements || [],
        };
        setRefineModalImage(updatedImg);
        setImages((prev) => prev.map((img) => (img.id === updatedImg.id ? updatedImg : img)));
        fetchListingDetails();
      } else {
        showToast(response.data.error || 'Failed to apply manual adjustments.', 'error');
      }
    } catch (err) {
      console.error('Manual refine error:', err);
      showToast('Failed to apply manual adjustments.', 'error');
    } finally {
      setIsRefiningImage(false);
    }
  };

  const handleResetRefinement = async (imageId) => {
    if (!window.confirm('Reset this photo back to the default AI enhancement?')) return;

    setIsResettingRefine(true);
    try {
      const response = await axios.post(`/api/images/${imageId}/reset-refine`);
      if (response.data.success) {
        showToast('Photo reset to default AI enhancement.', 'success');
        setCacheBuster(Date.now());
        const updatedImg = {
          ...refineModalImage,
          generated_image_location: response.data.image.generated_image_location,
          baseline_image_location: response.data.image.baseline_image_location,
          custom_refined_location: null,
          qa_report: response.data.image.qa_report,
          refinements: [],
        };
        if (refineModalImage && refineModalImage.id === imageId) {
          setRefineModalImage(updatedImg);
        }
        setSliderValues({
          brightness: 1.0,
          gamma: 1.05,
          clahe_max_slope: 3,
          hue: 0,
          saturation: 1.05,
          sharpness: 1.0,
        });
        setImages((prev) => prev.map((img) => (img.id === imageId ? updatedImg : img)));
        fetchListingDetails();
      } else {
        showToast(response.data.error || 'Failed to reset refinement.', 'error');
      }
    } catch (err) {
      console.error('Reset refinement error:', err);
      showToast('Failed to reset refinement.', 'error');
    } finally {
      setIsResettingRefine(false);
    }
  };

  const completedImages = images.filter((img) => img.status === 'completed');

  const openSliderForImage = (img) => {
    const idx = completedImages.findIndex((i) => i.id === img.id);
    setSliderIndex(idx !== -1 ? idx : 0);
    setSliderModalImage(img);
  };

  const handleNextSlider = () => {
    if (completedImages.length === 0) return;
    const nextIdx = (sliderIndex + 1) % completedImages.length;
    setSliderIndex(nextIdx);
    setSliderModalImage(completedImages[nextIdx]);
  };

  const handlePrevSlider = () => {
    if (completedImages.length === 0) return;
    const prevIdx = (sliderIndex - 1 + completedImages.length) % completedImages.length;
    setSliderIndex(prevIdx);
    setSliderModalImage(completedImages[prevIdx]);
  };

  const handleRetryImage = async (imageId) => {
    setIsRetrying((prev) => ({ ...prev, [imageId]: true }));
    try {
      const response = await axios.post(`/api/images/${imageId}/retry`);
      if (response.data.success) {
        showToast('Retrying photo enhancement...', 'info');
        fetchListingDetails();
      }
    } catch (err) {
      console.error('Retry image error:', err);
      showToast('Failed to retry image.', 'error');
    } finally {
      setIsRetrying((prev) => ({ ...prev, [imageId]: false }));
    }
  };

  const handleReProcessAll = async () => {
    setIsReProcessingAll(true);
    try {
      await axios.post(`/api/listings/${listingId}/process`, { prompt: customPrompt });
      showToast('Re-processing all photos with updated prompt...', 'info');
      fetchListingDetails();
    } catch (err) {
      console.error('Re-process error:', err);
      showToast('Failed to trigger re-enhancement.', 'error');
    } finally {
      setIsReProcessingAll(false);
    }
  };

  const handleUpdateRoomType = async (imageId, newRoomType) => {
    // 1. Immediate optimistic UI update
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, room_type: newRoomType } : img))
    );
    showToast(`Category updated to ${newRoomType.replace(/_/g, ' ')}.`, 'success');

    // 2. Persist directly to Supabase real_estate_images
    try {
      await sbFetch(`/real_estate_images?id=eq.${imageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ room_type: newRoomType })
      });
    } catch (err) {
      console.warn('Room type Supabase update warning:', err.message);
    }

    // 3. Optional local express backend sync
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocal) {
      try {
        await axios.put(`/api/images/${imageId}/room-type`, { room_type: newRoomType });
      } catch (ignore) {}
    }
  };

  const handleSetCoverImage = async (imageId) => {
    setImages((prev) =>
      prev.map((img) => ({ ...img, is_cover: img.id === imageId }))
    );
    try {
      await Promise.all([
        sbFetch(`/real_estate_images?listing_id=eq.${listingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_cover: false })
        }),
        sbFetch(`/real_estate_images?id=eq.${imageId}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_cover: true })
        })
      ]);
      showToast('🌟 Cover photo updated!', 'success');
    } catch (err) {
      console.warn('Cover photo update warning:', err);
    }
  };

  const handleMoveImage = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    setImages(newImages);
    showToast('Photo sequence reordered.', 'success');

    // Persist display_order directly to Supabase
    try {
      await Promise.all(
        newImages.map((img, idx) =>
          sbFetch(`/real_estate_images?id=eq.${img.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ display_order: idx })
          })
        )
      );
    } catch (err) {
      console.warn('Failed to persist order to Supabase:', err);
    }

    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocal) {
      try {
        await axios.put(`/api/listings/${listingId}/reorder`, {
          imageIds: newImages.map((img) => img.id),
        });
      } catch (ignore) {}
    }
  };

  const [isPushingBitrix, setIsPushingBitrix] = useState(false);
  const handlePushToBitrix = async () => {
    setIsPushingBitrix(true);
    try {
      const payload = {
        listing,
        commercial_specs: rentalSpecs,
        rental_specs: rentalSpecs,
        title_deed_data: listing?.title_deed_data
      };

      const endpoints = [
        '/dashboard/api/push-listing-bitrix.php',
        '/api/push-listing-bitrix.php',
        '/api/push-listing-bitrix'
      ];

      let resData = null;
      for (const ep of endpoints) {
        try {
          const res = await axios.post(ep, payload, { timeout: 20000 });
          if (res.data && res.data.success) {
            resData = res.data;
            break;
          }
        } catch (e) {}
      }

      if (resData && resData.dealId) {
        const dealIdStr = String(resData.dealId);
        await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            bitrix_deal_id: dealIdStr,
            bitrix_sync_status: 'synced',
            updated_at: new Date().toISOString()
          })
        });

        setListing((prev) => ({
          ...prev,
          bitrix_deal_id: dealIdStr,
          bitrix_sync_status: 'synced'
        }));

        showToast(`🎉 Deal #${dealIdStr} synced to Bitrix24 CRM!`, 'success');
      } else {
        showToast('Could not sync deal to Bitrix24. Verify CRM webhook.', 'error');
      }
    } catch (err) {
      console.error('Bitrix push error:', err);
      showToast('Bitrix24 push error: ' + err.message, 'error');
    } finally {
      setIsPushingBitrix(false);
    }
  };

  const handleGenerateCopy = async (tone = 'luxury') => {
    setIsGeneratingCopy(true);
    const copyPayload = {
      name: listing?.name || 'Luxury Property',
      reference: listing?.reference || 'ASQ-PROP',
      property_type: listing?.property_type || 'Apartment',
      purpose: listing?.purpose || 'For Sale',
      price: listing?.price || rentalSpecs?.price || '',
      bedrooms: listing?.bedrooms || rentalSpecs?.bedrooms || '',
      bathrooms: listing?.bathrooms || rentalSpecs?.bathrooms || '',
      size_sqft: listing?.size_sqft || rentalSpecs?.bua_sqft || '',
      furnishing: listing?.furnishing || rentalSpecs?.furnishing || 'Unfurnished',
      rough_notes: listing?.prompt && !listing.prompt.startsWith('{') ? listing.prompt : (listing?.rough_notes || ''),
      tone
    };

    const endpoints = [
      '/dashboard/api/generate-copy.php',
      '/api/generate-copy.php',
      `/api/listings/${listingId}/generate-copy`,
      '/api/generate-copy'
    ];

    let generatedData = null;
    for (const ep of endpoints) {
      try {
        const response = await axios.post(ep, copyPayload, { timeout: 45000 });
        if (response.data && (response.data.copyData || response.data.copy)) {
          generatedData = response.data.copyData || response.data.copy;
          break;
        }
      } catch (e) {
        // Continue to next endpoint
      }
    }

    if (generatedData) {
      setListing((prev) => ({ ...prev, copy_data: generatedData }));
      try {
        await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ copy_data: generatedData, updated_at: new Date().toISOString() })
        });
      } catch (sbErr) {
        console.warn('Supabase copy data save warning:', sbErr.message);
      }
      showToast('✨ Luxury multi-channel marketing copy generated & saved!', 'success');
    } else {
      showToast('Could not reach copy generator API. Please verify OpenAI connection.', 'error');
    }
    setIsGeneratingCopy(false);
  };

  const handleCopyText = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Copied ${fieldName} to clipboard!`, 'success');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleDownloadSingle = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadZip = async (title, packageType) => {
    showToast(`Preparing ${title} archive...`, 'info');
    try {
      const zip = new JSZip();

      if (packageType === 'marketing_photos' || packageType === 'master_bundle') {
        const photoFolder = packageType === 'master_bundle' ? zip.folder('Marketing_Photos') : zip;
        const validImages = images.filter((img) => img.generated_image_location || img.original_image_location);

        let loaded = 0;
        await Promise.all(
          validImages.map(async (img, idx) => {
            const rawUrl = img.generated_image_location || img.original_image_location;
            const imgUrl = withTimestamp(rawUrl);
            try {
              const res = await fetch(imgUrl);
              if (!res.ok) throw new Error('Fetch failed');
              const blob = await res.blob();
              const categoryName = (img.room_type || 'Photo').replace(/\s+/g, '_');
              const paddedIdx = String(idx + 1).padStart(2, '0');
              const filename = `${paddedIdx}_${categoryName}.jpg`;
              photoFolder.file(filename, blob);
              loaded++;
            } catch (err) {
              console.warn(`Could not add image ${idx} to zip:`, err);
            }
          })
        );

        if (loaded === 0 && packageType === 'marketing_photos') {
          showToast('Could not bundle photos. Check internet connection.', 'error');
          return;
        }
      }

      if (packageType === 'gov_docs' || packageType === 'master_bundle') {
        const docFolder = packageType === 'master_bundle' ? zip.folder('Government_NOC_Files') : zip;
        const summaryText = `PROPERTY LISTING DOSSIER\n-------------------------\nListing Name: ${listing?.name || 'Luxury Property'}\nProperty Type: ${listing?.property_type || 'Apartment'}\nGenerated Date: ${new Date().toLocaleDateString()}\nStatus: Verified\nTotal Photos: ${images.length}\n`;
        docFolder.file('Dossier_Summary.txt', summaryText);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const safeListingName = (listing?.name || 'Listing').replace(/[^a-zA-Z0-9_-]/g, '_');
      saveAs(content, `${safeListingName}_${packageType}.zip`);
      showToast(`${title} downloaded successfully!`, 'success');
    } catch (err) {
      console.error('Download zip error:', err);
      showToast('Failed to generate ZIP package.', 'error');
    }
  };

  const handleDownloadAllZip = () => {
    handleDownloadZip('Marketing Photos', 'marketing_photos');
  };

  const completedCount = images.filter((img) => img.status === 'completed').length;
  const failedCount = images.filter((img) => img.status === 'failed').length;
  const processingCount = images.filter((img) => img.status === 'processing').length;
  const queuedCount = images.filter((img) => img.status === 'queued').length;
  const totalCount = images.length;
  const progressPercentage = totalCount > 0 ? Math.round(((completedCount + failedCount) / totalCount) * 100) : 0;
  const copyData = listing?.copy_data;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
        <p className="text-white/60 text-sm font-sans">Loading property listing details...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-400 max-w-md mx-auto mb-4">
          {error || 'Listing not found'}
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-bone-100 hover:text-white bg-navy-800 border border-navy-700 px-4 py-2 rounded-xl text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 mb-3 transition-colors tracking-wide"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-sans font-bold text-white tracking-tight">{listing.name}</h1>
          </div>
          <p className="text-white/60 text-sm mt-1 font-sans">
            Property Type: <span className="text-blue-400 font-semibold">{listing.property_type}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bitrix24 CRM Sync Button / Deal Badge */}
          {listing.bitrix_deal_id ? (
            <a
              href={`https://crm.asquared.ae/crm/deal/details/${listing.bitrix_deal_id}/`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-all shadow-lg cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Bitrix24 Deal #{listing.bitrix_deal_id}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          ) : (
            <button
              type="button"
              onClick={handlePushToBitrix}
              disabled={isPushingBitrix}
              className="px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <Share2 className={`w-4 h-4 text-blue-400 ${isPushingBitrix ? 'animate-spin' : ''}`} />
              <span>{isPushingBitrix ? 'Syncing to Bitrix...' : 'Push to Bitrix24'}</span>
            </button>
          )}

          {/* Single Luxury Download Dropdown Button */}
          <div className="relative" ref={downloadDropdownRef}>
            <button
              onClick={() => setDownloadDropdownOpen((prev) => !prev)}
              className="px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white shadow-xl shadow-blue-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Download Packages</span>
              <ChevronDown className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${downloadDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

          {/* Dropdown Menu */}
          {downloadDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-navy-900/95 backdrop-blur-xl border border-blue-500/30 shadow-2xl shadow-black/80 z-50 p-2 divide-y divide-white/[0.06] animate-in fade-in zoom-in-95 duration-150">
              {/* Option 1: Government & NOC Files (ZIP) */}
              <a
                href="#" onClick={(e) => { e.preventDefault(); handleDownloadZip('Government & NOC Files', 'gov_docs'); setDownloadDropdownOpen(false); }}
                className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors group cursor-pointer"
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
              </a>

              {/* Option 2: Enhanced Listing Images (ZIP) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadDropdownOpen(false);
                  handleDownloadZip('Marketing Photos', 'marketing_photos');
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
              <a
                href="#" onClick={(e) => { e.preventDefault(); handleDownloadZip('Master Bundle', 'master_bundle'); setDownloadDropdownOpen(false); }}
                className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-white/[0.06] transition-colors group bg-white/[0.02] cursor-pointer"
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
              </a>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Editable AI Prompt & Instructions Bar */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Enhancement Prompt & Directives (Editable)
            </span>
          </div>
          <button
            onClick={handleReProcessAll}
            disabled={isReProcessingAll}
            className="px-3 py-1.5 rounded-xl glass-pill hover:bg-white/[0.1] text-xs font-semibold text-blue-300 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReProcessingAll ? 'animate-spin' : ''}`} />
            {isReProcessingAll ? 'Re-Processing...' : 'Re-Enhance All with Prompt'}
          </button>
        </div>
        <textarea
          rows={2}
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Custom AI enhancement instructions..."
          className="w-full glass-input rounded-xl p-3 text-bone-100 text-xs font-mono placeholder-slate-500 focus:outline-none transition-all leading-relaxed"
        ></textarea>
      </div>

      {/* AI Processing Progress Card */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-sans font-bold text-white">Photographic Processing Status</h2>
          </div>
          <span className="text-sm font-bold text-blue-400 font-sans">
            {completedCount} / {totalCount} images completed ({progressPercentage}%){images.some(i => i.status === 'processing') && ' • Auto-naming in progress...'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/40 rounded-full h-2.5 mb-6 overflow-hidden border border-white/[0.08]">
          <div
            className="bg-gradient-to-r from-khaki-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Status Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="glass-pill rounded-xl p-3.5 text-center">
            <span className="text-2xl font-bold text-emerald-400 block">{completedCount}</span>
            <span className="text-xs text-white/60 font-medium flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed
            </span>
          </div>

          <div className="glass-pill rounded-xl p-3.5 text-center">
            <span className="text-2xl font-bold text-blue-400 block">{processingCount}</span>
            <span className="text-xs text-white/60 font-medium flex items-center justify-center gap-1 mt-0.5">
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" /> Processing
            </span>
          </div>

          <div className="glass-pill rounded-xl p-3.5 text-center">
            <span className="text-2xl font-bold text-bone-200 block">{queuedCount}</span>
            <span className="text-xs text-white/60 font-medium flex items-center justify-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-white/60" /> Queued
            </span>
          </div>

          <div className="glass-pill rounded-xl p-3.5 text-center">
            <span className="text-2xl font-bold text-red-400 block">{failedCount}</span>
            <span className="text-xs text-white/60 font-medium flex items-center justify-center gap-1 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Failed
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DEDICATED SECTION: OFFICIAL A-SQUARED RENTAL FORM & NOC STUDIO    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="glass-card p-6 mb-8 border border-blue-500/25 bg-gradient-to-br from-[#0c1829] via-[#071322] to-[#020b18] shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5 mb-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <FileBadge2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-sans font-bold text-white tracking-tight">
                Official A-SQUARED Rental Listing Form &amp; NOC Studio
              </h2>
              {rentalFormGenerated ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Form Ready &amp; Verified
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Custom Input Required
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
              Fill in the operational, legal, and financial specifications that cannot be judged from the Title Deed, Emirates ID, or photos alone. Once customized, click to generate the official 1:1 signed A-SQUARED Rental Listing Form (NOC).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handlePullFromDocuments}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Populate available base data from Title Deed & Emirates ID"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Pull from Documents</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndGenerateRentalForm}
              disabled={isSavingRentalSpecs}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileCheck className={`w-4 h-4 ${isSavingRentalSpecs ? 'animate-spin' : ''}`} />
              <span>{isSavingRentalSpecs ? 'Generating Form...' : 'Save & Generate Rental Form PDF'}</span>
            </button>

            {/* Direct PDF View / Preview (Generated Client-Side, Zero 404) */}
            <button
              type="button"
              onClick={handlePreviewPdf}
              disabled={isPreviewingPdf}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
              title="Preview official filled Rental Form PDF in a new tab"
            >
              <Eye className={`w-3.5 h-3.5 ${isPreviewingPdf ? 'animate-spin' : ''}`} />
              <span>{isPreviewingPdf ? 'Preparing Preview...' : 'Preview PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer disabled:opacity-60"
              title="Direct download Rental Form PDF"
            >
              <Download className={`w-4 h-4 ${isDownloadingPdf ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Form Readiness Checklist */}
        {(() => {
          const isMissingPhone = !rentalSpecs.owner_phone || !rentalSpecs.owner_phone.trim();
          const isMissingEmail = !rentalSpecs.owner_email || !rentalSpecs.owner_email.trim();
          const isMissingPrice = !rentalSpecs.price || !rentalSpecs.price.trim();
          const isMissingBeds = !rentalSpecs.bedrooms || !rentalSpecs.bedrooms.trim();
          const isMissingBaths = !rentalSpecs.bathrooms || !rentalSpecs.bathrooms.trim();
          const missingCount = [isMissingPhone, isMissingEmail, isMissingPrice, isMissingBeds, isMissingBaths].filter(Boolean).length;

          return (
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
          );
        })()}

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

        {/* Tab 1: Rental Commercials & Terms */}
        <div className={rentalActiveTab === 'financials' ? "grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 animate-fade-in" : "hidden"}>
            {/* Agreement Form Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> AGREEMENT FORM DATE
              </label>
              <input
                type="text"
                value={rentalSpecs.form_date || ''}
                onChange={(e) => handleRentalSpecChange('form_date', e.target.value)}
                placeholder="DD/MM/YYYY e.g. 20/10/2026"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
              <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "DATE: ________" at top right</span>
            </div>

            {/* Asking Rent */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                <span className="text-emerald-400 font-bold">$</span> ANNUAL ASKING RENT (AED) <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={rentalSpecs.price ?? ''}
                onChange={(e) => handleRentalSpecChange('price', e.target.value)}
                placeholder="e.g. 185,000"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
              <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "Price (AED): ____________"</span>
            </div>

            {/* Cheques Payment Structure */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                PAYMENT TERMS (CHEQUES) <span className="text-blue-500">*</span>
              </label>
              <select
                value={rentalSpecs.cheques}
                onChange={(e) => handleRentalSpecChange('cheques', e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none transition-all text-sm cursor-pointer"
              >
                <option value="1 Cheque">1 Cheque (Upfront Annual)</option>
                <option value="2 Cheques">2 Cheques (Bi-Annual)</option>
                <option value="4 Cheques">4 Cheques (Quarterly - Standard)</option>
                <option value="6 Cheques">6 Cheques (Every 2 Months)</option>
                <option value="12 Cheques">12 Cheques (Monthly)</option>
                <option value="1 - 4 Cheques">1 - 4 Cheques (Negotiable)</option>
              </select>
              <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "No. Of Cheques"</span>
            </div>

            {/* Classification: Residential vs Commercial */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                CLASSIFICATION <span className="text-blue-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 glass-pill p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleRentalSpecChange('category', 'Residential')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rentalSpecs.category !== 'Commercial'
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ✓ Residential
                </button>
                <button
                  type="button"
                  onClick={() => handleRentalSpecChange('category', 'Commercial')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rentalSpecs.category === 'Commercial'
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ✓ Commercial
                </button>
              </div>
              <span className="text-[10px] text-white/40 mt-1 block">Checks official "Residential" or "Commercial" box</span>
            </div>

            {/* Occupancy Status */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                OCCUPANCY STATUS <span className="text-blue-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 glass-pill p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleRentalSpecChange('occupancy_status', 'Vacant')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rentalSpecs.occupancy_status === 'Vacant'
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ✓ Vacant
                </button>
                <button
                  type="button"
                  onClick={() => handleRentalSpecChange('occupancy_status', 'Tenanted')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rentalSpecs.occupancy_status === 'Tenanted'
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ✓ Tenanted
                </button>
              </div>
              <span className="text-[10px] text-white/40 mt-1 block">Checks official "Vacant" or "Tenanted" box</span>
            </div>

            {/* Furnishing Status */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                FURNISHING STATUS <span className="text-blue-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2 glass-pill p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleRentalSpecChange('furnishing', 'Unfurnished')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rentalSpecs.furnishing === 'Unfurnished'
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Unfurnished
                </button>
                <button
                  type="button"
                  onClick={() => handleRentalSpecChange('furnishing', 'Semi-Furnished')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rentalSpecs.furnishing === 'Semi-Furnished'
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Semi
                </button>
                <button
                  type="button"
                  onClick={() => handleRentalSpecChange('furnishing', 'Furnished')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rentalSpecs.furnishing === 'Furnished'
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Furnished
                </button>
              </div>
              <span className="text-[10px] text-white/40 mt-1 block">Checks official "Furnished" or "Unfurnished" box</span>
            </div>
          </div>

        {/* Tab 2: Landlord & Contact Details */}
        <div className={rentalActiveTab === 'landlord' ? "grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10 animate-fade-in" : "hidden"}>
            {/* Landlord Legal Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                LANDLORD LEGAL NAME (TITLE DEED / EID) <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={rentalSpecs.owner_name ?? ''}
                onChange={(e) => handleRentalSpecChange('owner_name', e.target.value)}
                placeholder="Full Legal Name as shown on Title Deed"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white font-semibold placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
              <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "Name: ________" and signature</span>
            </div>

            {/* Landlord Contact Mobile */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> CONTACT MOBILE / WHATSAPP <span className="text-blue-500">*</span>
                </span>
                {!rentalSpecs.owner_phone && (
                  <span className="text-[10px] text-red-400 font-bold uppercase animate-pulse">Required</span>
                )}
              </label>
              <input
                type="text"
                value={rentalSpecs.owner_phone ?? ''}
                onChange={(e) => handleRentalSpecChange('owner_phone', e.target.value)}
                placeholder="e.g. +971 50 123 4567"
                className={`w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm ${!rentalSpecs.owner_phone ? 'border-red-500/40' : ''}`}
              />
              <span className="text-[10px] text-emerald-400/80 mt-1 block">Stamped on line "Phone: ____________"</span>
            </div>

            {/* Landlord Email */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-400" /> LANDLORD EMAIL ADDRESS <span className="text-blue-500">*</span>
                </span>
                {!rentalSpecs.owner_email && (
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Recommended</span>
                )}
              </label>
              <input
                type="email"
                value={rentalSpecs.owner_email ?? ''}
                onChange={(e) => handleRentalSpecChange('owner_email', e.target.value)}
                placeholder="e.g. landlord@example.com"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
              <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "Email: ____________"</span>
            </div>

            {/* Landlord Nationality */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                NATIONALITY
              </label>
              <input
                type="text"
                value={rentalSpecs.owner_nationality ?? ''}
                onChange={(e) => handleRentalSpecChange('owner_nationality', e.target.value)}
                placeholder="e.g. United Arab Emirates"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
              <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "Nationality: ____________"</span>
            </div>
          </div>

        {/* Tab 3: Property Physical Specifications */}
        <div className={rentalActiveTab === 'specs' ? "space-y-4 relative z-10 animate-fade-in" : "hidden"}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-white/60" /> PROPERTY TYPE (8 OFFICIAL OPTIONS)
                </label>
                <select
                  value={rentalSpecs.property_type ?? 'Apartment'}
                  onChange={(e) => handleRentalSpecChange('property_type', e.target.value)}
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
                <span className="text-[10px] text-white/40 mt-1 block">Marks 1 of 8 official checkboxes</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-white/60" /> BEDROOMS
                </label>
                <input
                  type="text"
                  value={rentalSpecs.bedrooms ?? ''}
                  onChange={(e) => handleRentalSpecChange('bedrooms', e.target.value)}
                  placeholder="e.g. 2 Bedrooms or Studio"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "Bedroom: ________"</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5 text-white/60" /> BATHROOMS
                </label>
                <input
                  type="text"
                  value={rentalSpecs.bathrooms ?? ''}
                  onChange={(e) => handleRentalSpecChange('bathrooms', e.target.value)}
                  placeholder="e.g. 2 Baths or 3 Baths"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "Bathroom: ________"</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  PARKING BAYS / ALLOCATION
                </label>
                <input
                  type="text"
                  value={rentalSpecs.parking_bays ?? ''}
                  onChange={(e) => handleRentalSpecChange('parking_bays', e.target.value)}
                  placeholder="e.g. P2-128 or 1 Space"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "Parking: ________"</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    BUILDING / TOWER NAME
                  </label>
                  <button
                    type="button"
                    onClick={handleAiShortenBuildingName}
                    disabled={isShorteningName}
                    className="text-[10px] font-bold text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/40 px-2 py-0.5 rounded flex items-center gap-1 transition-all border border-cyan-500/30"
                    title="Shorten compound property name using OpenAI"
                  >
                    <Sparkles className={`w-3 h-3 text-cyan-400 ${isShorteningName ? 'animate-spin' : ''}`} />
                    {isShorteningName ? 'Shortening...' : 'AI Shorten'}
                  </button>
                </div>
                <input
                  type="text"
                  value={rentalSpecs.building_name ?? ''}
                  onChange={(e) => handleRentalSpecChange('building_name', e.target.value)}
                  placeholder="e.g. Sobha Creek Vistas Reserve"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  UNIT NUMBER
                </label>
                <input
                  type="text"
                  value={rentalSpecs.unit_number ?? ''}
                  onChange={(e) => handleRentalSpecChange('unit_number', e.target.value)}
                  placeholder="e.g. B1610"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  COMMUNITY
                </label>
                <input
                  type="text"
                  value={rentalSpecs.community ?? ''}
                  onChange={(e) => handleRentalSpecChange('community', e.target.value)}
                  placeholder="e.g. Sobha Hartland / MBR City"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  BUA (SQ.FT)
                </label>
                <input
                  type="text"
                  value={rentalSpecs.bua_sqft ?? ''}
                  onChange={(e) => handleRentalSpecChange('bua_sqft', e.target.value)}
                  placeholder="e.g. 528.83"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Plot Area */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                  PLOT AREA (SQ.FT)
                </label>
                <input
                  type="text"
                  value={rentalSpecs.plot_area ?? ''}
                  onChange={(e) => handleRentalSpecChange('plot_area', e.target.value)}
                  placeholder="e.g. 00 or 1,200"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Stamped on line "Plot Area: ____ SqFt"</span>
              </div>
            </div>
          </div>

        {/* Tab 4: Broker Representation & Mandate */}
        <div className={rentalActiveTab === 'mandate' ? "grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 animate-fade-in" : "hidden"}>
            {/* Agreement Type */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                AGREEMENT MANDATE TYPE
              </label>
              <div className="grid grid-cols-2 gap-2 glass-pill p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleRentalSpecChange('agreement_type', 'Non-Exclusive')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rentalSpecs.agreement_type === 'Non-Exclusive'
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Non-Exclusive
                </button>
                <button
                  type="button"
                  onClick={() => handleRentalSpecChange('agreement_type', 'Exclusive')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rentalSpecs.agreement_type === 'Exclusive'
                      ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Exclusive
                </button>
              </div>
              <span className="text-[10px] text-white/40 mt-1 block">Checks official "Non-Exclusive" or "Exclusive" box</span>
            </div>

            {/* Validity Duration (1 Month, 2 Month, 3 Month, Or Until) */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                CONTRACT PERIOD (OFFICIAL TEMPLATE OPTIONS)
              </label>
              <div className="grid grid-cols-4 gap-2 glass-pill p-1 rounded-xl mb-2">
                {['1 Month', '2 Month', '3 Month', 'Or Until'].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => handleRentalSpecChange('agreement_duration', dur)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rentalSpecs.agreement_duration === dur
                        ? 'bg-blue-600 text-white shadow-sm border border-blue-400'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
              {rentalSpecs.agreement_duration === 'Or Until' && (
                <div className="mt-2 animate-fade-in p-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-1">
                    SPECIFIC EXPIRY DATE (STAMPED ON "OR UNTIL: ________")
                  </label>
                  <input
                    type="text"
                    value={rentalSpecs.agreement_until_date || ''}
                    onChange={(e) => handleRentalSpecChange('agreement_until_date', e.target.value)}
                    placeholder="e.g. 31/12/2026 or 15 Nov 2026"
                    className="w-full glass-input rounded-xl px-4 py-2 text-white text-xs placeholder-slate-500 focus:outline-none"
                  />
                </div>
              )}
              <span className="text-[10px] text-white/40 mt-1 block">Checks 1M, 2M, 3M, or marks "Or Until" and stamps the custom date</span>
            </div>

            {/* Brokerage Firm */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                BROKERAGE FIRM (STAMPED AFTER "AGENT:")
              </label>
              <input
                type="text"
                value={rentalSpecs.broker_name ?? ''}
                onChange={(e) => handleRentalSpecChange('broker_name', e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
              />
              <span className="text-[10px] text-white/40 mt-1 block">Aligned cleanly after "Agent: " to prevent text overlap</span>
            </div>

            {/* Assigned Agent Name & BRN */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                ASSIGNED AGENT NAME
              </label>
              <input
                type="text"
                value={rentalSpecs.broker_agent_name ?? ''}
                onChange={(e) => handleRentalSpecChange('broker_agent_name', e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
              />
            </div>

            {/* Commission Rate */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                COMMISSION / BROKERAGE FEE
              </label>
              <input
                type="text"
                value={rentalSpecs.commission_rate ?? ''}
                onChange={(e) => handleRentalSpecChange('commission_rate', e.target.value)}
                placeholder="e.g. 5% + VAT"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all text-sm"
              />
            </div>

            {/* Broker Phone / Office & BRN */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                AGENCY REGISTRATION / BRN
              </label>
              <input
                type="text"
                value={rentalSpecs.broker_brn ?? ''}
                onChange={(e) => handleRentalSpecChange('broker_brn', e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-sm"
              />
            </div>
          </div>
      </div>

      {/* Multi-Channel Dubai Marketing Copywriter Suite */}
      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-lg font-sans font-bold text-white">Multi-Channel Marketing Copywriter Suite</h2>
              <p className="text-xs text-white/60 font-sans">1-Click generation for Portals, WhatsApp Broadcasts, Instagram, Investor Emails & Translations.</p>
            </div>
          </div>

          {/* Tone Selector & Regenerate Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleGenerateCopy('luxury')}
              disabled={isGeneratingCopy}
              className="px-3 py-1.5 rounded-xl glass-pill hover:bg-white/[0.1] text-xs font-semibold text-blue-300 flex items-center gap-1.5 transition-all"
              title="Luxury Editorial Tone"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGeneratingCopy ? 'Generating...' : 'Luxury Tone'}
            </button>
            <button
              onClick={() => handleGenerateCopy('investor_roi')}
              disabled={isGeneratingCopy}
              className="px-3 py-1.5 rounded-xl glass-pill hover:bg-white/[0.1] text-xs font-semibold text-emerald-300 flex items-center gap-1.5 transition-all"
              title="Investor Yield & ROI Tone"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Investor ROI
            </button>
            <button
              onClick={() => handleGenerateCopy('fast_deal')}
              disabled={isGeneratingCopy}
              className="px-3 py-1.5 rounded-xl glass-pill hover:bg-white/[0.1] text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition-all"
              title="Fast Deal / Hot Opportunity Tone"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fast Deal
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-white/[0.06] pb-3">
          <button
            onClick={() => setCopyTab('portal')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              copyTab === 'portal'
                ? 'bg-white/[0.06] text-white shadow-md shadow-blue-950/40'
                : 'glass-pill text-white/60 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Bayut & Property Finder
          </button>

          <button
            onClick={() => setCopyTab('whatsapp')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              copyTab === 'whatsapp'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'glass-pill text-white/60 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" /> WhatsApp Broadcast
          </button>

          <button
            onClick={() => setCopyTab('instagram')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              copyTab === 'instagram'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20'
                : 'glass-pill text-white/60 hover:text-white'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" /> Instagram & Social
          </button>

          <button
            onClick={() => setCopyTab('investor')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              copyTab === 'investor'
                ? 'bg-amber-500 text-white shadow-md shadow-blue-950/40'
                : 'glass-pill text-white/60 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> VIP Investor Email
          </button>

          <button
            onClick={() => setCopyTab('translations')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              copyTab === 'translations'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'glass-pill text-white/60 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Arabic & Russian
          </button>
        </div>

        {copyData ? (
          <div>
            {copyTab === 'portal' && (
              <div className="space-y-4">
                {/* Portal Headline */}
                <div className="glass-pill rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                      SEO Portal Title (Under 80 Chars • Bayut & Property Finder)
                    </span>
                    <button
                      onClick={() => handleCopyText(copyData.portal_title, 'Portal Title')}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedField === 'Portal Title' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Title!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Title
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-white">{copyData.portal_title}</p>
                </div>

                {/* Portal Description */}
                <div className="glass-pill rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                      5-Part Editorial Description & Specifications
                    </span>
                    <button
                      onClick={() => handleCopyText(copyData.portal_description, 'Full Description')}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedField === 'Full Description' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Full Description!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Full Description
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/30 p-3 rounded-lg border border-white/[0.05]">
                    {copyData.portal_description}
                  </pre>
                </div>
              </div>
            )}

            {copyTab === 'whatsapp' && (
              <div className="glass-pill rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    High-Converting WhatsApp Broker Broadcast
                  </span>
                  <button
                    onClick={() => handleCopyText(copyData.whatsapp_copy, 'WhatsApp Text')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                  >
                    {copiedField === 'WhatsApp Text' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied WhatsApp Text!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy WhatsApp Broadcast
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/30 p-3.5 rounded-lg border border-white/[0.05]">
                  {copyData.whatsapp_copy}
                </pre>
              </div>
            )}

            {copyTab === 'instagram' && (
              <div className="glass-pill rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400">
                    Instagram & Social Media Caption
                  </span>
                  <button
                    onClick={() => handleCopyText(copyData.instagram_copy, 'Instagram Caption')}
                    className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold"
                  >
                    {copiedField === 'Instagram Caption' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Instagram Caption!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Instagram Caption
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/30 p-3.5 rounded-lg border border-white/[0.05]">
                  {copyData.instagram_copy}
                </pre>
              </div>
            )}

            {copyTab === 'investor' && (
              <div className="glass-pill rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    VIP Investor Direct-Response Pitch
                  </span>
                  <button
                    onClick={() => handleCopyText(copyData.investor_email, 'Investor Email')}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    {copiedField === 'Investor Email' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Investor Pitch!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Investor Email
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/30 p-3.5 rounded-lg border border-white/[0.05]">
                  {copyData.investor_email}
                </pre>
              </div>
            )}

            {copyTab === 'translations' && (
              <div className="space-y-4">
                {/* Arabic */}
                <div className="glass-pill rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                      Arabic Luxury Summary (GCC & Regional Investors)
                    </span>
                    <button
                      onClick={() => handleCopyText(copyData.arabic_summary, 'Arabic Summary')}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedField === 'Arabic Summary' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Arabic!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Arabic
                        </>
                      )}
                    </button>
                  </div>
                  <pre dir="rtl" className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/30 p-3.5 rounded-lg border border-white/[0.05] text-right">
                    {copyData.arabic_summary}
                  </pre>
                </div>

                {/* Russian */}
                <div className="glass-pill rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                      Russian Luxury Summary (CIS Investors)
                    </span>
                    <button
                      onClick={() => handleCopyText(copyData.russian_summary, 'Russian Summary')}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedField === 'Russian Summary' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Russian!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Russian
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/30 p-3.5 rounded-lg border border-white/[0.05]">
                    {copyData.russian_summary}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 glass-pill rounded-xl border-dashed">
            <p className="text-xs text-white/60 mb-2 font-sans">Multi-channel copy is generating or can be created anytime.</p>
            <button
              onClick={() => handleGenerateCopy('luxury')}
              disabled={isGeneratingCopy}
              className="px-4 py-2 bg-white/[0.06] hover:bg-khaki-400 text-white font-bold text-xs rounded-2xl inline-flex items-center gap-2 shadow-md shadow-blue-950/40"
            >
              <Sparkles className="w-4 h-4" />
              {isGeneratingCopy ? 'Generating...' : 'Generate Multi-Channel Marketing Copy Now'}
            </button>
          </div>
        )}
      </div>

      {/* Add More Photos to Listing Dropzone */}
      <div className="glass-card p-5 mb-8 border border-white/[0.1] hover:border-blue-500/40 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-sans font-bold text-white">Add More Photos to This Listing</h3>
              <p className="text-xs text-white/60 font-sans">
                Drag and drop, browse, or paste (<kbd className="px-1.5 py-0.5 bg-navy-950 border border-navy-700 rounded text-[10px] font-mono text-blue-400">Ctrl + V</kbd>) additional photos anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleAdditionalFilesAdded(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl glass-pill hover:bg-white/[0.1] text-xs font-semibold text-blue-300 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Browse Photos
            </button>
          </div>
        </div>

        {/* Drop Target Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
              handleAdditionalFilesAdded(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-400 bg-blue-500/10 scale-[0.99]'
              : 'border-white/[0.12] bg-black/20 hover:border-white/[0.04] hover:bg-white/[0.02]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mx-auto mb-2 text-blue-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-white mb-0.5">
            Drop new property photos here, or click to choose files
          </p>
          <p className="text-[11px] text-white/60">
            JPG, PNG, WEBP • Seamlessly auto-enhanced in background
          </p>
        </div>

        {/* Staged New Photos Previews & Action */}
        {additionalPreviews.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Staged New Photos ({additionalPreviews.length})
              </span>
              <button
                onClick={handleUploadMoreImages}
                disabled={isUploadingMore}
                className="px-5 py-2 bg-gradient-to-r from-[#00284b] to-[#003d73] hover:from-[#003666] hover:to-[#004b8c] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-blue-950/40 transition-all"
              >
                <Sparkles className={`w-4 h-4 ${isUploadingMore ? 'animate-spin' : ''}`} />
                {isUploadingMore ? 'Uploading & Queuing...' : `Upload & Auto-Enhance (${additionalPreviews.length}) New Photo(s)`}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {additionalPreviews.map((prev, idx) => (
                <div key={prev.id} className="relative group rounded-xl overflow-hidden border border-white/[0.1] bg-black/40">
                  <img onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/0a1321/3b82f6?text=Image+Processing...'; }} src={prev.url} alt={prev.name} className="w-full h-24 object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAdditionalPreview(idx);
                    }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow hover:bg-red-500 transition-colors"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="p-1.5 bg-black/80 text-[10px] text-white/80 truncate font-mono">
                    {prev.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Results Gallery */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
            Image Results Gallery ({images.length} Photos)
          </h2>
          <span className="text-xs text-white/60 font-sans">
            Priority order determines portal cover photo (#01 = Main Cover)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="glass-card flex flex-col justify-between hover:border-white/[0.2] transition-all"
            >
              {/* Card Header: Order, Room Tag & Delete */}
              <div className="p-3 bg-black/40 border-b border-white/[0.06] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetCoverImage(img.id)}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                      img.is_cover || idx === 0 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm' 
                        : 'glass-pill text-white/60 hover:text-amber-300'
                    }`}
                    title="Click to set as primary cover photo"
                  >
                    {img.is_cover || idx === 0 ? '★ #01 COVER' : `#0${idx + 1}`}
                  </button>

                  {/* Move Up/Down Order Buttons */}
                  <button
                    onClick={() => handleMoveImage(idx, -1)}
                    disabled={idx === 0}
                    className="w-6 h-6 rounded-lg glass-pill hover:bg-white/[0.1] text-white/80 disabled:opacity-30 flex items-center justify-center"
                    title="Move earlier"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveImage(idx, 1)}
                    disabled={idx === images.length - 1}
                    className="w-6 h-6 rounded-lg glass-pill hover:bg-white/[0.1] text-white/80 disabled:opacity-30 flex items-center justify-center"
                    title="Move later"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Room Classification Tag Dropdown */}
                  <div className="relative flex items-center">
                    <Tag className="w-3 h-3 text-blue-400 absolute left-2 pointer-events-none" />
                    <select
                      value={img.room_type || 'Property_Photo'}
                      onChange={(e) => handleUpdateRoomType(img.id, e.target.value)}
                      className="glass-input text-blue-300 text-[11px] font-semibold rounded-lg pl-6 pr-2 py-1 focus:outline-none cursor-pointer max-w-[140px]"
                    >
                      {ROOM_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delete Single Photo Button */}
                  <button
                    onClick={() => handleDeleteImage(img.id, img.original_filename)}
                    disabled={isDeletingImage[img.id]}
                    className="w-7 h-7 rounded-lg glass-pill hover:bg-red-500/20 text-white/60 hover:text-red-400 flex items-center justify-center transition-colors"
                    title="Delete photo from listing"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${isDeletingImage[img.id] ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Image Comparison Thumbnail */}
              <div className="p-4 bg-black/30 border-b border-white/[0.06]">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {/* Original Thumbnail */}
                  <div className="relative group">
                    <img
                      onError={(e) => {
                        if (!e.target.dataset.retried) {
                          e.target.dataset.retried = 'true';
                          if (e.target.src.includes('/dashboard/uploads/')) {
                            e.target.src = e.target.src.replace('/dashboard/uploads/', '/uploads/');
                            return;
                          } else if (e.target.src.includes('/uploads/')) {
                            e.target.src = e.target.src.replace('/uploads/', '/dashboard/uploads/');
                            return;
                          }
                        }
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/600x400/0a1321/3b82f6?text=Image+Processing...';
                      }}
                      src={withTimestamp(img.original_image_location)}
                      alt="Original"
                      className="w-full h-36 object-cover rounded-xl border border-white/[0.08]"
                    />
                    <span className="absolute bottom-1.5 left-1.5 bg-black/80 text-[10px] text-white/80 font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                      Original
                    </span>
                  </div>

                  {/* Enhanced Generated Thumbnail */}
                  <div className="relative group">
                    {img.status === 'completed' && img.generated_image_location ? (
                      <>
                        <img
                          onError={(e) => {
                            if (!e.target.dataset.retried) {
                              e.target.dataset.retried = 'true';
                              if (e.target.src.includes('/dashboard/uploads/')) {
                                e.target.src = e.target.src.replace('/dashboard/uploads/', '/uploads/');
                                return;
                              } else if (e.target.src.includes('/uploads/')) {
                                e.target.src = e.target.src.replace('/uploads/', '/dashboard/uploads/');
                                return;
                              }
                            }
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/600x400/0a1321/3b82f6?text=Image+Processing...';
                          }}
                          src={withTimestamp(img.generated_image_location)}
                          alt="Enhanced"
                          className="w-full h-36 object-cover rounded-xl border border-white/[0.04] shadow-md shadow-blue-950/40 cursor-pointer"
                          onClick={() => openSliderForImage(img)}
                        />
                        <span className={`absolute bottom-1.5 left-1.5 font-bold text-[10px] px-2 py-0.5 rounded shadow ${
                          img.is_generative ? 'bg-amber-400 text-white font-bold' : img.custom_refined_location ? 'bg-khaki-400 text-white' : 'bg-white/[0.06] text-white'
                        }`}>
                          {img.is_generative ? '✨ Staged' : img.custom_refined_location ? '✨ Refined' : '🤖 Enhanced'}
                        </span>
                      </>
                    ) : img.status === 'processing' ? (
                      <div className="w-full h-36 rounded-xl border border-blue-500/30 bg-white/[0.02] flex flex-col items-center justify-center p-3 text-center">
                        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mb-2" />
                        <span className="text-xs text-blue-300 font-medium">Enhancing Clarity...</span>
                      </div>
                    ) : img.status === 'failed' ? (
                      <div className="w-full h-36 rounded-xl border border-red-500/30 bg-red-500/5 flex flex-col items-center justify-center p-3 text-center">
                        <AlertTriangle className="w-6 h-6 text-red-400 mb-1" />
                        <span className="text-xs text-red-400 font-medium">Failed</span>
                      </div>
                    ) : (
                      <div className="w-full h-36 rounded-xl border border-white/[0.08] bg-black/40 flex flex-col items-center justify-center text-center">
                        <Clock className="w-6 h-6 text-white/40 mb-1" />
                        <span className="text-xs text-white/60 font-medium">Queued</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-semibold text-white/80 truncate max-w-[180px]">
                    {img.original_filename}
                  </span>

                  {/* Status Badge */}
                  {img.status === 'completed' && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      img.is_generative
                        ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" /> {img.is_generative ? 'Virtual Staged' : img.custom_refined_location ? 'Custom Refined' : 'Enhanced'}
                    </span>
                  )}
                  {img.status === 'processing' && (
                    <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Enhancing
                    </span>
                  )}
                  {img.status === 'failed' && (
                    <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Failed
                    </span>
                  )}
                  {img.status === 'queued' && (
                    <span className="text-[10px] font-bold uppercase text-white/60 glass-pill px-2 py-0.5 rounded-full">
                      Queued
                    </span>
                  )}
                </div>

                {/* QA Verification Report Tag */}
                {img.qa_report && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-col gap-1 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-400" /> QA Verified
                      </span>
                      <span className="text-white/60 font-mono">
                        {img.qa_report.action === 'use_as_is' ? 'Ready As-Is' : 'Conservative Edit'}
                      </span>
                    </div>
                    {img.qa_report.edit_summary && (
                      <p className="text-white/60 text-[10px] line-clamp-1 italic">
                        {img.qa_report.edit_summary}
                      </p>
                    )}
                  </div>
                )}

                {img.error_message && (
                  <p className="text-[11px] text-red-400 mt-2 line-clamp-2 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    {img.error_message}
                  </p>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="p-3 bg-black/40 border-t border-white/[0.06] flex items-center justify-between gap-2">
                {img.status === 'completed' && img.generated_image_location ? (
                  <>
                    <button
                      onClick={() => openRefineModal(img)}
                      className="py-2 px-3 bg-blue-500/15 hover:bg-white/[0.04] text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-blue-500/30 shadow-sm"
                      title="Direct AI or adjust sliders on this photo"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" /> AI Refine
                    </button>

                    <button
                      onClick={() => openSliderForImage(img)}
                      className="flex-1 py-2 px-3 glass-pill hover:bg-white/[0.1] text-bone-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-white/60" /> Compare
                    </button>

                    <button
                      onClick={() =>
                        handleDownloadSingle(
                          withTimestamp(img.generated_image_location),
                          `0${idx + 1}_${img.room_type || 'enhanced'}.jpg`
                        )
                      }
                      className="py-2 px-2.5 glass-pill hover:bg-white/[0.1] text-bone-100 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Download single photo"
                    >
                      <Download className="w-3.5 h-3.5 text-white/60" />
                    </button>
                  </>
                ) : img.status === 'failed' ? (
                  <button
                    onClick={() => handleRetryImage(img.id)}
                    disabled={isRetrying[img.id]}
                    className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-red-500/30"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRetrying[img.id] ? 'animate-spin' : ''}`} />
                    {isRetrying[img.id] ? 'Retrying...' : 'Retry Enhancement'}
                  </button>
                ) : (
                  <span className="text-xs text-white/40 italic py-1.5 text-center w-full font-sans">
                    Awaiting photographic processing...
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Image AI Darkroom Refinement Studio Modal (ChatGPT-Style + 3-Way Compare + Sliders) */}
      {refineModalImage && (() => {
        const comp = getComparisonUrls(refineModalImage, refineMode);
        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
            <div className="relative w-full max-w-6xl glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border border-white/[0.15]">
              {/* Modal Header */}
              <div className="p-4 bg-black/50 border-b border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-sans font-bold text-white">
                        AI Darkroom Refinement Studio
                      </h3>
                      <span className="text-[11px] font-mono bg-white/[0.06] text-blue-400 px-2 py-0.5 rounded border border-white/[0.1]">
                        {(refineModalImage.room_type || 'Property Photo').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 font-sans">
                      Targeted optical directives & precision sliders with real-time 3-way version comparison.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResetRefinement(refineModalImage.id)}
                    disabled={isResettingRefine || isRefiningImage}
                    className="px-3 py-1.5 rounded-xl glass-pill hover:bg-white/[0.1] text-xs font-semibold text-white/80 hover:text-white flex items-center gap-1.5 transition-colors"
                    title="Reset back to initial baseline AI enhancement"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isResettingRefine ? 'animate-spin' : ''}`} />
                    {isResettingRefine ? 'Resetting...' : 'Reset to Default AI'}
                  </button>

                  <button
                    onClick={() => setRefineModalImage(null)}
                    className="p-2 rounded-xl glass-pill hover:bg-red-600/80 text-bone-100 hover:text-white transition-colors ml-1"
                    title="Close (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Main Body (2 Columns on large screens) */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto bg-black/40">
                {/* Left Column: 3-Way Comparison View & Slider */}
                <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col items-center justify-between border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-black/20">
                  {/* 3-Way Comparison Switcher Bar */}
                  <div className="w-full mb-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" /> Compare Mode:
                    </span>
                    <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setRefineMode('orig-vs-refined')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                          refineMode === 'orig-vs-refined'
                            ? 'bg-white/[0.06] text-white font-bold shadow'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        📸 Raw vs ✨ Refined
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefineMode('baseline-vs-refined')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                          refineMode === 'baseline-vs-refined'
                            ? 'bg-white/[0.06] text-white font-bold shadow'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        🤖 Auto vs ✨ Refined
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefineMode('orig-vs-baseline')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                          refineMode === 'orig-vs-baseline'
                            ? 'bg-white/[0.06] text-white font-bold shadow'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        📸 Raw vs 🤖 Auto
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Before/After Slider */}
                  <BeforeAfterSlider
                    originalUrl={comp.leftUrl}
                    enhancedUrl={comp.rightUrl}
                    leftLabel={comp.leftLabel}
                    rightLabel={comp.rightLabel}
                    className="w-full h-[45vh] lg:h-[52vh] max-h-[500px]"
                  />

                  <div className="mt-3 flex items-center justify-between w-full text-xs text-white/60 font-sans px-1">
                    <span>💡 Drag slider handle to inspect textures & window clarity</span>
                    <button
                      onClick={() =>
                        handleDownloadSingle(
                          withTimestamp(refineModalImage.generated_image_location),
                          `refined_${refineModalImage.room_type || 'photo'}.jpg`
                        )
                      }
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Refined Photo
                    </button>
                  </div>
                </div>

                {/* Right Column: AI Directive Chat & Precision Sliders */}
                <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col justify-between bg-black/30">
                  <div>
                    {/* Mode Tabs Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setRefineStudioTab('optical')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            refineStudioTab === 'optical'
                              ? 'bg-white/[0.06] text-white shadow-md'
                              : 'glass-pill text-white/80 hover:text-white'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> 📸 Optical
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefineStudioTab('generative')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            refineStudioTab === 'generative'
                              ? 'bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white shadow-md font-bold'
                              : 'glass-pill text-amber-300/80 hover:text-amber-200 border border-amber-500/20'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> ✨ Virtual Staging / Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefineStudioTab('sliders')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            refineStudioTab === 'sliders'
                              ? 'bg-white/[0.06] text-white shadow-md'
                              : 'glass-pill text-white/80 hover:text-white'
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5" /> 🎚️ Sliders
                        </button>
                      </div>
                      <span className="text-[10px] text-white/60 font-mono">
                        {refineStudioTab === 'generative' ? '✨ Generative AI' : '🔒 100% Optical'}
                      </span>
                    </div>

                    {/* TAB 1: 📸 Optical Darkroom Directive (100% Non-Generative) */}
                    {refineStudioTab === 'optical' && (
                      <div>
                        {/* Directive Input Box */}
                        <div className="relative mb-3">
                          <textarea
                            rows={3}
                            value={adminDirective}
                            onChange={(e) => setAdminDirective(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleApplyDirective();
                              }
                            }}
                            placeholder="e.g. 'The marble flooring looks slightly dark, lift the shadow levels while keeping the window view clear.'"
                            className="w-full glass-input rounded-2xl p-3 text-bone-100 text-xs font-sans placeholder-slate-500 focus:outline-none leading-relaxed transition-all resize-none"
                          ></textarea>

                          <button
                            onClick={() => handleApplyDirective()}
                            disabled={isRefiningImage || !adminDirective.trim()}
                            className="absolute bottom-3 right-3 px-4 py-1.5 bg-gradient-to-r from-khaki-500 to-khaki-600 hover:from-[#003666] hover:to-[#004b8c] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-950/40 disabled:opacity-40 transition-all"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${isRefiningImage ? 'animate-spin' : ''}`} />
                            {isRefiningImage ? 'Refining...' : 'Apply Optical Directive'}
                          </button>
                        </div>

                        {/* 1-Click Quick Tweak Preset Chips for Optical Mode */}
                        <div className="mb-4">
                          <span className="text-[11px] font-semibold text-white/60 block mb-2">
                            ⚡ Quick Optical Enhancements:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {QUICK_DIRECTIVES.map((chip, idx) => (
                              <button
                                key={idx}
                                disabled={isRefiningImage}
                                onClick={() => handleApplyDirective(chip.text)}
                                className="px-2.5 py-1.5 rounded-xl glass-pill hover:bg-white/[0.1] text-[11px] text-white/80 hover:text-white transition-all text-left flex items-center gap-1 border border-white/[0.08]"
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Refinement History Timeline */}
                        <div className="border-t border-white/[0.08] pt-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5 mb-2">
                            <History className="w-3.5 h-3.5" /> Refinement History on This Photo
                          </span>

                          {refineModalImage.refinements && refineModalImage.refinements.length > 0 ? (
                            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                              {refineModalImage.refinements.map((ref, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-black/40 border border-white/[0.05] text-[11px]">
                                  <div className="flex items-center justify-between text-blue-400 font-semibold mb-0.5">
                                    <span className="flex items-center gap-1">
                                      {ref.is_generative ? '✨ Virtual Staging' : `Directive #${idx + 1}`}
                                    </span>
                                    <span className="text-[10px] text-white/40 font-mono">
                                      {new Date(ref.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-white font-medium italic mb-1">"{ref.directive}"</p>
                                  {ref.summary && (
                                    <p className="text-white/60 text-[10px]">{ref.summary}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3 bg-black/20 rounded-xl border border-white/[0.04] text-[11px] text-white/40 font-sans">
                              No custom directives applied yet. Initial AI enhancement active.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 2: ✨ AI Virtual Staging & Edit (Generative) */}
                    {refineStudioTab === 'generative' && (
                      <div>
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-3 text-xs">
                          <div className="font-bold text-amber-300 flex items-center justify-between gap-1.5 mb-1">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-400" /> Virtual Staging & Decluttering Studio
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                              🔒 100% Pixel-Lock
                            </span>
                          </div>
                          <p className="text-white/80 leading-relaxed text-[11px]">
                            Type your specific edit below. The AI strictly modifies <strong>only</strong> the requested object or area — 100% of surrounding room geometry, walls, flooring, lighting, and textures are mathematically locked to your raw photo.
                          </p>
                        </div>

                        {/* Custom Staging Directive Box */}
                        <div className="relative mb-3">
                          <textarea
                            rows={4}
                            value={generativeDirective}
                            onChange={(e) => setGenerativeDirective(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleApplyGenerative();
                              }
                            }}
                            placeholder="e.g. 'Remove the second door on the left and make it a smooth wall' or 'Add a luxury velvet cream armchair in the empty corner'"
                            className="w-full glass-input rounded-2xl p-3 text-bone-100 text-xs font-sans placeholder-slate-500 focus:outline-none leading-relaxed transition-all resize-none border border-amber-500/20"
                          ></textarea>

                          <button
                            onClick={handleApplyGenerative}
                            disabled={isRefiningImage || !generativeDirective.trim()}
                            className="absolute bottom-3 right-3 px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08]  text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-950/40 disabled:opacity-40 transition-all"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${isRefiningImage ? 'animate-spin' : ''}`} />
                            {isRefiningImage ? 'Executing Edit...' : 'Apply Targeted Edit'}
                          </button>
                        </div>

                        <div className="text-[10px] text-white/60 font-sans px-1 mb-3 flex items-center justify-between">
                          <span>💡 Press <kbd className="px-1 py-0.5 glass-pill rounded font-mono text-amber-300">Ctrl + Enter</kbd> to execute</span>
                          <span className="text-amber-300/90 font-mono">Pixel-Lock Inpainting</span>
                        </div>

                        {/* History Timeline */}
                        <div className="border-t border-white/[0.08] pt-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5 mb-2">
                            <History className="w-3.5 h-3.5" /> Staging & Refinement History
                          </span>

                          {refineModalImage.refinements && refineModalImage.refinements.length > 0 ? (
                            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                              {refineModalImage.refinements.map((ref, idx) => (
                                <div key={idx} className={`p-2.5 rounded-xl border text-[11px] ${
                                  ref.is_generative ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/40 border-white/[0.05]'
                                }`}>
                                  <div className="flex items-center justify-between text-blue-400 font-semibold mb-0.5">
                                    <span className={ref.is_generative ? 'text-amber-300 font-bold flex items-center gap-1' : 'text-blue-400'}>
                                      {ref.is_generative ? '✨ Virtual Staging' : `Directive #${idx + 1}`}
                                    </span>
                                    <span className="text-[10px] text-white/40 font-mono">
                                      {new Date(ref.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-white font-medium italic mb-1">"{ref.directive}"</p>
                                  {ref.summary && (
                                    <p className="text-white/60 text-[10px]">{ref.summary}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3 bg-black/20 rounded-xl border border-white/[0.04] text-[11px] text-white/40 font-sans">
                              No virtual staging applied yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Precision Manual Sliders */}
                    {refineStudioTab === 'sliders' && (
                      <div className="space-y-3.5">
                        {/* 1. Exposure / Brightness */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/80 font-medium">☀️ Exposure & Brightness</span>
                            <span className="text-blue-400 font-mono text-xs font-bold">
                              {(sliderValues.brightness * 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="1.8"
                            step="0.05"
                            value={sliderValues.brightness}
                            onChange={(e) => setSliderValues((prev) => ({ ...prev, brightness: parseFloat(e.target.value) }))}
                            className="w-full accent-khaki-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 2. Shadow Depth & Lift (Gamma) */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/80 font-medium">🌑 Shadow Lift / Tone Curve</span>
                            <span className="text-blue-400 font-mono text-xs font-bold">
                              {sliderValues.gamma > 1.0 ? `+${((sliderValues.gamma - 1) * 100).toFixed(0)}% Lift` : `${((sliderValues.gamma - 1) * 100).toFixed(0)}% Deep`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.75"
                            max="1.45"
                            step="0.05"
                            value={sliderValues.gamma}
                            onChange={(e) => setSliderValues((prev) => ({ ...prev, gamma: parseFloat(e.target.value) }))}
                            className="w-full accent-khaki-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 3. Window Glare Pull (CLAHE) */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/80 font-medium">🪟 Window Glare Compression (CLAHE)</span>
                            <span className="text-blue-400 font-mono text-xs font-bold">
                              Slope: {sliderValues.clahe_max_slope}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={sliderValues.clahe_max_slope}
                            onChange={(e) => setSliderValues((prev) => ({ ...prev, clahe_max_slope: parseInt(e.target.value, 10) }))}
                            className="w-full accent-khaki-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 4. Color Warmth / Hue Temp */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/80 font-medium">🌡️ Kelvin / Tone Warmth</span>
                            <span className="text-blue-400 font-mono text-xs font-bold">
                              {sliderValues.hue > 0 ? `+${sliderValues.hue}° Golden` : sliderValues.hue < 0 ? `${sliderValues.hue}° Cool Neutral` : '0° Balanced'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-20"
                            max="20"
                            step="1"
                            value={sliderValues.hue}
                            onChange={(e) => setSliderValues((prev) => ({ ...prev, hue: parseInt(e.target.value, 10) }))}
                            className="w-full accent-khaki-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 5. Vibrance / Saturation */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/80 font-medium">🎨 Vibrance & Saturation</span>
                            <span className="text-blue-400 font-mono text-xs font-bold">
                              {(sliderValues.saturation * 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.7"
                            max="1.5"
                            step="0.05"
                            value={sliderValues.saturation}
                            onChange={(e) => setSliderValues((prev) => ({ ...prev, saturation: parseFloat(e.target.value) }))}
                            className="w-full accent-khaki-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* 6. Structural Sharpness */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/80 font-medium">✨ Texture Crispness & Clarity</span>
                            <span className="text-blue-400 font-mono text-xs font-bold">
                              {sliderValues.sharpness.toFixed(1)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="3.0"
                            step="0.2"
                            value={sliderValues.sharpness}
                            onChange={(e) => setSliderValues((prev) => ({ ...prev, sharpness: parseFloat(e.target.value) }))}
                            className="w-full accent-khaki-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* Action buttons for sliders */}
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSliderValues({
                                brightness: 1.0,
                                gamma: 1.05,
                                clahe_max_slope: 3,
                                hue: 0,
                                saturation: 1.05,
                                sharpness: 1.0,
                              })
                            }
                            className="px-3 py-2 rounded-xl glass-pill hover:bg-white/[0.1] text-xs font-semibold text-white/80"
                          >
                            Reset Defaults
                          </button>
                          <button
                            type="button"
                            onClick={handleManualRefine}
                            disabled={isRefiningImage}
                            className="flex-1 py-2 bg-gradient-to-r from-khaki-500 to-khaki-600 hover:from-[#003666] hover:to-[#004b8c] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/40 disabled:opacity-40"
                          >
                            <Sliders className={`w-3.5 h-3.5 ${isRefiningImage ? 'animate-spin' : ''}`} />
                            {isRefiningImage ? 'Processing Darkroom...' : 'Apply Precision Sliders'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer status notice */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] text-white/40 flex items-center justify-between">
                    <span>{refineStudioTab === 'chat' ? 'Press Ctrl + Enter to apply directive' : 'Fine-grained non-destructive curves'}</span>
                    <span>100% Authentic Geometry</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Before / After Split Slider Modal (With 3-Way Comparison) */}
      {sliderModalImage && (() => {
        const comp = getComparisonUrls(sliderModalImage, sliderMode);
        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
            <div className="relative w-full max-w-5xl glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
              {/* Modal Top Bar */}
              <div className="p-4 bg-black/40 border-b border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-white/[0.06] text-white px-2.5 py-1 rounded-md font-sans">
                    #{sliderIndex + 1} of {completedImages.length}
                  </span>
                  <span className="text-sm font-sans font-bold text-white">
                    {(sliderModalImage.room_type || 'Property Photo').replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-white/60 font-mono hidden sm:inline">
                    {sliderModalImage.original_filename}
                  </span>
                </div>

                {/* 3-Way Selector Pills */}
                <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setSliderMode('orig-vs-refined')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      sliderMode === 'orig-vs-refined'
                        ? 'bg-white/[0.06] text-white font-bold shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    📸 Raw vs ✨ Refined
                  </button>
                  <button
                    type="button"
                    onClick={() => setSliderMode('baseline-vs-refined')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      sliderMode === 'baseline-vs-refined'
                        ? 'bg-white/[0.06] text-white font-bold shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    🤖 Auto vs ✨ Refined
                  </button>
                  <button
                    type="button"
                    onClick={() => setSliderMode('orig-vs-baseline')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      sliderMode === 'orig-vs-baseline'
                        ? 'bg-white/[0.06] text-white font-bold shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    📸 Raw vs 🤖 Auto
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const current = sliderModalImage;
                      setSliderModalImage(null);
                      openRefineModal(current);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-white/[0.04] text-blue-300 text-xs font-semibold flex items-center gap-1.5 border border-blue-500/30 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> AI Refine
                  </button>
                  <button
                    onClick={handlePrevSlider}
                    className="p-2 rounded-xl glass-pill hover:bg-white/[0.1] text-bone-100 text-xs font-semibold flex items-center gap-1"
                    title="Previous image (Left arrow)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextSlider}
                    className="p-2 rounded-xl glass-pill hover:bg-white/[0.1] text-bone-100 text-xs font-semibold flex items-center gap-1"
                    title="Next image (Right arrow)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSliderModalImage(null)}
                    className="p-2 rounded-xl glass-pill hover:bg-red-600/80 text-bone-100 hover:text-white transition-colors ml-2"
                    title="Close (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Slider Container */}
              <div className="p-4 sm:p-6 flex-1 flex items-center justify-center overflow-hidden bg-black/40">
                <BeforeAfterSlider
                  originalUrl={comp.leftUrl}
                  enhancedUrl={comp.rightUrl}
                  leftLabel={comp.leftLabel}
                  rightLabel={comp.rightLabel}
                  className="w-full h-[62vh] max-h-[600px]"
                />
              </div>

              {/* Modal Footer Controls */}
              <div className="p-3.5 bg-black/40 border-t border-white/[0.08] flex items-center justify-between text-xs text-white/60">
                <span className="hidden sm:inline font-sans">
                  💡 Tip: Drag slider handle horizontally. Use <kbd className="px-1.5 py-0.5 glass-pill rounded font-mono text-blue-400">←</kbd> and <kbd className="px-1.5 py-0.5 glass-pill rounded font-mono text-blue-400">→</kbd> to switch photos, <kbd className="px-1.5 py-0.5 glass-pill rounded font-mono text-blue-400">Esc</kbd> to close.
                </span>
                <button
                  onClick={() =>
                    handleDownloadSingle(
                      withTimestamp(sliderModalImage.generated_image_location),
                      `0${sliderIndex + 1}_${sliderModalImage.room_type || 'enhanced'}.jpg`
                    )
                  }
                  className="ml-auto px-4 py-2 bg-gradient-to-r from-[#00284b] to-[#003d73] hover:from-[#003666] hover:to-[#004b8c] text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-950/40"
                >
                  <Download className="w-4 h-4" /> Download This Enhanced Photo
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Clean popup toast */}
      <Toast
        message={toast.msg}
        type={toast.type}
        onClose={() => setToast({ msg: '', type: 'success' })}
      />
    </div>
  );
}
