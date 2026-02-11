const mongoose = require('mongoose');

const workflowStepSchema = new mongoose.Schema({
    agent: {
        type: String,
        enum: ['resume_screener', 'voice_caller', 'calendar_agent', 'interview_agent', 'transcript_scorer', 'offer_letter'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
        default: 'pending'
    },
    taskId: String,  // ID from agent bridge
    startedAt: Date,
    completedAt: Date,
    result: mongoose.Schema.Types.Mixed,
    error: String
});

const workflowSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'paused', 'completed', 'failed'],
        default: 'draft'
    },
    currentStep: {
        type: Number,
        default: 0
    },
    steps: [workflowStepSchema],
    config: {
        autoAdvance: { type: Boolean, default: false },
        notifyOnComplete: { type: Boolean, default: true }
    },
    stats: {
        totalCandidates: { type: Number, default: 0 },
        shortlisted: { type: Number, default: 0 },
        interviewed: { type: Number, default: 0 },
        offered: { type: Number, default: 0 }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    startedAt: Date,
    completedAt: Date
}, {
    timestamps: true
});

// Get progress percentage
workflowSchema.virtual('progress').get(function () {
    if (!this.steps.length) return 0;
    const completed = this.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / this.steps.length) * 100);
});

// Get current step info
workflowSchema.methods.getCurrentStep = function () {
    return this.steps[this.currentStep];
};

// Advance to next step
workflowSchema.methods.advanceStep = async function () {
    if (this.currentStep < this.steps.length - 1) {
        this.currentStep += 1;
        await this.save();
        return true;
    }
    return false;
};

module.exports = mongoose.model('Workflow', workflowSchema);
