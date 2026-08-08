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

    // Convert to webp with progressive rendering and 82 quality (great storage size to HD ratio)
    const optimizedBuffer = await transformer
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      ext: '.webp',
      mime: 'image/webp'
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
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
async function uploadImage(fileBuffer, originalName) {
  // 1. Optimize image first
  const { buffer, ext, mime } = await optimizeImage(fileBuffer);

  // Generate unique filename to prevent overwrites
  const hash = crypto.randomBytes(16).toString('hex');
  const filename = `${hash}${ext}`;

  // 2. Upload to R2 if configured
  if (isR2Configured && s3Client) {
    try {
      const folder = env.nodeEnv === 'production' ? 'production' : 'development';
      const key = `${folder}/${filename}`;

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

  // 3. Fallback: Save locally
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);

  // Return local static path
  const host = env.nodeEnv === 'production' ? '' : `http://localhost:${env.port}`;
  return `${host}/uploads/${filename}`;
}

module.exports = {
  uploadImage,
};
