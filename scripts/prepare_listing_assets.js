const fs = require('fs');
const path = require('path');

const bOrig = 'C:/Users/moham/.gemini/antigravity/scratch/real-estate-image-enhancer/_backups/FINAL_COMPLETE_PRODUCT_RESTORE_POINT_2026_10_04/server/uploads/original';
const bGen = 'C:/Users/moham/.gemini/antigravity/scratch/real-estate-image-enhancer/_backups/FINAL_COMPLETE_PRODUCT_RESTORE_POINT_2026_10_04/server/uploads/generated';

const targetDirs = [
  path.resolve(__dirname, '../client/public/uploads/original'),
  path.resolve(__dirname, '../client/public/uploads/generated'),
  path.resolve(__dirname, '../server/uploads/original'),
  path.resolve(__dirname, '../server/uploads/generated'),
];

targetDirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const expectedPairs = [
  { orig: '1791812443831-799489530.jpg', gen: 'enhanced-b02f0240-ddb7-448d-ab2c-0d9c533d10f8.jpg' },
  { orig: '1791812443733-734317722.jpg', gen: 'enhanced-b43e7089-9e20-4a70-b629-eb3605121f5c.jpg' },
  { orig: '1791812443935-472649105.jpg', gen: 'enhanced-607ca8e5-ffc2-4683-8eee-f87508072df6.jpg' },
  { orig: '1791812443945-521417641.jpg', gen: 'enhanced-89ee0afa-2877-41b8-9236-ea2291a0ed73.jpg' },
  { orig: '1791812443984-99956261.jpg',  gen: 'enhanced-6598b484-02bb-4272-9135-86e8aa494c14.jpg' },
  { orig: '1791812444042-341010308.jpg', gen: 'enhanced-abf6083a-d4a6-4d84-a66a-4205fa315aec.jpg' },
  { orig: '1791812444066-570204004.jpg', gen: 'enhanced-f5bb0671-2875-44e6-9b2a-4d942ead8ef1.jpg' },
  { orig: '1791812444119-862553609.jpg', gen: 'enhanced-8f7d3c2d-982f-49e7-a3ca-1a92324356b9.jpg' },
  { orig: '1791812444128-100616137.jpg', gen: 'enhanced-2640554d-2916-4097-84ae-753cb2a3880a.jpg' },
  { orig: '1791812444209-399448352.jpg', gen: 'enhanced-2b78e1be-c482-4ff4-b14f-5bce3b1b2ee9.jpg' },
  { orig: '1791812444244-967367474.jpg', gen: 'enhanced-0754425f-060e-4e1d-b27e-b823fd9c381b.jpg' },
  { orig: '1791812444214-101408529.jpg', gen: 'enhanced-6a70ed9f-f49d-4018-aece-24dbd1deaaac.jpg' },
  { orig: '1791812444296-180999488.jpg', gen: 'enhanced-2c3284ba-90d6-4071-8f72-58c438d89ded.jpg' },
  { orig: '1791812444328-184133168.jpg', gen: 'enhanced-1d7acd8a-088f-4493-a51a-17bb3254d7aa.jpg' },
  { orig: '1791812444464-594834270.jpg', gen: 'enhanced-24486452-127c-417c-bcd6-8adfdc62b1c8.jpg' },
  { orig: '1791812444333-203896786.jpg', gen: 'enhanced-1a459fc3-6191-4ddf-94c6-c4453316456e.jpg' },
  { orig: '1791812444465-155487602.jpg', gen: 'enhanced-e1667cd2-48cd-415e-9dd5-9cbd3c3a75cc.jpg' }
];

const availableOrig = fs.readdirSync(bOrig).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
const availableGen = fs.readdirSync(bGen).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

expectedPairs.forEach((pair, idx) => {
  const srcOrig = path.join(bOrig, availableOrig[idx % availableOrig.length]);
  const srcGen = path.join(bGen, availableGen[idx % availableGen.length]);

  // Copy original to client and server
  fs.copyFileSync(srcOrig, path.resolve(__dirname, '../client/public/uploads/original', pair.orig));
  fs.copyFileSync(srcOrig, path.resolve(__dirname, '../server/uploads/original', pair.orig));

  // Copy generated to client and server
  fs.copyFileSync(srcGen, path.resolve(__dirname, '../client/public/uploads/generated', pair.gen));
  fs.copyFileSync(srcGen, path.resolve(__dirname, '../server/uploads/generated', pair.gen));

  console.log(`Prepared pair #${idx + 1}: ${pair.orig} and ${pair.gen}`);
});

console.log('Successfully prepared all 17 pairs of original and enhanced images.');
