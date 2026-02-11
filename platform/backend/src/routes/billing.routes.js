const express = require('express');
const Subscription = require('../models/Subscription');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();


const PLANS = {
    free: {
        name: 'Free',
        price: 0,
        workflowsPerMonth: 10,
        candidatesPerJob: 50,
        teamMembers: 2
    },
    starter: {
        name: 'Starter',
        price: 4999,
        workflowsPerMonth: 50,
        candidatesPerJob: 200,
        teamMembers: 5
    },
    pro: {
        name: 'Pro',
        price: 14999,
        workflowsPerMonth: 200,
        candidatesPerJob: 1000,
        teamMembers: 15
    },
    enterprise: {
        name: 'Enterprise',
        price: 49999,
        workflowsPerMonth: -1, // unlimited
        candidatesPerJob: -1,
        teamMembers: -1
    }
};

/**
 * @route   GET /api/billing/plans
 * @desc    Get available plans
 */
router.get('/plans', (req, res) => {
    res.json(PLANS);
});

/**
 * @route   GET /api/billing/subscription
 * @desc    Get current subscription
 */
router.get('/subscription', auth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            organization: req.user.organization._id
        });

        if (!subscription) {
            return res.status(404).json({ message: 'No subscription found' });
        }

        res.json({
            ...subscription.toObject(),
            planDetails: PLANS[subscription.plan]
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch subscription' });
    }
});

/**
 * @route   GET /api/billing/usage
 * @desc    Get usage stats
 */
router.get('/usage', auth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            organization: req.user.organization._id
        });

        if (!subscription) {
            return res.status(404).json({ message: 'No subscription found' });
        }

        const planLimits = PLANS[subscription.plan];

        res.json({
            workflows: {
                used: subscription.usage.workflowsUsed,
                limit: planLimits.workflowsPerMonth,
                remaining: planLimits.workflowsPerMonth === -1
                    ? 'unlimited'
                    : planLimits.workflowsPerMonth - subscription.usage.workflowsUsed
            },
            resetDate: subscription.usage.lastResetDate,
            plan: subscription.plan
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch usage' });
    }
});

/**
 * @route   POST /api/billing/upgrade
 * @desc    Upgrade subscription (simplified - real implementation would use Stripe)
 */
router.post('/upgrade', auth, authorize('admin'), async (req, res) => {
    try {
        const { plan } = req.body;

        if (!PLANS[plan]) {
            return res.status(400).json({ message: 'Invalid plan' });
        }

        const subscription = await Subscription.findOne({
            organization: req.user.organization._id
        });

        if (!subscription) {
            return res.status(404).json({ message: 'No subscription found' });
        }
        subscription.plan = plan;
        subscription.limits = {
            workflowsPerMonth: PLANS[plan].workflowsPerMonth,
            candidatesPerJob: PLANS[plan].candidatesPerJob,
            teamMembers: PLANS[plan].teamMembers
        };

        await subscription.save();

        res.json({
            message: 'Subscription upgraded successfully',
            subscription
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upgrade subscription' });
    }
});

/**
 * @route   POST /api/billing/cancel
 * @desc    Cancel subscription
 */
router.post('/cancel', auth, authorize('admin'), async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            organization: req.user.organization._id
        });

        if (!subscription) {
            return res.status(404).json({ message: 'No subscription found' });
        }
        subscription.status = 'canceled';
        await subscription.save();

        res.json({ message: 'Subscription will be canceled at end of billing period' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to cancel subscription' });
    }
});

/**
 * @route   POST /api/billing/webhook
 * @desc    Stripe webhook handler
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    res.json({ received: true });
});

module.exports = router;
