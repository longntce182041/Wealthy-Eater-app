/// DTO for API responses from nutritionist registration
class RegistrationResponseDto {
  final bool success;
  final String message;
  final RegistrationDataDto? data;

  const RegistrationResponseDto({
    required this.success,
    required this.message,
    this.data,
  });

  factory RegistrationResponseDto.fromJson(Map<String, dynamic> json) {
    return RegistrationResponseDto(
      success: json['success'] as bool,
      message: json['message'] as String,
      data: json['data'] != null
          ? RegistrationDataDto.fromJson(json['data'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Data payload in registration response
class RegistrationDataDto {
  final String? userId;
  final String? email;
  final String? role;
  final String? accessToken;
  final String? refreshToken;
  final String? nextStep;
  final String? nutritionistId;
  final String? approvalStatus;

  const RegistrationDataDto({
    this.userId,
    this.email,
    this.role,
    this.accessToken,
    this.refreshToken,
    this.nextStep,
    this.nutritionistId,
    this.approvalStatus,
  });

  factory RegistrationDataDto.fromJson(Map<String, dynamic> json) {
    return RegistrationDataDto(
      userId: json['userId'] as String?,
      email: json['email'] as String?,
      role: json['role'] as String?,
      accessToken: json['accessToken'] as String?,
      refreshToken: json['refreshToken'] as String?,
      nextStep: json['nextStep'] as String?,
      nutritionistId: json['nutritionistId'] as String?,
      approvalStatus: json['approvalStatus'] as String?,
    );
  }
}
