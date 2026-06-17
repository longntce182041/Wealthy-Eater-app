import '../../domain/entities/consultation.dart';

class NutritionistModel extends NutritionistEntity {
  NutritionistModel({
    required super.id,
    required super.fullName,
    required super.specialization,
    required super.serviceFee,
    required super.averageRating,
    super.certificationUrl,
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
}

