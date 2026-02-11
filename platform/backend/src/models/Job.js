const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        unique: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Job title is required']
    },
    department: String,
    role: {
        type: String,
        required: true
    },
    description: String,
    requirements: {
        minExperience: { type: Number, default: 0 },
        location: String,
        salaryRange: String,
        skills: [String],
        education: String
    },
    status: {
        type: String,
        enum: ['draft', 'open', 'paused', 'closed', 'filled'],
        default: 'draft'
    },
    pipeline: {
        total: { type: Number, default: 0 },
        screened: { type: Number, default: 0 },
        contacted: { type: Number, default: 0 },
        scheduled: { type: Number, default: 0 },
        interviewed: { type: Number, default: 0 },
        offered: { type: Number, default: 0 },
        hired: { type: Number, default: 0 }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    closedAt: Date
}, {
    timestamps: true
});

// Generate unique job ID
jobSchema.pre('save', async function (next) {
    if (this.isNew && !this.jobId) {
        const count = await this.constructor.countDocuments();
        this.jobId = `J${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Job', jobSchema);
