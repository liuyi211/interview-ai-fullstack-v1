// eslint-disable-next-line no-unused-vars
const httpStatus = require('http-status');
// eslint-disable-next-line no-unused-vars
const ApiError = require('../utils/ApiError');

/**
 * Middleware: extract tenantId from JWT claim and attach to req.tenantId
 *
 * 候选人实现要求：
 * 1. 从 req.user.tenantId 读取 tenantId（JWT 已由 Passport 验证，req.user 由 jwtStrategy 填充）
 * 2. 若 tenantId 缺失，调用 next(new ApiError(httpStatus.UNAUTHORIZED, 'Tenant required'))
 * 3. 否则设置 req.tenantId = req.user.tenantId 并调用 next()
 *
 * ⚠️ 禁止从 req.body / req.query / req.headers['x-tenant-id'] 取值
 */
const requireTenant = (req, res, next) => {
  const tenantId = req.user && req.user.tenantId;
  if (!tenantId) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Tenant required'));
  }
  req.tenantId = tenantId;
  next();
};

module.exports = requireTenant;
