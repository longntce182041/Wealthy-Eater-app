const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/shopping_list.controller');
const { authenticateToken } = require('../middlewares/auth');

/**
 * shopping_list.route.js
 *
 * All routes require a valid JWT (authenticateToken middleware).
 * Mounted at /api/shopping-list in routes/index.js.
 *
 * Route ordering matters:
 *   Static paths (/stats, /clear/purchased, /clear/all) MUST be declared
 *   BEFORE parameterised paths (/:itemId) to prevent Express from treating
 *   "stats" or "clear" as an itemId.
 */

// All routes require authentication
router.use(authenticateToken);

// ── Collection-level (static paths first) ────────────────────────────────────

// GET  /api/shopping-list        → full list (grouped + paginated)
router.get('/', controller.getList);

// GET  /api/shopping-list/stats  → completion statistics
router.get('/stats', controller.getStats);

// POST /api/shopping-list/add-from-recipe → smart add from recipe
router.post('/add-from-recipe', controller.addFromRecipe);

// DELETE /api/shopping-list/clear/purchased → remove all purchased items
router.delete('/clear/purchased', controller.clearPurchased);

// DELETE /api/shopping-list/clear/all → remove every item
router.delete('/clear/all', controller.clearAll);

// ── Resource-level (parameterised paths after static) ────────────────────────

// PATCH  /api/shopping-list/:itemId/toggle → flip purchased status
router.patch('/:itemId/toggle', controller.togglePurchased);

// DELETE /api/shopping-list/:itemId → remove a single item
router.delete('/:itemId', controller.removeItem);

module.exports = router;
