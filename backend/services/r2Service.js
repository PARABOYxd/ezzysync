const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const logger = require('../utils/logger');

// Initialize S3 client for Cloudflare R2 if credentials are provided
let s3Client = null;
const isR2Configured = Boolean(
  env.r2.accessKeyId &&
  env.r2.secretAccessKey &&
  env.r2.endpoint &&
  env.r2.bucketName
);

if (isR2Configured) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: env.r2.endpoint,
    credentials: {
      accessKeyId: env.r2.accessKeyId,
      secretAccessKey: env.r2.secretAccessKey,
    },
  });
} else if (env.nodeEnv === 'production') {
  // Said loudly because the failure is silent otherwise: uploads appear to
  // work, then vanish on the next deploy when Railway replaces the disk.
  logger.warn(
    '[r2Service] Cloudflare R2 is NOT configured. Uploaded files are going to the server disk and ' +
      'will be DELETED on the next deploy. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, ' +
      'R2_BUCKET_NAME and R2_PUBLIC_URL.'
  );
} else {
  logger.info('[r2Service] Cloudflare R2 is not fully configured. Using local uploads directory fallback.');
}

/**
 * Customer documents - passports, tickets, payment proofs, vouchers - are
 * stored privately and never handed out as permanent public links.
 *
 * The database keeps a reference (`private:<key>`), not a URL. Whenever a link
 * is needed it is minted with an expiry and a signature, and /media checks both
 * before serving the file. A link forwarded or leaked stops working within two
 * hours.
 *
 * R2_PRIVATE_BUCKET_NAME should name a bucket with public access turned off.
 * Without it these files go to the main bucket, which works but is only as
 * private as that bucket's public setting.
 */
const PRIVATE_PREFIX = 'private:';
const privateBucketName = env.r2.privateBucketName || env.r2.bucketName;
const PRIVATE_LOCAL_DIR = path.join(__dirname, '..', 'private-uploads');

// Links are stable for a whole hour, so the inbox re-fetching every few seconds
// gets the same URL back and the browser does not reload every image.
const LINK_WINDOW_MS = 60 * 60 * 1000;

function getLocalHost() {
  if (env.backendUrl && !env.backendUrl.includes('ezzysync-production.up.railway.app')) {
    return env.backendUrl.replace(/\/$/, '');
  }
  return env.nodeEnv === 'production' ? '' : `http://localhost:${env.port}`;
}

/** Absolute, because Meta has to be able to fetch the link as well as the browser. */
function getMediaHost() {
  if (env.nodeEnv === 'production' || process.env.BACKEND_URL) {
    return env.backendUrl.replace(/\/$/, '');
  }
  return `http://localhost:${env.port}`;
}

/**
 * Optimizes an image buffer using Sharp.
 * Limits maximum width to 1600px while maintaining aspect ratio, and
 * compresses to 82% JPEG quality to keep file size small without blurring.
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

/** Optimizes images, names the file, and works out where it goes. */
async function prepareUpload(fileBuffer, originalName, mimeType, subFolder) {
  let buffer = fileBuffer;
  let ext = path.extname(originalName || '').toLowerCase();
  let mime = mimeType || 'application/octet-stream';

  if (mime.startsWith('image/')) {
    const optimized = await optimizeImage(fileBuffer);
    buffer = optimized.buffer;
    ext = optimized.ext;
    mime = optimized.mime;
  }

  // Random, so one upload never overwrites another and names cannot be guessed.
  const hash = crypto.randomBytes(16).toString('hex');
  const filename = `${hash}${ext}`;
  const envFolder = env.nodeEnv === 'production' ? 'production' : 'development';
  const cleanSubFolder = subFolder ? subFolder.replace(/^\/+|\/+$/g, '') : '';
  const key = cleanSubFolder ? `${cleanSubFolder}/${filename}` : `${envFolder}/${filename}`;

  return { buffer, mime, key };
}

async function putToR2(bucket, key, buffer, mime) {
  await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mime }));
}

