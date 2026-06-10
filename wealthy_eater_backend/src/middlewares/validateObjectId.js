const mongoose = require('mongoose');

/**
 * Middleware to validate if the :id parameter in the route is a valid MongoDB ObjectId.
 * Prevents Mongoose CastError (500) and immediately returns 400 Bad Request.
 */
function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid resource ID format' 
      });
    }
    
    next();
  };
}

module.exports = validateObjectId;
