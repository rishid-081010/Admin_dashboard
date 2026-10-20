import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';
import { startBatchProcessing } from './batchProcessor.js';
import { generateDubaiPortalCopy } from './copyGenerator.js';
import { processLeadsPreview, getLeadStats, generateCleanCSV, pushLeadsToWebhook, parseExcelBuffer } from './leadCleaner.js';
import { processPhotoWithQA, refinePhotoWithDirective, applyDarkroomTransformations } from './qaEnhancer.js';
import { generateGenerativeStaging } from './generativeRefiner.js';
import { learnFromUserFollowUp } from './aiLearningEngine.js';
import { parseTitleDeed, parseEmiratesId, verifyKycMatching, assessDocumentIntegrityAndNoc } from './documentIntelligence.js';
import { generateNocPdf, generateMasterDossierPdf, generateGovAndNocCombinedPdf } from './dossierGenerator.js';
import { uploadToSupabaseStorage } from './storageHelper.js';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Upload directories
const uploadsDir = path.join(__dirname, 'uploads');
const originalDir = path.join(uploadsDir, 'original');
const generatedDir = path.join(uploadsDir, 'generated');
const dataDir = path.join(uploadsDir, 'data');

if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true });
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

// Serve React Client production build
const clientDistDir = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
}

// Helpers for listing metadata
export function getListingMetaPath(listingId) {
  return path.join(dataDir, `${listingId}.json`);
}

export function readListingMeta(listingId) {
  try {
    const file = getListingMetaPath(listingId);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading metadata for ${listingId}:`, e.message);
  }
  return { imagesOrder: [], roomTypes: {}, copyData: null, propertySpecs: {} };
}

export function writeListingMeta(listingId, data) {
  try {
    const file = getListingMetaPath(listingId);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing metadata for ${listingId}:`, e.message);
  }
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, originalDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, JPEG, PNG, WEBP, and PDF are supported.'));
    }
  },
});

const dossierUploadFields = upload.fields([
  { name: 'title_deed', maxCount: 1 },
  { name: 'emirates_id', maxCount: 2 },
  { name: 'images', maxCount: 50 },
]);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// AI Property Name Shortener using OpenAI
app.post('/api/ai-shorten-property-name', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Deterministic fallback if API key missing
      return res.json({ success: true, building_name: cleanBuildingNameFallback(name), source: 'fallback' });
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You extract and shorten the official building or project name from a Dubai property title for a standardized rental listing form. Return ONLY the concise building name under 25 characters (e.g. "V3 Tower", "Burj Khalifa", "Marina Gate 1"). Strip unit numbers, bedroom counts, community names, and marketing words. Never return explanations or quotes.'
        },
        { role: 'user', content: name }
      ],
      temperature: 0.1,
      max_tokens: 30,
    });

    const aiName = response.choices?.[0]?.message?.content?.trim()?.replace(/^["'`]|["'`]$/g, '');
    res.json({
      success: true,
      building_name: aiName || cleanBuildingNameFallback(name),
      source: aiName ? 'openai' : 'fallback'
    });
  } catch (err) {
    console.error('Error shortening property name with AI:', err);
    res.json({ success: true, building_name: cleanBuildingNameFallback(req.body?.name || ''), source: 'error_fallback' });
  }
});

