import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.OPENAI_API_KEY;

async function testPortrait() {
  const inputPath = path.join(__dirname, 'uploads/original/1791812444066-570204004.jpg');
  const buffer = fs.readFileSync(inputPath);
  const blob = new Blob([buffer], { type: 'image/jpeg' });

  const prompt = `You are a real-estate property photo QA and enhancement assistant.
Review the attached property photo for portal advertising.

ORIENTATION & COMPOSITION MANDATE (CRITICAL):
- This is a PORTRAIT / vertical property photo (height > width).
- You MUST preserve the exact vertical portrait orientation, framing, and aspect ratio.
- Under NO circumstances should you expand, outpaint, or turn this photo into landscape.
- Do not fabricate extra walls, floors, or furniture. Keep the exact authentic room boundaries.

FOREIGN WATERMARK REMOVAL:
- Erase the competitor watermark in the top right corner and seamlessly inpaint the wall/ceiling texture.

Enhance natural exposure, window view clarity, and white balance without changing room layout or adding objects.`;

  const formData = new FormData();
  formData.append('model', 'gpt-image-2.5-flare');
  formData.append('image', blob, 'property.jpg');
  formData.append('prompt', prompt);
  formData.append('quality', 'high');

  console.log('Sending request to OpenAI...');
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    body: formData
  });

  console.log('HTTP status:', res.status);
  const data = await res.json();
  if (data.data?.[0]?.b64_json) {
    const outBuf = Buffer.from(data.data[0].b64_json, 'base64');
    const m = await sharp(outBuf).metadata();
    console.log('Result dimensions:', m.width, 'x', m.height, 'aspect:', (m.width / m.height).toFixed(3));
    fs.writeFileSync(path.join(__dirname, '../../test_portrait_enhanced.jpg'), outBuf);
  } else if (data.data?.[0]?.url) {
    const dl = await fetch(data.data[0].url);
    const ab = await dl.arrayBuffer();
    const outBuf = Buffer.from(ab);
    const m = await sharp(outBuf).metadata();
    console.log('Result dimensions:', m.width, 'x', m.height, 'aspect:', (m.width / m.height).toFixed(3));
    fs.writeFileSync(path.join(__dirname, '../../test_portrait_enhanced.jpg'), outBuf);
  } else {
    console.log('Data error:', data);
  }
}

testPortrait().catch(console.error);
