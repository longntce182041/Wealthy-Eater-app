/// Sealed base state for expert registration flow (Dart 3 sealed class)
sealed class ExpertRegistrationState {}

/// Initial state before any action
class RegistrationInitial extends ExpertRegistrationState {}

// ── Step 1: Account Creation ──────────────────────────────────────────────────

/// Account creation request in progress
class AccountCreationLoading extends ExpertRegistrationState {}

/// Account created successfully; holds JWT tokens
class AccountCreationSuccess extends ExpertRegistrationState {
  final String userId;
  final String accessToken;
  final String refreshToken;
  final String email;

  AccountCreationSuccess({
    required this.userId,
    required this.accessToken,
    required this.refreshToken,
    required this.email,
  });
}

/// Account creation failed
class AccountCreationError extends ExpertRegistrationState {
  final String message;
  AccountCreationError(this.message);
}

// ── Step 2: Nutritionist Registration ─────────────────────────────────────────

/// Nutritionist registration request in progress
class NutritionistRegistrationLoading extends ExpertRegistrationState {}

/// Nutritionist registration submitted successfully
class NutritionistRegistrationSuccess extends ExpertRegistrationState {
  final String nutritionistId;
  final String approvalStatus;

  NutritionistRegistrationSuccess({
    required this.nutritionistId,
    required this.approvalStatus,
  });
}

/// Nutritionist registration failed
class NutritionistRegistrationError extends ExpertRegistrationState {
  final String message;
  NutritionistRegistrationError(this.message);
}
