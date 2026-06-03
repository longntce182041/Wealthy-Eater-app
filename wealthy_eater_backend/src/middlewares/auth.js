const { verifyAccessToken } = require('../utils/jwt');

/**
 * Middleware: verify JWT access token from Authorization: Bearer <token> header.
 * Attaches decoded payload to `req.user` on success.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)   // remove 'Bearer ' prefix
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token not provided.',
    });
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired ? 'Access token has expired.' : 'Invalid access token.',
    });
  }
};

/**
 * Middleware: check that `req.user.role` is in the list of permitted roles.
 * Must be used AFTER `authenticateToken`.
 *
 * @param {...string} permittedRoles - Roles allowed to access the route.
 *
 * @example
 * router.delete('/users/:id', authenticateToken, authorizeRoles('admin'), handler);
 */
const authorizeRoles = (...permittedRoles) => {
  return (req, res, next) => {
    if (!req.user || !permittedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
