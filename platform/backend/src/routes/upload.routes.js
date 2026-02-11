const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../../../data');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const jobId = req.body.jobId || 'default';
        const ext = path.extname(file.originalname);
        cb(null, `applications_data_${jobId}${ext}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel and CSV files are allowed'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * @route   POST /api/upload/applications
 * @desc    Upload applications data file (xlsx/csv)
 */
router.post('/applications', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const sourcePath = req.file.path;
        const destPath = path.join(__dirname, '../../../../data/applications_data.xlsx');

        fs.copyFileSync(sourcePath, destPath);

        res.json({
            message: 'File uploaded successfully',
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: req.file.path
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'File upload failed' });
    }
});

/**
 * @route   GET /api/upload/files
 * @desc    List uploaded files
 */
router.get('/files', auth, async (req, res) => {
    try {
        const dataPath = path.join(__dirname, '../../../../data');
        if (!fs.existsSync(dataPath)) {
            return res.json({ files: [] });
        }

        const files = fs.readdirSync(dataPath)
            .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'))
            .map(f => ({
                name: f,
                size: fs.statSync(path.join(dataPath, f)).size,
                modified: fs.statSync(path.join(dataPath, f)).mtime
            }));

        res.json({ files });
    } catch (error) {
        res.status(500).json({ message: 'Failed to list files' });
    }
});

module.exports = router;
