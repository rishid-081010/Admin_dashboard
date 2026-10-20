const fs = require('fs');
const path = require('path');
const sharp = require(path.resolve(__dirname, '../server/node_modules/sharp'));

(async () => {
  // Let's analyze baseline_test.png
  // Image is 1120x1583 (or whatever playwright outputted)
  const meta = await sharp(path.resolve(__dirname, 'baseline_test.png')).metadata();
  console.log('baseline_test.png dimensions:', meta.width, 'x', meta.height);

  // In baseline_test.png, let's find the bounding box of the actual PDF content area
  // The Chrome PDF viewer renders the page centered inside a dark viewer.
  // Let's find the white page rectangle!
  const { data, info } = await sharp(path.resolve(__dirname, 'baseline_test.png')).raw().toBuffer({ resolveWithObject: true });
  
  // Find top, left, right, bottom of white page
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      // Pure white or nearly white (page background is #ffffff)
      if (r > 250 && g > 250 && b > 250) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log('White page bounds in viewport:', { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY });
})();
