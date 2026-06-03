const express = require('express');
const passport = require('passport');
const validate = require('../../middlewares/validate');
const requireTenant = require('../../middlewares/requireTenant');
const jobValidation = require('../../validations/job.validation');
const jobService = require('../../services/jobService');

const router = express.Router();

const auth = passport.authenticate('jwt', { session: false });

router.post('/', auth, requireTenant, validate(jobValidation.submitJob), async (req, res) => {
  const result = await jobService.submit(req.tenantId, req.body.payload);
  res.status(201).send(result);
});

router.get('/:id', auth, requireTenant, async (req, res) => {
  const job = await jobService.getJob(req.params.id, req.tenantId);
  if (!job) {
    return res.status(404).send({ message: 'Job not found' });
  }
  res.send(job);
});

module.exports = router;
