const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');
const { HttpError } = require('../utils/httpError');

// On EC2 the SDK reads credentials from the instance's IAM role (LabRole). No keys in code.
const s3 = env.s3Bucket ? new S3Client({ region: env.awsRegion }) : null;
const LOCAL_DIR = path.join(__dirname, '..', '..', 'uploads');
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const TYPE = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

/** Saves a base64 data URL to S3 (or local disk in dev) and returns a stable URL like /api/media/gigs/abc.jpg */
async function saveDataUrl(dataUrl, folder) {
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new HttpError(400, 'Image must be a PNG, JPG or WebP');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2 * 1024 * 1024) throw new HttpError(400, 'Image is too large (max 2 MB)');
  const type = m[1] === 'image/jpg' ? 'image/jpeg' : m[1];
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${EXT[type]}`;
  if (s3) {
    await s3.send(new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, Body: buf, ContentType: type }));
  } else {
    fs.mkdirSync(path.dirname(path.join(LOCAL_DIR, key)), { recursive: true });
    fs.writeFileSync(path.join(LOCAL_DIR, key), buf);
  }
  return `/api/media/${key}`;
}

/** Streams an image back to the browser. The bucket stays private; only the backend can read it. */
async function sendMedia(key, res) {
  const ext = key.split('.').pop();
  res.set('Content-Type', TYPE[ext] || 'application/octet-stream');
  res.set('Cache-Control', 'public, max-age=86400');
  if (s3) {
    const out = await s3.send(new GetObjectCommand({ Bucket: env.s3Bucket, Key: key }));
    return out.Body.pipe(res);
  }
  const file = path.join(LOCAL_DIR, key);
  if (!fs.existsSync(file)) throw new Error('missing');
  return fs.createReadStream(file).pipe(res);
}

module.exports = { saveDataUrl, sendMedia, storageMode: s3 ? 's3' : 'local' };
