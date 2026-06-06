const mongoose = require('mongoose');

/**
 * Middleware to validate if the `req.params.id` (or other specified param)
 * is a valid MongoDB ObjectId. Prevents Mongoose CastError exceptions.
 */
function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        error: { code: 'INVALID_ID', message: `The provided ${paramName} is not a valid ObjectId.` }
      });
    }
    next();
  };
}

module.exports = validateObjectId;
