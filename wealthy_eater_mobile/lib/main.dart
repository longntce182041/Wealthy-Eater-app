import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';

import 'core/config/env_config.dart';
import 'core/network/api_client.dart';
import 'core/theme/index.dart';
import 'data/repositories/index.dart';
import 'data/services/chat_service.dart';
import 'data/services/consultation_service.dart';
import 'data/services/nutritionist_service.dart';
import 'domain/usecases/get_recipe_detail_usecase.dart';
import 'domain/usecases/get_recipes_usecase.dart';
import 'domain/usecases/recipe_like_usecases.dart';
import 'domain/usecases/recipe_review_usecases.dart';
import 'domain/usecases/get_my_reviews_list_usecase.dart';
import 'domain/usecases/shopping_list_usecases.dart';
import 'domain/usecases/auth_usecases.dart';
import 'domain/usecases/nutritionist_usecases.dart';
import 'domain/usecases/chat_usecases.dart';
import 'domain/usecases/chatbot_usecases.dart';
import 'domain/usecases/notification_usecases.dart';
import 'domain/usecases/consultation_usecases.dart';
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
    final authRepository         = AuthRepositoryImpl(apiClient: api);
    final nutritionistRepository = NutritionistRepositoryImpl(service: NutritionistService(apiClient: api));
    final chatRepository         = ChatRepositoryImpl(service: ChatService(apiClient: api));
    final chatbotRepository     = ChatbotRepositoryImpl(apiClient: api);
    final notificationRepository = NotificationRepositoryImpl(apiClient: api);
    final consultationRepository = ConsultationRepositoryImpl(service: ConsultationService(apiClient: api));

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthProvider(
            restoreSessionUseCase:      RestoreSessionUseCase(authRepository),
            loginUseCase:               LoginUseCase(authRepository),
            googleSignInUseCase:        GoogleSignInUseCase(authRepository),
            registerUseCase:            RegisterUseCase(authRepository),
            verifyOtpUseCase:           VerifyOtpUseCase(authRepository),
            resendOtpUseCase:           ResendOtpUseCase(authRepository),
            logoutUseCase:              LogoutUseCase(authRepository),
            fetchUserProfileUseCase:    FetchUserProfileUseCase(authRepository),
            fetchSetupMetadataUseCase:  FetchSetupMetadataUseCase(authRepository),
            fetchWeightHistoryUseCase:  FetchWeightHistoryUseCase(authRepository),
            logWeightUseCase:           LogWeightUseCase(authRepository),
            saveUserProfileUseCase:     SaveUserProfileUseCase(authRepository),
          ),
        ),
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
        ChangeNotifierProvider(
          create: (_) => NotificationProvider(
            fetchNotificationSettingsUseCase: FetchNotificationSettingsUseCase(notificationRepository),
            updateSettingsUseCase:            UpdateNotificationSettingsUseCase(notificationRepository),
            fetchHistoryUseCase:              FetchNotificationHistoryUseCase(notificationRepository),
            markAsReadUseCase:                 MarkNotificationAsReadUseCase(notificationRepository),
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => NutritionistProvider(
            fetchNutritionistsUseCase:       FetchNutritionistsUseCase(nutritionistRepository),
            fetchMealPlanRequestsUseCase:    FetchMealPlanRequestsUseCase(nutritionistRepository),
            respondToMealPlanRequestUseCase: RespondToMealPlanRequestUseCase(nutritionistRepository),
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => ConsultationProvider(
            hireNutritionistUseCase:            HireNutritionistUseCase(consultationRepository),
            getTransactionDetailUseCase:        GetTransactionDetailUseCase(consultationRepository),
            verifyPaymentUseCase:               VerifyPaymentUseCase(consultationRepository),
            getPayOSUrlsUseCase:                GetPayOSUrlsUseCase(consultationRepository),
            getActiveContractUseCase:           GetActiveContractUseCase(consultationRepository),
            requestMealPlanUseCase:             RequestMealPlanUseCase(consultationRepository),
            getMealPlanRequestStatusUseCase:    GetMealPlanRequestStatusUseCase(consultationRepository),
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => ChatProvider(
            fetchActiveContractsUseCase:   FetchActiveContractsUseCase(chatRepository),
            fetchMessageHistoryUseCase:    FetchMessageHistoryUseCase(chatRepository),
            uploadChatImageUseCase:        UploadChatImageUseCase(chatRepository),
            markChatMessagesReadUseCase:   MarkChatMessagesReadUseCase(chatRepository),
            connectChatSocketUseCase:      ConnectChatSocketUseCase(chatRepository),
            disconnectChatSocketUseCase:   DisconnectChatSocketUseCase(chatRepository),
            getChatSocketConnectedUseCase: GetChatSocketConnectedUseCase(chatRepository),
            joinChatRoomUseCase:           JoinChatRoomUseCase(chatRepository),
            sendChatTextMessageUseCase:    SendChatTextMessageUseCase(chatRepository),
            emitChatMarkReadUseCase:       EmitChatMarkReadUseCase(chatRepository),
            listenChatNewMessageUseCase:   ListenChatNewMessageUseCase(chatRepository),
            listenChatMessagesReadUseCase: ListenChatMessagesReadUseCase(chatRepository),
            listenChatSocketErrorUseCase:  ListenChatSocketErrorUseCase(chatRepository),
            listenChatRoomJoinedUseCase:   ListenChatRoomJoinedUseCase(chatRepository),
            removeChatAllListenersUseCase: RemoveChatAllListenersUseCase(chatRepository),
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => ChatbotProvider(
            getChatbotHistoryUseCase:  GetChatbotHistoryUseCase(chatbotRepository),
            sendChatbotMessageUseCase: SendChatbotMessageUseCase(chatbotRepository),
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
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().restoreSession().then((_) {
        if (mounted) {
          setState(() {
            _initialized = true;
          });
        }
        if (mounted && context.read<AuthProvider>().isAuthenticated) {
          context.read<RecipeProvider>().loadRecipes();
          context.read<NotificationProvider>().fetchSettings();
          context.read<NotificationProvider>().fetchHistory();
        }
      });
    });
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
            return NutritionistDashboardScreen(user: auth.user);
          }
          return HomeScreen(user: auth.user);
        }
        return const LoginScreen();
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
