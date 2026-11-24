/**
 * Universal Cross-Browser Build and Packaging Pipeline for Sharingan Lens
 * 
 * Supports every modern browser:
 * - Brave Browser
 * - Google Chrome
 * - Mozilla Firefox (and Floorp, Zen, LibreWolf, Tor)
 * - Microsoft Edge
 * - Universal Chromium (Opera, Vivaldi, Arc, Chromium)
 * - Apple Safari (WebExtension MV3)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Browser target definitions
const TARGETS = [
  {
    id: 'brave',
    name: 'Brave Browser',
    dir: path.join(DIST_DIR, 'brave'),
    manifest: 'manifest.json',
    zipName: 'sharingan-lens-brave.zip'
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    dir: path.join(DIST_DIR, 'chrome'),
    manifest: 'manifest.json',
    zipName: 'sharingan-lens-chrome.zip'
  },
  {
    id: 'firefox',
    name: 'Mozilla Firefox',
    dir: path.join(DIST_DIR, 'firefox'),
    manifest: 'manifest.firefox.json',
    zipName: 'sharingan-lens-firefox.zip'
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    dir: path.join(DIST_DIR, 'edge'),
    manifest: 'manifest.json',
    zipName: 'sharingan-lens-edge.zip'
  },
  {
    id: 'chromium',
    name: 'Opera / Vivaldi / Arc (Universal Chromium)',
    dir: path.join(DIST_DIR, 'chromium'),
    manifest: 'manifest.json',
    zipName: 'sharingan-lens-chromium.zip'
  },
  {
    id: 'safari',
    name: 'Apple Safari (Web Extension)',
    dir: path.join(DIST_DIR, 'safari'),
    manifest: 'manifest.safari.json',
    zipName: 'sharingan-lens-safari.zip'
  }
];

// Files and directories to bundle into every build
const ASSET_PATHS = [
  'background.js',
  'rules.json',
  'utils',
  'content',
  'popup',
  'options',
  'icons'
];

function cleanDist() {
  console.log('🧹 Cleaning dist directory...');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
  for (const target of TARGETS) {
    fs.mkdirSync(target.dir, { recursive: true });
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function buildTargets() {
  console.log('📦 Bundling core assets into all browser distributions...');
  
  for (const target of TARGETS) {
    console.log(`  ⚙️  Building ${target.name} target in dist/${path.basename(target.dir)}/`);
    
    // Copy shared code & assets
    for (const asset of ASSET_PATHS) {
      const src = path.join(ROOT_DIR, asset);
      if (!fs.existsSync(src)) {
        console.warn(`  ⚠️ Missing asset path ${src}`);
        continue;
      }
      copyRecursive(src, path.join(target.dir, asset));
    }

    // Copy target-specific manifest
    const manifestSrc = path.join(ROOT_DIR, target.manifest);
    fs.copyFileSync(manifestSrc, path.join(target.dir, 'manifest.json'));
  }

  // Also create dist/brave-chromium for backward compatibility
  const legacyBraveDir = path.join(DIST_DIR, 'brave-chromium');
  copyRecursive(path.join(DIST_DIR, 'brave'), legacyBraveDir);
}

function createZipPackages() {
  console.log('🗜️ Packaging production ZIP bundles for every browser...');
  
  for (const target of TARGETS) {
    const zipPath = path.join(DIST_DIR, target.zipName);
    try {
      execSync(`cd "${target.dir}" && zip -r "${zipPath}" .`, { stdio: 'ignore' });
      const sizeKb = Math.round(fs.statSync(zipPath).size / 1024);
      console.log(`  ✔ Created dist/${target.zipName} (${sizeKb} KB)`);
    } catch (err) {
      console.warn(`  ⚠️ Failed to zip ${target.name}: ${err.message}`);
    }
  }

  // Legacy zip aliases for backward compatibility
  try {
    fs.copyFileSync(
      path.join(DIST_DIR, 'sharingan-lens-brave.zip'),
      path.join(DIST_DIR, 'sharingan-brave.zip')
    );
    fs.copyFileSync(
      path.join(DIST_DIR, 'sharingan-lens-firefox.zip'),
      path.join(DIST_DIR, 'sharingan-firefox.zip')
    );
  } catch (err) {
    // Ignore legacy aliases if zip wasn't created
  }
}

function main() {
  console.log('👁️ Starting Sharingan Lens Cross-Browser Build Pipeline...\n');
  cleanDist();
  buildTargets();
  createZipPackages();
  
  console.log('\n✨ Build completed successfully for EVERY browser!');
  console.log('================================================================');
  console.log('🦁 Brave Browser:                 dist/brave/     (or sharingan-lens-brave.zip)');
  console.log('🌐 Google Chrome:                  dist/chrome/    (or sharingan-lens-chrome.zip)');
  console.log('🦊 Mozilla Firefox:                dist/firefox/   (or sharingan-lens-firefox.zip)');
  console.log('🌊 Microsoft Edge:                 dist/edge/      (or sharingan-lens-edge.zip)');
  console.log('🔴 Opera / Vivaldi / Arc:          dist/chromium/  (or sharingan-lens-chromium.zip)');
  console.log('🧭 Apple Safari:                   dist/safari/    (or sharingan-lens-safari.zip)');
  console.log('================================================================');
}

main();
