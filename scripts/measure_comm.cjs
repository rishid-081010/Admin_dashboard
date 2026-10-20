const sharp = require('../server/node_modules/sharp');
const path = require('path');

(async () => {
  const { data, info } = await sharp(path.resolve(__dirname, 'strip_bldg_comm.png')).raw().toBuffer({ resolveWithObject: true });
  // Base x was 50

  // Find exact start and end of "Community:"
  let commStart = null, commEnd = null;
  for (let x = 450; x < info.width; x++) {
    let textPix = 0;
    for (let y = 5; y < 22; y++) {
      if (data[(y * info.width + x) * info.channels] < 150) textPix++;
    }
    const gx = 50 + x;
    if (textPix >= 3 && !commStart && gx > 500) commStart = gx;
    if (textPix >= 3 && gx > 500) commEnd = gx;
  }
  console.log('Community: text starts at globalX=' + commStart + ' and ends at globalX=' + commEnd);

  // Find end of "Building Name:"
  let bldgEnd = null;
  for (let x = 0; x < 250; x++) {
    let textPix = 0;
    for (let y = 5; y < 22; y++) {
      if (data[(y * info.width + x) * info.channels] < 150) textPix++;
    }
    const gx = 50 + x;
    if (textPix >= 3 && gx < 220) bldgEnd = gx;
  }
  console.log('Building Name: text ends at globalX=' + bldgEnd);

  // Find dashes start for Building Name
  let firstDash = null;
  for (let x = (bldgEnd - 50); x < (bldgEnd - 50 + 50); x++) {
    if (data[(22 * info.width + x) * info.channels] < 180) {
      firstDash = 50 + x;
      break;
    }
  }
  console.log('First dash for Building Name is at globalX=' + firstDash);
})();
