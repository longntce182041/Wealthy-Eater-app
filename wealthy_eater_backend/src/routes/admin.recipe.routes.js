/**
 * Admin Recipe Routes - UC-71: View List Recipes
 * Rotas para gerenciamento de receitas no painel administrativo
 */

const express = require('express');
const router = express.Router();

const AdminRecipeController = require('../controllers/admin.recipe.controller');
const { authenticateToken } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');

/**
 * Middleware para verificar se o usuário é admin
 * (Você pode ajustar conforme sua estrutura de roles)
 */
function checkAdminRole(req, res, next) {
  // Por enquanto, apenas verifica se está autenticado
  // Você pode adicionar verificação de role aqui depois
  next();
}

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);
router.use(checkAdminRole);

/**
 * UC-71: GET /api/admin/recipes
 * Lista todas as receitas com paginação e filtros
 * 
 * Query Parameters:
 * - page: número da página (padrão: 1)
 * - limit: itens por página (padrão: 20, máximo: 100)
 * - search: termo de busca
 * - status: filtrar por status
 * - level: filtrar por nível de dificuldade
 * - minTime/maxTime: filtro de tempo de preparo
 * - minCalories/maxCalories: filtro de calorias
 * - sortBy: name_asc, name_desc, time_asc, time_desc, newest, oldest
 */
router.get('/', AdminRecipeController.getRecipesList);

/**
 * GET /api/admin/recipes/stats
 * Obtém estatísticas gerais sobre receitas
 */
router.get('/stats', AdminRecipeController.getRecipesStats);

/**
 * GET /api/admin/recipes/:id
 * Obtém detalhes completos de uma receita específica
 */
router.get('/:id', validateObjectId('id'), AdminRecipeController.getRecipeDetail);

module.exports = router;
