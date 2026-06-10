class NutritionistModel {
  final String id;
  final String fullName;
  final String specialization;
  final int serviceFee;
  final double averageRating;
  final String? certificationUrl;

  NutritionistModel({
    required this.id,
    required this.fullName,
    required this.specialization,
    required this.serviceFee,
    required this.averageRating,
    this.certificationUrl,
  });

  factory NutritionistModel.fromJson(Map<String, dynamic> json) {
    return NutritionistModel(
      id: json['_id'] ?? '',
      fullName: json['full_name'] ?? 'Unknown',
      specialization: json['specialization'] ?? 'General Nutrition',
      serviceFee: json['service_fee'] ?? 0,
      averageRating: (json['average_rating'] ?? 0).toDouble(),
      certificationUrl: json['certification_url'],
    );
  }

  // Helper method to get initials for default avatar
  String get initials {
    if (fullName.isEmpty) return '??';
    final parts = fullName.split(' ').where((part) => part.isNotEmpty).toList();
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
    }
    return fullName.substring(0, 1).toUpperCase();
  }
}