function writeLocal(baseDir, key, buffer) {
  const filePath = path.join(baseDir, key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

/**
 * Uploads a public asset (logos, itinerary images) to R2 or local fallback.
 * @returns {Promise<string>} - Public URL
 */
async function uploadFile(fileBuffer, originalName, mimeType, subFolder = '') {
  const { buffer, mime, key } = await prepareUpload(fileBuffer, originalName, mimeType, subFolder);

  if (isR2Configured && s3Client) {
    try {
      await putToR2(env.r2.bucketName, key, buffer, mime);
      const publicBase = env.r2.publicUrl
        ? env.r2.publicUrl.replace(/\/$/, '')
        : `${env.r2.endpoint}/${env.r2.bucketName}`;
      return `${publicBase}/${key}`;
    } catch (err) {
      logger.error({ err }, '[r2Service] Cloudflare R2 upload failed, falling back to local storage');
    }
  }

  writeLocal(path.join(__dirname, '..', 'uploads'), key, buffer);
  return `${getLocalHost()}/uploads/${key}`;
}

/** Images go through the same path; kept for existing callers. */
async function uploadImage(fileBuffer, originalName, subFolder = '') {
  return uploadFile(fileBuffer, originalName, 'image/jpeg', subFolder);
}

/**
 * Uploads a customer document privately.
 * @returns {Promise<string>} - a `private:<key>` reference; turn it into a
 *   link with resolveMediaUrl() at the moment one is needed.
 */
async function uploadPrivateFile(fileBuffer, originalName, mimeType, subFolder = '') {
  const { buffer, mime, key } = await prepareUpload(fileBuffer, originalName, mimeType, subFolder);

  if (isR2Configured && s3Client) {
    try {
      await putToR2(privateBucketName, key, buffer, mime);
      return `${PRIVATE_PREFIX}${key}`;
    } catch (err) {
      logger.error({ err }, '[r2Service] Private R2 upload failed, falling back to local storage');
    }
  }

  writeLocal(PRIVATE_LOCAL_DIR, key, buffer);
  return `${PRIVATE_PREFIX}${key}`;
}

// Derived rather than reusing JWT_SECRET directly, so a media signature can
// never be mistaken for anything else signed with the same secret.
const signingKey = crypto.createHash('sha256').update(`media-links:${env.jwtSecret}`).digest();

function sign(key, exp) {
  return crypto.createHmac('sha256', signingKey).update(`${key}\n${exp}`).digest('base64url');
}

/** Only the characters our own keys use; anything else is not a file we wrote. */
function isSafeKey(key) {
  return typeof key === 'string' && /^[A-Za-z0-9_\-./]+$/.test(key) && !key.split('/').includes('..');
}

/**
 * A stored media value as something a browser or Meta can open.
 * Public URLs (older rows, logos) are returned unchanged.
 */
function resolveMediaUrl(stored) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith(PRIVATE_PREFIX)) return stored;
  const key = stored.slice(PRIVATE_PREFIX.length);
  if (!isSafeKey(key)) return null;

  // Rounded to the hour and one window ahead: valid for 1-2 hours from now.
  const exp = (Math.floor(Date.now() / LINK_WINDOW_MS) + 2) * LINK_WINDOW_MS;
  // The key stays in the path so the file name and extension still show.
  return `${getMediaHost()}/media/${key}?exp=${exp}&sig=${sign(key, exp)}`;
}

function verifyMediaLink(key, exp, sig) {
  if (!isSafeKey(key) || !/^\d+$/.test(String(exp || '')) || typeof sig !== 'string') return false;
  if (Number(exp) < Date.now()) return false;
  const expected = Buffer.from(sign(key, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

const LOCAL_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
};

/**
 * Opens a private file for streaming. Local disk is checked first because an
 * upload falls back there when R2 was unreachable at the time.
 * @returns {Promise<{stream: import('stream').Readable, contentType: string}|null>}
 */
async function openPrivateFile(key) {
  if (!isSafeKey(key)) return null;

  const localPath = path.join(PRIVATE_LOCAL_DIR, key);
  if (localPath.startsWith(PRIVATE_LOCAL_DIR + path.sep) && fs.existsSync(localPath)) {
    return {
      stream: fs.createReadStream(localPath),
      contentType: LOCAL_TYPES[path.extname(localPath).toLowerCase()] || 'application/octet-stream',
    };
  }

  if (isR2Configured && s3Client) {
    try {
      const obj = await s3Client.send(new GetObjectCommand({ Bucket: privateBucketName, Key: key }));
      return { stream: obj.Body, contentType: obj.ContentType || 'application/octet-stream' };
    } catch (err) {
      if (err?.name !== 'NoSuchKey') logger.error({ err, key }, '[r2Service] Could not read private file');
    }
  }
  return null;
}

module.exports = {
  isR2Configured,
  uploadImage,
  uploadFile,
  uploadPrivateFile,
  resolveMediaUrl,
  verifyMediaLink,
  openPrivateFile,
  PRIVATE_PREFIX,
};
