const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    stripeCustomerId: {
        type: String
    },
    stripeSubscriptionId: {
        type: String
    },
    plan: {
        type: String,
        enum: ['free', 'starter', 'pro', 'enterprise'],
        default: 'free'
    },
    status: {
        type: String,
        enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
        default: 'active'
    },
    currentPeriodStart: {
        type: Date
    },
    currentPeriodEnd: {
        type: Date
    },
    limits: {
        workflowsPerMonth: { type: Number, default: 10 },
        candidatesPerJob: { type: Number, default: 100 },
        teamMembers: { type: Number, default: 3 }
    },
    usage: {
        workflowsUsed: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now }
    }
}, {
    timestamps: true
});

// Check if limit exceeded
subscriptionSchema.methods.canRunWorkflow = function () {
    return this.usage.workflowsUsed < this.limits.workflowsPerMonth;
};

// Increment usage
subscriptionSchema.methods.incrementUsage = async function () {
    this.usage.workflowsUsed += 1;
    await this.save();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
