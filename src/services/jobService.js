const { v4: uuidv4 } = require('uuid');
const { Queue } = require('bullmq');
const httpStatus = require('http-status');
const config = require('../config/config');
const billingService = require('./billingService');
const Job = require('../models/job.model');
const ApiError = require('../utils/ApiError');

const JOB_QUEUE_NAME = 'job-pipeline';

let queue;
const getQueue = () => {
  if (!queue) {
    queue = new Queue(JOB_QUEUE_NAME, {
      connection: { url: config.redis.url },
    });
  }
  return queue;
};

const submit = async (tenantId, payload) => {
  const deduction = await billingService.deduct(tenantId);
  if (!deduction.ok) {
    throw new ApiError(httpStatus.PAYMENT_REQUIRED, 'Insufficient balance');
  }

  const jobId = uuidv4();
  await getQueue().add(jobId, { jobId, tenantId, payload });
  await Job.create({ jobId, tenantId, status: 'queued', phases: [] });

  return { jobId };
};

const getJob = async (jobId, tenantId) => {
  return Job.findOne({ jobId, tenantId });
};

module.exports = { submit, getJob, JOB_QUEUE_NAME, getQueue };
