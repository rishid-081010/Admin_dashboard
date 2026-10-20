const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName } = require(path.resolve(__dirname, '../client/node_modules/pdf-lib'));
const sharp = require(path.resolve(__dirname, '../server/node_modules/sharp'));

(async () => {
  const bytes = fs.readFileSync(path.resolve(__dirname, '../client/src/assets/templates/A_SQUARED_Listing_Form_Rental_Template.pdf'));
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const resources = page.node.Resources();
  const xobjects = resources.lookup(PDFName.of('XObject'));
  
  // Image12
  const img12Ref = xobjects.get(PDFName.of('Image12'));
  const img12 = doc.context.lookup(img12Ref);
  const w12 = img12.dict.get(PDFName.of('Width')).numberValue;
  const h12 = img12.dict.get(PDFName.of('Height')).numberValue;
  
  // Extract uncompressed or decoded pixels
  const rawBytes = img12.contents;
  const filter = img12.dict.get(PDFName.of('Filter'))?.name;
  console.log('Image12 filter:', filter, 'raw bytes:', rawBytes.length);

  // If FlateDecode or DCTDecode, sharp can read buffer
  let imgBuffer;
  if (filter === 'FlateDecode') {
    const zlib = require('zlib');
    const decompressed = zlib.inflateSync(rawBytes);
    // 1-bit or 8-bit?
    const bpc = img12.dict.get(PDFName.of('BitsPerComponent'))?.numberValue || 8;
    const cs = img12.dict.get(PDFName.of('ColorSpace'))?.name;
    console.log('BitsPerComponent:', bpc, 'ColorSpace:', cs, 'decompressed:', decompressed.length);
  }
})();
