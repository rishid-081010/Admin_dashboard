const fs = require('fs');
const path = require('path');
const sharp = require(path.resolve(__dirname, '../server/node_modules/sharp'));

(async () => {
  // Let's inspect baseline_test.png where no checkmark is in Villa, Townhouse, Land, etc.
  // In baseline_test.png, Villa is at ~226, Townhouse at ~321, Land at ~469, etc.
  // And in Property Details: Furnished is at ~185..200, Tenanted at ~450..485, Commercial at ~740..780.
  // Let's find the exact square of [ ] Furnished and [ ] Tenanted!
  const img = sharp(path.resolve(__dirname, 'baseline_test.png'));
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  // Chrome viewer page offset: earlier we found white page bounds:
  // minX: 68, maxX: 1116, minY: 24, maxY: 1207 (scale ~ 1048 / 1119.6 = 0.936)
  // Let's find the exact coordinates in PDF points by inspecting decompressed_stream.txt or template vector paths!
  console.log('Searching decompressed_stream.txt for checkbox squares...');
  const s = fs.readFileSync(path.resolve(__dirname, '../server/templates/decompressed_stream.txt'), 'utf8');
  // Checkbox squares in PDF are usually drawn with 're' (rectangle) or 'm ... l ... h'
  // 14x14 or 15x15 or 16x16
  const reRegex = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+re/g;
  let match;
  const rects = [];
  while ((match = reRegex.exec(s)) !== null) {
    const x = parseFloat(match[1]), y = parseFloat(match[2]), w = parseFloat(match[3]), h = parseFloat(match[4]);
    if (Math.abs(w - h) < 3 && w >= 10 && w <= 25) {
      rects.push({ x, y, w, h });
    }
  }
  console.log('Square rects found in vector stream:', rects.length);
  rects.forEach(r => console.log('Vector square:', r));
})();
