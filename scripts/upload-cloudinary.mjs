import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const assetDir = path.join(projectRoot, 'asset');
const manifestPath = path.join(projectRoot, 'cloudinary-videos.json');
const videoExtensions = new Set(['.mp4', '.mov', '.webm', '.m4v']);

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseCloudinaryUrl(cloudinaryUrl) {
  if (!cloudinaryUrl) return {};

  const url = new URL(cloudinaryUrl);
  return {
    apiKey: decodeURIComponent(url.username),
    apiSecret: decodeURIComponent(url.password),
    cloudName: url.hostname,
  };
}

function createSignature(params, apiSecret) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

async function findVideos() {
  const entries = await readdir(assetDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && videoExtensions.has(path.extname(entry.name).toLowerCase()))
    .map(entry => path.join(assetDir, entry.name))
    .sort();
}

async function uploadVideo(filePath, config) {
  const fileName = path.basename(filePath);
  const publicId = path.basename(fileName, path.extname(fileName));
  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`;
  const form = new FormData();
  const bytes = readFileSync(filePath);

  form.append('file', new Blob([bytes]), fileName);
  form.append('folder', config.folder);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');

  if (config.uploadPreset) {
    form.append('upload_preset', config.uploadPreset);
  } else {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedParams = {
      folder: config.folder,
      overwrite: 'true',
      public_id: publicId,
      timestamp,
    };

    form.append('api_key', config.apiKey);
    form.append('timestamp', timestamp);
    form.append('signature', createSignature(signedParams, config.apiSecret));
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form,
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `Cloudinary upload failed for ${fileName}`;
    throw new Error(message);
  }

  return {
    file: path.relative(projectRoot, filePath),
    publicId: data.public_id,
    secureUrl: data.secure_url,
    format: data.format,
    bytes: data.bytes,
    duration: data.duration,
  };
}

loadEnv(envPath);

const parsedUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
const config = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || parsedUrl.cloudName,
  apiKey: process.env.CLOUDINARY_API_KEY || parsedUrl.apiKey,
  apiSecret: process.env.CLOUDINARY_API_SECRET || parsedUrl.apiSecret,
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
  folder: process.env.CLOUDINARY_FOLDER || 'veo3-prompt-improver',
};

if (!config.cloudName) {
  throw new Error('Missing CLOUDINARY_CLOUD_NAME or CLOUDINARY_URL in .env');
}

if (!config.uploadPreset && (!config.apiKey || !config.apiSecret)) {
  throw new Error('Missing signed upload credentials. Add CLOUDINARY_URL or CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or add CLOUDINARY_UPLOAD_PRESET for unsigned uploads.');
}

const videos = await findVideos();
if (!videos.length) {
  throw new Error('No videos found in asset/');
}

const uploads = [];
for (const video of videos) {
  console.log(`Uploading ${path.relative(projectRoot, video)}...`);
  uploads.push(await uploadVideo(video, config));
}

await writeFile(manifestPath, JSON.stringify(uploads, null, 2));
console.log(`Uploaded ${uploads.length} videos.`);
console.log(`Manifest written to ${path.relative(projectRoot, manifestPath)}`);
