// Global state
let currentPreviewData = null;
let activeTab = 'clean';

// Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const mappingCard = document.getElementById('mapping-card');
const mappingChips = document.getElementById('mapping-chips');
const kpiGrid = document.getElementById('kpi-grid');
const tableSection = document.getElementById('table-section');
const leadsTableBody = document.getElementById('leads-table-body');
const downloadCsvBtn = document.getElementById('download-csv-btn');
const loadSampleBtn = document.getElementById('load-sample-btn');
const defaultPropTypeSelect = document.getElementById('default-property-type');

// Dropzone Drag and Drop
['dragenter', 'dragover'].forEach(eventName => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('dropzone-active');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dropzone-active');
  }, false);
});

dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length) {
    handleFile(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) {
    handleFile(e.target.files[0]);
  }
});

// One-Click Sample Messy File Loader
if (loadSampleBtn) {
  loadSampleBtn.addEventListener('click', async () => {
    try {
      loadSampleBtn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Loading...`;
      lucide.createIcons();
      const res = await fetch('sample_unstructured_leads.csv');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'sample_unstructured_leads.csv', { type: 'text/csv' });
      await handleFile(sampleFile);
    } catch (err) {
    dropzone.innerHTML = `<div class='flex flex-col items-center justify-center space-y-2 text-rose-400'><i data-lucide='alert-circle' class='w-8 h-8'></i><p class='text-sm font-semibold'>Error: ${err.message}</p><button id='retry-btn' class='px-3 py-1 bg-rose-500/20 rounded mt-2 text-xs'>Try Again</button></div>`;
    lucide.createIcons();
    document.getElementById('retry-btn').addEventListener('click', resetDropzone);
  }
}

function resetDropzone() {
  dropzone.innerHTML = `
    <input type="file" id="file-input" accept=".csv, .txt, .xlsx" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
    <div class="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
      <i data-lucide="upload-cloud" class="w-7 h-7"></i>
    </div>
    <h3 class="text-base font-semibold text-white">Drag & drop raw community CSV here</h3>
    <p class="text-xs text-gray-400 mt-1 max-w-sm">Supports Princess Tower, Damac Hills, Emaar, DLD exports, or custom spreadsheets.</p>
    <div class="flex items-center gap-3 mt-3">
      <span class="px-3 py-1 rounded-md bg-slate-800/80 text-xs text-blue-300 border border-slate-700 font-medium">Click to browse file</span>
      <span class="text-xs text-gray-500">or click "Load Sample Messy File" above</span>
    </div>
  `;
  lucide.createIcons();
  document.getElementById('file-input').addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });
}

function renderResults(data) {
  resetDropzone();

  // 1. Column Mapping Chips
  mappingCard.classList.remove('hidden');
  mappingChips.innerHTML = '';
  const mapping = data.mapping_used || {};
  const schemaKeys = [
    { key: 'phone', label: 'Phone Number' },
    { key: 'name', label: 'Owner Name' },
    { key: 'project', label: 'Project / Tower' },
    { key: 'location', label: 'Location' },
    { key: 'unit', label: 'Unit Number' },
    { key: 'property_type', label: 'Property Type' },
  ];

  schemaKeys.forEach(f => {
    const detected = mapping[f.key] || 'Not in CSV';
    const isMatched = !!mapping[f.key];
    const chip = document.createElement('div');
    chip.className = 'p-3 rounded-xl bg-slate-950/80 border border-slate-700/60 flex flex-col';
    chip.innerHTML = `
      <span class="text-[10px] uppercase font-semibold text-gray-400">${f.label}</span>
      <span class="text-xs font-bold ${isMatched ? 'text-emerald-400' : 'text-gray-500'} truncate mt-1 flex items-center gap-1 font-mono">
        ${isMatched ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>' : ''}
        ${detected}
      </span>
    `;
    mappingChips.appendChild(chip);
  });

  // 2. Stat Cards & Pipeline Status
  const elTotal = document.getElementById('stat-total') || document.getElementById('kpi-total');
  const elClean = document.getElementById('stat-clean') || document.getElementById('kpi-ready');
  const elDupFile = document.getElementById('stat-dup-file') || document.getElementById('kpi-dup-file');
  const elDupDb = document.getElementById('stat-dup-db') || document.getElementById('kpi-dup-db');
  const elInvalid = document.getElementById('stat-invalid') || document.getElementById('kpi-invalid');

  if (elTotal) elTotal.innerText = data.stats.total.toLocaleString();
  if (elClean) elClean.innerText = data.stats.ready.toLocaleString();
  if (elDupFile) elDupFile.innerText = data.stats.duplicates_file.toLocaleString();
  if (elDupDb) elDupDb.innerText = data.stats.duplicates_db.toLocaleString();
  if (elInvalid) elInvalid.innerText = data.stats.invalid.toLocaleString();

  const pipeStatus = document.getElementById('pipe-status');
  if (pipeStatus) pipeStatus.innerText = `${data.stats.total} Rows Imported`;

  // Tab count labels
  const tabClean = document.getElementById('tab-clean-count');
  const tabDupFile = document.getElementById('tab-dup-file-count');
  const tabDupDb = document.getElementById('tab-dup-db-count');
  const tabInvalid = document.getElementById('tab-invalid-count');
  if (tabClean) tabClean.innerText = data.stats.ready;
  if (tabDupFile) tabDupFile.innerText = data.stats.duplicates_file;
  if (tabDupDb) tabDupDb.innerText = data.stats.duplicates_db;
  if (tabInvalid) tabInvalid.innerText = data.stats.invalid;

  // 3. Table Section
  tableSection.classList.remove('hidden');
  renderTableRows();

  // Scroll to table smoothly
  tableSection.scrollIntoView({ behavior: 'smooth' });
}

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active-tab');
      b.classList.add('text-gray-400');
    });
    btn.classList.add('active-tab');
    btn.classList.remove('text-gray-400');
    activeTab = btn.getAttribute('data-tab');
    renderTableRows();
  });
});

function renderTableRows() {
  if (!currentPreviewData) return;
  leadsTableBody.innerHTML = '';

  let rows = [];
  if (activeTab === 'clean') rows = currentPreviewData.clean_leads;
  else if (activeTab === 'dup_file') rows = currentPreviewData.duplicates_in_file;
  else if (activeTab === 'dup_db') rows = currentPreviewData.duplicates_in_db;
  else if (activeTab === 'invalid') rows = currentPreviewData.invalid_leads;

  if (!rows || rows.length === 0) {
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-gray-500 text-xs font-mono">No records in this category.</td>
      </tr>
    `;
    return;
  }

  rows.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/50 transition-colors text-xs';

    if (activeTab === 'invalid') {
      tr.innerHTML = `
        <td class="py-3 px-4 text-gray-500 font-mono">${r.row_num || (idx + 1)}</td>
        <td class="py-3 px-4 font-medium text-white">${r.owner_name || 'N/A'}</td>
        <td class="py-3 px-4 text-rose-400 font-mono font-semibold">${r.raw_phone || r.contact_number || r.raw_data?.['Phone'] || 'Invalid'}</td>
        <td class="py-3 px-4 text-gray-400" colspan="3">Reason: ${r.reason || 'Invalid phone format'}</td>
        <td class="py-3 px-4 text-right"><span class="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold font-mono uppercase">Rejected</span></td>
      `;
    } else {
      let badgeHtml = '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold font-mono uppercase">Ready</span>';
      if (activeTab === 'dup_file') {
        badgeHtml = '<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-semibold font-mono uppercase">In-File Dup</span>';
      } else if (activeTab === 'dup_db') {
        badgeHtml = '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 font-semibold font-mono uppercase">In CRM</span>';
      }

      tr.innerHTML = `
        <td class="py-3 px-4 text-gray-500 font-mono">${r.row_num}</td>
        <td class="py-3 px-4 font-medium text-white">${r.owner_name || '<span class="text-gray-500 italic">Empty</span>'}</td>
        <td class="py-3 px-4 font-mono text-emerald-400 font-medium">${r.vapi_e164 || r.contact_number}</td>
        <td class="py-3 px-4 text-gray-300">${r.project_name || '<span class="text-gray-500 italic">None</span>'}</td>
        <td class="py-3 px-4 text-gray-300">${r.location || '<span class="text-gray-500 italic">None</span>'}</td>
        <td class="py-3 px-4 font-mono text-gray-400">${r.unit_number || '<span class="text-gray-600">-</span>'}</td>
        <td class="py-3 px-4 text-right">${badgeHtml}</td>
      `;
    }

    leadsTableBody.appendChild(tr);
  });
}

// Download Structured CSV (Does NOT touch CRM)
downloadCsvBtn.addEventListener('click', async () => {
  if (!currentPreviewData || !currentPreviewData.clean_leads.length) {
    alert('Please upload or load a file first to generate clean leads.');
    return;
  }

  const leads = currentPreviewData.clean_leads;
  const originalName = currentPreviewData.filename || 'leads.csv';
  const cleanName = originalName.replace(/\.csv$/i, '') + '_structured_clean.csv';

  try {
    downloadCsvBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Generating CSV...`;
    lucide.createIcons();

    const res = await fetch('api.php?endpoint=export-cleaned-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leads: leads,
        filename: cleanName
      })
    });

    if (!res.ok) throw new Error('Failed to generate export file');

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = cleanName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);

  } catch (err) {
    alert('Error downloading CSV: ' + err.message);
  } finally {
    downloadCsvBtn.innerHTML = `<i data-lucide="download" class="w-4 h-4"></i> Download Structured CSV (.csv)`;
    lucide.createIcons();
  }
});
const pushLeadsBtn = document.getElementById('push-leads-btn');
if (pushLeadsBtn) {
  pushLeadsBtn.addEventListener('click', async () => {
    if (!currentPreviewData || !currentPreviewData.clean_leads.length) {
      alert('Please upload a file first to generate clean leads.');
      return;
    }
    const leads = currentPreviewData.clean_leads;
    try {
      pushLeadsBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Pushing...';
      lucide.createIcons();
      const res = await fetch('api.php?endpoint=push-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leads, live_sync: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to push leads');
      alert('Success: ' + data.message);
    } catch (err) {
      alert('Error pushing to CRM: ' + err.message);
    } finally {
      pushLeadsBtn.innerHTML = '<i data-lucide="upload" class="w-4 h-4"></i> Push Leads to CRM';
      lucide.createIcons();
    }
  });
}





