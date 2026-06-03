const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

/**
 * Job Schema
 *
 * 候选人实现要求：
 * 定义以下字段：
 * - jobId: String, required, unique（使用 uuid 生成）
 * - tenantId: String, required（来自 JWT claim，用于租户隔离查询）
 * - status: String, enum ['queued', 'processing', 'completed', 'failed'], default 'queued'
 * - phases: Array of { name: String, status: String, completedAt: Date }
 * - createdAt: Date, default Date.now
 * - completedAt: Date
 */
const jobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
  },
  phases: [
    {
      name: String,
      status: String,
      completedAt: Date,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
});

// add plugin that converts mongoose to json
jobSchema.plugin(toJSON);

/**
 * @typedef {Object} Job
 */
const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
