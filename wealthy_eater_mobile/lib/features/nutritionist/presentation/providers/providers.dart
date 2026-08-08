import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/config/env_config.dart';
import '../../../../core/network/api_client.dart';
import '../../data/repositories/nutritionist_repository_impl.dart';
import '../../data/services/nutritionist_remote_datasource.dart';
import 'expert_registration_notifier.dart';

/// Dependency wiring for the nutritionist registration feature.
///
/// Requires [ApiClient] to be available in the widget tree via Provider.
/// Place [NutritionistProviders.provider()] above the registration pages.
///
/// Usage in your router / parent widget:
/// ```dart
/// NutritionistProviders.provider(
///   child: const ExpertRegistrationStep1Page(),
/// )
/// ```
class NutritionistProviders {
  NutritionistProviders._();

  /// Creates a fresh [ExpertRegistrationNotifier] with its own [ApiClient].
  /// Does NOT require ApiClient to be registered in the widget tree.
  static ExpertRegistrationNotifier createNotifier(BuildContext _) {
    final baseUrl = EnvConfig.baseUrl;
    final apiClient = ApiClient(baseUrl);
    final dataSource = NutritionistRemoteDataSource(apiClient);
    final repository = NutritionistRepositoryImpl(dataSource);
    return ExpertRegistrationNotifier(repository);
  }

  /// Convenience wrapper returning the configured [ChangeNotifierProvider].
  static ChangeNotifierProvider<ExpertRegistrationNotifier> provider({
    Widget? child,
  }) {
    return ChangeNotifierProvider<ExpertRegistrationNotifier>(
      create: createNotifier,
      child: child,
    );
  }
}
