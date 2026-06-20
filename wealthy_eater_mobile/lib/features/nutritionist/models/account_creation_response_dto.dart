/// DTO for Step 1 response: Account created with JWT tokens
class AccountCreationResponseDto {
  final bool success;
  final String message;
  final AccountCreationDataDto data;

  const AccountCreationResponseDto({
    required this.success,
    required this.message,
    required this.data,
  });

  factory AccountCreationResponseDto.fromJson(Map<String, dynamic> json) {
    return AccountCreationResponseDto(
      success: json['success'] as bool,
      message: json['message'] as String,
      data: AccountCreationDataDto.fromJson(
        json['data'] as Map<String, dynamic>,
      ),
    );
  }
}

/// Data from account creation response
class AccountCreationDataDto {
  final String userId;
  final String email;
  final String role;
  final String accessToken;
  final String refreshToken;
  final String? nextStep;

  const AccountCreationDataDto({
    required this.userId,
    required this.email,
    required this.role,
    required this.accessToken,
    required this.refreshToken,
    this.nextStep,
  });

  factory AccountCreationDataDto.fromJson(Map<String, dynamic> json) {
    return AccountCreationDataDto(
      userId: json['userId'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      nextStep: json['nextStep'] as String?,
    );
  }
}
