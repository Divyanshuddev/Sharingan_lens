/**
 * Validation and Syntax Test Suite for Sharingan Lens Extension
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');

let errors = 0;
let passed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    errors++;
  }
}

console.log('🧪 Running Sharingan Lens Cross-Browser Validation & Syntax Checks...\n');

// 1. Check Manifests
console.log('[1/4] Checking Manifest files across browsers...');
['manifest.json', 'manifest.firefox.json', 'manifest.safari.json'].forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert(content.manifest_version === 3, `${file} has manifest_version 3`);
    assert(content.name === 'Sharingan Lens', `${file} has name 'Sharingan Lens'`);
    assert(content.version, `${file} has version`);
    assert(content.permissions.includes('declarativeNetRequest'), `${file} includes declarativeNetRequest permission`);
    assert(content.permissions.includes('search'), `${file} includes search permission`);
    assert(content.permissions.includes('contextMenus'), `${file} includes contextMenus permission`);
    assert(content.permissions.includes('activeTab'), `${file} includes activeTab permission`);
    assert(content.permissions.includes('clipboardWrite'), `${file} includes clipboardWrite permission`);
    assert(content.host_permissions.includes('*://lens.google.com/*'), `${file} includes lens host permissions`);
  } catch (err) {
    assert(false, `${file} parse error: ${err.message}`);
  }
});

// 2. Check JavaScript Syntax
console.log('\n[2/4] Checking JavaScript Syntax...');
const jsFiles = [
  'background.js',
  'utils/lens-api.js',
  'utils/storage.js',
  'content/overlay.js',
  'content/video-capture.js',
  'popup/popup.js',
  'options/options.js'
];

jsFiles.forEach(relPath => {
  const fullPath = path.join(ROOT_DIR, relPath);
  try {
    execSync(`node --check "${fullPath}"`);
    assert(true, `${relPath} syntax valid`);
  } catch (err) {
    assert(false, `${relPath} has syntax errors: ${err.message}`);
  }
});

// 3. Check HTML & CSS Assets Exist
console.log('\n[3/4] Checking HTML & CSS Assets...');
const staticAssets = [
  'content/overlay.css',
  'popup/popup.html',
  'popup/popup.css',
  'options/options.html',
  'options/options.css'
];

staticAssets.forEach(relPath => {
  const exists = fs.existsSync(path.join(ROOT_DIR, relPath));
  assert(exists, `Found ${relPath}`);
});

// 4. Check Icon Assets Exist
console.log('\n[4/4] Checking Icon Files...');
[16, 32, 48, 128].forEach(size => {
  const iconPath = path.join(ROOT_DIR, `icons/icon${size}.png`);
  const exists = fs.existsSync(iconPath);
  const sizeBytes = exists ? fs.statSync(iconPath).size : 0;
  assert(exists && sizeBytes > 0, `icons/icon${size}.png exists (${sizeBytes} bytes)`);
});

console.log(`\n========================================`);
console.log(`Results: ${passed} Passed, ${errors} Failed`);
console.log(`========================================`);

if (errors > 0) {
  process.exit(1);
}
