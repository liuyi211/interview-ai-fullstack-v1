const express = require('express');
const passport = require('passport');
const requireTenant = require('../../middlewares/requireTenant');
const billingService = require('../../services/billingService');

const router = express.Router();

const auth = passport.authenticate('jwt', { session: false });

router.get('/balance', auth, requireTenant, async (req, res) => {
  const balance = await billingService.getBalance(req.tenantId);
  res.send({ tenantId: req.tenantId, balance });
});

module.exports = router;
