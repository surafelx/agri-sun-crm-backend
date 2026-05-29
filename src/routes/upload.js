const express = require('express');
const multer  = require('multer');
const cloudinary = require('../config/cloudinary');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// memory storage — buffer sent straight to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ok = /^(image|application\/pdf|application\/msword|application\/vnd\.|text\/)/.test(
      file.mimetype
    ) || file.mimetype.startsWith('image/');
    cb(null, ok);
  },
});

// POST /api/upload
// body: multipart/form-data  field: file
// optional query: folder (e.g. "installations" or "customers")
router.post('/', upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'No file provided' });

  try {
    const folder = req.query.folder ? `agrisun-crm/${req.query.folder}` : 'agrisun-crm/misc';

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(req.file.buffer);
    });

    res.json({
      url:       result.secure_url,
      publicId:  result.public_id,
      name:      req.file.originalname,
      mimeType:  req.file.mimetype,
      size:      req.file.size,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/upload/:publicId  (publicId is base64-encoded to avoid "/" issues)
router.delete('/:encodedId', async (req, res, next) => {
  try {
    const publicId = Buffer.from(req.params.encodedId, 'base64').toString('utf8');
    // try image first, then raw (PDFs / docs)
    let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result === 'not found') {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
    res.json({ result: result.result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
