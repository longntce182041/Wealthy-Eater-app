import 'package:go_router/go_router.dart';

import '../pages/index.dart';
import '../providers/providers.dart';

/// Route definitions for nutritionist/expert registration feature
class NutritionistRoutes {
  static const String expertRegisterStep1 = '/expert-register-step1';
  static const String expertRegisterStep2 = '/expert-register-step2';

  /// Get the list of routes for nutritionist feature
  static List<RouteBase> getRoutes() {
    return [
      // Step 1: Account Creation
      GoRoute(
        path: expertRegisterStep1,
        name: 'expertRegisterStep1',
        builder: (context, state) {
          return NutritionistProviders.provider(
            child: const ExpertRegistrationStep1Page(),
          );
        },
      ),

      // Step 2: Professional Details
      GoRoute(
        path: expertRegisterStep2,
        name: 'expertRegisterStep2',
        builder: (context, state) {
          // Extract user data from state if passed via extra
          final extra = state.extra as Map<String, dynamic>?;
          return NutritionistProviders.provider(
            child: ExpertRegistrationStep2Page(
              userId: extra?['userId'] as String?,
              accessToken: extra?['accessToken'] as String?,
            ),
          );
        },
      ),
    ];
  }
}
