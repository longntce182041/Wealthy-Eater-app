const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract Bearer token string

  if (!token) {
    return res.status(401).json({ error: "Access token not provided." });
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ error: "Token signatures expired or corrupted." });
    }
    req.user = user; // Attach deserialized token contents to request lifecycle
    next();
  });
};

const authorizeRoles = (...permittedRoles) => {
  return (req, res, next) => {
    if (!req.user || !permittedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Unauthorized profile tier permissions access violation.",
      });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
