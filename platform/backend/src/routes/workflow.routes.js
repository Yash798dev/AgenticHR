const express = require('express');
const axios = require('axios');
const Workflow = require('../models/Workflow');
const Job = require('../models/Job');
const { auth, authorize } = require('../middleware/auth');
const { agentLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const AGENT_BRIDGE_URL = process.env.AGENT_BRIDGE_URL || 'http://localhost:8000';

/**
 * @route   GET /api/workflows
 * @desc    Get all workflows for organization
 */
router.get('/', auth, async (req, res) => {
    try {
        const workflows = await Workflow.find({
            organization: req.user.organization._id
        })
            .populate('job', 'jobId title role')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.json(workflows);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch workflows' });
    }
});

/**
 * @route   GET /api/workflows/:id
 * @desc    Get single workflow
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const workflow = await Workflow.findOne({
            _id: req.params.id,
            organization: req.user.organization._id
        })
            .populate('job')
            .populate('createdBy', 'firstName lastName');

        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        res.json(workflow);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch workflow' });
    }
});

/**
 * @route   POST /api/workflows
 * @desc    Create new workflow
 */
router.post('/', auth, async (req, res) => {
    try {
        const { jobId, name, autoAdvance } = req.body;

        const job = await Job.findOne({
            _id: jobId,
            organization: req.user.organization._id
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        const workflow = await Workflow.create({
            name: name || `Workflow for ${job.title}`,
            organization: req.user.organization._id,
            job: job._id,
            createdBy: req.user._id,
            config: { autoAdvance: autoAdvance || false },
            steps: [
                { agent: 'resume_screener', status: 'pending' },
                { agent: 'voice_caller', status: 'pending' },
                { agent: 'calendar_agent', status: 'pending' },
                { agent: 'interview_agent', status: 'pending' },
                { agent: 'transcript_scorer', status: 'pending' },
                { agent: 'offer_letter', status: 'pending' }
            ]
        });

        res.status(201).json(workflow);
    } catch (error) {
        console.error('Create workflow error:', error);
        res.status(500).json({ message: 'Failed to create workflow' });
    }
});

/**
 * @route   POST /api/workflows/:id/run-step
 * @desc    Run current step of workflow
 */
router.post('/:id/run-step', auth, agentLimiter, async (req, res) => {
    try {
        const workflow = await Workflow.findOne({
            _id: req.params.id,
            organization: req.user.organization._id
        }).populate('job');

        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        const currentStep = workflow.steps[workflow.currentStep];
        if (!currentStep) {
            return res.status(400).json({ message: 'No more steps to run' });
        }

        if (currentStep.status === 'running') {
            return res.status(400).json({ message: 'Step already running' });
        }
        const job = workflow.job;
        let agentEndpoint = '';
        let requestBody = {};

        switch (currentStep.agent) {
            case 'resume_screener':
                agentEndpoint = '/api/agents/resume-screener/run';
                requestBody = {
                    job_id: job.jobId,
                    role: job.role,
                    min_experience: job.requirements?.minExperience || 0,
                    location: job.requirements?.location || '',
                    salary_range: job.requirements?.salaryRange || ''
                };
                break;

            case 'voice_caller':
                agentEndpoint = '/api/agents/voice-caller/run';
                requestBody = {
                    job_id: job.jobId,
                    server_url: req.body.serverUrl || '',
                    role: job.role,
                    salary_range: job.requirements?.salaryRange || ''
                };
                break;

            case 'calendar_agent':
                agentEndpoint = '/api/agents/calendar/run';
                requestBody = { job_id: job.jobId };
                break;

            case 'interview_agent':
                agentEndpoint = '/api/agents/interview/run';
                requestBody = { job_id: job.jobId };
                break;

            case 'transcript_scorer':
                agentEndpoint = '/api/agents/transcript-scorer/run';
                requestBody = { job_id: job.jobId };
                break;

            case 'offer_letter':
                agentEndpoint = '/api/agents/offer-letter/run';
                requestBody = {
                    job_id: job.jobId,
                    candidate_email: req.body.candidateEmail || '',
                    salary: req.body.salary || '',
                    start_date: req.body.startDate || ''
                };
                break;

            default:
                return res.status(400).json({ message: 'Unknown agent type' });
        }
        const response = await axios.post(`${AGENT_BRIDGE_URL}${agentEndpoint}`, requestBody);

        currentStep.status = 'running';
        currentStep.taskId = response.data.task_id;
        currentStep.startedAt = new Date();

        if (workflow.status === 'draft') {
            workflow.status = 'active';
            workflow.startedAt = new Date();
        }

        await workflow.save();

        res.json({
            workflow,
            taskId: response.data.task_id
        });

    } catch (error) {
        console.error('Run step error:', error);
        res.status(500).json({ message: 'Failed to run workflow step' });
    }
});

/**
 * @route   GET /api/workflows/:id/step-status
 * @desc    Check status of current step
 */
router.get('/:id/step-status', auth, async (req, res) => {
    try {
        const workflow = await Workflow.findOne({
            _id: req.params.id,
            organization: req.user.organization._id
        });

        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        const currentStep = workflow.steps[workflow.currentStep];
        if (!currentStep || !currentStep.taskId) {
            return res.json({ status: currentStep?.status || 'pending' });
        }
        const response = await axios.get(`${AGENT_BRIDGE_URL}/api/tasks/${currentStep.taskId}`);
        const taskStatus = response.data;
        if (taskStatus.status === 'completed' || taskStatus.status === 'failed') {
            currentStep.status = taskStatus.status;
            currentStep.completedAt = new Date();
            currentStep.result = taskStatus.result;
            currentStep.error = taskStatus.error;
            if (currentStep.agent === 'resume_screener' && taskStatus.result) {
                workflow.stats.totalCandidates = taskStatus.result.total_candidates;
                workflow.stats.shortlisted = taskStatus.result.shortlisted;
            }
            if (taskStatus.status === 'completed' && workflow.config.autoAdvance) {
                if (workflow.currentStep < workflow.steps.length - 1) {
                    workflow.currentStep += 1;
                } else {
                    workflow.status = 'completed';
                    workflow.completedAt = new Date();
                }
            }

            await workflow.save();
        }

        res.json({
            stepStatus: currentStep.status,
            taskStatus: taskStatus.status,
            result: taskStatus.result,
            error: taskStatus.error
        });

    } catch (error) {
        console.error('Check status error:', error);
        res.status(500).json({ message: 'Failed to check step status' });
    }
});

/**
 * @route   POST /api/workflows/:id/advance
 * @desc    Manually advance to next step
 */
router.post('/:id/advance', auth, async (req, res) => {
    try {
        const workflow = await Workflow.findOne({
            _id: req.params.id,
            organization: req.user.organization._id
        });

        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        const currentStep = workflow.steps[workflow.currentStep];
        if (currentStep.status !== 'completed') {
            return res.status(400).json({ message: 'Current step not completed' });
        }

        if (workflow.currentStep >= workflow.steps.length - 1) {
            workflow.status = 'completed';
            workflow.completedAt = new Date();
        } else {
            workflow.currentStep += 1;
        }

        await workflow.save();
        res.json(workflow);

    } catch (error) {
        res.status(500).json({ message: 'Failed to advance workflow' });
    }
});

/**
 * @route   DELETE /api/workflows/:id
 * @desc    Delete workflow
 */
router.delete('/:id', auth, authorize('admin', 'manager'), async (req, res) => {
    try {
        const workflow = await Workflow.findOneAndDelete({
            _id: req.params.id,
            organization: req.user.organization._id
        });

        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        res.json({ message: 'Workflow deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete workflow' });
    }
});

module.exports = router;
