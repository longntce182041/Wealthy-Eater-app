import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';

import 'core/config/env_config.dart';
import 'core/network/api_client.dart';
import 'core/theme/index.dart';
import 'data/repositories/index.dart';
import 'domain/usecases/get_recipe_detail_usecase.dart';
import 'domain/usecases/get_recipes_usecase.dart';
import 'presentation/providers/index.dart';
import 'presentation/screens/index.dart';

void main() {
  runApp(const WealthyEaterApp());
}

class WealthyEaterApp extends StatelessWidget {
  const WealthyEaterApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Determine base URL based on platform
    final baseUrl = kIsWeb ? 'http://localhost:5000' : EnvConfig.baseUrl;
    final api = ApiClient(baseUrl);
    final recipeRepository = RecipeRepositoryImpl(apiClient: api);

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(api: api)),
        ChangeNotifierProvider(
          create: (_) => RecipeProvider(
            getRecipesUseCase: GetRecipesUseCase(recipeRepository),
            getRecipeDetailUseCase: GetRecipeDetailUseCase(recipeRepository),
          )..loadRecipes(),
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
///
/// On launch:
/// 1. Calls [AuthProvider.restoreSession] to check stored token.
/// 2. Shows a splash loader during the check.
/// 3. Routes to [HomeScreen] if authenticated, [LoginScreen] if not.
class _AppRoot extends StatefulWidget {
  const _AppRoot();

  @override
  State<_AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<_AppRoot> {
  @override
  void initState() {
    super.initState();
    // Restore session after first frame so the provider tree is ready
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().restoreSession().then((_) {
        // Once authenticated, pre-load recipes
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
              // If authenticated but user hasn't completed profile, show profile form (customers)
              if (auth.user?.role == 'customer' && auth.userProfile == null) {
                return const ProfileFormScreen();
              }

              // Route to different home views depending on role
              if (auth.user?.role == 'nutritionist') {
                return NutritionistHomeScreen(user: auth.user);
              }
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
            Icon(Icons.restaurant_menu, size: 64, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 20),
            Text(
              'Wealthy Eater',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
