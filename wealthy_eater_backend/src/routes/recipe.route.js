const express = require('express');
const router  = express.Router();

const RecipeController       = require('../controllers/recipe.controller');
const LikeController         = require('../controllers/recipe.like.controller');
const ReviewController       = require('../controllers/recipe.review.controller');

const { authenticateToken }  = require('../middlewares/auth');

// All routes in this file are protected by JWT auth
router.use(authenticateToken);

// ════════════════════════════════════════════════════════════
// COLLECTION-LEVEL  (must come before /:id to avoid conflicts)
// ════════════════════════════════════════════════════════════

// Browse recipes
router.get('/', RecipeController.list);

// Liked recipes  — "Likes" tab
router.get('/liked',        LikeController.getLikedRecipes);
router.get('/liked/count',  LikeController.getLikeCount);


// Current user's reviews (across all recipes)
router.get('/reviews/mine',  ReviewController.getAllMyReviews);

// ════════════════════════════════════════════════════════════
// RESOURCE-LEVEL  (/:id and nested)
// ════════════════════════════════════════════════════════════

// Recipe detail
router.get('/:id', RecipeController.detail);



// Likes toggle + status
router.post('/:id/like',         LikeController.toggleLike);
router.get('/:id/like/status',   LikeController.getLikeStatus);

// Reviews
router.post('/:id/reviews',       ReviewController.upsertReview);      // add / update
router.get('/:id/reviews',        ReviewController.getRecipeReviews);  // list for recipe
router.get('/:id/reviews/mine',   ReviewController.getMyReview);       // current user's review
router.delete('/reviews/:reviewId', ReviewController.deleteReview);    // delete own review

module.exports = router;