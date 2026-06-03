// ignore: dangling_library_doc_comments
/// Represents an authenticated user in the domain layer.
// ignore: unintended_html_in_doc_comment
/// Mapped from API response by [AuthProvider] — never use raw Map<String, dynamic>.
class UserEntity {
  final String id;
  final String email;
  final String role;
  final String? displayName;
  final String? firstName;
  final String? lastName;
  final String? phoneNumber;
  final String? address;

  const UserEntity({
    required this.id,
    required this.email,
    required this.role,
    this.displayName,
    this.firstName,
    this.lastName,
    this.phoneNumber,
    this.address,
  });

  /// Derives the best display name available.
  String get fullName {
    final parts = [firstName, lastName].where((p) => p != null && p.isNotEmpty).toList();
    if (parts.isNotEmpty) return parts.join(' ');
    return displayName ?? email;
  }

  /// Construct from API response JSON.
  factory UserEntity.fromJson(Map<String, dynamic> json) {
    return UserEntity(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? 'customer').toString(),
      displayName: json['display_name']?.toString(),
      firstName: json['first_name']?.toString(),
      lastName: json['last_name']?.toString(),
      phoneNumber: json['phone_number']?.toString(),
      address: json['address']?.toString(),
    );
  }
}
