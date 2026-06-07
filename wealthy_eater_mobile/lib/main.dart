import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';

import 'core/config/env_config.dart';
import 'core/network/api_client.dart';
import 'core/theme/index.dart';
import 'data/repositories/index.dart';
import 'domain/usecases/get_recipe_detail_usecase.dart';
import 'domain/usecases/get_recipes_usecase.dart';
import 'domain/usecases/recipe_like_usecases.dart';
import 'domain/usecases/recipe_review_usecases.dart';
import 'domain/usecases/get_my_reviews_list_usecase.dart';
import 'domain/usecases/shopping_list_usecases.dart';
import 'presentation/providers/index.dart';
import 'presentation/screens/index.dart';

void main() {
  runApp(const WealthyEaterApp());
}

class WealthyEaterApp extends StatelessWidget {
  const WealthyEaterApp({super.key});

  @override
  Widget build(BuildContext context) {
    final baseUrl = kIsWeb ? 'http://localhost:5000' : EnvConfig.baseUrl;
    final api = ApiClient(baseUrl);
    final recipeRepository       = RecipeRepositoryImpl(apiClient: api);
    final shoppingListRepository = ShoppingListRepositoryImpl(apiClient: api);

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(api: api)),
        ChangeNotifierProvider(
          create: (_) => RecipeProvider(
            // Browse
            getRecipesUseCase:      GetRecipesUseCase(recipeRepository),
            getRecipeDetailUseCase:  GetRecipeDetailUseCase(recipeRepository),
            // Likes
            toggleRecipeLikeUseCase: ToggleRecipeLikeUseCase(recipeRepository),
            getLikedRecipesUseCase:  GetLikedRecipesUseCase(recipeRepository),
            getLikeStatusUseCase:    GetLikeStatusUseCase(recipeRepository),
            // Reviews
            upsertReviewUseCase:     UpsertRecipeReviewUseCase(recipeRepository),
            getRecipeReviewsUseCase: GetRecipeReviewsUseCase(recipeRepository),
            getMyReviewUseCase:      GetMyRecipeReviewUseCase(recipeRepository),
            deleteReviewUseCase:     DeleteRecipeReviewUseCase(recipeRepository),
            // My Reviews
            getMyReviewsListUseCase: GetMyReviewsListUseCase(recipeRepository),
          )..loadRecipes(),
        ),
        ChangeNotifierProvider(
          create: (_) => ShoppingListProvider(
            addFromRecipeUseCase:         AddFromRecipeUseCase(shoppingListRepository),
            getShoppingListUseCase:       GetShoppingListUseCase(shoppingListRepository),
            toggleShoppingItemUseCase:    ToggleShoppingItemUseCase(shoppingListRepository),
            removeShoppingItemUseCase:    RemoveShoppingItemUseCase(shoppingListRepository),
            clearPurchasedUseCase:        ClearPurchasedUseCase(shoppingListRepository),
            clearAllShoppingItemsUseCase: ClearAllShoppingItemsUseCase(shoppingListRepository),
          ),
        ),
      ],
      child: MaterialApp(
        title: 'Wealthy Eater',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.build(),
        home: const _AppRoot(),
      ),
    );
  }
}

/// Root widget that handles session restore and routes to the correct screen.
class _AppRoot extends StatefulWidget {
  const _AppRoot();

  @override
  State<_AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<_AppRoot> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().restoreSession().then((_) {
        if (mounted && context.read<AuthProvider>().isAuthenticated) {
          context.read<RecipeProvider>().loadRecipes();
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        switch (auth.state) {
          case AuthState.initial:
          case AuthState.loading:
            return const _SplashScreen();
          case AuthState.authenticated:
            return HomeScreen(user: auth.user);
          case AuthState.unauthenticated:
          case AuthState.error:
            return const LoginScreen();
        }
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.restaurant_menu,
                size: 64, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 20),
            Text(
              'Wealthy Eater',
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
