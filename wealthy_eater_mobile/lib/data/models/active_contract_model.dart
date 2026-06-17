import 'nutritionist_model.dart';
import '../../domain/entities/consultation.dart';

class ActiveContractModel extends ConsultationContractEntity {
  ActiveContractModel({
    required super.id,
    required super.status,
    required NutritionistModel super.nutritionist,
    super.packageType = '1_month',
    super.expireAt,
    super.createdAt,
  });

  factory ActiveContractModel.fromJson(Map<String, dynamic> json) {
    return ActiveContractModel(
      id: json['_id'] ?? '',
      status: json['status'] ?? '',
      nutritionist: NutritionistModel.fromJson(json['nutritionist_id'] ?? {}),
      packageType: json['package_type'] ?? '1_month',
      expireAt: json['expire_at'] != null ? DateTime.tryParse(json['expire_at']) : null,
      createdAt: json['create_at'] != null ? DateTime.tryParse(json['create_at']) : null,
    );
  }
}

