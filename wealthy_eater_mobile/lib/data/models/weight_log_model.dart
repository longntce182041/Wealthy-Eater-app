class WeightLogModel {
  final String id;
  final String userId;
  final double weight;
  final DateTime date;

  WeightLogModel({
    required this.id,
    required this.userId,
    required this.weight,
    required this.date,
  });

  factory WeightLogModel.fromJson(Map<String, dynamic> json) {
    return WeightLogModel(
      id: json['_id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      weight: (json['weight'] as num?)?.toDouble() ?? 0.0,
      date: json['date'] != null
          ? DateTime.parse(json['date'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'user_id': userId,
      'weight': weight,
      'date': date.toIso8601String(),
    };
  }
}
