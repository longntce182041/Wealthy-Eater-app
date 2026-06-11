import 'nutritionist_model.dart';

class ActiveContractModel {
  final String id;
  final String status;
  final NutritionistModel nutritionist;

  final String packageType;
  final DateTime? expireAt;
  final DateTime? createdAt;

  ActiveContractModel({
    required this.id,
    required this.status,
    required this.nutritionist,
    this.packageType = '1_month',
    this.expireAt,
    this.createdAt,
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
