/**
 * Live Google Lens API Verification
 * Tests the reverse-engineered upload endpoint using native fetch and FormData.
 */

import { uploadImageToLens, getLensUrlByImageUrl } from '../utils/lens-api.js';
import fs from 'fs';
import path from 'path';

async function testLiveUpload() {
  console.log('Testing reverse-engineered Google Lens API...');

  // 1. Test getLensUrlByImageUrl
  const testUrl = 'https://example.com/sample.jpg';
  const urlResult = getLensUrlByImageUrl(testUrl);
  console.log('  ✔ URL endpoint generated:', urlResult);
  if (!urlResult.includes('lens.google.com/uploadbyurl?url=')) {
    throw new Error('Invalid URL format');
  }

  // 2. Test direct binary upload to lens.google.com/v3/upload
  const iconPath = path.resolve('icons/icon128.png');
  const buffer = fs.readFileSync(iconPath);
  const blob = new Blob([buffer], { type: 'image/png' });

  console.log(`  Uploading ${blob.size} bytes to Google Lens (v3/upload)...`);
  const result = await uploadImageToLens(blob, 'icon128.png');

  console.log('  ✔ Lens Upload Response:', result);
  if (!result.success || !result.url.includes('google.com/search')) {
    throw new Error('Upload failed or did not redirect to Google Search Lens');
  }

  console.log('\n✅ ALL LENS API TESTS PASSED! Redirect URL is valid and active.');
}

testLiveUpload().catch(err => {
  console.error('❌ API Test Failed:', err);
  process.exit(1);
});
