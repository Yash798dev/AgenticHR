const express = require('express');
const Job = require('../models/Job');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs for organization
 */
router.get('/', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { organization: req.user.organization._id };

        if (status) {
            filter.status = status;
        }

        const jobs = await Job.find(filter)
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch jobs' });
    }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const job = await Job.findOne({
            _id: req.params.id,
            organization: req.user.organization._id
        }).populate('createdBy', 'firstName lastName');

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json(job);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch job' });
    }
});

/**
 * @route   POST /api/jobs
 * @desc    Create new job
 */
router.post('/', auth, async (req, res) => {
    try {
        const { title, department, role, description, requirements } = req.body;

        const job = await Job.create({
            title,
            department,
            role,
            description,
            requirements,
            organization: req.user.organization._id,
            createdBy: req.user._id,
            status: 'draft'
        });

        res.status(201).json(job);
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ message: 'Failed to create job' });
    }
});

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update job
 */
router.put('/:id', auth, async (req, res) => {
    try {
        const job = await Job.findOneAndUpdate(
            {
                _id: req.params.id,
                organization: req.user.organization._id
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json(job);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update job' });
    }
});

/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Update job status
 */
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;

        const job = await Job.findOneAndUpdate(
            {
                _id: req.params.id,
                organization: req.user.organization._id
            },
            {
                status,
                ...(status === 'closed' ? { closedAt: new Date() } : {})
            },
            { new: true }
        );

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json(job);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update job status' });
    }
});

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete job
 */
router.delete('/:id', auth, authorize('admin', 'manager'), async (req, res) => {
    try {
        const job = await Job.findOneAndDelete({
            _id: req.params.id,
            organization: req.user.organization._id
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json({ message: 'Job deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete job' });
    }
});

module.exports = router;
