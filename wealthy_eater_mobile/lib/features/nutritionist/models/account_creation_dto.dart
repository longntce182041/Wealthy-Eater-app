/// DTO for Step 1: Creating a user account (email/password)
class AccountCreationDto {
  final String email;
  final String password;

  const AccountCreationDto({required this.email, required this.password});

  Map<String, dynamic> toJson() => {'email': email, 'password': password};
}