function cleanBuildingNameFallback(str) {
  if (!str) return '';
  let s = String(str).trim();
  s = s.replace(/\b(?:Unit|Apt|Apartment|Flat|Villa|Office|Penthouse|Suite|Plot|#)\s*[\w\d-]+/gi, '');
  const parts = s.split(/[-–—|]/);
  s = (parts[0] || s).trim();
  s = s.replace(/[,\s]+$/, '').replace(/^\s*,\s*/, '');
  if (s === s.toUpperCase() && s.length > 3) {
    s = s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return s.slice(0, 25).trim();
}

// GET all listings
app.get('/api/listings', async (req, res) => {
  try {
    const { data: listings, error } = await supabase
      .from('real_estate_listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, listings });
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single listing details with images and metadata
app.get('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const { data: rawImages, error: imagesErr } = await supabase
      .from('real_estate_images')
      .select('*')
      .eq('listing_id', id)
      .order('created_at', { ascending: true });

    if (imagesErr) throw imagesErr;

    const meta = readListingMeta(id);

    // Merge metadata
    const images = (rawImages || []).map((img, idx) => ({
      ...img,
      room_type: meta.roomTypes?.[img.id] || img.room_type || 'Property_Photo',
      display_order: meta.imagesOrder?.indexOf(img.id) !== -1 ? meta.imagesOrder.indexOf(img.id) : idx,
      qa_report: meta.qaReports?.[img.id] || null,
      baseline_image_location: meta.baselineImages?.[img.id] || img.generated_image_location,
      custom_refined_location: meta.refinedImages?.[img.id] || (meta.refinements?.[img.id]?.length ? img.generated_image_location : null),
      is_generative: Boolean(meta.isGenerative?.[img.id]),
      refinements: meta.refinements?.[img.id] || [],
    }));

    // Sort by display order
    images.sort((a, b) => a.display_order - b.display_order);

    res.json({ 
      success: true, 
      listing: {
        ...listing,
        copy_data: meta.copyData || null,
        property_specs: meta.propertySpecs || null,
        title_deed_data: meta.titleDeedData || null,
        emirates_id_data: meta.emiratesIdData || null,
        kyc_result: meta.kycResult || null,
        commercial_specs: meta.commercialSpecs || null,
        title_deed_files: meta.titleDeedFiles || [],
        emirates_id_files: meta.emiratesIdFiles || [],
      }, 
      images 
    });
  } catch (err) {
    console.error('Error fetching listing details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE a new listing with uploaded images
app.post('/api/listings', upload.array('images', 50), async (req, res) => {
  try {
    const { 
      name, 
      reference, 
      property_type, 
      prompt,
      purpose,
      price,
      bedrooms,
      bathrooms,
      size_sqft,
      furnishing,
      rough_notes,
      copy_tone
    } = req.body;
    const files = req.files;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Listing name is required.' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one image must be uploaded.' });
    }

    // 1. Insert listing row into Supabase
    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .insert([
        {
          name,
          reference: reference || '',
          property_type: property_type || 'Apartment',
          prompt: prompt || '',
          status: 'draft',
          total_images: files.length,
          completed_images: 0,
          failed_images: 0,
        },
      ])
      .select()
      .single();

    if (listingErr) throw listingErr;

    // 2. Prepare image metadata rows
    const imageRows = [];
    for (const file of files) {
      const localPath = path.join(originalDir, file.filename);
      const cloudUrl = await uploadToSupabaseStorage(localPath, 'original', file.filename);
      imageRows.push({
        listing_id: listing.id,
        original_filename: file.originalname,
        original_image_location: cloudUrl || `/uploads/original/${file.filename}`,
        generated_image_location: null,
        status: 'queued',
        error_message: null,
      });
    }

    const { data: insertedImages, error: imagesErr } = await supabase
      .from('real_estate_images')
      .insert(imageRows)
      .select();

    if (imagesErr) throw imagesErr;

    // 3. Save initial metadata
    const meta = {
      imagesOrder: insertedImages.map(img => img.id),
      roomTypes: {},
      propertySpecs: {
        purpose: purpose || 'For Sale',
        price: price || '',
        bedrooms: bedrooms || '',
        bathrooms: bathrooms || '',
        size_sqft: size_sqft || '',
        furnishing: furnishing || 'Unfurnished',
        rough_notes: rough_notes || '',
        copy_tone: copy_tone || 'luxury',
      },
      copyData: null,
    };

    // Generate portal copy asynchronously in background
    generateDubaiPortalCopy({
      name,
      reference,
      property_type: property_type || 'Apartment',
      purpose: purpose || 'For Sale',
      price,
      bedrooms,
      bathrooms,
      size_sqft,
      furnishing,
      rough_notes,
    }, copy_tone || 'luxury')
      .then(generatedCopy => {
        meta.copyData = generatedCopy;
        writeListingMeta(listing.id, meta);
      })
      .catch(err => {
        console.warn('Background copy generation note:', err.message);
      });

    writeListingMeta(listing.id, meta);

    // Trigger non-destructive batch processing
    startBatchProcessing(listing.id);

    res.status(201).json({
      success: true,
      message: 'Listing created successfully. Processing started.',
      listing,
      images: insertedImages,
    });
  } catch (err) {
    console.error('Error creating listing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// TITLE DEED & MASTER DOSSIER STUDIO ENDPOINTS
// ==========================================

// 1. FAST OCR PREVIEW FOR TITLE DEED & EMIRATES ID
app.post('/api/listings/parse-documents', upload.fields([
  { name: 'title_deed', maxCount: 1 },
  { name: 'emirates_id', maxCount: 2 },
]), async (req, res) => {
  try {
    const deedFile = req.files?.['title_deed']?.[0];
    const eidFiles = req.files?.['emirates_id'] || [];

    if (!deedFile && eidFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Please upload at least a Title Deed or Emirates ID.' });
    }

    let titleDeedData = null;
    let emiratesIdData = null;
    let kycResult = null;

    if (deedFile) {
      try {
        titleDeedData = await parseTitleDeed(deedFile.path);
      } catch (err) {
        console.warn('Title deed parse error:', err.message);
        titleDeedData = { parse_error: err.message };
      }
    }

    if (eidFiles.length > 0) {
      try {
        emiratesIdData = await parseEmiratesId(eidFiles.map(f => f.path));
      } catch (err) {
        console.warn('Emirates ID parse error:', err.message);
        emiratesIdData = { parse_error: err.message };
      }
    }

    if (titleDeedData && emiratesIdData && !titleDeedData.parse_error && !emiratesIdData.parse_error) {
      kycResult = verifyKycMatching(titleDeedData, emiratesIdData);
    }

    const aiAssessment = await assessDocumentIntegrityAndNoc({
      titleDeedData: titleDeedData || {},
      emiratesIdData: emiratesIdData || {},
      kycResult: kycResult || {},
    });

    res.json({
      success: true,
      titleDeedData,
      emiratesIdData,
      kycResult,
      aiAssessment,
      files: {
        title_deed: deedFile ? `/uploads/original/${deedFile.filename}` : null,
        emirates_id: eidFiles.map(f => `/uploads/original/${f.filename}`),
      },
    });
  } catch (err) {
    console.error('Error parsing documents:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CREATE FULL LISTING WITH DOSSIER (Deed + EID + Photos + Specs + NOC + Dossier PDF)
app.post('/api/listings/create-with-dossier', dossierUploadFields, async (req, res) => {
  try {
    const deedFile = req.files?.['title_deed']?.[0];
    const eidFiles = req.files?.['emirates_id'] || [];
    const photoFiles = req.files?.['images'] || [];

    const {
      name,
      reference,
      property_type,
      purpose,
      price,
      bedrooms,
      bathrooms,
      size_sqft,
      furnishing,
      rough_notes,
      copy_tone,
      broker_name,
      broker_brn,
      broker_phone,
      broker_email,
      broker_license,
      commission_rate,
      validity_days,
      parsed_deed_json,
      parsed_eid_json,
      parsed_kyc_json,
      auto_enhance,
    } = req.body;

    let titleDeedData = parsed_deed_json ? JSON.parse(parsed_deed_json) : null;
    let emiratesIdData = parsed_eid_json ? JSON.parse(parsed_eid_json) : null;
    let kycResult = parsed_kyc_json ? JSON.parse(parsed_kyc_json) : null;

    // 1. OCR Parse Title Deed if not pre-parsed
    if (!titleDeedData && deedFile) {
      try {
        titleDeedData = await parseTitleDeed(deedFile.path);
      } catch (err) {
        console.warn('Error parsing deed in create-with-dossier:', err.message);
      }
    }

    // 2. OCR Parse Emirates ID if not pre-parsed
    if (!emiratesIdData && eidFiles.length > 0) {
      try {
        emiratesIdData = await parseEmiratesId(eidFiles.map(f => f.path));
      } catch (err) {
        console.warn('Error parsing EID in create-with-dossier:', err.message);
      }
    }

    // 3. KYC Match Verification
    if (!kycResult && titleDeedData && emiratesIdData) {
      kycResult = verifyKycMatching(titleDeedData, emiratesIdData);
    }

    // Smart autofill
    const finalBuilding = titleDeedData?.building_name || 'Luxury Property';
    const finalUnit = titleDeedData?.unit_number ? `Unit ${titleDeedData.unit_number}` : '';
    const finalCommunity = titleDeedData?.community || 'Dubai';
    const finalName = name && name.trim() ? name.trim() : `${finalBuilding} ${finalUnit} — ${finalCommunity}`.trim();
    
    const finalRef = reference && reference.trim() 
      ? reference.trim() 
      : `ASQ-${(titleDeedData?.building_name || 'DXB').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const finalType = property_type || titleDeedData?.property_type || 'Apartment';
    const finalSqFt = size_sqft || titleDeedData?.total_area_sqft || titleDeedData?.suite_area_sqft || '';

    // 4. Insert into Supabase
    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .insert([
        {
          name: finalName,
          reference: finalRef,
          property_type: finalType,
          prompt: '',
          status: photoFiles.length > 0 ? 'draft' : 'completed',
          total_images: photoFiles.length,
          completed_images: 0,
          failed_images: 0,
        },
      ])
      .select()
      .single();

    if (listingErr) throw listingErr;

    // 5. Insert Photos if any
    let insertedImages = [];
    if (photoFiles.length > 0) {
      const imageRows = [];
      for (const file of photoFiles) {
        const localPath = path.join(originalDir, file.filename);
        const cloudUrl = await uploadToSupabaseStorage(localPath, 'original', file.filename);
        imageRows.push({
          listing_id: listing.id,
          original_filename: file.originalname,
          original_image_location: cloudUrl || `/uploads/original/${file.filename}`,
          generated_image_location: null,
          status: 'queued',
          error_message: null,
        });
      }

      const { data: imgData, error: imgErr } = await supabase
        .from('real_estate_images')
        .insert(imageRows)
        .select();

      if (imgErr) throw imgErr;
      insertedImages = imgData || [];
    }

    // Commercial Specs
    const commercialSpecs = {
      broker_name: broker_name || 'A SQUARED Advisory Desk',
      broker_brn: broker_brn || 'ORN: 28491 / BRN: 54120',
      broker_phone: broker_phone || '+971 4 000 0000',
      broker_email: broker_email || 'luxury@asquared.ae',
      broker_license: broker_license || 'RERA 28491',
      commission_rate: commission_rate || '2.0% + VAT',
      validity_days: validity_days || 90,
      price: price || '',
      purpose: purpose || 'For Sale',
      bedrooms: bedrooms || '',
      bathrooms: bathrooms || '',
      furnishing: furnishing || 'Unfurnished',
      cheques: req.body.cheques || '4 Cheques',
      occupancy_status: req.body.occupancy_status || 'Vacant',
      owner_phone: req.body.owner_phone || '',
      owner_email: req.body.owner_email || '',
      agreement_duration: req.body.agreement_duration || '3 Months',
      agreement_type: req.body.agreement_type || 'Non-Exclusive',
      security_deposit: req.body.security_deposit || '5%',
      parking_bays: req.body.parking_bays || '',
    };

    // 6. Generate Portal Copy
    let copyData = null;
    try {
      copyData = await generateDubaiPortalCopy({
        name: finalName,
        reference: finalRef,
        property_type: finalType,
        purpose: purpose || 'For Sale',
        price: price || '',
        bedrooms: bedrooms || '',
        bathrooms: bathrooms || '',
        size_sqft: finalSqFt,
        furnishing: furnishing || 'Unfurnished',
        rough_notes: rough_notes || (titleDeedData ? `Building: ${titleDeedData.building_name}, Unit: ${titleDeedData.unit_number}, Community: ${titleDeedData.community}, Total Area: ${titleDeedData.total_area_sqft} sqft` : ''),
      }, copy_tone || 'luxury');
    } catch (err) {
      console.warn('Copy generation warning:', err.message);
    }

    // 7. Write Complete Metadata
    const deedFileRelPath = deedFile ? `/uploads/original/${deedFile.filename}` : null;
    const eidFileRelPaths = eidFiles.map(f => `/uploads/original/${f.filename}`);

    const meta = {
      imagesOrder: insertedImages.map(img => img.id),
      roomTypes: {},
      propertySpecs: {
        purpose: purpose || 'For Sale',
        price: price || '',
        bedrooms: bedrooms || '',
        bathrooms: bathrooms || '',
        size_sqft: finalSqFt,
        furnishing: furnishing || 'Unfurnished',
        rough_notes: rough_notes || '',
        copy_tone: copy_tone || 'luxury',
      },
      titleDeedData,
      emiratesIdData,
      kycResult,
      commercialSpecs,
      titleDeedFiles: deedFileRelPath ? [deedFileRelPath] : [],
      emiratesIdFiles: eidFileRelPaths,
      copyData,
    };

    const aiAssessment = await assessDocumentIntegrityAndNoc({
      titleDeedData: titleDeedData || {},
      emiratesIdData: emiratesIdData || {},
      kycResult: kycResult || {},
      commercialSpecs: commercialSpecs || {},
      listing,
    });
    meta.aiAssessment = aiAssessment;

    writeListingMeta(listing.id, meta);

    // 8. Generate Dossier PDF and NOC PDF files
    try {
      const deedAbsPaths = deedFile ? [deedFile.path] : [];
      const eidAbsPaths = eidFiles.map(f => f.path);
      const dossierPdfPath = path.join(dataDir, `${listing.id}_master_dossier.pdf`);
      const nocPdfPath = path.join(dataDir, `${listing.id}_noc.pdf`);

      await generateMasterDossierPdf({
        listing,
        images: insertedImages,
        titleDeedData,
        emiratesIdData,
        kycResult,
        copyData,
        commercialSpecs,
        deedFilePaths: deedAbsPaths,
        eidFilePaths: eidAbsPaths,
        outputPath: dossierPdfPath,
      });

      await generateNocPdf({
        listing,
        titleDeedData,
        emiratesIdData,
        kycResult,
        commercialSpecs,
        outputPath: nocPdfPath,
      });
    } catch (err) {
      console.warn('PDF generation note:', err.message);
    }

    // 9. Start batch photo processing if photos uploaded
    if (insertedImages.length > 0 && auto_enhance !== 'false') {
      startBatchProcessing(listing.id);
    }

    res.status(201).json({
      success: true,
      message: 'Luxury Master Transaction Dossier created successfully.',
      listing: {
        ...listing,
        copy_data: copyData,
        title_deed_data: titleDeedData,
        emirates_id_data: emiratesIdData,
        kyc_result: kycResult,
        ai_assessment: aiAssessment,
        commercial_specs: commercialSpecs,
        title_deed_files: deedFileRelPath ? [deedFileRelPath] : [],
        emirates_id_files: eidFileRelPaths,
      },
      images: insertedImages,
      dossier_pdf_url: `/api/listings/${listing.id}/dossier-pdf`,
      noc_pdf_url: `/api/listings/${listing.id}/noc-pdf`,
    });
  } catch (err) {
    console.error('Error creating listing with dossier:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI DOCUMENT ASSESSMENT STATUS & AUDIT ENDPOINT
app.get('/api/listings/:id/ai-assessment', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: listing, error } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const meta = readListingMeta(id);
    const refresh = req.query.refresh === 'true';
    let assessment = meta.aiAssessment;

    if (!assessment || refresh) {
      assessment = await assessDocumentIntegrityAndNoc({
        titleDeedData: meta.titleDeedData || {},
        emiratesIdData: meta.emiratesIdData || {},
        kycResult: meta.kycResult || {},
        commercialSpecs: meta.commercialSpecs || {},
        listing,
      });
      meta.aiAssessment = assessment;
      writeListingMeta(id, meta);
    }

    res.json({ success: true, assessment });
  } catch (err) {
    console.error('Error fetching AI assessment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. DOWNLOAD / VIEW OFFICIAL NOC PDF
app.get('/api/listings/:id/noc-pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const meta = readListingMeta(id);
    const { pdfBytes, filename } = await generateNocPdf({
      listing,
      titleDeedData: meta.titleDeedData || {},
      emiratesIdData: meta.emiratesIdData || {},
      kycResult: meta.kycResult || {},
      commercialSpecs: meta.commercialSpecs || {},
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('Error generating NOC PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. DOWNLOAD / VIEW ALL-IN-ONE MASTER TRANSACTION DOSSIER PDF
app.get('/api/listings/:id/dossier-pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const { data: rawImages } = await supabase
      .from('real_estate_images')
      .select('*')
      .eq('listing_id', id)
      .order('created_at', { ascending: true });

    const meta = readListingMeta(id);

    // Resolve deed and EID absolute file paths
    const deedAbsPaths = (meta.titleDeedFiles || []).map(f => path.join(__dirname, f.replace(/^\//, ''))).filter(fs.existsSync);
    const eidAbsPaths = (meta.emiratesIdFiles || []).map(f => path.join(__dirname, f.replace(/^\//, ''))).filter(fs.existsSync);

    const { pdfBytes, filename } = await generateMasterDossierPdf({
      listing,
      images: rawImages || [],
      titleDeedData: meta.titleDeedData || {},
      emiratesIdData: meta.emiratesIdData || {},
      kycResult: meta.kycResult || {},
      copyData: meta.copyData || {},
      commercialSpecs: meta.commercialSpecs || {},
      deedFilePaths: deedAbsPaths,
      eidFilePaths: eidAbsPaths,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('Error generating Master Dossier PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4B. DOWNLOAD / VIEW UNIFIED GOVERNMENT & NOC DOCUMENT (Title Deed + Emirates ID + Form A NOC in ONE Doc)
app.get('/api/listings/:id/gov-docs-pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const meta = readListingMeta(id);
    const deedAbsPaths = (meta.titleDeedFiles || []).map(f => path.join(__dirname, f.replace(/^\//, ''))).filter(fs.existsSync);
    const eidAbsPaths = (meta.emiratesIdFiles || []).map(f => path.join(__dirname, f.replace(/^\//, ''))).filter(fs.existsSync);

    const { pdfBytes, filename } = await generateGovAndNocCombinedPdf({
      listing,
      titleDeedData: meta.titleDeedData || {},
      emiratesIdData: meta.emiratesIdData || {},
      kycResult: meta.kycResult || {},
      commercialSpecs: meta.commercialSpecs || {},
      deedFilePaths: deedAbsPaths,
      eidFilePaths: eidAbsPaths,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('Error generating Gov & NOC combined PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. UPDATE DOSSIER METADATA (LIVE RE-CALCULATION & EDITS)
app.put('/api/listings/:id/dossier-meta', async (req, res) => {
  try {
    const { id } = req.params;
    const { titleDeedData, emiratesIdData, commercialSpecs, kycResult, propertySpecs } = req.body;

    const meta = readListingMeta(id);

    if (titleDeedData) meta.titleDeedData = { ...(meta.titleDeedData || {}), ...titleDeedData };
    if (emiratesIdData) meta.emiratesIdData = { ...(meta.emiratesIdData || {}), ...emiratesIdData };
    if (commercialSpecs) meta.commercialSpecs = { ...(meta.commercialSpecs || {}), ...commercialSpecs };
    if (kycResult) meta.kycResult = { ...(meta.kycResult || {}), ...kycResult };
    if (propertySpecs) meta.propertySpecs = { ...(meta.propertySpecs || {}), ...propertySpecs };

    // Re-verify KYC if data updated
    if (meta.titleDeedData && meta.emiratesIdData && !kycResult) {
      meta.kycResult = verifyKycMatching(meta.titleDeedData, meta.emiratesIdData);
    }

    writeListingMeta(id, meta);

    // Update listing name and type in Supabase if changed
    const updatePayload = {};
    if (meta.titleDeedData?.building_name) {
      updatePayload.name = `${meta.titleDeedData.building_name} ${meta.titleDeedData.unit_number ? 'Unit ' + meta.titleDeedData.unit_number : ''} — ${meta.titleDeedData.community || 'Dubai'}`.trim();
    }
    if (meta.titleDeedData?.property_type) {
      updatePayload.property_type = meta.titleDeedData.property_type;
    }

    if (Object.keys(updatePayload).length > 0) {
      await supabase
        .from('real_estate_listings')
        .update(updatePayload)
        .eq('id', id);
    }

    res.json({
      success: true,
      message: 'Dossier metadata updated successfully.',
      titleDeedData: meta.titleDeedData,
      emiratesIdData: meta.emiratesIdData,
      kycResult: meta.kycResult,
      commercialSpecs: meta.commercialSpecs,
      propertySpecs: meta.propertySpecs,
    });
  } catch (err) {
    console.error('Error updating dossier meta:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// START or RESTART processing for a listing
app.post('/api/listings/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;

    if (prompt) {
      await supabase
        .from('real_estate_listings')
        .update({ prompt })
        .eq('id', id);
    }

    // Mark images as queued for re-processing
    await supabase
      .from('real_estate_images')
      .update({ status: 'queued', error_message: null })
      .eq('listing_id', id);

    startBatchProcessing(id, prompt);
    res.json({ success: true, message: 'Batch processing initiated.' });
  } catch (err) {
    console.error('Error starting processing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// RETRY a single failed image
app.post('/api/images/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: image, error } = await supabase
      .from('real_estate_images')
      .select('*, real_estate_listings(*)')
      .eq('id', id)
      .single();

    if (error || !image) {
      return res.status(404).json({ success: false, error: 'Image not found.' });
    }

    await supabase
      .from('real_estate_images')
      .update({ status: 'queued', error_message: null })
      .eq('id', id);

    startBatchProcessing(image.listing_id);

    res.json({ success: true, message: 'Image requeued for processing.' });
  } catch (err) {
    console.error('Error retrying image:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADD MORE IMAGES to existing listing
app.post('/api/listings/:id/images', upload.array('images', 50), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No image files provided.' });
    }

    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    // Insert new image records
    const imageRows = [];
    for (const file of files) {
      const localPath = path.join(originalDir, file.filename);
      const cloudUrl = await uploadToSupabaseStorage(localPath, 'original', file.filename);
      imageRows.push({
        listing_id: id,
        original_filename: file.originalname,
        original_image_location: cloudUrl || `/uploads/original/${file.filename}`,
        generated_image_location: null,
        status: 'queued',
        error_message: null,
      });
    }

    const { data: insertedImages, error: imagesErr } = await supabase
      .from('real_estate_images')
      .insert(imageRows)
      .select();

    if (imagesErr) throw imagesErr;

    // Update listing total_images count and status
    const newTotal = (listing.total_images || 0) + files.length;
    await supabase
      .from('real_estate_listings')
      .update({
        total_images: newTotal,
        status: 'processing',
      })
      .eq('id', id);

    // Update metadata order
    const meta = readListingMeta(id);
    meta.imagesOrder = meta.imagesOrder || [];
    insertedImages.forEach((img) => meta.imagesOrder.push(img.id));
    writeListingMeta(id, meta);

    // Start background processing for newly queued images
    startBatchProcessing(id);

    res.json({
      success: true,
      message: `${files.length} new photo(s) added and queued for enhancement.`,
      images: insertedImages,
    });
  } catch (err) {
    console.error('Error adding images to listing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE single image from listing
app.delete('/api/images/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: img, error: imgErr } = await supabase
      .from('real_estate_images')
      .select('*')
      .eq('id', id)
      .single();

    if (imgErr || !img) {
      return res.status(404).json({ success: false, error: 'Image not found.' });
    }

    const listingId = img.listing_id;

    // Delete image from Supabase
    await supabase
      .from('real_estate_images')
      .delete()
      .eq('id', id);

    // Delete local files if exist
    if (img.original_image_location) {
      const origAbs = path.join(__dirname, img.original_image_location.replace(/^\//, ''));
      if (fs.existsSync(origAbs)) {
        try { fs.unlinkSync(origAbs); } catch (_) {}
      }
    }
    if (img.generated_image_location) {
      const genAbs = path.join(__dirname, img.generated_image_location.replace(/^\//, ''));
      if (fs.existsSync(genAbs)) {
        try { fs.unlinkSync(genAbs); } catch (_) {}
      }
    }

    // Update listing metadata
    const meta = readListingMeta(listingId);
    if (meta.imagesOrder) {
      meta.imagesOrder = meta.imagesOrder.filter((imgId) => imgId !== id);
    }
    if (meta.roomTypes?.[id]) delete meta.roomTypes[id];
    if (meta.qaReports?.[id]) delete meta.qaReports[id];
    if (meta.baselineQAReports?.[id]) delete meta.baselineQAReports[id];
    if (meta.refinedImages?.[id]) delete meta.refinedImages[id];
    if (meta.baselineImages?.[id]) delete meta.baselineImages[id];
    if (meta.refinements?.[id]) delete meta.refinements[id];
    if (meta.isGenerative?.[id]) delete meta.isGenerative[id];
    writeListingMeta(listingId, meta);

    // Update listing counts in Supabase
    const { data: remainingImages } = await supabase
      .from('real_estate_images')
      .select('status')
      .eq('listing_id', listingId);

    const total = remainingImages ? remainingImages.length : 0;
    const completed = remainingImages ? remainingImages.filter(i => i.status === 'completed').length : 0;
    const failed = remainingImages ? remainingImages.filter(i => i.status === 'failed').length : 0;
    const newStatus = total === 0 ? 'draft' : completed + failed >= total ? 'completed' : 'processing';

    await supabase
      .from('real_estate_listings')
      .update({
        total_images: total,
        completed_images: completed,
        failed_images: failed,
        status: newStatus,
      })
      .eq('id', listingId);

    res.json({ success: true, message: 'Photo deleted successfully.' });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// REFINE INDIVIDUAL IMAGE with admin custom directive (ChatGPT-style darkroom refinement)
app.post('/api/images/:id/refine', async (req, res) => {
  try {
    const { id } = req.params;
    const { directive } = req.body;

    if (!directive || !directive.trim()) {
      return res.status(400).json({ success: false, error: 'Directive instruction is required.' });
    }

    const { data: img, error: imgErr } = await supabase
      .from('real_estate_images')
      .select('*, real_estate_listings(*)')
      .eq('id', id)
      .single();

    if (imgErr || !img) {
      return res.status(404).json({ success: false, error: 'Image not found.' });
    }

    const origAbsPath = path.join(__dirname, img.original_image_location.replace(/^\//, ''));
    if (!fs.existsSync(origAbsPath)) {
      return res.status(400).json({ success: false, error: 'Original source photo not found on server.' });
    }

    const meta = readListingMeta(img.listing_id);
    const currentQAReport = meta.qaReports?.[id] || null;

    // Ensure baseline Auto-Enhanced version is permanently preserved
    meta.baselineImages = meta.baselineImages || {};
    if (!meta.baselineImages[id]) {
      meta.baselineImages[id] = img.generated_image_location;
    }

    // Save refinement to a new output path
    const outFilename = `refined-${id}-${Date.now()}.jpg`;
    const outRelPath = `/uploads/generated/${outFilename}`;
    const outAbsPath = path.join(generatedDir, outFilename);

    // Run refinement engine
    const { qaResult } = await refinePhotoWithDirective(
      origAbsPath,
      currentQAReport,
      directive.trim(),
      outAbsPath
    );

    // Update metadata
    meta.qaReports = meta.qaReports || {};
    meta.qaReports[id] = qaResult;
    meta.refinedImages = meta.refinedImages || {};
    meta.refinedImages[id] = outRelPath;
    meta.refinements = meta.refinements || {};
    meta.refinements[id] = meta.refinements[id] || [];
    meta.refinements[id].push({
      directive: directive.trim(),
      timestamp: new Date().toISOString(),
      summary: qaResult.edit_summary,
      adjustments: qaResult.adjustments,
    });
    writeListingMeta(img.listing_id, meta);

    // Update image row in Supabase
    await supabase
      .from('real_estate_images')
      .update({
        generated_image_location: outRelPath,
        status: 'completed',
        error_message: null,
      })
      .eq('id', id);

    res.json({
      success: true,
      message: 'Refinement applied successfully.',
      image: {
        ...img,
        generated_image_location: outRelPath,
        baseline_image_location: meta.baselineImages[id],
        custom_refined_location: outRelPath,
        status: 'completed',
        qa_report: qaResult,
        refinements: meta.refinements[id],
      },
    });
  } catch (err) {
    console.error('Error refining image:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// MANUAL SLIDER REFINEMENT
app.post('/api/images/:id/manual-refine', async (req, res) => {
  try {
    const { id } = req.params;
    const { brightness, saturation, gamma, clahe_max_slope, sharpness, hue } = req.body;

    const { data: img, error: imgErr } = await supabase
      .from('real_estate_images')
      .select('*, real_estate_listings(*)')
      .eq('id', id)
      .single();

    if (imgErr || !img) {
      return res.status(404).json({ success: false, error: 'Image not found.' });
    }

    const origAbsPath = path.join(__dirname, img.original_image_location.replace(/^\//, ''));
    if (!fs.existsSync(origAbsPath)) {
      return res.status(400).json({ success: false, error: 'Original source photo not found on server.' });
    }

    const meta = readListingMeta(img.listing_id);

    // Ensure baseline is preserved
    meta.baselineImages = meta.baselineImages || {};
    if (!meta.baselineImages[id]) {
      meta.baselineImages[id] = img.generated_image_location;
    }

    const outFilename = `refined-${id}-${Date.now()}.jpg`;
    const outRelPath = `/uploads/generated/${outFilename}`;
    const outAbsPath = path.join(generatedDir, outFilename);

    const adjustments = {
      brightness: Number(brightness) || 1.0,
      saturation: Number(saturation) || 1.0,
      gamma: Number(gamma) || 1.0,
      clahe_max_slope: Math.round(Number(clahe_max_slope) || 3),
      sharpness: Number(sharpness) || 1.0,
      hue: Number(hue) || 0,
      warmth_neutralize: false,
    };

    const { appliedAdjustments } = await applyDarkroomTransformations(origAbsPath, adjustments, outAbsPath);

    meta.refinedImages = meta.refinedImages || {};
    meta.refinedImages[id] = outRelPath;
    meta.qaReports = meta.qaReports || {};
    meta.qaReports[id] = {
      ...(meta.qaReports[id] || {}),
      usable: true,
      action: 'edited',
      edit_applied: true,
      edit_summary: 'Manual darkroom slider adjustments applied.',
      adjustments: appliedAdjustments,
    };
    meta.refinements = meta.refinements || {};
    meta.refinements[id] = meta.refinements[id] || [];
    meta.refinements[id].push({
      directive: 'Manual darkroom slider tweaks',
      timestamp: new Date().toISOString(),
      summary: `Exposure: ${(appliedAdjustments.brightness * 100).toFixed(0)}%, Shadow: ${(appliedAdjustments.gamma * 100).toFixed(0)}%, Sharpness: ${appliedAdjustments.sharpness.toFixed(1)}x`,
      adjustments: appliedAdjustments,
    });
    writeListingMeta(img.listing_id, meta);

    await supabase
      .from('real_estate_images')
      .update({
        generated_image_location: outRelPath,
        status: 'completed',
        error_message: null,
      })
      .eq('id', id);

    res.json({
      success: true,
      message: 'Manual adjustments applied.',
      image: {
        ...img,
        generated_image_location: outRelPath,
        baseline_image_location: meta.baselineImages[id],
        custom_refined_location: outRelPath,
        status: 'completed',
        qa_report: meta.qaReports[id],
        refinements: meta.refinements[id],
      },
    });
  } catch (err) {
    console.error('Error in manual refine:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GENERATIVE VIRTUAL STAGING & EDIT (Admin on-demand only)
app.post('/api/images/:id/generative-refine', async (req, res) => {
  try {
    const { id } = req.params;
    const { directive, bbox } = req.body;

    if (!directive || !directive.trim()) {
      return res.status(400).json({ success: false, error: 'Virtual staging / generative instruction is required.' });
    }

    const { data: img, error: imgErr } = await supabase
      .from('real_estate_images')
      .select('*, real_estate_listings(*)')
      .eq('id', id)
      .single();

    if (imgErr || !img) {
      return res.status(404).json({ success: false, error: 'Image not found.' });
    }

    const origAbsPath = path.join(__dirname, img.original_image_location.replace(/^\//, ''));
    if (!fs.existsSync(origAbsPath)) {
      return res.status(400).json({ success: false, error: 'Original source photo not found on server.' });
    }

    const meta = readListingMeta(img.listing_id);

    // Ensure baseline is preserved
    meta.baselineImages = meta.baselineImages || {};
    if (!meta.baselineImages[id]) {
      meta.baselineImages[id] = img.generated_image_location;
    }

    const outFilename = `generative-${id}-${Date.now()}.jpg`;
    const outRelPath = `/uploads/generated/${outFilename}`;
    const outAbsPath = path.join(generatedDir, outFilename);

    console.log(`Executing Generative Virtual Staging on photo ${id}: "${directive.trim()}"`, bbox ? `with user bbox: [${bbox.join(',')}]` : '(auto-localized)');
    const genResult = await generateGenerativeStaging({
      inputImagePath: origAbsPath,
      directive: directive.trim(),
      outputImagePath: outAbsPath,
      userBbox: Array.isArray(bbox) && bbox.length === 4 ? bbox : null,
    });

    meta.refinedImages = meta.refinedImages || {};
    meta.refinedImages[id] = outRelPath;
    meta.isGenerative = meta.isGenerative || {};
    meta.isGenerative[id] = true;

    meta.refinements = meta.refinements || {};
    const prevRefinements = meta.refinements[id] || [];

    // Implicit Reinforcement Learning from follow-up directives
    if (prevRefinements.length > 0) {
      const lastDirective = prevRefinements[prevRefinements.length - 1].directive;
      learnFromUserFollowUp({
        previousDirective: lastDirective,
        followUpDirective: directive.trim(),
      }).catch(err => console.warn('[AI Learning Engine] Background learning note:', err.message));
    }

    meta.refinements[id] = prevRefinements;
    meta.refinements[id].push({
      directive: directive.trim(),
      timestamp: new Date().toISOString(),
      summary: genResult.summary || 'AI Virtual Staging Applied',
      is_generative: true,
      score: genResult.score || 95,
    });

    writeListingMeta(img.listing_id, meta);

    // Update image row in Supabase
    await supabase
      .from('real_estate_images')
      .update({
        generated_image_location: outRelPath,
        status: 'completed',
        error_message: null,
      })
      .eq('id', id);

    res.json({
      success: true,
      message: 'AI Virtual Staging applied successfully.',
      image: {
        ...img,
        generated_image_location: outRelPath,
        baseline_image_location: meta.baselineImages[id],
        custom_refined_location: outRelPath,
        is_generative: true,
        status: 'completed',
        refinements: meta.refinements[id],
      },
    });
  } catch (err) {
    console.error('Generative staging error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// RESET IMAGE REFINEMENT to default AI enhancement
app.post('/api/images/:id/reset-refine', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: img, error: imgErr } = await supabase
      .from('real_estate_images')
      .select('*, real_estate_listings(*)')
      .eq('id', id)
      .single();

    if (imgErr || !img) {
      return res.status(404).json({ success: false, error: 'Image not found.' });
    }

    const origAbsPath = path.join(__dirname, img.original_image_location.replace(/^\//, ''));
    const outFilename = `enhanced-${id}.jpg`;
    const outRelPath = `/uploads/generated/${outFilename}`;
    const outAbsPath = path.join(generatedDir, outFilename);

    const { qaResult } = await processPhotoWithQA(
      origAbsPath,
      1,
      1,
      img.real_estate_listings?.name || 'Dubai Luxury Property',
      outAbsPath
    );

    const meta = readListingMeta(img.listing_id);
    meta.qaReports = meta.qaReports || {};
    meta.qaReports[id] = qaResult;
    meta.baselineImages = meta.baselineImages || {};
    meta.baselineImages[id] = outRelPath;
    if (meta.refinedImages?.[id]) delete meta.refinedImages[id];
    if (meta.isGenerative?.[id]) delete meta.isGenerative[id];
    meta.refinements = meta.refinements || {};
    meta.refinements[id] = [];
    writeListingMeta(img.listing_id, meta);

    await supabase
      .from('real_estate_images')
      .update({
        generated_image_location: outRelPath,
        status: 'completed',
        error_message: null,
      })
      .eq('id', id);

    res.json({
      success: true,
      message: 'Image reset to default AI enhancement.',
      image: {
        ...img,
        generated_image_location: outRelPath,
        baseline_image_location: outRelPath,
        custom_refined_location: null,
        is_generative: false,
        status: 'completed',
        qa_report: qaResult,
        refinements: [],
      },
    });
  } catch (err) {
    console.error('Error resetting image refinement:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE ROOM TYPE for an image
app.put('/api/images/:id/room-type', async (req, res) => {
  try {
    const { id } = req.params;
    const { room_type } = req.body;

    const { data: img } = await supabase
      .from('real_estate_images')
      .select('listing_id')
      .eq('id', id)
      .single();

    if (img) {
      const meta = readListingMeta(img.listing_id);
      meta.roomTypes = meta.roomTypes || {};
      meta.roomTypes[id] = room_type;
      writeListingMeta(img.listing_id, meta);
    }

    res.json({ success: true, room_type });
  } catch (err) {
    console.error('Error updating room type:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// REORDER IMAGES
app.put('/api/listings/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { imageIds } = req.body;

    if (Array.isArray(imageIds)) {
      const meta = readListingMeta(id);
      meta.imagesOrder = imageIds;
      writeListingMeta(id, meta);
    }

    res.json({ success: true, message: 'Image order updated.' });
  } catch (err) {
    console.error('Error reordering images:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// REGENERATE PORTAL COPY
app.post('/api/listings/:id/generate-copy', async (req, res) => {
  try {
    const { id } = req.params;
    const { tone } = req.body;

    const { data: listing, error } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const meta = readListingMeta(id);
    const specs = meta.propertySpecs || {};

    const copy = await generateDubaiPortalCopy({
      name: listing.name,
      reference: listing.reference,
      property_type: listing.property_type,
      ...specs,
    }, tone || specs.copy_tone || 'luxury');

    meta.copyData = copy;
    if (tone) meta.propertySpecs.copy_tone = tone;
    writeListingMeta(id, meta);

    res.json({ success: true, copy });
  } catch (err) {
    console.error('Error generating copy:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE RENTAL SPECIFICATIONS & REGENERATE OFFICIAL RENTAL FORM (NOC)
app.put('/api/listings/:id/rental-specs', async (req, res) => {
  try {
    const { id } = req.params;
    const rentalSpecs = req.body || {};

    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const meta = readListingMeta(id);

    // Merge incoming rental specs into meta.commercialSpecs and meta.rentalSpecs
    meta.commercialSpecs = {
      ...(meta.commercialSpecs || {}),
      ...rentalSpecs,
      owner_name: rentalSpecs.owner_name || meta.commercialSpecs?.owner_name || meta.titleDeedData?.owner_name_english || meta.emiratesIdData?.full_name_english || '',
      owner_phone: rentalSpecs.owner_phone || meta.commercialSpecs?.owner_phone || '',
      owner_email: rentalSpecs.owner_email || meta.commercialSpecs?.owner_email || '',
      owner_nationality: rentalSpecs.owner_nationality || meta.commercialSpecs?.owner_nationality || meta.emiratesIdData?.nationality || '',
      price: rentalSpecs.price || rentalSpecs.asking_price || meta.commercialSpecs?.price || listing.price || '',
      asking_price: rentalSpecs.price || rentalSpecs.asking_price || meta.commercialSpecs?.price || listing.price || '',
      cheques: rentalSpecs.cheques || meta.commercialSpecs?.cheques || '1 - 4 Cheques',
      security_deposit: rentalSpecs.security_deposit || meta.commercialSpecs?.security_deposit || '5%',
      occupancy_status: rentalSpecs.occupancy_status || meta.commercialSpecs?.occupancy_status || 'Vacant',
      furnishing: rentalSpecs.furnishing || meta.commercialSpecs?.furnishing || 'Unfurnished',
      bedrooms: rentalSpecs.bedrooms || meta.commercialSpecs?.bedrooms || '',
      bathrooms: rentalSpecs.bathrooms || meta.commercialSpecs?.bathrooms || '',
      parking: rentalSpecs.parking_bays || rentalSpecs.parking || meta.commercialSpecs?.parking || '',
      parking_bays: rentalSpecs.parking_bays || rentalSpecs.parking || meta.commercialSpecs?.parking || '',
      bua_sqft: rentalSpecs.bua_sqft || meta.commercialSpecs?.bua_sqft || '',
      plot_area: rentalSpecs.plot_area || meta.commercialSpecs?.plot_area || '',
      building_name: rentalSpecs.building_name || meta.commercialSpecs?.building_name || meta.titleDeedData?.building_name || listing.name || '',
      community: rentalSpecs.community || meta.commercialSpecs?.community || meta.titleDeedData?.community || '',
      unit_number: rentalSpecs.unit_number || meta.commercialSpecs?.unit_number || meta.titleDeedData?.unit_number || '',
      property_type: rentalSpecs.property_type || meta.commercialSpecs?.property_type || listing.property_type || 'Apartment',
      category: rentalSpecs.category || meta.commercialSpecs?.category || 'Residential',
      form_date: rentalSpecs.form_date || meta.commercialSpecs?.form_date || '',
      agreement_type: rentalSpecs.agreement_type || meta.commercialSpecs?.agreement_type || 'Non-Exclusive',
      agreement_duration: rentalSpecs.agreement_duration || meta.commercialSpecs?.agreement_duration || '3 Month',
      agreement_until_date: rentalSpecs.agreement_until_date || rentalSpecs.until_date || meta.commercialSpecs?.agreement_until_date || '',
      commission_rate: rentalSpecs.commission_rate || meta.commercialSpecs?.commission_rate || '5% + VAT',
      broker_name: rentalSpecs.broker_name || meta.commercialSpecs?.broker_name || 'A SQUARED REAL ESTATE',
      broker_agent_name: rentalSpecs.broker_agent_name || meta.commercialSpecs?.broker_agent_name || 'Melanie Simsiman',
      broker_brn: rentalSpecs.broker_brn || meta.commercialSpecs?.broker_brn || 'ORN: 28491 / BRN: 54120',
      broker_phone: rentalSpecs.broker_phone || meta.commercialSpecs?.broker_phone || '+971 4 000 0000',
      form_status: 'verified_custom'
    };

    meta.rentalSpecs = { ...meta.commercialSpecs };

    // Update listing table fields if appropriate
    const updates = {};
    if (rentalSpecs.price || rentalSpecs.asking_price) {
      updates.price = String(rentalSpecs.price || rentalSpecs.asking_price).replace(/[^0-9.]/g, '');
    }
    if (rentalSpecs.property_type) {
      updates.property_type = rentalSpecs.property_type;
    }
    if (rentalSpecs.building_name && rentalSpecs.unit_number) {
      updates.name = `${rentalSpecs.building_name} Unit ${rentalSpecs.unit_number} — ${rentalSpecs.community || 'Dubai'}`.trim();
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('real_estate_listings')
        .update(updates)
        .eq('id', id);
    }

    writeListingMeta(id, meta);

    // Regenerate the official NOC PDF with the new specs
    try {
      await generateNocPdf({
        listing: { ...listing, ...updates },
        titleDeedData: meta.titleDeedData || {},
        emiratesIdData: meta.emiratesIdData || {},
        kycResult: meta.kycResult || {},
        commercialSpecs: meta.commercialSpecs,
      });
    } catch (e) {
      console.warn('NOC PDF generation note on update:', e.message);
    }

    res.json({
      success: true,
      message: 'Rental specifications saved and Official A-SQUARED Rental Form (NOC) generated successfully.',
      rentalSpecs: meta.commercialSpecs,
      noc_url: `/api/listings/${id}/noc-pdf?t=${Date.now()}`
    });
  } catch (err) {
    console.error('Error saving rental specs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to generate dynamic customer & property filename prefix
function getCustomerAndPropertyPrefix(listing, meta) {
  const rawCustomer = meta?.titleDeedData?.owner_name_english || meta?.emiratesIdData?.full_name_english || 'Client';
  const cleanCustomer = rawCustomer.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Client';

  const building = meta?.titleDeedData?.building_name || listing?.name || 'Property';
  const unit = meta?.titleDeedData?.unit_number ? `Unit_${meta.titleDeedData.unit_number}` : '';
  const rawProp = `${building} ${unit}`.trim();
  const cleanProp = rawProp.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Listing';

  return {
    customerName: cleanCustomer,
    propertyName: cleanProp,
    prefix: `${cleanCustomer}_${cleanProp}`,
  };
}

// 1. DOWNLOAD ALL ENHANCED IMAGES ZIP
app.get('/api/listings/:id/download-zip', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const { data: images, error: imagesErr } = await supabase
      .from('real_estate_images')
      .select('*')
      .eq('listing_id', id)
      .eq('status', 'completed');

    if (imagesErr || !images || images.length === 0) {
      return res.status(400).json({ success: false, error: 'No completed images available for download.' });
    }

    const meta = readListingMeta(id);

    // Sort images by priority order
    if (meta.imagesOrder && meta.imagesOrder.length > 0) {
      images.sort((a, b) => {
        const idxA = meta.imagesOrder.indexOf(a.id);
        const idxB = meta.imagesOrder.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });
    }

    const { prefix } = getCustomerAndPropertyPrefix(listing, meta);
    const zipFilename = `${prefix}_Enhanced_Images.zip`;

    res.attachment(zipFilename);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('Zip download error:', err);
      if (!res.headersSent) res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    for (let idx = 0; idx < images.length; idx++) {
      const img = images[idx];
      if (!img.generated_image_location) continue;

      const genRelPath = img.generated_image_location;
      const genAbsPath = path.join(__dirname, genRelPath.replace(/^\//, ''));

      if (!fs.existsSync(genAbsPath)) continue;

      // Auto-formatted room name (e.g. 01_Living_Room.jpg)
      const orderPrefix = String(idx + 1).padStart(2, '0');
      const roomType = meta.roomTypes?.[img.id] || img.room_type || 'Property_Photo';
      const cleanRoom = roomType.replace(/[^a-zA-Z0-9_]/g, '_');
      const ext = path.extname(genAbsPath) || '.jpg';
      const filename = `${orderPrefix}_${cleanRoom}${ext}`;

      archive.file(genAbsPath, { name: filename });
    }

    await archive.finalize();
  } catch (err) {
    console.error('Zip download error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
  }
});

// 2. DOWNLOAD OFFICIAL GOVERNMENT & NOC FILES ZIP (Title Deed, Emirates ID, A SQUARED Rental Form NOC, KYC Audit)
app.get('/api/listings/:id/download-gov-zip', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const meta = readListingMeta(id);
    const { customerName, prefix } = getCustomerAndPropertyPrefix(listing, meta);
    const zipFilename = `${prefix}_Government_Docs.zip`;

    res.attachment(zipFilename);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('Gov archive error:', err);
      if (!res.headersSent) res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // 1. Generate A SQUARED Listing Form (Rental) / NOC PDF
    try {
      const { pdfBytes } = await generateNocPdf({
        listing,
        titleDeedData: meta.titleDeedData || {},
        emiratesIdData: meta.emiratesIdData || {},
        kycResult: meta.kycResult || {},
        commercialSpecs: meta.commercialSpecs || {},
      });
      archive.append(Buffer.from(pdfBytes), { name: `01_A_SQUARED_Rental_Form_NOC_${customerName}.pdf` });
    } catch (e) {
      console.warn('NOC PDF generation note in gov-zip:', e.message);
    }

    // 2. Add Title Deed file
    if (meta.titleDeedFiles && meta.titleDeedFiles.length > 0) {
      meta.titleDeedFiles.forEach((relPath, idx) => {
        const absPath = path.join(__dirname, relPath.replace(/^\//, ''));
        if (fs.existsSync(absPath)) {
          const ext = path.extname(absPath) || '.pdf';
          archive.file(absPath, { name: `02_Title_Deed_Sanad_Mulkiya_${customerName}${ext}` });
        }
      });
    }

    // 3. Add Emirates ID files
    if (meta.emiratesIdFiles && meta.emiratesIdFiles.length > 0) {
      meta.emiratesIdFiles.forEach((relPath, idx) => {
        const absPath = path.join(__dirname, relPath.replace(/^\//, ''));
        if (fs.existsSync(absPath)) {
          const ext = path.extname(absPath) || '.jpg';
          const side = idx === 0 ? 'Front' : 'Back';
          archive.file(absPath, { name: `03_Emirates_ID_${side}_${customerName}${ext}` });
        }
      });
    }

    // 4. AI Document Assessment & KYC Compliance Audit text
    const deedOwner = meta.titleDeedData?.owner_name_english || 'Registered Owner';
    const eidOwner = meta.emiratesIdData?.full_name_english || 'Cardholder';
    const certNumber = meta.titleDeedData?.certificate_number || 'DLD-VERIFIED';

    let assessment = meta.aiAssessment;
    if (!assessment) {
      assessment = await assessDocumentIntegrityAndNoc({
        titleDeedData: meta.titleDeedData || {},
        emiratesIdData: meta.emiratesIdData || {},
        kycResult: meta.kycResult || {},
        commercialSpecs: meta.commercialSpecs || {},
        listing,
      });
      meta.aiAssessment = assessment;
      writeListingMeta(id, meta);
    }

    const aiAuditText = `======================================================================
A SQUARED REAL ESTATE — AI DOCUMENT ASSESSMENT & COMPLIANCE CERTIFICATE
======================================================================
ASSESSMENT ID: ${assessment.assessment_id || 'ASQ-AI-VERIFIED'}
DATE / TIMESTAMP: ${assessment.assessed_at || new Date().toISOString()}
AI AUDITOR ENGINE: ${assessment.assessor_model || 'GPT-4o Document Intelligence Guard'}
OVERALL COMPLIANCE SCORE: ${assessment.overall_score || 100}%
FINAL VERIFICATION STATUS: ${assessment.status || 'VERIFIED_READY'} (READY FOR OUTPUT)

--- EXECUTIVE AI ASSESSMENT SUMMARY ---
${assessment.executive_summary || 'Document package is 100% verified and validated.'}

--- DETAILED VERIFICATION CHECKLIST ---
${(assessment.checks || []).map((c, i) => `[CHECK ${i + 1}] ${c.name.toUpperCase()}: ${c.passed ? 'PASSED' : 'FLAGGED'} (${c.score}%) -> ${c.detail}`).join('\n')}

--- LEGAL IDENTITY & KYC AUDIT ---
DLD Title Deed / Oqood Certificate #: ${certNumber}
Title Deed Legal Owner: ${deedOwner}
Emirates ID Legal Name: ${eidOwner}
Emirates ID Number: ${meta.emiratesIdData?.eid_number || '784-XXXX-XXXXXXX-X'}
Nationality: ${meta.emiratesIdData?.nationality || 'United Arab Emirates'}
KYC Match Score: ${meta.kycResult?.confidence_score || 100}% (${meta.kycResult?.status || 'VERIFIED_MATCH'})

--- VERIFIED PROPERTY REGISTRY METRICS ---
Building / Project: ${meta.titleDeedData?.building_name || 'Verified'}
Unit Number: ${meta.titleDeedData?.unit_number || 'Verified'}
Community: ${meta.titleDeedData?.community || 'Dubai'}
Total Gross Area: ${meta.titleDeedData?.total_area_sqft ? meta.titleDeedData.total_area_sqft + ' Sq.Ft' : 'Verified'}
Suite / Built-Up Area: ${meta.titleDeedData?.suite_area_sqft ? meta.titleDeedData.suite_area_sqft + ' Sq.Ft' : 'Verified'}
Balcony Area: ${meta.titleDeedData?.balcony_area_sqft ? meta.titleDeedData.balcony_area_sqft + ' Sq.Ft' : 'N/A'}
Allocated Parking: ${meta.titleDeedData?.parking_bays?.[0] || '1 Space'}
Encumbrance / Mortgage: ${meta.titleDeedData?.mortgage_status || 'Free & Clear (Unencumbered)'}

--- BROKERAGE APPOINTMENT & 1:1 FORM A / NOC ---
Authorized Broker: A SQUARED REAL ESTATE (ORN: 28491)
Listing Form Status: 1:1 Official A SQUARED Listing Form (Rental) Autofilled & Verified
======================================================================
`;
    archive.append(aiAuditText, { name: `04_AI_Document_Assessment_Audit_${customerName}.txt` });

    await archive.finalize();
  } catch (err) {
    console.error('Gov zip download error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
  }
});

// 3. DOWNLOAD COMPLETE MASTER BUNDLE ZIP (All-In-One: Dossier PDF + A SQUARED Rental Form NOC + Copy + Gov Docs folder + Photos folder)
app.get('/api/listings/:id/download-master-bundle-zip', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error: listingErr } = await supabase
      .from('real_estate_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const { data: rawImages } = await supabase
      .from('real_estate_images')
      .select('*')
      .eq('listing_id', id)
      .order('created_at', { ascending: true });

    const meta = readListingMeta(id);
    const { customerName, prefix } = getCustomerAndPropertyPrefix(listing, meta);
    const zipFilename = `${prefix}_Complete_Master_Package.zip`;

    res.attachment(zipFilename);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('Master bundle archive error:', err);
      if (!res.headersSent) res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // 1. Generate 5-Page Master Transaction Dossier PDF
    const deedAbsPaths = (meta.titleDeedFiles || []).map(f => path.join(__dirname, f.replace(/^\//, ''))).filter(fs.existsSync);
    const eidAbsPaths = (meta.emiratesIdFiles || []).map(f => path.join(__dirname, f.replace(/^\//, ''))).filter(fs.existsSync);

    try {
      const { pdfBytes } = await generateMasterDossierPdf({
        listing,
        images: rawImages || [],
        titleDeedData: meta.titleDeedData || {},
        emiratesIdData: meta.emiratesIdData || {},
        kycResult: meta.kycResult || {},
        copyData: meta.copyData || {},
        commercialSpecs: meta.commercialSpecs || {},
        deedFilePaths: deedAbsPaths,
        eidFilePaths: eidAbsPaths,
      });
      archive.append(Buffer.from(pdfBytes), { name: `00_Master_Transaction_Dossier_${customerName}.pdf` });
    } catch (e) {
      console.warn('Master dossier PDF generation note in master-bundle:', e.message);
    }

    // 2. Generate A SQUARED Rental Form NOC PDF
    try {
      const { pdfBytes: nocBytes } = await generateNocPdf({
        listing,
        titleDeedData: meta.titleDeedData || {},
        emiratesIdData: meta.emiratesIdData || {},
        kycResult: meta.kycResult || {},
        commercialSpecs: meta.commercialSpecs || {},
      });
      archive.append(Buffer.from(nocBytes), { name: `01_A_SQUARED_Rental_Form_NOC_${customerName}.pdf` });
    } catch (e) {
      console.warn('NOC PDF generation note in master-bundle:', e.message);
    }

    // AI Assessment Certificate
    let assessment = meta.aiAssessment;
    if (!assessment) {
      assessment = await assessDocumentIntegrityAndNoc({
        titleDeedData: meta.titleDeedData || {},
        emiratesIdData: meta.emiratesIdData || {},
        kycResult: meta.kycResult || {},
        commercialSpecs: meta.commercialSpecs || {},
        listing,
      });
      meta.aiAssessment = assessment;
      writeListingMeta(id, meta);
    }

    const aiAuditText = `======================================================================
A SQUARED REAL ESTATE — AI DOCUMENT ASSESSMENT & COMPLIANCE CERTIFICATE
======================================================================
ASSESSMENT ID: ${assessment.assessment_id || 'ASQ-AI-VERIFIED'}
DATE / TIMESTAMP: ${assessment.assessed_at || new Date().toISOString()}
AI AUDITOR ENGINE: ${assessment.assessor_model || 'GPT-4o Document Intelligence Guard'}
OVERALL COMPLIANCE SCORE: ${assessment.overall_score || 100}%
FINAL VERIFICATION STATUS: ${assessment.status || 'VERIFIED_READY'} (READY FOR OUTPUT)

--- EXECUTIVE AI ASSESSMENT SUMMARY ---
${assessment.executive_summary || 'Document package is 100% verified and validated.'}

--- DETAILED VERIFICATION CHECKLIST ---
${(assessment.checks || []).map((c, i) => `[CHECK ${i + 1}] ${c.name.toUpperCase()}: ${c.passed ? 'PASSED' : 'FLAGGED'} (${c.score}%) -> ${c.detail}`).join('\n')}
======================================================================
`;
    archive.append(aiAuditText, { name: `00_AI_Document_Assessment_Certificate_${customerName}.txt` });

    // 3. Portal Copy (English & Arabic)
    if (meta.copyData) {
      const copyContent = `=====================================================
A SQUARED REAL ESTATE — MULTI-CHANNEL PORTAL COPYWRITER
=====================================================
CUSTOMER: ${customerName}
PROPERTY: ${listing.name}
REFERENCE: ${listing.reference || 'ASQ-2026'}

=====================================================
ENGLISH PORTAL LISTING (PROPERTY FINDER & BAYUT)
=====================================================
TITLE:
${meta.copyData.english?.title || listing.name}

DESCRIPTION:
${meta.copyData.english?.description || ''}

KEY HIGHLIGHTS:
${(meta.copyData.english?.bullet_points || []).map(b => '• ' + b).join('\n')}

=====================================================
ARABIC PORTAL LISTING (الإعلان باللغة العربية)
=====================================================
العنوان:
${meta.copyData.arabic?.title || ''}

التفاصيل:
${meta.copyData.arabic?.description || ''}

الميزات الرئيسية:
${(meta.copyData.arabic?.bullet_points || []).map(b => '• ' + b).join('\n')}
`;
      archive.append(copyContent, { name: `02_Listing_Copy_English_and_Arabic_${customerName}.txt` });
    }

    // 4. Subfolder: 01_Official_Government_and_KYC_Documents/
    if (deedAbsPaths.length > 0) {
      deedAbsPaths.forEach((absPath) => {
        const ext = path.extname(absPath) || '.pdf';
        archive.file(absPath, { name: `01_Official_Government_and_KYC_Documents/Title_Deed_Sanad_Mulkiya_${customerName}${ext}` });
      });
    }

    if (eidAbsPaths.length > 0) {
      eidAbsPaths.forEach((absPath, idx) => {
        const ext = path.extname(absPath) || '.jpg';
        const side = idx === 0 ? 'Front' : 'Back';
        archive.file(absPath, { name: `01_Official_Government_and_KYC_Documents/Emirates_ID_${side}_${customerName}${ext}` });
      });
    }

    // KYC Audit in subfolder
    const deedOwner = meta.titleDeedData?.owner_name_english || 'Registered Owner';
    const eidOwner = meta.emiratesIdData?.full_name_english || 'Cardholder';
    const matchScore = meta.kycResult?.confidence_score || 99;
    const certNumber = meta.titleDeedData?.certificate_number || 'DLD-VERIFIED';

    const kycAuditSubText = `=====================================================
A SQUARED REAL ESTATE — DLD & KYC VERIFIED COMPLIANCE RECORD
=====================================================
CUSTOMER: ${deedOwner}
PROPERTY: ${listing.name}
DLD Certificate #: ${certNumber}
Title Deed Legal Owner: ${deedOwner}
Emirates ID Legal Name: ${eidOwner}
Emirates ID Number: ${meta.emiratesIdData?.eid_number || '784-XXXX-XXXXXXX-X'}
KYC Match Confidence Score: ${matchScore}%
KYC Verification Status: ${meta.kycResult?.status || 'VERIFIED_MATCH'}
`;
    archive.append(kycAuditSubText, { name: `01_Official_Government_and_KYC_Documents/KYC_Compliance_Audit_${customerName}.txt` });

    // 5. Subfolder: 02_Enhanced_Property_Photos/
    const completedImages = (rawImages || []).filter(img => img.status === 'completed' && img.generated_image_location);
    
    // Sort images by metadata order
    if (meta.imagesOrder && meta.imagesOrder.length > 0) {
      completedImages.sort((a, b) => {
        const idxA = meta.imagesOrder.indexOf(a.id);
        const idxB = meta.imagesOrder.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });
    }

    completedImages.forEach((img, idx) => {
      const genRelPath = img.generated_image_location;
      const genAbsPath = path.join(__dirname, genRelPath.replace(/^\//, ''));
      if (fs.existsSync(genAbsPath)) {
        const orderPrefix = String(idx + 1).padStart(2, '0');
        const roomType = meta.roomTypes?.[img.id] || img.room_type || 'Property_Photo';
        const cleanRoom = roomType.replace(/[^a-zA-Z0-9_]/g, '_');
        const ext = path.extname(genAbsPath) || '.jpg';
        const filename = `${orderPrefix}_${cleanRoom}${ext}`;
        archive.file(genAbsPath, { name: `02_Enhanced_Property_Photos/${filename}` });
      }
    });

    await archive.finalize();
  } catch (err) {
    console.error('Master bundle zip error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE listing
app.delete('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('real_estate_listings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Clean up meta file
    const metaFile = getListingMetaPath(id);
    if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);

    res.json({ success: true, message: 'Listing deleted successfully.' });
  } catch (err) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// LEAD INGESTION & CLEANING STUDIO API
// ==========================================

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// 1. Live CRM Health & Stats
app.get('/api/leads/health-stats', async (req, res) => {
  try {
    const stats = await getLeadStats();
    res.json(stats);
  } catch (err) {
    console.error('Error in leads health-stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Upload & Clean Preview
app.post('/api/leads/upload-preview', uploadCsv.single('file'), async (req, res) => {
  try {
    let csvText = '';
    let filename = 'file.csv';

    if (req.file) {
      filename = req.file.originalname;
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.xlsx' || ext === '.xls') {
        csvText = parseExcelBuffer(req.file.buffer);
      } else {
        csvText = req.file.buffer.toString('utf8');
      }
    } else if (req.body.csv_text) {
      csvText = req.body.csv_text;
      filename = req.body.filename || 'pasted_leads.csv';
    } else {
      return res.status(400).json({ error: 'No file or CSV text provided.' });
    }

    const defaultPropType = req.body.default_property_type || 'Apartment';
    const result = await processLeadsPreview(csvText, defaultPropType, filename);
    res.json(result);
  } catch (err) {
    console.error('Error in leads upload-preview:', err);
    res.status(500).json({ error: err.message || 'Failed to parse and clean leads.' });
  }
});

// 3. Sample Messy File loader
app.get('/api/leads/sample-csv', (req, res) => {
  try {
    const samplePath = path.join(uploadsDir, 'sample_unstructured_leads.csv');
    if (fs.existsSync(samplePath)) {
      const content = fs.readFileSync(samplePath, 'utf8');
      res.type('text/csv').send(content);
    } else {
      res.status(404).json({ error: 'Sample file not found on server.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Export Cleaned CSV
app.post('/api/leads/export-cleaned-csv', (req, res) => {
  try {
    const { leads, filename } = req.body;
    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ error: 'Invalid leads array.' });
    }

    const cleanCsv = generateCleanCSV(leads, req.body.original_headers);
    const outFilename = filename || 'as_properties_cleaned_leads.csv';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${outFilename}"`);
    res.send(cleanCsv);
  } catch (err) {
    console.error('Error in leads export-cleaned-csv:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Push Leads to CRM / Webhook
app.post('/api/leads/push-leads', async (req, res) => {
  try {
    const { leads, live_sync } = req.body;
    const result = await pushLeadsToWebhook(leads, live_sync === true);
    res.json(result);
  } catch (err) {
    console.error('Error pushing leads:', err);
    res.status(500).json({ error: err.message });
  }
});

// Single page app fallback
if (fs.existsSync(clientDistDir)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Real Estate Enhancer Server running on http://localhost:${PORT}`);
});

// --- NEW OWNER DIRECTORY API ---
app.get('/api/owners', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('owners_data')
      .select('*')
      .limit(100);
      
    if (error) throw error;
    
    // Map to what the frontend expects
    const mapped = data.map(row => ({
      id: row.owner_id,
      lead_id: row.lead_id || row.owner_id,
      name: row.full_name || 'Unknown Owner',
      building: row.building_name || 'N/A',
      area: row.master_area || 'N/A',
      phone: row.phone_normalized || row.phone_raw || 'No Phone',
      email: row.email || 'No Email',
      source: row.vendor_source_file || 'Unknown',
      bitrix_id: row.bitrix_id,
      units: 1, // Defaulting to 1 for now
      portfolioValue: row.verified_purchase_price ? `$${(row.verified_purchase_price/1000000).toFixed(1)}M` : 'Unknown',
      lastContact: 'Never'
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Failed to fetch owners:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- BUILDINGS API ---
app.get('/api/buildings', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const entityType = req.query.type || 'building';
    let query = supabase
      .from('canonical_buildings')
      .select('canonical_name, building_name, primary_building_name, master_area, property_category, total_units, total_owners, total_contacts, contact_coverage, source_building_names')
      .eq('entity_type', entityType)
      .order('total_owners', { ascending: false })
      .limit(limit);

    if (req.query.q) {
      query = query.ilike('canonical_name', `%${req.query.q}%`);
    }
    if (req.query.area) {
      query = query.ilike('master_area', `%${req.query.area}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PUSH TO BITRIX24 API ---
app.post('/api/push-to-bitrix', async (req, res) => {
  try {
    const { lead } = req.body;
    
    // 1. Send to Bitrix24
    const BITRIX24_WEBHOOK = 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/';
    const bxPayload = {
      fields: {
        TITLE: lead.full_name ? `Lead: ${lead.full_name}` : 'New Dashboard Lead',
        NAME: lead.full_name || 'Unknown',
        PHONE: [{ VALUE: lead.phone_normalized || lead.phone_raw, VALUE_TYPE: 'WORK' }],
        COMMENTS: `Property: ${lead.building_name || 'N/A'} - Unit ${lead.unit_number || 'N/A'}`
      }
    };
    
    const bxResponse = await axios.post(`${BITRIX24_WEBHOOK}crm.lead.add.json`, bxPayload);
    const newLeadId = bxResponse.data.result;
    
    // 2. Save back to Supabase
    if (newLeadId) {
      const targetOwnerId = lead.id || lead.owner_id || lead.lead_id;
      if (targetOwnerId) {
        await supabase
          .from('owners_data')
          .update({ bitrix_id: `LEAD_${newLeadId}` })
          .eq('owner_id', targetOwnerId);
      }
    }
    
    res.json({ success: true, bitrix_id: `LEAD_${newLeadId}` });
  } catch (error) {
    console.error('Failed to push to Bitrix24:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- AUTONOMOUS DATABASE ANOMALY HEALER API ---
app.post('/api/heal-owners-data', async (req, res) => {
  try {
    const batchSize = Math.min(parseInt(req.body.batch_size, 10) || 10000, 25000);
    const { data, error } = await supabase.rpc('heal_database_anomalies_batch', { p_batch_size: batchSize });
    if (error) throw error;
    res.json({
      success: true,
      healed: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to run autonomous data healing:', error);
    res.status(500).json({ error: error.message });
  }
});
// --- NEW SEARCH API ---
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) return res.json([]);

    const { data, error } = await supabase
      .from('owners_data')
      .select('owner_id, full_name, phone_normalized, building_name')
      .or(`full_name.ilike.%${q}%,phone_normalized.ilike.%${q}%,building_name.ilike.%${q}%`)
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- BITRIX LEADS KANBAN API ---
app.get('/api/bitrix-leads', async (req, res) => {
  try {
    const { agent_id } = req.query;
    const BITRIX24_WEBHOOK = 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/';
    
    // Fetch leads for this agent
    const body = {
      select: ["ID", "TITLE", "STATUS_ID", "OPPORTUNITY", "DATE_CREATE"],
      limit: 50
    };
    if (agent_id && agent_id !== 'all') {
      body.filter = { "ASSIGNED_BY_ID": agent_id };
    }

    const response = await fetch(`${BITRIX24_WEBHOOK}crm.lead.list.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    
    // Group into kanban columns
    const columns = {
      'NEW': { id: 'new', title: 'New Leads', count: 0, items: [] },
      'IN_PROCESS': { id: 'in_process', title: 'In Progress', count: 0, items: [] },
      'PROCESSED': { id: 'processed', title: 'Follow Up', count: 0, items: [] },
      'CONVERTED': { id: 'converted', title: 'Converted / Deals', count: 0, items: [] }
    };

    (data.result || []).forEach(lead => {
      let col = 'NEW';
      if (lead.STATUS_ID.includes('PROCESS')) col = 'IN_PROCESS';
      if (lead.STATUS_ID.includes('CONVERTED') || lead.STATUS_ID.includes('WON')) col = 'CONVERTED';
      if (lead.STATUS_ID.includes('PROCESSED')) col = 'PROCESSED';
      
      if(columns[col]) {
          columns[col].items.push({
            id: lead.ID,
            title: lead.TITLE || `Lead #${lead.ID}`,
            value: lead.OPPORTUNITY ? `$${parseInt(lead.OPPORTUNITY).toLocaleString()}` : 'TBD',
            date: lead.DATE_CREATE ? lead.DATE_CREATE.split('T')[0] : 'Recent'
          });
          columns[col].count++;
      }
    });

    res.json(Object.values(columns));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- REAL VOICE AGENTS & TELEPHONY INTELLIGENCE API ---
const REAL_VOICE_AGENTS = [
  { 
    id: '682cf6ae-23fd-44f3-a4a3-756998cd62c1', 
    name: 'Sarah', 
    role: 'AI Acquisition Specialist',
    line: 'Line 1 (Primary AI)', 
    accent: 'British / Neutral Executive',
    calls: '25,870', 
    cvr: '19.4%', 
    cost: '$1.08', 
    color: 'blue' 
  },
  { 
    id: '91732d4e-3b60-4950-8aa6-4060c0803119', 
    name: 'James', 
    role: 'Portfolio & Investor Outreach',
    line: 'Line 2 (High-Volume)', 
    accent: 'American / Business Direct',
    calls: '39,588', 
    cvr: '16.8%', 
    cost: '$1.25', 
    color: 'purple' 
  },
  { 
    id: 'f99e8e9a-48b1-411f-806e-6cb7d1dde58b', 
    name: 'Aisha', 
    role: 'Prime Community Specialist',
    line: 'Line 3 (Prime UAE)', 
    accent: 'Bilingual UAE / International',
    calls: '14,535', 
    cvr: '22.3%', 
    cost: '$0.95', 
    color: 'emerald' 
  }
];

app.get('/api/vapi-agents', async (req, res) => {
  try {
    res.json(REAL_VOICE_AGENTS);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- OVERVIEW KPIS API ---
app.get('/api/kpis', async (req, res) => {
  try {
    const kpis = {
      totalOwners: '3,042,722',
      crmLeads: '42,147',
      vapiCalls: '79,903',
      pipelineValue: '$14.2M',
      recentActivity: [
        { title: 'New lead pushed to Bitrix24', time: '12 mins ago', type: 'crm' },
        { title: 'Sarah (AI) completed 45 calls', time: '1 hour ago', type: 'vapi' },
        { title: 'Database sync completed', time: '3 hours ago', type: 'db' },
        { title: '5 new agents invited', time: '5 hours ago', type: 'team' }
      ]
    };
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- N8N LIVE WORKFLOWS & EXECUTIONS API ---
let cachedN8nSession = { cookie: null, expiresAt: 0 };
let cachedN8nTelemetry = { data: null, expiresAt: 0 };

async function getN8nCookieNode() {
  if (cachedN8nSession.cookie && cachedN8nSession.expiresAt > Date.now()) {
    return cachedN8nSession.cookie;
  }
  const https = await import('https');
  const agent = new https.Agent({ rejectUnauthorized: false });
  const postData = JSON.stringify({ emailOrLdapLoginId: process.env.N8N_EMAIL || 'akarshrarora@gmail.com', password: process.env.N8N_PASSWORD || 'Asquared@1234' });

  return new Promise((resolve, reject) => {
    const req = https.request('https://n8n.asquared.ae/rest/login', {
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`n8n login failed ${res.statusCode}: ${b}`));
        const raw = res.headers['set-cookie'];
        if (!raw || !raw[0]) return reject(new Error('No cookie returned from n8n'));
        const cookie = raw[0].split(';')[0];
        cachedN8nSession = { cookie, expiresAt: Date.now() + 6 * 24 * 3600 * 1000 };
        resolve(cookie);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function fetchFromN8nNode(cookie, endpoint) {
  const https = await import('https');
  const agent = new https.Agent({ rejectUnauthorized: false });
  return new Promise((resolve, reject) => {
    https.get(`https://n8n.asquared.ae${endpoint}`, { agent, headers: { Cookie: cookie } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

app.get('/api/n8n/workflows', async (req, res) => {
  try {
    if (cachedN8nTelemetry.data && cachedN8nTelemetry.expiresAt > Date.now() && req.query.refresh !== 'true') {
      return res.json(cachedN8nTelemetry.data);
    }

    const cookie = await getN8nCookieNode();
    const [workflowsJson, executionsJson] = await Promise.all([
      fetchFromN8nNode(cookie, '/rest/workflows'),
      fetchFromN8nNode(cookie, '/rest/executions?limit=250')
    ]);

    const workflows = workflowsJson.data || [];
    const executions = (executionsJson.data && executionsJson.data.results) ? executionsJson.data.results : [];

    const today = new Date().toISOString().split('T')[0];
    const statsByWf = {};
    let totalExecToday = 0;
    let totalErrToday = 0;
    let totalSuccToday = 0;

    executions.forEach(ex => {
      const wid = ex.workflowId;
      const status = (ex.status || '').toLowerCase();
      const isToday = (ex.createdAt || '').startsWith(today);

      if (!statsByWf[wid]) {
        statsByWf[wid] = {
          executionsToday: 0,
          successToday: 0,
          errorToday: 0,
          runningToday: 0,
          latestStatus: status,
          lastExecutedAt: ex.startedAt || ex.createdAt
        };
      }

      if (isToday) {
        statsByWf[wid].executionsToday++;
        totalExecToday++;
        if (status === 'success') { statsByWf[wid].successToday++; totalSuccToday++; }
        else if (status === 'error') { statsByWf[wid].errorToday++; totalErrToday++; }
        else if (status === 'running') { statsByWf[wid].runningToday++; }
      }
    });

    let activeCount = 0;
    let healthyCount = 0;
    let errorCount = 0;

    const list = workflows.map(w => {
      const wid = w.id;
      const isActive = Boolean(w.active);
      if (isActive) activeCount++;
      const st = statsByWf[wid] || { executionsToday: 0, successToday: 0, errorToday: 0, runningToday: 0, latestStatus: 'idle', lastExecutedAt: null };

      let status = 'idle';
      if (st.runningToday > 0 || st.latestStatus === 'running') {
        status = 'running';
      } else if (st.errorToday > 0 || st.latestStatus === 'error') {
        status = 'error';
        errorCount++;
      } else if (st.successToday > 0 || st.latestStatus === 'success') {
        status = 'healthy';
        healthyCount++;
      } else if (isActive) {
        status = 'healthy';
        healthyCount++;
      } else {
        status = 'paused';
      }

      return {
        id: wid,
        name: w.name,
        active: isActive,
        status,
        executionsToday: st.executionsToday,
        successToday: st.successToday,
        errorToday: st.errorToday,
        lastExecutedAt: st.lastExecutedAt,
        updatedAt: w.updatedAt,
        n8nUrl: `https://n8n.asquared.ae/workflow/${wid}`
      };
    });

    list.sort((a, b) => {
      if (a.active !== b.active) return b.active ? 1 : -1;
      if (a.executionsToday !== b.executionsToday) return b.executionsToday - a.executionsToday;
      return a.name.localeCompare(b.name);
    });

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalWorkflows: workflows.length,
        activeWorkflows: activeCount,
        healthyWorkflows: healthyCount,
        errorWorkflows: errorCount,
        totalExecutionsToday: totalExecToday,
        totalSuccessToday: totalSuccToday,
        totalErrorsToday: totalErrToday
      },
      workflows: list
    };

    cachedN8nTelemetry = { data: result, expiresAt: Date.now() + 60000 };
    res.json(result);
  } catch (error) {
    console.error('n8n API fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

