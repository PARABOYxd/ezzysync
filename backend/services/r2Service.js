const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const logger = require('../utils/logger');

// Initialize S3 client for Cloudflare R2 if credentials are provided
let s3Client = null;
const isR2Configured =
  env.r2.accessKeyId &&
  env.r2.secretAccessKey &&
  env.r2.endpoint &&
  env.r2.bucketName;

if (isR2Configured) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: env.r2.endpoint,
    credentials: {
      accessKeyId: env.r2.accessKeyId,
      secretAccessKey: env.r2.secretAccessKey,
    },
  });
} else {
  logger.info('[r2Service] Cloudflare R2 is not fully configured. Using local uploads directory fallback.');
}

function getLocalHost() {
  if (env.backendUrl && !env.backendUrl.includes('ezzysync-production.up.railway.app')) {
    return env.backendUrl.replace(/\/$/, '');
  }
  return env.nodeEnv === 'production' ? '' : `http://localhost:${env.port}`;
}

/**
 * Where a file goes in the bucket.
 *
 * Every key starts with the environment, so production and development never
 * share a folder. They used to: the environment prefix was applied *only* when
 * no subfolder was given, and WhatsApp always gives one - so its media landed
 * in a top-level `whatsapp/` folder with dev and prod files mixed together,
 * sitting beside the `production/` folder everything else used. Deleting a
 * test file meant hunting for it among real customer media.
 *
 * Existing objects are deliberately left where they are. The public URL is
 * stored in full on the message row, so old media keeps resolving from its old
 * key; only new uploads use this layout.
 */
function buildStorageKey(subFolder, filename) {
  const envFolder = env.nodeEnv === 'production' ? 'production' : 'development';
  const cleanSubFolder = subFolder ? subFolder.replace(/^\/+|\/+$/g, '') : '';
  return cleanSubFolder
    ? `${envFolder}/${cleanSubFolder}/${filename}`
    : `${envFolder}/${filename}`;
}

/**
 * Optimizes an image buffer using Sharp.
 * Converts to WebP format, limits maximum width to 1600px while maintaining aspect ratio,
 * and compresses to 82% quality to keep file size small while keeping HD quality (non-blurry).
 * 
 * @param {Buffer} buffer - The raw image buffer
 * @returns {Promise<{buffer: Buffer, ext: string, mime: string}>}
 */
async function optimizeImage(buffer) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Limit maximum width to 1600px to prevent huge dimensions, but maintain aspect ratio
    let transformer = image;
    if (metadata.width > 1600) {
      transformer = transformer.resize({ width: 1600, withoutEnlargement: true });
    }

    // Convert to jpeg with progressive rendering and 82 quality (fully supported by WhatsApp/Meta Cloud API)
    const optimizedBuffer = await transformer
      .jpeg({ quality: 82, progressive: true })
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      ext: '.jpg',
      mime: 'image/jpeg'
    };
  } catch (err) {
    logger.error({ err }, '[r2Service] Image optimization failed, falling back to original buffer');
    // Fallback if sharp fails (e.g. unsupported format)
    return {
      buffer,
      ext: '.jpg',
      mime: 'image/jpeg'
    };
  }
}

/**
 * Uploads an image buffer to Cloudflare R2 (or falls back to local storage)
 * @param {Buffer} fileBuffer - File raw buffer
 * @param {string} originalName - Original file name
 * @param {string} subFolder - Optional subfolder in bucket (e.g. 'whatsapp/images')
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
async function uploadImage(fileBuffer, originalName, subFolder = '') {
  // 1. Optimize image first
  const { buffer, ext, mime } = await optimizeImage(fileBuffer);

  // Generate unique filename to prevent overwrites
  const hash = crypto.randomBytes(16).toString('hex');
  const filename = `${hash}${ext}`;
  const key = buildStorageKey(subFolder, filename);

  // 2. Upload to R2 if configured
  if (isR2Configured && s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: env.r2.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mime,
      });

      await s3Client.send(command);

      // Construct public URL
      const publicBase = env.r2.publicUrl
        ? env.r2.publicUrl.replace(/\/$/, '')
        : `${env.r2.endpoint}/${env.r2.bucketName}`;
      
      return `${publicBase}/${key}`;
    } catch (err) {
      logger.error({ err }, '[r2Service] Cloudflare R2 upload failed, falling back to local storage');
    }
  }

  // 3. Fallback: Save locally in matching folder structure
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const filePath = path.join(uploadsDir, key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);

  // Same layout as the bucket, so a file is in the same place either way.
  const host = getLocalHost();
  return `${host}/uploads/${key}`;
}

/**
 * Uploads any file (image or PDF document) to Cloudflare R2 or local fallback storage.
 * If file is an image, it optimizes it; otherwise uploads it raw.
 * 
 * @param {Buffer} fileBuffer - Raw buffer of the file
 * @param {string} originalName - Original filename (e.g. invoice.pdf)
 * @param {string} mimeType - The mime-type of the file
 * @param {string} subFolder - Optional subfolder in bucket (e.g. 'whatsapp/documents')
 * @returns {Promise<string>} - Public URL
 */
async function uploadFile(fileBuffer, originalName, mimeType, subFolder = '') {
  let buffer = fileBuffer;
  let ext = path.extname(originalName).toLowerCase();
  let mime = mimeType || 'application/octet-stream';

  const isImage = mime.startsWith('image/');

  if (isImage) {
    const optimized = await optimizeImage(fileBuffer);
    buffer = optimized.buffer;
    ext = optimized.ext;
    mime = optimized.mime;
  }

  // Generate unique filename to prevent overwrites
  const hash = crypto.randomBytes(16).toString('hex');
  const filename = `${hash}${ext}`;
  const key = buildStorageKey(subFolder, filename);

  // 2. Upload to R2 if configured
  if (isR2Configured && s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: env.r2.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mime,
      });

      await s3Client.send(command);

      // Construct public URL
      const publicBase = env.r2.publicUrl
        ? env.r2.publicUrl.replace(/\/$/, '')
        : `${env.r2.endpoint}/${env.r2.bucketName}`;
      
      return `${publicBase}/${key}`;
    } catch (err) {
      logger.error({ err }, '[r2Service] Cloudflare R2 upload failed, falling back to local storage');
    }
  }

  // 3. Fallback: Save locally in matching folder structure
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const filePath = path.join(uploadsDir, key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);

  // Same layout as the bucket, so a file is in the same place either way.
  const host = getLocalHost();
  return `${host}/uploads/${key}`;
}

module.exports = {
  uploadImage,
  uploadFile,
};
