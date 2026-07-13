import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';

import 'core/config/env_config.dart';
import 'core/network/api_client.dart';
import 'core/network/session_expired_notifier.dart';
import 'core/theme/index.dart';
import 'data/repositories/index.dart';
import 'data/repositories/plan_repository.dart';
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
        Provider<ApiClient>.value(value: api),
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
            // S-08: Removed eager ..loadRecipes() here.
            // loadRecipes is called in _AppRootState.initState after session restore
            // conditioned on isAuthenticated, preventing a double-fetch and an
            // unauthenticated network request on app start.
          ),
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
        ChangeNotifierProvider(create: (_) => NotificationProvider(api: api)),
        ChangeNotifierProvider(create: (_) => NutritionistProvider(api: api)),
        ChangeNotifierProvider(create: (_) => ConsultationProvider(api: api)),
        ChangeNotifierProvider(create: (_) => ChatProvider(api: api)),
        ChangeNotifierProvider(create: (_) => MealPlanProvider(api: api)),
        ChangeNotifierProvider(
          create: (_) => MealGenerationProvider(
            repository: PlanRepository(api.dio),
          ),
        ),
        ChangeNotifierProvider(create: (_) => ChatbotProvider(api: api)),
        ChangeNotifierProvider(create: (_) => MealImageScanProvider(api: api)),
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
  bool _initialized = false;
  StreamSubscription<void>? _sessionExpiredSub;

  @override
  void initState() {
    super.initState();

    // Listen for hard session expiry from the auth interceptor
    _sessionExpiredSub =
        SessionExpiredNotifier.instance.stream.listen((_) {
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      auth.logout();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          ),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 4),
        ),
      );
    });

    // Reactive logout cleanup: clears all user-specific data from other providers
    final auth = context.read<AuthProvider>();
    bool wasAuthenticated = auth.isAuthenticated;
    auth.addListener(() {
      if (!mounted) return;
      final isAuth = auth.isAuthenticated;
      if (wasAuthenticated && !isAuth) {
        context.read<RecipeProvider>().reset();
        context.read<ShoppingListProvider>().reset();
        context.read<NotificationProvider>().reset();
        context.read<MealPlanProvider>().reset();
        context.read<NutritionistProvider>().reset();
        context.read<ConsultationProvider>().reset();
        context.read<ChatProvider>().resetChat();
      }
      wasAuthenticated = isAuth;
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().restoreSession().then((_) {
        if (mounted) {
          setState(() {
            _initialized = true;
          });
        }
        if (mounted && context.read<AuthProvider>().isAuthenticated) {
          // Data loading has been delegated to HomeScreen and NutritionistDashboardScreen initState
        }
      });
    });
  }

  @override
  void dispose() {
    _sessionExpiredSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const _SplashScreen();
    }

    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.isAuthenticated) {
          if (auth.user?.role == 'nutritionist') {
            final status = auth.user?.approvalStatus;
            if (status == 'APPROVED' || status == 'approval') {
              return NutritionistDashboardScreen(user: auth.user);
            }
            return const NutritionistVerificationScreen();
          }
          return HomeScreen(user: auth.user);
        }
        return const CustomerLoginScreen();
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
